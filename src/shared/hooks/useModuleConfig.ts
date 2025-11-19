import { useLaboratory } from '@/app/providers/LaboratoryContext'
import type { ModuleConfig } from '@/shared/types/types'

/**
 * Hook para obtener la configuración completa de un módulo
 * @param moduleName - Nombre del módulo (ej: 'registrationForm', 'chatAI')
 * @returns Configuración del módulo o null si no existe
 * 
 * @example
 * ```tsx
 * const chatConfig = useModuleConfig('chatAI')
 * const model = chatConfig?.settings?.model || 'gpt-3.5-turbo'
 * ```
 */
export function useModuleConfig(moduleName: string): ModuleConfig | null {
  const { laboratory } = useLaboratory()
  
  if (!laboratory) return null
  
  // Obtener configuración del módulo desde config.modules
  const moduleConfig = laboratory.config?.modules?.[moduleName]
  
  return moduleConfig || null
}

