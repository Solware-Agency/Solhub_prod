import { supabase } from '@services/supabase/config/config'
import { getUserLaboratoryId } from './aseguradoras-utils'

const getDateOnly = (value?: string | null) => (value ? new Date(`${value}T00:00:00`) : null)

const isPastDue = (value?: string | null, today = new Date()) => {
	const date = getDateOnly(value)
	if (!date) return false
	const todayStart = new Date(today)
	todayStart.setHours(0, 0, 0, 0)
	return date < todayStart
}

const shouldMarkEnMora = (poliza: Poliza, today = new Date()) => {
	const dueDate = poliza.fecha_prox_vencimiento || poliza.fecha_vencimiento
	if (!dueDate) return false
	if (poliza.estatus_pago === 'Pagado' || poliza.estatus_pago === 'En mora') return false
	return isPastDue(dueDate, today)
}

export interface Poliza {
	id: string
	codigo: string | null
	laboratory_id: string
	asegurado_id: string
	aseguradora_id: string
	agente_nombre: string
	codigo_legacy: string | null
	numero_poliza: string
	ramo: string
	suma_asegurada: number | null
	modalidad_pago: 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual'
	estatus_poliza: 'Activa' | 'En emisión' | 'Renovación pendiente' | 'Vencida'
	estatus_pago: 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora' | null
	estatus: 'activa' | 'por_vencer' | 'vencida' | null
	fecha_inicio: string
	fecha_vencimiento: string
	dia_vencimiento: number | null
	fecha_prox_vencimiento: string | null
	dias_prox_vencimiento: number | null
	tipo_alerta: string | null
	dias_alerta: number | null
	dias_frecuencia: number | null
	dias_frecuencia_post: number | null
	dias_recordatorio: number | null
	alert_30_enviada: boolean
	alert_14_enviada: boolean
	alert_7_enviada: boolean
	alert_dia_enviada: boolean
	alert_post_enviada: boolean
	ultima_alerta: string | null
	alert_type_ultima: string | null
	alert_cycle_id: string | null
	fecha_pago_ultimo: string | null
	fecha_pago_ultimo_backup: string | null
	pdf_url: string | null
	notas: string | null
	activo: boolean
	created_at: string | null
	updated_at: string | null
	asegurado?: { id: string; full_name: string; document_id: string } | null
	aseguradora?: { id: string; nombre: string } | null
}

export interface PolizaInsert {
	asegurado_id: string
	aseguradora_id: string
	agente_nombre: string
	codigo_legacy?: string | null
	numero_poliza: string
	ramo: string
	suma_asegurada?: number | null
	modalidad_pago: 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual'
	estatus_poliza: 'Activa' | 'En emisión' | 'Renovación pendiente' | 'Vencida'
	estatus_pago?: 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora' | null
	estatus?: 'activa' | 'por_vencer' | 'vencida' | null
	fecha_inicio: string
	fecha_vencimiento: string
	dia_vencimiento?: number | null
	fecha_prox_vencimiento?: string | null
	dias_prox_vencimiento?: number | null
	tipo_alerta?: string | null
	dias_alerta?: number | null
	dias_frecuencia?: number | null
	dias_frecuencia_post?: number | null
	dias_recordatorio?: number | null
	pdf_url?: string | null
	notas?: string | null
}

export interface PolizaUpdate extends Partial<PolizaInsert> {
	activo?: boolean
}

export const getPolizas = async (
	page = 1,
	limit = 50,
	searchTerm?: string,
	sortField: 'fecha_vencimiento' | 'numero_poliza' | 'created_at' = 'created_at',
	sortDirection: 'asc' | 'desc' = 'desc',
) => {
	const laboratoryId = await getUserLaboratoryId()

	let query = supabase
		.from('polizas')
		.select(
			'*, asegurado:asegurados(id, full_name, document_id), aseguradora:aseguradoras(id, nombre)',
			{ count: 'exact' },
		)
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)

	if (searchTerm) {
		query = query.or(
			`numero_poliza.ilike.%${searchTerm}%,ramo.ilike.%${searchTerm}%`,
		)
	}

	query = query.order(sortField, { ascending: sortDirection === 'asc' })

	const from = (page - 1) * limit
	const to = from + limit - 1
	const { data, error, count } = await query.range(from, to)

	if (error) throw error

	const today = new Date()
	const overdueIds = (data || [])
		.filter((row) => shouldMarkEnMora(row as Poliza, today))
		.map((row) => row.id)

	if (overdueIds.length > 0) {
		const { error: updateError } = await supabase
			.from('polizas')
			.update({ estatus_pago: 'En mora', updated_at: new Date().toISOString() })
			.in('id', overdueIds)
			.eq('laboratory_id', laboratoryId)

		if (updateError) {
			console.error('Error actualizando estatus_pago a En mora', updateError)
		}
	}

	const normalized = (data || []).map((row) =>
		overdueIds.includes(row.id)
			? {
					...row,
					estatus_pago: 'En mora',
				}
			: row,
	)

	return {
		data: normalized as Poliza[],
		count: count || 0,
		page,
		limit,
		totalPages: Math.ceil((count || 0) / limit),
	}
}

