// =====================================================================
// HELPERS DE TIPOS PARA MULTI-TENANT
// =====================================================================
// Helpers para trabajar con tipos de Supabase que no reconocen laboratory_id

/**
 * Type helper para profiles con laboratory_id
 * Usa esto cuando Supabase no reconozca laboratory_id en profiles
 */
export type ProfileWithLab = {
  laboratory_id?: string;
  display_name?: string;
  [key: string]: unknown;
};

/**
 * Type helper para extraer laboratory_id de forma segura
 */
export function extractLaboratoryId(
  profile: unknown,
): string | null {
  const p = profile as ProfileWithLab;
  return p?.laboratory_id || null;
}

/**
 * Type helper para extraer display_name de forma segura
 */
export function extractDisplayName(
  profile: unknown,
): string | null {
  const p = profile as ProfileWithLab;
  return p?.display_name || null;
}

/**
 * Type helper para obtener laboratory_id del usuario actual
 * Usa esto en lugar de acceder directamente a profile.laboratory_id
 */
export async function getUserLaboratoryIdSafe(
  supabase: { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown; error: unknown }> } } } },
  userId: string,
): Promise<string> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('laboratory_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('Usuario no tiene laboratorio asignado');
  }

  const laboratoryId = extractLaboratoryId(profile);
  
  if (!laboratoryId) {
    throw new Error('Usuario no tiene laboratorio asignado');
  }

  return laboratoryId;
}

