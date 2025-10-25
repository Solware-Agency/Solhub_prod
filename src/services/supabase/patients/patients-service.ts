// =====================================================================
// SERVICIO DE PACIENTES - NUEVA ESTRUCTURA
// =====================================================================
// Servicios para manejar la tabla patients de forma independiente

import { supabase } from '@services/supabase/config/config'

// Tipos específicos para pacientes (simplificados para evitar problemas de importación)
export interface Patient {
  id: string;
  laboratory_id: string; // NUEVO: Multi-tenant
  cedula: string;
  nombre: string;
  edad: string | null;
  telefono: string | null;
  email: string | null;
  gender: 'Masculino' | 'Femenino' | null;
  created_at: string | null;
  updated_at: string | null;
  version: number | null;
}

export interface PatientInsert {
  id?: string;
  laboratory_id: string; // NUEVO: Multi-tenant
  cedula: string;
  nombre: string;
  edad?: string | null;
  telefono?: string | null;
  email?: string | null;
  gender?: 'Masculino' | 'Femenino' | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: number | null;
}

export interface PatientUpdate {
  id?: string;
  laboratory_id?: string; // NUEVO: Multi-tenant
  cedula?: string;
  nombre?: string;
  edad?: string | null;
  telefono?: string | null;
  email?: string | null;
  gender?: 'Masculino' | 'Femenino' | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: number | null;
}

// =====================================================================
// FUNCIONES DEL SERVICIO DE PACIENTES
// =====================================================================

/**
 * Obtener laboratory_id del usuario autenticado
 * Helper function para multi-tenant
 */
const getUserLaboratoryId = async (): Promise<string> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    // Type assertion porque sabemos que laboratory_id existe en la BD
    const laboratoryId = (profile as { laboratory_id?: string }).laboratory_id;
    
    if (!laboratoryId) {
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    return laboratoryId;
  } catch (error) {
    console.error('Error obteniendo laboratory_id:', error);
    throw error;
  }
};

/**
 * Buscar paciente por cédula (único) - MULTI-TENANT
 * Busca tanto por formato completo como solo por número para evitar duplicados
 * SOLO busca en el laboratorio del usuario autenticado
 */
export const findPatientByCedula = async (
  cedula: string,
): Promise<Patient | null> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    // Primero intentar búsqueda exacta
    const { data: exactMatch, error: exactError } = await supabase
      .from('patients')
      .select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
      .eq('cedula', cedula)
      .eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
      .single();

    if (exactMatch && !exactError) {
      return exactMatch as unknown as Patient;
    }

    // Si no hay coincidencia exacta, buscar por número de cédula (sin prefijo)
    const cedulaNumber = cedula.replace(/^[VEJC]-/, '');

    // Buscar pacientes que tengan el mismo número pero diferente prefijo
    const { data: numberMatch, error: numberError } = await supabase
      .from('patients')
      .select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
      .like('cedula', `%-${cedulaNumber}`)
      .eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
      .single();

    if (numberMatch && !numberError) {
      const patient = numberMatch as unknown as Patient;
      console.log(
        `⚠️ Encontrado paciente con mismo número pero diferente prefijo: ${patient.cedula} (buscando: ${cedula})`,
      );
      return patient;
    }

    // Si no encuentra nada, retornar null
    if (exactError?.code === 'PGRST116' || numberError?.code === 'PGRST116') {
      return null;
    }

    // Si hay otro tipo de error, lanzarlo
    if (exactError) throw exactError;
    if (numberError) throw numberError;

    return null;
  } catch (error) {
    console.error('Error buscando paciente por cédula:', error);
    throw error;
  }
};

/**
 * Buscar paciente por ID - MULTI-TENANT
 * SOLO busca en el laboratorio del usuario autenticado
 */
export const findPatientById = async (id: string): Promise<Patient | null> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    const { data, error } = await supabase
      .from('patients')
      .select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
      .eq('id', id)
      .eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as unknown as Patient;
  } catch (error) {
    console.error('Error buscando paciente por ID:', error);
    throw error;
  }
};

/**
 * Crear nuevo paciente - MULTI-TENANT
 * Automáticamente asigna laboratory_id del usuario autenticado
 */