export const getPolizasByAseguradoId = async (aseguradoId: string): Promise<Poliza[]> => {
	const laboratoryId = await getUserLaboratoryId()

	const { data, error } = await supabase
		.from('polizas')
		.select('*, asegurado:asegurados(id, full_name, document_id), aseguradora:aseguradoras(id, nombre)')
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)
		.eq('asegurado_id', aseguradoId)
		.order('fecha_vencimiento', { ascending: true })

	if (error) throw error

	const today = new Date()
	const overdueIds = (data || [])
		.filter((row) => shouldMarkEnMora(row as Poliza, today))
		.map((row) => row.id)

	if (overdueIds.length > 0) {
		await supabase
			.from('polizas')
			.update({ estatus_pago: 'En mora', updated_at: new Date().toISOString() })
			.in('id', overdueIds)
			.eq('laboratory_id', laboratoryId)
	}

	const normalized = (data || []).map((row) =>
		overdueIds.includes(row.id) ? { ...row, estatus_pago: 'En mora' } : row,
	)

	return normalized as Poliza[]
}

export const getPolizasByAseguradoraId = async (aseguradoraId: string): Promise<Poliza[]> => {
	const laboratoryId = await getUserLaboratoryId()

	const { data, error } = await supabase
		.from('polizas')
		.select('*, asegurado:asegurados(id, full_name, document_id), aseguradora:aseguradoras(id, nombre)')
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)
		.eq('aseguradora_id', aseguradoraId)
		.order('fecha_vencimiento', { ascending: true })

	if (error) throw error

	const today = new Date()
	const overdueIds = (data || [])
		.filter((row) => shouldMarkEnMora(row as Poliza, today))
		.map((row) => row.id)

	if (overdueIds.length > 0) {
		await supabase
			.from('polizas')
			.update({ estatus_pago: 'En mora', updated_at: new Date().toISOString() })
			.in('id', overdueIds)
			.eq('laboratory_id', laboratoryId)
	}

	const normalized = (data || []).map((row) =>
		overdueIds.includes(row.id) ? { ...row, estatus_pago: 'En mora' } : row,
	)

	return normalized as Poliza[]
}

/** Estado para filtrar pólizas por fecha de próximo vencimiento */
export type PolizaEstadoFilter = 'vigentes' | 'por_vencer' | 'vencidas'

export const getPolizasByEstado = async (estado: PolizaEstadoFilter): Promise<Poliza[]> => {
	const laboratoryId = await getUserLaboratoryId()
	const today = new Date()
	const todayStr = today.toISOString().slice(0, 10)
	const in30Days = new Date(today)
	in30Days.setDate(in30Days.getDate() + 30)
	const in30DaysStr = in30Days.toISOString().slice(0, 10)

	let query = supabase
		.from('polizas')
		.select('*, asegurado:asegurados(id, full_name, document_id), aseguradora:aseguradoras(id, nombre)')
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)
		.order('fecha_prox_vencimiento', { ascending: true })

	if (estado === 'vencidas') {
		query = query.lt('fecha_prox_vencimiento', todayStr)
	} else if (estado === 'por_vencer') {
		query = query.gte('fecha_prox_vencimiento', todayStr).lte('fecha_prox_vencimiento', in30DaysStr)
	} else {
		// vigentes = después de 30 días
		query = query.gt('fecha_prox_vencimiento', in30DaysStr)
	}

	const { data, error } = await query
	if (error) throw error
	const list = (data || []) as Poliza[]
	const todayObj = new Date()
	const overdueIds = list.filter((row) => shouldMarkEnMora(row, todayObj)).map((row) => row.id)
	if (overdueIds.length > 0) {
		await supabase
			.from('polizas')
			.update({ estatus_pago: 'En mora', updated_at: new Date().toISOString() })
			.in('id', overdueIds)
			.eq('laboratory_id', laboratoryId)
	}
	return list.map((row) => (overdueIds.includes(row.id) ? { ...row, estatus_pago: 'En mora' as const } : row))
}

export const getPolizaById = async (id: string): Promise<Poliza | null> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('polizas')
		.select('*, asegurado:asegurados(id, full_name, document_id), aseguradora:aseguradoras(id, nombre)')
		.eq('id', id)
		.eq('laboratory_id', laboratoryId)
		.single()

	if (error) {
		if (error.code === 'PGRST116') return null
		throw error
	}

	const poliza = data as Poliza
	if (shouldMarkEnMora(poliza)) {
		const { error: updateError } = await supabase
			.from('polizas')
			.update({ estatus_pago: 'En mora', updated_at: new Date().toISOString() })
			.eq('id', poliza.id)
			.eq('laboratory_id', laboratoryId)

		if (updateError) {
			console.error('Error actualizando estatus_pago a En mora', updateError)
		} else {
			poliza.estatus_pago = 'En mora'
		}
	}

	return poliza
}

export const createPoliza = async (payload: PolizaInsert): Promise<Poliza> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('polizas')
		.insert({
			...payload,
			laboratory_id: laboratoryId,
			alert_30_enviada: false,
			alert_14_enviada: false,
			alert_7_enviada: false,
			alert_dia_enviada: false,
			alert_post_enviada: false,
		})
		.select('*')
		.single()

	if (error) throw error
	return data as Poliza
}

export const updatePoliza = async (id: string, payload: PolizaUpdate): Promise<Poliza> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('polizas')
		.update({ ...payload, updated_at: new Date().toISOString() })
		.eq('id', id)
		.eq('laboratory_id', laboratoryId)
		.select('*')
		.single()

	if (error) throw error
	return data as Poliza
}

/** Soft delete: marca póliza como inactiva; deja de mostrarse en listados pero se conserva en BD */
export const deactivatePoliza = async (id: string): Promise<Poliza> => {
	return updatePoliza(id, { activo: false })
}

export const deletePoliza = async (id: string) => {
	const laboratoryId = await getUserLaboratoryId()
	const { error } = await supabase.from('polizas').delete().eq('id', id).eq('laboratory_id', laboratoryId)
	if (error) throw error
	return { deleted: true }
}
