import { supabase } from '@services/supabase/config/config'
import { getUserLaboratoryId } from './aseguradoras-utils'

export interface PagoPoliza {
	id: string
	laboratory_id: string
	poliza_id: string
	fecha_pago: string
	monto: number
	metodo_pago: string | null
	banco: string | null
	referencia: string | null
	documento_pago_url: string | null
	notas: string | null
	created_at: string | null
	updated_at: string | null
}

export interface PagoPolizaInsert {
	poliza_id: string
	fecha_pago: string
	monto: number
	metodo_pago?: string | null
	banco?: string | null
	referencia?: string | null
	documento_pago_url?: string | null
	notas?: string | null
}

export const getPagosByPoliza = async (polizaId: string): Promise<PagoPoliza[]> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('pagos_poliza')
		.select('*')
		.eq('poliza_id', polizaId)
		.eq('laboratory_id', laboratoryId)
		.order('fecha_pago', { ascending: false })

	if (error) throw error
	return (data || []) as PagoPoliza[]
}

/** Pagos en un mes dado (año y mes 1-12) */
export const getPagosByMonth = async (year: number, month: number): Promise<(PagoPoliza & { poliza?: { id: string; numero_poliza: string } })[]> => {
	const laboratoryId = await getUserLaboratoryId()
	const start = new Date(year, month - 1, 1)
	const end = new Date(year, month, 0)
	const startStr = start.toISOString().slice(0, 10)
	const endStr = end.toISOString().slice(0, 10)

	const { data, error } = await supabase
		.from('pagos_poliza')
		.select('*, poliza:polizas(id, numero_poliza)')
		.eq('laboratory_id', laboratoryId)
		.gte('fecha_pago', startStr)
		.lte('fecha_pago', endStr)
		.order('fecha_pago', { ascending: false })

	if (error) throw error
	return (data || []) as (PagoPoliza & { poliza?: { id: string; numero_poliza: string } })[]
}

export const getPagosPoliza = async (page = 1, limit = 50) => {
	const laboratoryId = await getUserLaboratoryId()
	const from = (page - 1) * limit
	const to = from + limit - 1

	const { data, error, count } = await supabase
		.from('pagos_poliza')
		.select('*, poliza:polizas(id, numero_poliza)', { count: 'exact' })
		.eq('laboratory_id', laboratoryId)
		.order('fecha_pago', { ascending: false })
		.range(from, to)

	if (error) throw error
	return {
		data: (data || []) as (PagoPoliza & { poliza?: { id: string; numero_poliza: string } })[],
		count: count || 0,
		page,
		limit,
		totalPages: Math.ceil((count || 0) / limit),
	}
}

export const createPagoPoliza = async (payload: PagoPolizaInsert): Promise<PagoPoliza> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('pagos_poliza')
		.insert({ ...payload, laboratory_id: laboratoryId })
		.select('*')
		.single()

	if (error) throw error
	return data as PagoPoliza
}