export const createPatient = async (
  patientData: Omit<PatientInsert, 'laboratory_id'>,
): Promise<Patient> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    // SIEMPRE incluir laboratory_id al insertar
    const { data, error } = await supabase
      .from('patients')
      .insert({
        ...patientData,
        laboratory_id: laboratoryId, // CRÍTICO: Multi-tenant
      })
      .select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Paciente creado exitosamente:', data);
    return data as unknown as Patient;
  } catch (error) {
    console.error('❌ Error creando paciente:', error);
    throw error;
  }
};

/**
 * Actualizar paciente existente
 */
export const updatePatient = async (
  id: string,
  updates: PatientUpdate,
  userId?: string,
): Promise<Patient> => {
  try {
    // Obtener datos actuales para detectar cambios
    const currentPatient = await findPatientById(id);
    if (!currentPatient) {
      throw new Error('Paciente no encontrado');
    }

    // Si se está actualizando la cédula, verificar si ya existe otro paciente con esa cédula
    if (updates.cedula && updates.cedula !== currentPatient.cedula) {
      const existingPatient = await findPatientByCedula(updates.cedula);
      if (existingPatient && existingPatient.id !== id) {
        throw new Error(
          `Ya existe un paciente con la cédula ${updates.cedula}`,
        );
      }
    }

    // Preparar datos de actualización
    const updateData: PatientUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
      version: (currentPatient.version || 1) + 1,
    };

    // Actualizar paciente
    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', id)
      .select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
      .single();

    if (error) {
      throw error;
    }

    // Registrar cambios en change_logs si hay userId
    if (userId) {
      await logPatientChanges(id, currentPatient, updates, userId);
    }

    console.log('✅ Paciente actualizado exitosamente:', data);
    return data as unknown as Patient;
  } catch (error) {
    console.error('❌ Error actualizando paciente:', error);
    throw error;
  }
};

/**
 * Registrar cambios de paciente en change_logs
 */
const logPatientChanges = async (
  patientId: string,
  oldData: Patient,
  newData: PatientUpdate,
  userId: string,
) => {
  try {
    // Obtener información del usuario
    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single();

    const userEmail = profile?.email || user.user?.email || 'unknown';
    const userDisplayName = profile?.display_name || 'Usuario';

    // Crear logs para cada campo que cambió
    const changes = [];

    // Mapeo de campos para nombres legibles
    const fieldLabels: Record<string, string> = {
      cedula: 'Cédula',
      nombre: 'Nombre',
      edad: 'Edad',
      telefono: 'Teléfono',
      email: 'Email',
      gender: 'Género',
    };

    // Detectar cambios
    for (const [field, newValue] of Object.entries(newData)) {
      if (field === 'updated_at' || field === 'version') continue;

      const oldValue = oldData[field as keyof Patient];

      if (oldValue !== newValue) {
        changes.push({
          patient_id: patientId,
          entity_type: 'patient',
          field_name: field,
          field_label: fieldLabels[field] || field,
          old_value: String(oldValue || ''),
          new_value: String(newValue || ''),
          user_id: userId,
          user_email: userEmail,
          user_display_name: userDisplayName,
        });
      }
    }

    // Insertar cambios si hay alguno
    if (changes.length > 0) {
      const { error } = await supabase.from('change_logs').insert(changes);

      if (error) {
        console.error('Error registrando cambios del paciente:', error);
      } else {
        console.log(
          `✅ ${changes.length} cambios registrados para el paciente`,
        );
      }
    }
  } catch (error) {
    console.error('Error en logPatientChanges:', error);
  }
};

/**
 * Obtener todos los pacientes con paginación - MULTI-TENANT
 * SOLO muestra pacientes del laboratorio del usuario autenticado
 */
export const getPatients = async (
  page = 1,
  limit = 50,
  searchTerm?: string,
) => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('laboratory_id', laboratoryId); // FILTRO MULTI-TENANT

    // Filtro de búsqueda
    if (searchTerm) {
      query = query.or(
        `cedula.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`,
      );
    }

    // Paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error('Error obteniendo pacientes:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de un paciente usando consultas directas
 */
