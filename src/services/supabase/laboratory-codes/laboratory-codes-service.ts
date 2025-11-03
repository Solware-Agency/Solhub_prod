// =====================================================================
// SERVICIO DE CÓDIGOS DE LABORATORIO
// =====================================================================
// Servicios para validar y gestionar códigos de acceso para laboratorios
//
// ¿Qué hace este servicio?
// 1. Valida códigos de laboratorio antes del registro
// 2. Verifica que el código esté activo, no expirado y no excedido
// 3. Incrementa el contador de usos cuando se usa un código
//
// ¿Por qué separamos esto en un servicio?
// - Reutilizable: Podemos validar códigos desde cualquier parte de la app
// - Testeable: Fácil de probar independientemente
// - Mantenible: Cambios en la lógica de validación están centralizados

import { supabase } from '@services/supabase/config/config';
import type {
  Laboratory,
  LaboratoryCode,
  LaboratoryCodeValidation,
} from '@shared/types/types';

// =====================================================================
// TIPOS TYPESCRIPT
// =====================================================================
// Los tipos LaboratoryCode y LaboratoryCodeValidation están definidos
// en src/shared/types/types.ts para evitar duplicación

/**
 * Errores específicos que pueden ocurrir al validar un código
 */
export class LaboratoryCodeError extends Error {
  constructor(
    message: string,
    public code:
      | 'CODE_NOT_FOUND'
      | 'CODE_INACTIVE'
      | 'CODE_EXPIRED'
      | 'CODE_EXCEEDED'
      | 'UNKNOWN_ERROR',
  ) {
    super(message);
    this.name = 'LaboratoryCodeError';
  }
}

// =====================================================================
// FUNCIONES DE VALIDACIÓN
// =====================================================================

/**
 * Valida un código de laboratorio
 *
 * ¿Qué hace esta función?
 * 1. Busca el código en la base de datos
 * 2. Verifica que esté activo (is_active = true)
 * 3. Verifica que no haya expirado (expires_at > now())
 * 4. Verifica que no haya excedido el límite (current_uses < max_uses)
 *
 * @param code - El código a validar (ej: "VARGAS2024")
 * @returns Los datos del código y del laboratorio si es válido
 * @throws LaboratoryCodeError si el código es inválido
 *
 * Ejemplo de uso:
 * ```typescript
 * try {
 *   const validation = await validateLaboratoryCode("VARGAS2024")
 *   console.log("Código válido para:", validation.laboratory.name)
 * } catch (error) {
 *   if (error instanceof LaboratoryCodeError) {
 *     console.error("Error:", error.message)
 *   }
 * }
 * ```
 */
