// =====================================================================
// SERVICIO DE PACIENTES - NUEVA ESTRUCTURA
// =====================================================================
// Servicios para manejar la tabla patients de forma independiente

import { supabase } from '@services/supabase/config/config'
import { findPatientByIdentificationNumber, parseCedula } from './identificaciones-service'

// Tipos específicos para pacientes (simplificados para evitar problemas de importación)
export interface Patient {
	id: string
	laboratory_id: string // NUEVO: Multi-tenant
	cedula: string
	nombre: string
	edad: string | null
	telefono: string | null
	email: string | null
	gender: 'Masculino' | 'Femenino' | null
	fecha_nacimiento?: string | null
	tipo_paciente?: 'adulto' | 'menor' | 'animal' | null
	especie?: string | null
	created_at: string | null
	updated_at: string | null
	version: number | null
}

export interface PatientInsert {
	id?: string
	laboratory_id: string // NUEVO: Multi-tenant
	cedula: string | null // Puede ser null para dependientes (menores/animales)
	nombre: string
	edad?: string | null
	telefono?: string | null
	email?: string | null
	gender?: 'Masculino' | 'Femenino' | null
	created_at?: string | null
	updated_at?: string | null
	version?: number | null
}

export interface PatientUpdate {
	id?: string
	laboratory_id?: string // NUEVO: Multi-tenant
	cedula?: string | null // Puede ser null para dependientes (menores/animales)
	nombre?: string
	edad?: string | null
	telefono?: string | null
	email?: string | null
	gender?: 'Masculino' | 'Femenino' | null
	created_at?: string | null
	updated_at?: string | null
	version?: number | null
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
		} = await supabase.auth.getUser()
		if (!user) throw new Error('Usuario no autenticado')

		const { data: profile, error } = await supabase.from('profiles').select('laboratory_id').eq('id', user.id).single()

		if (error || !profile) {
			throw new Error('Usuario no tiene laboratorio asignado')
		}

		// Type assertion porque sabemos que laboratory_id existe en la BD
		const laboratoryId = (profile as { laboratory_id?: string }).laboratory_id

		if (!laboratoryId) {
			throw new Error('Usuario no tiene laboratorio asignado')
		}

		return laboratoryId
	} catch (error) {
		console.error('Error obteniendo laboratory_id:', error)
		throw error
	}
}

/**
 * Buscar paciente por cédula (único) - MULTI-TENANT
 * Busca tanto por formato completo como solo por número para evitar duplicados
 * SOLO busca en el laboratorio del usuario autenticado
 */
export const findPatientByCedula = async (cedula: string): Promise<Patient | null> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		// Primero intentar búsqueda exacta
		const { data: exactMatch, error: exactError } = await supabase
			.from('patients')
			.select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
			.eq('cedula', cedula)
			.eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
			.single()

		if (exactMatch && !exactError) {
			return exactMatch as unknown as Patient
		}

		// Si no hay coincidencia exacta, buscar por número de cédula (sin prefijo)
		const cedulaNumber = cedula.replace(/^[VEJC]-/, '')

		// Buscar pacientes que tengan el mismo número pero diferente prefijo
		const { data: numberMatch, error: numberError } = await supabase
			.from('patients')
			.select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
			.like('cedula', `%-${cedulaNumber}`)
			.eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
			.single()

		if (numberMatch && !numberError) {
			const patient = numberMatch as unknown as Patient
			console.log(
				`⚠️ Encontrado paciente con mismo número pero diferente prefijo: ${patient.cedula} (buscando: ${cedula})`,
			)
			return patient
		}

		// Si no encuentra nada, retornar null
		if (exactError?.code === 'PGRST116' || numberError?.code === 'PGRST116') {
			return null
		}

		// Si hay otro tipo de error, lanzarlo
		if (exactError) throw exactError
		if (numberError) throw numberError

		return null
	} catch (error) {
		console.error('Error buscando paciente por cédula:', error)
		throw error
	}
}

/**
 * Función unificada para buscar paciente por cédula - FASE 8
 * Usa feature flag para decidir entre sistema nuevo (identificaciones) o antiguo (patients.cedula)
 * Implementa dual-read: intenta ambos sistemas y combina resultados
 */