export const getPatientStatistics = async (patientId: string) => {
  try {
    // Obtener información del paciente
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError) {
      throw patientError;
    }

    // Obtener casos médicos del paciente
    const { data: cases, error: casesError } = await supabase
      .from('medical_records_clean')
      .select('total_amount, date')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (casesError) {
      throw casesError;
    }

    // Calcular estadísticas
    const totalCases = cases?.length || 0;
    const totalSpent =
      cases?.reduce((sum, case_) => sum + (case_.total_amount || 0), 0) || 0;
    const lastVisit = cases?.[0]?.date || null;

    return {
      id: patient.id,
      cedula: patient.cedula,
      nombre: patient.nombre,
      edad: patient.edad,
      telefono: patient.telefono,
      email: patient.email,
      gender: patient.gender,
      total_cases: totalCases,
      total_spent: totalSpent,
      last_visit: lastVisit,
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas del paciente:', error);
    throw error;
  }
};

/**
 * Buscar pacientes por nombre o cédula (para autocomplete) - MULTI-TENANT
 * SOLO busca en el laboratorio del usuario autenticado
 */
export const searchPatients = async (searchTerm: string, limit = 10) => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    const { data, error } = await supabase
      .from('patients')
      .select('id, cedula, nombre, telefono, gender')
      .eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
      .or(`cedula.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('nombre');

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error buscando pacientes:', error);
    throw error;
  }
};

/**
 * Encontrar pacientes duplicados por número de cédula
 * Útil para limpiar duplicados existentes
 */
export const findDuplicatePatients = async () => {
	try {
		// Obtener todos los pacientes
		const { data: allPatients, error } = await supabase
			.from('patients')
			.select('id, cedula, nombre, created_at')
			.order('created_at', { ascending: true })

		if (error) {
			throw error
		}

		// Agrupar por número de cédula (sin prefijo)
		const groupedByNumber: Record<
			string,
			Array<{ id: string; cedula: string; nombre: string; created_at: string | null }>
		> = {}

		allPatients?.forEach((patient) => {
			const cedulaNumber = patient.cedula.replace(/^[VEJC]-/, '')
			if (!groupedByNumber[cedulaNumber]) {
				groupedByNumber[cedulaNumber] = []
			}
			groupedByNumber[cedulaNumber].push(patient)
		})

		// Encontrar duplicados
		const duplicates: Array<{
			cedulaNumber: string
			patients: Array<{ id: string; cedula: string; nombre: string; created_at: string | null }>
		}> = []

		Object.entries(groupedByNumber).forEach(([cedulaNumber, patients]) => {
			if (patients.length > 1) {
				duplicates.push({ cedulaNumber, patients })
			}
		})

		return duplicates
	} catch (error) {
		console.error('Error buscando pacientes duplicados:', error)
		throw error
	}
}

/**
 * Consolidar pacientes duplicados
 * Mantiene el paciente más reciente y elimina los duplicados
 */
export const consolidateDuplicatePatients = async (
	duplicates: Array<{
		cedulaNumber: string
		patients: Array<{ id: string; cedula: string; nombre: string; created_at: string | null }>
	}>,
) => {
	try {
		const results = []

		for (const { cedulaNumber, patients } of duplicates) {
			// Ordenar por fecha de creación (más reciente primero)
			const sortedPatients = patients.sort((a, b) => {
				const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
				const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
				return dateB - dateA
			})

			const keepPatient = sortedPatients[0] // El más reciente
			const deletePatients = sortedPatients.slice(1) // Los duplicados

			console.log(`🔄 Consolidando cédula ${cedulaNumber}:`)
			console.log(`   ✅ Mantener: ${keepPatient.cedula} (${keepPatient.nombre})`)

			// Eliminar duplicados
			for (const patient of deletePatients) {
				console.log(`   ❌ Eliminar: ${patient.cedula} (${patient.nombre})`)

				const { error: deleteError } = await supabase.from('patients').delete().eq('id', patient.id)

				if (deleteError) {
					console.error(`Error eliminando paciente ${patient.id}:`, deleteError)
				} else {
					results.push({
						action: 'deleted',
						patient: patient,
						kept: keepPatient,
					})
				}
			}
		}

		return results
	} catch (error) {
		console.error('Error consolidando pacientes duplicados:', error)
		throw error
	}
}