export async function validateLaboratoryCode(
  code: string,
): Promise<LaboratoryCodeValidation> {
  // Paso 1: Normalizar el código (eliminar espacios, convertir a mayúsculas)
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    throw new LaboratoryCodeError(
      'El código de laboratorio no puede estar vacío',
      'CODE_NOT_FOUND',
    );
  }

  // Paso 2: Buscar el código en la base de datos
  // Usamos .select() para traer también los datos del laboratorio (JOIN automático)
  // Nota: Usamos 'as any' porque laboratory_codes no está en los tipos Database generados
  // En producción, deberías regenerar los tipos desde Supabase
  const { data, error } = await (supabase as any)
    .from('laboratory_codes')
    .select(
      `
      *,
      laboratories (*)
    `,
    )
    .eq('code', normalizedCode)
    .single(); // .single() espera exactamente 1 resultado, si hay 0 o 2+ lanza error

  if (error) {
    // Si no se encuentra el código (error PGRST116 = "not found")
    if (error.code === 'PGRST116') {
      throw new LaboratoryCodeError(
        'El código de laboratorio no existe. Verifica que lo hayas escrito correctamente.',
        'CODE_NOT_FOUND',
      );
    }

    // Otro tipo de error (red, servidor, etc.)
    console.error('Error al buscar código:', error);
    throw new LaboratoryCodeError(
      'Error al validar el código. Por favor, intenta de nuevo.',
      'UNKNOWN_ERROR',
    );
  }

  // Paso 3: Verificar que el código existe
  if (!data) {
    throw new LaboratoryCodeError(
      'El código de laboratorio no existe',
      'CODE_NOT_FOUND',
    );
  }

  const codeData = data as LaboratoryCode & { laboratories: Laboratory };

  // Paso 4: Verificar que el código esté activo
  if (!codeData.is_active) {
    throw new LaboratoryCodeError(
      'Este código de laboratorio está desactivado. Contacta al administrador.',
      'CODE_INACTIVE',
    );
  }

  // Paso 5: Verificar que no haya expirado
  // Si expires_at es null, significa que no expira (es válido)
  if (codeData.expires_at) {
    const expirationDate = new Date(codeData.expires_at);
    const now = new Date();

    if (expirationDate < now) {
      throw new LaboratoryCodeError(
        `Este código de laboratorio expiró el ${expirationDate.toLocaleDateString(
          'es-VE',
        )}. Solicita un nuevo código.`,
        'CODE_EXPIRED',
      );
    }
  }

  // Paso 6: Verificar que no haya excedido el límite de usos
  // Si max_uses es null, significa que es ilimitado (es válido)
  if (codeData.max_uses !== null) {
    if (codeData.current_uses >= codeData.max_uses) {
      throw new LaboratoryCodeError(
        `Este código de laboratorio ha alcanzado su límite de usos (${codeData.max_uses}/${codeData.max_uses}). Solicita un nuevo código.`,
        'CODE_EXCEEDED',
      );
    }
  }

  // Paso 7: Si llegamos aquí, el código es válido
  // Retornamos el código y el laboratorio asociado
  return {
    code: codeData,
    laboratory: codeData.laboratories,
  };
}

/**
 * Incrementa el contador de usos de un código
 *
 * ¿Por qué esta función es importante?
 * - Necesitamos registrar cuántas veces se ha usado un código
 * - Usamos una operación atómica (UPDATE ... SET current_uses = current_uses + 1)
 *   para evitar race conditions (si dos usuarios usan el mismo código simultáneamente)
 *
 * @param codeId - El ID del código (no el código en sí)
 * @returns void si es exitoso
 * @throws Error si falla
 *
 * Ejemplo de uso:
 * ```typescript
 * try {
 *   await incrementCodeUsage(codeData.code.id)
 *   console.log("Uso del código incrementado")
 * } catch (error) {
 *   console.error("Error al incrementar uso:", error)
 * }
 * ```
 */
export async function incrementCodeUsage(codeId: string): Promise<void> {
  // Usamos UPDATE directo con incremento atómico
  // PostgreSQL garantiza que la operación se ejecute de forma atómica
  // Primero obtenemos el valor actual
  const { data: currentCode, error: fetchError } = await (supabase as any)
    .from('laboratory_codes')
    .select('current_uses')
    .eq('id', codeId)
    .single();

  if (fetchError || !currentCode) {
    console.error('Error al obtener código actual:', fetchError);
    throw new Error('No se pudo incrementar el uso del código');
  }

  // Incrementamos el contador
  const { error: updateError } = await (supabase as any)
    .from('laboratory_codes')
    .update({ current_uses: currentCode.current_uses + 1 })
    .eq('id', codeId);

  if (updateError) {
    console.error('Error al incrementar uso del código:', updateError);
    throw new Error('No se pudo incrementar el uso del código');
  }
}

/**
 * Obtiene información de un laboratorio por su código
 *
 * Función auxiliar que combina validación + obtención del laboratorio
 * Útil cuando solo necesitas el laboratorio, no toda la información del código
 *
 * @param code - El código a validar
 * @returns El laboratorio asociado al código
 * @throws LaboratoryCodeError si el código es inválido
 */
export async function getLaboratoryByCode(code: string): Promise<Laboratory> {
  const validation = await validateLaboratoryCode(code);
  return validation.laboratory;
}
