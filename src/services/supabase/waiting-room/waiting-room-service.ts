import { supabase } from '@/services/supabase/config/config';

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

/**
 * Para employee (y otros roles con sede asignada): restringe datos a su sede.
 * Owner/prueba sin sede asignada ven todas las sedes.
 * @returns Sede a la que restringir, o null si el usuario puede ver todas.
 */
const getBranchRestrictionForCurrentUser = async (): Promise<string | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, assigned_branch')
      .eq('id', user.id)
      .single();

    if (error || !profile) return null;

    const p = profile as { role?: string; assigned_branch?: string | null };
    // Rol prueba (godmode) y owner pueden ver todas las sedes
    if (p.role === 'prueba' || p.role === 'owner') return null;
    if ((p.role === 'employee' || p.role === 'coordinador') && p.assigned_branch) return p.assigned_branch;
    // Otros roles con sede asignada (ej. residente) también restringidos
    if (p.assigned_branch) return p.assigned_branch;
    return null;
  } catch (error) {
    console.error('Error obteniendo restricción de sede:', error);
    return null;
  }
};

/**
 * Estado del caso en el flujo de sala de espera SPT
 */
export type EstadoSpt = 'pendiente_triaje' | 'esperando_consulta' | 'finalizado';

/**
 * Caso médico con información básica para sala de espera
 */
export interface WaitingRoomCase {
  id: string;
  code: string | null;
  patient_id: string | null;
  branch: string | null;
  estado_spt: EstadoSpt | null;
  created_at: string;
  updated_at: string;
  // Información del paciente
  nombre: string;
  cedula: string | null;
}

/**
 * Obtener casos activos de la sala de espera
 * Solo muestra casos con estado 'pendiente_triaje' o 'esperando_consulta'
 * Los casos finalizados no aparecen
 * 
 * @param branch - Sede específica (opcional). Si no se proporciona, retorna todas las sedes
 * @returns Array de casos activos ordenados por fecha de creación (más antiguos primero - orden de llegada)
 */
export const getWaitingRoomCases = async (
  branch?: string
): Promise<WaitingRoomCase[]> => {
  try {
    const laboratoryId = await getUserLaboratoryId();
    const restrictedBranch = await getBranchRestrictionForCurrentUser();
    const effectiveBranch = restrictedBranch ?? branch;

    // Construir query base
    let query = supabase
      .from('medical_records_clean')
      .select(`
        id,
        code,
        patient_id,
        branch,
        estado_spt,
        created_at,
        updated_at,
        patients:patient_id (
          nombre,
          cedula
        )
      `)
      .eq('laboratory_id', laboratoryId)
      .in('estado_spt', ['pendiente_triaje', 'esperando_consulta'])
      .order('created_at', { ascending: true });

    // Filtrar por sede si se proporciona o si el usuario está restringido a una (ej. employee)
    if (effectiveBranch) {
      query = query.eq('branch', effectiveBranch);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo casos de sala de espera:', error);
      throw new Error(`Error al obtener casos: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Transformar datos para incluir información del paciente
    const cases: WaitingRoomCase[] = data
      .filter((case_) => case_.patients) // Filtrar casos sin paciente (no debería pasar)
      .map((case_) => ({
        id: case_.id,
        code: case_.code,
        patient_id: case_.patient_id,
        branch: case_.branch,
        estado_spt: case_.estado_spt as EstadoSpt | null,
        created_at: case_.created_at,
        updated_at: case_.updated_at,
        nombre: (case_.patients as any)?.nombre || 'Sin nombre',
        cedula: (case_.patients as any)?.cedula || null,
      }));

    return cases;
  } catch (error) {
    console.error('Error en getWaitingRoomCases:', error);
    throw error;
  }
};

/**
 * Obtener todas las sedes del laboratorio (desde configuración)
 * Retorna todas las sedes configuradas, no solo las que tienen casos activos
 * 
 * @returns Array de nombres de sedes únicas
 */
export const getActiveBranches = async (): Promise<string[]> => {
  try {
    const restrictedBranch = await getBranchRestrictionForCurrentUser();
    if (restrictedBranch) {
      return [restrictedBranch];
    }

    const laboratoryId = await getUserLaboratoryId();

    // Obtener configuración del laboratorio
    const { data: laboratory, error: labError } = await supabase
      .from('laboratories')
      .select('config')
      .eq('id', laboratoryId)
      .single();

    if (labError || !laboratory) {
      console.error('Error obteniendo configuración del laboratorio:', labError);
      throw new Error(`Error al obtener configuración: ${labError?.message || 'Laboratorio no encontrado'}`);
    }

    // Extraer sedes de la configuración
    const config = laboratory.config as any;
    let branches = config?.branches || [];

    // Si branches es un string JSON, parsearlo
    if (typeof branches === 'string') {
      try {
        branches = JSON.parse(branches);
      } catch (e) {
        console.error('Error parseando branches como JSON:', e);
        branches = [];
      }
    }

    console.log('🔍 Sedes obtenidas de configuración:', branches);

    if (!Array.isArray(branches) || branches.length === 0) {
      // Si no hay sedes en la configuración, obtener sedes únicas de casos médicos como fallback
      const { data: casesData, error: casesError } = await supabase
        .from('medical_records_clean')
        .select('branch')
        .eq('laboratory_id', laboratoryId)
        .not('branch', 'is', null);

      if (casesError) {
        console.error('Error obteniendo sedes de casos:', casesError);
        return [];
      }

      const uniqueBranches = Array.from(
        new Set(casesData?.map((item) => item.branch).filter(Boolean) || [])
      ) as string[];

      return uniqueBranches.sort();
    }

    // Retornar sedes de la configuración ordenadas
    return branches.sort();
  } catch (error) {
    console.error('Error en getActiveBranches:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de la sala de espera
 * 
 * @param branch - Sede específica (opcional)
 * @returns Estadísticas por estado
 */
export const getWaitingRoomStats = async (
  branch?: string
): Promise<{
  pendiente_triaje: number;
  esperando_consulta: number;
  total: number;
}> => {
  try {
    const laboratoryId = await getUserLaboratoryId();
    const restrictedBranch = await getBranchRestrictionForCurrentUser();
    const effectiveBranch = restrictedBranch ?? branch;

    let query = supabase
      .from('medical_records_clean')
      .select('estado_spt', { count: 'exact' })
      .eq('laboratory_id', laboratoryId)
      .in('estado_spt', ['pendiente_triaje', 'esperando_consulta']);

    if (effectiveBranch) {
      query = query.eq('branch', effectiveBranch);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }

    const pendiente_triaje =
      data?.filter((item) => item.estado_spt === 'pendiente_triaje').length || 0;
    const esperando_consulta =
      data?.filter((item) => item.estado_spt === 'esperando_consulta').length || 0;

    return {
      pendiente_triaje,
      esperando_consulta,
      total: count || 0,
    };
  } catch (error) {
    console.error('Error en getWaitingRoomStats:', error);
    throw error;
  }
};