export const findPatientUnified = async (cedula: string): Promise<Patient | null> => {
	try {
		// Obtener laboratory_id y verificar feature flag
		const laboratoryId = await getUserLaboratoryId()

		// Obtener configuración del laboratorio para verificar feature flag
		// Usar 'as any' porque 'laboratories' puede no estar en tipos generados de Supabase
		let useNewSystem = false
		try {
			const result = await supabase
				.from('laboratories' as any)
				.select('features')
				.eq('id', laboratoryId)
				.single()

			const laboratory = result.data as any
			useNewSystem = (laboratory?.features as any)?.hasNewPatientSystem === true
		} catch (error) {
			// Si falla al obtener el laboratorio, asumir que no hay feature flag (sistema antiguo)
			console.warn('⚠️ No se pudo obtener configuración del laboratorio, usando sistema antiguo:', error)
		}

		// =====================================================================
		// NUEVO SISTEMA: Buscar en identificaciones (si feature flag activo)
		// =====================================================================
		if (useNewSystem) {
			try {
				// Parsear cédula para obtener tipo y número
				const { tipo, numero } = parseCedula(cedula)

				// Buscar en identificaciones
				const result = await findPatientByIdentificationNumber(numero, tipo)

				if (result && result.paciente) {
					// Convertir a formato Patient
					const patient: Patient = {
						id: result.paciente.id,
						laboratory_id: result.paciente.laboratory_id,
						cedula: `${result.identificacion.tipo_documento}-${result.identificacion.numero}`,
						nombre: result.paciente.nombre,
						edad: result.paciente.edad,
						telefono: result.paciente.telefono,
						email: result.paciente.email,
						gender: result.paciente.gender,
						fecha_nacimiento: result.paciente.fecha_nacimiento,
						tipo_paciente: result.paciente.tipo_paciente,
						especie: result.paciente.especie,
						created_at: result.paciente.created_at,
						updated_at: result.paciente.updated_at,
						version: result.paciente.version,
					}
					return patient
				}
			} catch (newSystemError) {
				// FALLBACK: Si falla el nuevo sistema, usar el antiguo
				console.warn('⚠️ Nuevo sistema falló, usando fallback:', newSystemError)
			}
		}

		// =====================================================================
		// SISTEMA ANTIGUO: Buscar en patients.cedula (siempre disponible como fallback)
		// =====================================================================
		return await findPatientByCedula(cedula)
	} catch (error) {
		console.error('Error en findPatientUnified:', error)
		// Último fallback: intentar sistema antiguo directamente
		return await findPatientByCedula(cedula)
	}
}

/**
 * Buscar paciente por ID - MULTI-TENANT
 * SOLO busca en el laboratorio del usuario autenticado
 */
export const findPatientById = async (id: string): Promise<Patient | null> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		const { data, error } = await supabase
			.from('patients')
			.select(
				'id, laboratory_id, cedula, nombre, edad, telefono, email, gender, fecha_nacimiento, tipo_paciente, especie, created_at, updated_at, version',
			)
			.eq('id', id)
			.eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				return null
			}
			throw error
		}

		return data as unknown as Patient
	} catch (error) {
		console.error('Error buscando paciente por ID:', error)
		throw error
	}
}

/**
 * Crear nuevo paciente - MULTI-TENANT
 * Automáticamente asigna laboratory_id del usuario autenticado
 */
export const createPatient = async (patientData: Omit<PatientInsert, 'laboratory_id'>): Promise<Patient> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		// SIEMPRE incluir laboratory_id al insertar
		// Usar 'as any' porque los tipos generados pueden no incluir laboratory_id
		const { data, error } = await supabase
			.from('patients')
			.insert({
				...patientData,
				laboratory_id: laboratoryId, // CRÍTICO: Multi-tenant
			} as any)
			.select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
			.single()

		if (error) {
			throw error
		}

		console.log('✅ Paciente creado exitosamente:', data)
		return data as unknown as Patient
	} catch (error) {
		console.error('❌ Error creando paciente:', error)
		throw error
	}
}

/**
 * Actualizar paciente existente
 */
export const updatePatient = async (id: string, updates: PatientUpdate, userId?: string): Promise<Patient> => {
	try {
		// Obtener datos actuales para detectar cambios
		const currentPatient = await findPatientById(id)
		if (!currentPatient) {
			throw new Error('Paciente no encontrado')
		}

		// Si se está actualizando la cédula, verificar si ya existe otro paciente con esa cédula
		if (updates.cedula && updates.cedula !== currentPatient.cedula) {
			const existingPatient = await findPatientByCedula(updates.cedula)
			if (existingPatient && existingPatient.id !== id) {
				throw new Error(`Ya existe un paciente con la cédula ${updates.cedula}`)
			}
		}

		// Preparar datos de actualización
		const updateData: PatientUpdate = {
			...updates,
			updated_at: new Date().toISOString(),
			version: (currentPatient.version || 1) + 1,
		}

		// Actualizar paciente
		// Usar 'as any' porque los tipos generados pueden no permitir null en cedula
		const { data, error } = await supabase
			.from('patients')
			.update(updateData as any)
			.eq('id', id)
			.select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
			.single()

		if (error) {
			throw error
		}

		// Registrar cambios en change_logs si hay userId
		if (userId) {
			await logPatientChanges(id, currentPatient, updates, userId)
		}

		console.log('✅ Paciente actualizado exitosamente:', data)
		return data as unknown as Patient
	} catch (error) {
		console.error('❌ Error actualizando paciente:', error)
		throw error
	}
}

/**
 * Registrar cambios de paciente en change_logs
 */
