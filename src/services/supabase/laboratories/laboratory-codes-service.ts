// =====================================================================
// SERVICIO DE CÓDIGOS DE LABORATORIO
// =====================================================================
// Validación y gestión de códigos con límite de usos

import { supabase } from '@/services/supabase/config/config';

export interface LaboratoryCode {
  id: string; // uuid
  laboratory_id: string; // uuid
  code: string; // text
  is_active: boolean; // bool
  max_uses: number | null; // int4 (nullable)
  current_uses: number; // int4
  expires_at: string | null; // timestamptz (nullable)
  created_by: string | null; // uuid (nullable)
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface CodeValidationResult {
  success: boolean;
  laboratory_id?: string;
  code?: LaboratoryCode;
  error?: string;
}

/**
 * Valida un código de laboratorio y verifica sus límites
 */
export async function validateLaboratoryCode(
  code: string
): Promise<CodeValidationResult> {
  try {
    console.log('🔍 Validando código:', code);

    const { data, error } = await (supabase as any)
      .from('laboratory_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('❌ Código no encontrado:', error);
      return {
        success: false,
        error: 'Código de laboratorio no encontrado o inactivo'
      };
    }

    // Verificar expiración
    if (data.expires_at) {
      const expirationDate = new Date(data.expires_at);
      if (expirationDate < new Date()) {
        return {
          success: false,
          error: 'El código ha expirado'
        };
      }
    }

    // Verificar límite de usos
    if (data.max_uses !== null && data.current_uses >= data.max_uses) {
      return {
        success: false,
        error: `El código alcanzó su límite de usos (${data.max_uses})`
      };
    }

    // Verificar que el laboratorio esté activo (no permitir registro si está inactive)
    const { data: lab, error: labError } = await (supabase as any)
      .from('laboratories')
      .select('id, status')
      .eq('id', data.laboratory_id)
      .maybeSingle();

    if (labError || !lab || lab.status === 'inactive') {
      return {
        success: false,
        error: 'Cuenta inactiva. Por favor, pague para continuar utilizando el servicio.'
      };
    }

    console.log('✅ Código válido:', data);

    return {
      success: true,
      laboratory_id: data.laboratory_id,
      code: data
    };
  } catch (error) {
    console.error('❌ Error validando código:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al validar código'
    };
  }
}

/**
 * Incrementa el contador de usos de un código
 */
export async function incrementCodeUsage(codeId: string): Promise<void> {
  console.log('📈 Incrementando uso del código:', codeId);

  // ⚠️ IMPORTANTE:
  // Durante el signup el usuario suele NO tener sesión válida (email confirmation),
  // así que un UPDATE directo puede fallar por RLS.
  // Por eso usamos un RPC SECURITY DEFINER en BD.
  const { data, error } = await (supabase as any).rpc(
    'increment_laboratory_code_usage',
    { code_id: codeId },
  );

  if (!error) {
    // data típicamente será [{ id, current_uses }]
    console.log('✅ Uso incrementado correctamente (RPC)', data);
    return;
  }

  // Fallback defensivo: si el RPC aún no existe en el entorno, intentamos UPDATE directo.
  // Esto puede seguir fallando por RLS, pero al menos deja un error claro en consola.
  console.warn(
    '⚠️ RPC increment_laboratory_code_usage falló; intentando fallback UPDATE directo.',
    error,
  );

  const { data: currentData, error: fetchError } = await (supabase as any)
    .from('laboratory_codes')
    .select('current_uses')
    .eq('id', codeId)
    .single();

  if (fetchError || !currentData) {
    console.error('❌ Error obteniendo código para fallback:', fetchError);
    throw new Error('No se pudo incrementar el uso del código');
  }

  const { error: updateError } = await (supabase as any)
    .from('laboratory_codes')
    .update({ current_uses: currentData.current_uses + 1 })
    .eq('id', codeId);

  if (updateError) {
    console.error('❌ Error incrementando uso (fallback):', updateError);
    throw new Error(updateError.message || 'No se pudo incrementar el uso del código');
  }

  console.log('✅ Uso incrementado correctamente (fallback)');
}

/**
 * Obtiene información de uso de un código (sin datos sensibles)
 */
export async function getCodeUsageInfo(code: string): Promise<{
  success: boolean;
  remaining?: number | null; // null = ilimitado
  total?: number;
  currentUses?: number;
  error?: string;
}> {
  try {
    const { data, error } = await (supabase as any)
      .from('laboratory_codes')
      .select('max_uses, current_uses')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: 'Código no encontrado'
      };
    }

    const remaining = data.max_uses !== null 
      ? Math.max(0, data.max_uses - data.current_uses)
      : null;

    return {
      success: true,
      remaining,
      total: data.max_uses,
      currentUses: data.current_uses
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene todos los códigos de un laboratorio (solo para owners)
 */
export async function getLaboratoryCodes(laboratoryId: string): Promise<{
  success: boolean;
  codes?: LaboratoryCode[];
  error?: string;
}> {
  try {
    const { data, error } = await (supabase as any)
      .from('laboratory_codes')
      .select('*')
      .eq('laboratory_id', laboratoryId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      codes: data || []
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
