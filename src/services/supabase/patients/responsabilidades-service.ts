// =====================================================================
// SERVICIO DE RESPONSABILIDADES - NUEVO SISTEMA
// =====================================================================
// Servicios para manejar la tabla responsabilidades
// NO modifica código existente, solo agrega nuevas funciones
// =====================================================================

import { supabase } from '@services/supabase/config/config'

// =====================================================================
// TIPOS
// =====================================================================

export interface Responsabilidad {
  id: string;
  laboratory_id: string;
  paciente_id_responsable: string;
  paciente_id_dependiente: string;
  tipo: 'menor' | 'animal';
  created_at: string | null;
  updated_at: string | null;
}

export interface ResponsabilidadInsert {
  paciente_id_responsable: string;
  paciente_id_dependiente: string;
  tipo: 'menor' | 'animal';
  laboratory_id?: string; // Opcional, se obtiene automáticamente si no se proporciona
}

export interface ResponsabilidadWithPatients extends Responsabilidad {
  responsable?: any; // Paciente responsable
  dependiente?: any; // Paciente dependiente
}

// =====================================================================
// FUNCIONES HELPER
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

// =====================================================================
// FUNCIONES DEL SERVICIO
// =====================================================================

/**
 * Crear nueva responsabilidad - MULTI-TENANT
 * Relaciona un responsable con un dependiente (menor o animal)
 */
export const createResponsibility = async (
  responsabilidadData: ResponsabilidadInsert,
): Promise<Responsabilidad> => {
  try {
    const laboratoryId = responsabilidadData.laboratory_id || await getUserLaboratoryId();

    // Validar que responsable y dependiente sean diferentes
    if (responsabilidadData.paciente_id_responsable === responsabilidadData.paciente_id_dependiente) {
      throw new Error('El responsable y el dependiente no pueden ser la misma persona');
    }

    const { data, error } = await supabase
      .from('responsabilidades' as any)
      .insert({
        ...responsabilidadData,
        laboratory_id: laboratoryId,
      } as any)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Responsabilidad creada exitosamente:', data);
    return data as Responsabilidad;
  } catch (error) {
    console.error('❌ Error creando responsabilidad:', error);
    throw error;
  }
};

/**
 * Obtener todos los dependientes de un responsable - MULTI-TENANT
 * Retorna menores y animales asociados a un responsable
 */
export const getDependentsByResponsable = async (
  responsableId: string,
): Promise<ResponsabilidadWithPatients[]> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    const { data, error } = await supabase
      .from('responsabilidades' as any)
      .select('*')
      .eq('laboratory_id', laboratoryId)
      .eq('paciente_id_responsable', responsableId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Obtener datos completos de pacientes
    const responsabilidadesWithPatients: ResponsabilidadWithPatients[] = [];

    for (const responsabilidad of (data || [])) {
      // Obtener responsable
      const { data: responsable } = await supabase
        .from('patients')
        .select('*')
        .eq('id', responsabilidad.paciente_id_responsable)
        .single();

      // Obtener dependiente
      const { data: dependiente } = await supabase
        .from('patients')
        .select('*')
        .eq('id', responsabilidad.paciente_id_dependiente)
        .single();

      responsabilidadesWithPatients.push({
        ...responsabilidad,
        responsable: responsable || null,
        dependiente: dependiente || null,
      });
    }

    return responsabilidadesWithPatients;
  } catch (error) {
    console.error('Error obteniendo dependientes:', error);
    throw error;
  }
};

/**
 * Obtener el responsable de un dependiente - MULTI-TENANT
 * Retorna el responsable de un menor o animal
 */
export const getResponsableByDependiente = async (
  dependienteId: string,
): Promise<{ responsabilidad: Responsabilidad; responsable: any } | null> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    const { data, error } = await supabase
      .from('responsabilidades' as any)
      .select('*')
      .eq('laboratory_id', laboratoryId)
      .eq('paciente_id_dependiente', dependienteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No tiene responsable
      }
      throw error;
    }

    // Obtener datos del responsable
    const { data: responsable, error: pacienteError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', data.paciente_id_responsable)
      .single();

    if (pacienteError || !responsable) {
      throw new Error('Responsable no encontrado');
    }

    return {
      responsabilidad: data as Responsabilidad,
      responsable,
    };
  } catch (error) {
    console.error('Error obteniendo responsable:', error);
    throw error;
  }
};

/**
 * Verificar si un paciente tiene responsable - MULTI-TENANT
 * Útil para validar antes de crear casos de menores/animales
 */
export const hasResponsable = async (dependienteId: string): Promise<boolean> => {
  try {
    const responsable = await getResponsableByDependiente(dependienteId);
    return responsable !== null;
  } catch (error) {
    console.error('Error verificando responsable:', error);
    return false;
  }
};

/**
 * Eliminar responsabilidad - MULTI-TENANT
 * Solo owners/admins pueden eliminar (según RLS)
 */
export const deleteResponsibility = async (id: string): Promise<void> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    const { error } = await supabase
      .from('responsabilidades' as any)
      .delete()
      .eq('id', id)
      .eq('laboratory_id', laboratoryId); // Asegurar multi-tenant

    if (error) {
      throw error;
    }

    console.log('✅ Responsabilidad eliminada exitosamente');
  } catch (error) {
    console.error('❌ Error eliminando responsabilidad:', error);
    throw error;
  }
};

/**
 * Obtener todas las responsabilidades de un laboratorio - MULTI-TENANT
 * Útil para reportes y administración
 */
export const getAllResponsabilidades = async (): Promise<ResponsabilidadWithPatients[]> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    const { data, error } = await supabase
      .from('responsabilidades' as any)
      .select('*')
      .eq('laboratory_id', laboratoryId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Obtener datos completos de pacientes
    const responsabilidadesWithPatients: ResponsabilidadWithPatients[] = [];

    for (const responsabilidad of (data || [])) {
      // Obtener responsable
      const { data: responsable } = await supabase
        .from('patients')
        .select('*')
        .eq('id', responsabilidad.paciente_id_responsable)
        .single();

      // Obtener dependiente
      const { data: dependiente } = await supabase
        .from('patients')
        .select('*')
        .eq('id', responsabilidad.paciente_id_dependiente)
        .single();

      responsabilidadesWithPatients.push({
        ...responsabilidad,
        responsable: responsable || null,
        dependiente: dependiente || null,
      });
    }

    return responsabilidadesWithPatients;
  } catch (error) {
    console.error('Error obteniendo responsabilidades:', error);
    throw error;
  }
};

