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
export async function incrementCodeUsage(codeId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('📈 Incrementando uso del código:', codeId);

    // Obtener current_uses actual
    const { data: currentData, error: fetchError } = await (supabase as any)
      .from('laboratory_codes')
      .select('current_uses')
      .eq('id', codeId)
      .single();

    if (fetchError || !currentData) {
      return {
        success: false,
        error: 'No se pudo obtener información del código'
      };
    }

    // Incrementar
    const { error } = await (supabase as any)
      .from('laboratory_codes')
      .update({
        current_uses: currentData.current_uses + 1
      })
      .eq('id', codeId);

    if (error) {
      console.error('❌ Error incrementando uso:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Uso incrementado correctamente');

    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Error incrementando uso:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
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