const logPatientChanges = async (patientId: string, oldData: Patient, newData: PatientUpdate, userId: string) => {
	try {
		// Obtener información del usuario
		const { data: user } = await supabase.auth.getUser()
		const { data: profile } = await supabase.from('profiles').select('display_name, email').eq('id', userId).single()

		const userEmail = profile?.email || user.user?.email || 'unknown'
		const userDisplayName = profile?.display_name || 'Usuario'

		// Crear logs para cada campo que cambió
		const changes = []

		// Mapeo de campos para nombres legibles
		const fieldLabels: Record<string, string> = {
			cedula: 'Cédula',
			nombre: 'Nombre',
			edad: 'Edad',
			telefono: 'Teléfono',
			email: 'Email',
			gender: 'Género',
		}

		// Detectar cambios
		for (const [field, newValue] of Object.entries(newData)) {
			if (field === 'updated_at' || field === 'version') continue

			const oldValue = oldData[field as keyof Patient]

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
				})
			}
		}

		// Insertar cambios si hay alguno
		if (changes.length > 0) {
			const { error } = await supabase.from('change_logs').insert(changes)

			if (error) {
				console.error('Error registrando cambios del paciente:', error)
			} else {
				console.log(`✅ ${changes.length} cambios registrados para el paciente`)
			}
		}
	} catch (error) {
		console.error('Error en logPatientChanges:', error)
	}
}

/**
 * Obtener todos los pacientes con paginación - MULTI-TENANT
 * SOLO muestra pacientes del laboratorio del usuario autenticado
 */
export const getPatients = async (page = 1, limit = 50, searchTerm?: string) => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		let query = supabase.from('patients').select('*', { count: 'exact' }).eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT

		// Filtro de búsqueda
		if (searchTerm) {
			query = query.or(`cedula.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
		}

		// Paginación
		const from = (page - 1) * limit
		const to = from + limit - 1

		const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })

		if (error) {
			throw error
		}

		return {
			data: data || [],
			count: count || 0,
			page,
			limit,
			totalPages: Math.ceil((count || 0) / limit),
		}
	} catch (error) {
		console.error('Error obteniendo pacientes:', error)
		throw error
	}
}

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
			.single()

		if (patientError) {
			throw patientError
		}

		// Obtener casos médicos del paciente
		const { data: cases, error: casesError } = await supabase
			.from('medical_records_clean')
			.select('total_amount, date')
			.eq('patient_id', patientId)
			.order('date', { ascending: false })

		if (casesError) {
			throw casesError
		}

		// Calcular estadísticas
		const totalCases = cases?.length || 0
		const totalSpent = cases?.reduce((sum, case_) => sum + (case_.total_amount || 0), 0) || 0
		const lastVisit = cases?.[0]?.date || null

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
		}
	} catch (error) {
		console.error('Error obteniendo estadísticas del paciente:', error)
		throw error
	}
}

/**
 * Buscar pacientes por nombre o cédula (para autocomplete) - MULTI-TENANT
 * SOLO busca en el laboratorio del usuario autenticado
 */
export const searchPatients = async (searchTerm: string, limit = 10) => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		const { data, error } = await supabase
			.from('patients')
			.select('id, cedula, nombre, telefono, gender')
			.eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
			.or(`cedula.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
			.limit(limit)
			.order('nombre')

		if (error) {
			throw error
		}

		return data || []
	} catch (error) {
		console.error('Error buscando pacientes:', error)
		throw error
	}
}

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

/**
 * Eliminar paciente - MULTI-TENANT
 * Verifica casos médicos y dependientes antes de eliminar
 * Retorna información sobre qué se eliminará
 */
export const deletePatient = async (
	patientId: string,
): Promise<{
	deleted: boolean
	casesCount: number
	dependentsCount: number
}> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		// Verificar casos médicos del paciente
		const { count: casesCount } = await supabase
			.from('medical_records_clean')
			.select('*', { count: 'exact', head: true })
			.eq('patient_id', patientId)
			.eq('laboratory_id', laboratoryId)

		// Verificar si es responsable (tiene dependientes)
		const { count: dependentsCount } = await supabase
			.from('responsabilidades' as any)
			.select('*', { count: 'exact', head: true })
			.eq('paciente_id_responsable', patientId)
			.eq('laboratory_id', laboratoryId)

		// Eliminar responsabilidades donde este paciente es dependiente
		await supabase
			.from('responsabilidades' as any)
			.delete()
			.eq('paciente_id_dependiente', patientId)
			.eq('laboratory_id', laboratoryId)

		// Eliminar responsabilidades donde este paciente es responsable (cascada)
		if (dependentsCount && dependentsCount > 0) {
			await supabase
				.from('responsabilidades' as any)
				.delete()
				.eq('paciente_id_responsable', patientId)
				.eq('laboratory_id', laboratoryId)
		}

		// Eliminar identificaciones del paciente
		await supabase
			.from('identificaciones' as any)
			.delete()
			.eq('paciente_id', patientId)
			.eq('laboratory_id', laboratoryId)

		// Eliminar el paciente (los casos se eliminan en cascada si hay FK constraint)
		const { error } = await supabase.from('patients').delete().eq('id', patientId).eq('laboratory_id', laboratoryId)

		if (error) {
			throw error
		}

		console.log('✅ Paciente eliminado exitosamente')
		return {
			deleted: true,
			casesCount: casesCount || 0,
			dependentsCount: dependentsCount || 0,
		}
	} catch (error) {
		console.error('❌ Error eliminando paciente:', error)
		throw error
	}
}