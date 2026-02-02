// =====================================================================
// SERVICIO DE ESTRUCTURA DE COSTOS POR TIPO DE MUESTRA (Marihorgen)
// =====================================================================
// getSampleTypeCostsByLaboratory, updateSampleTypeCost

import { supabase } from '@/services/supabase/config/config'

export interface SampleTypeCost {
	id: string
	laboratory_id: string
	code: string
	name: string
	price_taquilla: number
	price_convenios: number | null
	price_descuento: number | null
	created_at?: string
	updated_at?: string
}

export interface GetSampleTypeCostsResult {
	success: boolean
	data?: SampleTypeCost[]
	error?: string
}

export interface UpdateSampleTypeCostParams {
	price_taquilla?: number
	price_convenios?: number | null
	price_descuento?: number | null
}

export interface UpdateSampleTypeCostResult {
	success: boolean
	data?: SampleTypeCost
	error?: string
}

/**
 * Obtiene la lista de costos por tipo de muestra para un laboratorio (ordenada por código).
 */
export async function getSampleTypeCostsByLaboratory(
	laboratoryId: string
): Promise<GetSampleTypeCostsResult> {
	try {
		const { data, error } = await supabase
			.from('sample_type_costs')
			.select('id, laboratory_id, code, name, price_taquilla, price_convenios, price_descuento, created_at, updated_at')
			.eq('laboratory_id', laboratoryId)
			.order('code', { ascending: true })

		if (error) {
			console.error('Error fetching sample type costs:', error)
			return { success: false, error: error.message }
		}

		return { success: true, data: (data ?? []) as SampleTypeCost[] }
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Error desconocido'
		console.error('getSampleTypeCostsByLaboratory:', message)
		return { success: false, error: message }
	}
}

/**
 * Actualiza solo los montos de un tipo de muestra (para la vista de edición).
 */
export async function updateSampleTypeCost(
	laboratoryId: string,
	code: string,
	params: UpdateSampleTypeCostParams
): Promise<UpdateSampleTypeCostResult> {
	try {
		const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
		if (params.price_taquilla !== undefined) updates.price_taquilla = params.price_taquilla
		if (params.price_convenios !== undefined) updates.price_convenios = params.price_convenios
		if (params.price_descuento !== undefined) updates.price_descuento = params.price_descuento

		const { data, error } = await supabase
			.from('sample_type_costs')
			.update(updates)
			.eq('laboratory_id', laboratoryId)
			.eq('code', code)
			.select()
			.single()

		if (error) {
			console.error('Error updating sample type cost:', error)
			return { success: false, error: error.message }
		}

		return { success: true, data: data as SampleTypeCost }
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Error desconocido'
		console.error('updateSampleTypeCost:', message)
		return { success: false, error: message }
	}
}
