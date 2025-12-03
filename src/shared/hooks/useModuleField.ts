import { useModuleConfig } from './useModuleConfig'
import type { ModuleFieldConfig } from '@/shared/types/types'

/**
 * Hook para obtener la configuración de un campo específico dentro de un módulo
 * @param moduleName - Nombre del módulo (ej: 'registrationForm')
 * @param fieldName - Nombre del campo (ej: 'cedula', 'email', 'telefono')
 * @returns Configuración del campo (enabled, required) o null si no existe
 * 
 * @example
 * ```tsx
 * const emailConfig = useModuleField('registrationForm', 'email')
 * 
 * // Renderizar campo solo si está habilitado
 * {emailConfig?.enabled && (
 *   <input
 *     name="email"
 *     required={emailConfig.required}
 *   />
 * )}
 * ```
 */
export function useModuleField(
  moduleName: string,
  fieldName: string
): ModuleFieldConfig | null {
  const moduleConfig = useModuleConfig(moduleName)
  
  if (!moduleConfig?.fields?.[fieldName]) {
    return null
  }
  
  return moduleConfig.fields[fieldName]
}

