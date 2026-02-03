// =====================================================================
// SERVICIO DE LABORATORIOS - Actualización de config (owner)
// =====================================================================

import { supabase } from '@/services/supabase/config/config'
import type { LaboratoryConfig } from '@shared/types/types'

export interface UpdateLaboratoryConfigParams {
	convenioDiscountPercent?: number
	descuentoDiscountPercent?: number
	[key: string]: unknown
}

export interface UpdateLaboratoryConfigResult {
	success: boolean
	error?: string
}

/**
 * Actualiza parcialmente el config del laboratorio (ej. porcentajes de descuento).
 * Solo owners pueden actualizar (RLS).
 */
export async function updateLaboratoryConfig(
	laboratoryId: string,
	partialConfig: UpdateLaboratoryConfigParams
): Promise<UpdateLaboratoryConfigResult> {
	try {
		const { data: current, error: fetchError } = await supabase
			.from('laboratories' as never)
			.select('config')
			.eq('id', laboratoryId)
			.single()

		if (fetchError || !current) {
			console.error('Error fetching laboratory config:', fetchError)
			return { success: false, error: fetchError?.message ?? 'Laboratorio no encontrado' }
		}

		const currentConfig = (current.config ?? {}) as LaboratoryConfig & Record<string, unknown>
		const mergedConfig = { ...currentConfig, ...partialConfig }

		const { error: updateError } = await supabase
			.from('laboratories' as never)
			.update({ config: mergedConfig, updated_at: new Date().toISOString() })
			.eq('id', laboratoryId)

		if (updateError) {
			console.error('Error updating laboratory config:', updateError)
			return { success: false, error: updateError.message }
		}

		return { success: true }
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Error desconocido'
		console.error('updateLaboratoryConfig:', message)
		return { success: false, error: message }
	}
}
