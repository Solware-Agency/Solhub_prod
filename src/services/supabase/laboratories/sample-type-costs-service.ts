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

export interface CreateSampleTypeCostParams {
	code: string
	name: string
	price_taquilla: number
	/** Si true, price_convenios y price_descuento quedan null (solo taquilla). */
	only_taquilla?: boolean
	/** Porcentaje de descuento para precio convenios (ej. 5 = 5%). Por defecto 5. */
	convenioDiscountPercent?: number
	/** Porcentaje de descuento para precio descuento (ej. 10 = 10%). Por defecto 10. */
	descuentoDiscountPercent?: number
}

export interface CreateSampleTypeCostResult {
	success: boolean
	data?: SampleTypeCost
	error?: string
}

export interface DeleteSampleTypeCostResult {
	success: boolean
	error?: string
}

/**
 * Elimina un tipo de muestra del laboratorio.
 */
export async function deleteSampleTypeCost(
	laboratoryId: string,
	code: string
): Promise<DeleteSampleTypeCostResult> {
	try {
		const { error } = await supabase
			.from('sample_type_costs')
			.delete()
			.eq('laboratory_id', laboratoryId)
			.eq('code', code)

		if (error) {
			console.error('Error deleting sample type cost:', error)
			return { success: false, error: error.message }
		}

		return { success: true }
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Error desconocido'
		console.error('deleteSampleTypeCost:', message)
		return { success: false, error: message }
	}
}

/**
 * Crea un nuevo tipo de muestra con sus costos para el laboratorio.
 */
export async function createSampleTypeCost(
	laboratoryId: string,
	params: CreateSampleTypeCostParams
): Promise<CreateSampleTypeCostResult> {
	try {
		const convenioPct = params.convenioDiscountPercent ?? 5
		const descuentoPct = params.descuentoDiscountPercent ?? 10
		const factorConvenios = (100 - convenioPct) / 100
		const factorDescuento = (100 - descuentoPct) / 100
		const priceConvenios = params.only_taquilla
			? null
			: Number((params.price_taquilla * factorConvenios).toFixed(2))
		const priceDescuento = params.only_taquilla
			? null
			: Number((params.price_taquilla * factorDescuento).toFixed(2))

		const { data, error } = await supabase
			.from('sample_type_costs')
			.insert({
				laboratory_id: laboratoryId,
				code: params.code.trim(),
				name: params.name.trim(),
				price_taquilla: params.price_taquilla,
				price_convenios: priceConvenios,
				price_descuento: priceDescuento,
			})
			.select()
			.single()

		if (error) {
			console.error('Error creating sample type cost:', error)
			return { success: false, error: error.message }
		}

		return { success: true, data: data as SampleTypeCost }
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Error desconocido'
		console.error('createSampleTypeCost:', message)
		return { success: false, error: message }
	}
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
