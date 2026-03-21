import { supabase } from '@services/supabase/config/config'
import { getUserLaboratoryId } from './aseguradoras-utils'
import {
	buildChangeRows,
	insertAseguradorasChangeLog,
	logAseguradorasCreated,
} from './aseguradoras-change-log'

const MAX_DOCUMENTOS_POLIZA = 3

export interface DocumentoPoliza {
	url: string
	name: string
}

function normalizeDocumentosPoliza(row: Record<string, unknown>): DocumentoPoliza[] {
	const raw = row.documentos_poliza
	if (Array.isArray(raw) && raw.length > 0) {
		const out: DocumentoPoliza[] = []
		for (const item of raw.slice(0, MAX_DOCUMENTOS_POLIZA)) {
			if (item && typeof item === 'object' && typeof (item as any).url === 'string') {
				out.push({
					url: (item as any).url,
					name: typeof (item as any).name === 'string' ? (item as any).name : 'Documento',
				})
			}
		}
		return out
	}
	const pdfUrl = row.pdf_url
	if (typeof pdfUrl === 'string' && pdfUrl.trim()) {
		return [{ url: pdfUrl.trim(), name: 'Documento póliza' }]
	}
	return []
}

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
	estatus_poliza: 'Activa' | 'Anulada' | 'En emisión' | 'Renovación pendiente' | 'Vencida'
	estatus_pago: 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora' | null
	estatus: 'activa' | 'por_vencer' | 'vencida' | null
	fecha_inicio: string
	fecha_vencimiento: string
	dia_vencimiento: number | null
	fecha_prox_vencimiento: string | null
	pdf_url: string | null
	documentos_poliza: DocumentoPoliza[]
	notas: string | null
	activo: boolean
	created_at: string | null
	updated_at: string | null
	/** Fecha de próximo pago (recordatorios y lógica de cobro). */
	next_payment_date?: string | null
	renewal_day_of_month?: number | null
	payment_frequency?: string | null
	billing_amount?: number | null
	/** current = al día; overdue = vencida. */
	payment_status?: 'current' | 'overdue' | null
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
	estatus_poliza: 'Activa' | 'Anulada' | 'En emisión' | 'Renovación pendiente' | 'Vencida'
	estatus_pago?: 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora' | null
	estatus?: 'activa' | 'por_vencer' | 'vencida' | null
	fecha_inicio: string
	fecha_vencimiento: string
	dia_vencimiento?: number | null
	fecha_prox_vencimiento?: string | null
	pdf_url?: string | null
	documentos_poliza?: DocumentoPoliza[]
	notas?: string | null
	/** Columnas de cobro/recordatorios (se rellenan desde el form). */
	next_payment_date?: string | null
	renewal_day_of_month?: number | null
	payment_frequency?: string | null
	billing_amount?: number | null
	payment_status?: 'current' | 'overdue' | null
}

export interface PolizaUpdate extends Partial<PolizaInsert> {
	activo?: boolean
	next_payment_date?: string | null
	renewal_day_of_month?: number | null
	payment_frequency?: string | null
	billing_amount?: number | null
	payment_status?: 'current' | 'overdue' | null
	fecha_prox_vencimiento?: string | null
	estatus_pago?: 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora' | null
}

/** Filtros de listado (página Pólizas). Cadenas vacías = sin filtrar ese criterio. */
export type PolizaActivoListFilter = 'all' | 'activas' | 'inactivas'

export interface PolizaListFilters {
	activo: PolizaActivoListFilter
	estatus_poliza: string
	estatus_pago: string
	modalidad_pago: string
	ramo: string
	aseguradora_id: string
}

export const defaultPolizaListFilters = (): PolizaListFilters => ({
	activo: 'activas',
	estatus_poliza: '',
	estatus_pago: '',
	modalidad_pago: '',
	ramo: '',
	aseguradora_id: '',
})

/** Cuántos criterios difieren del listado por defecto (solo activas, resto sin filtrar). */
export const countActivePolizaListFilters = (f: PolizaListFilters): number => {
	const d = defaultPolizaListFilters()
	let n = 0
	if (f.activo !== d.activo) n++
	if ((f.estatus_poliza || '') !== '') n++
	if ((f.estatus_pago || '') !== '') n++
	if ((f.modalidad_pago || '') !== '') n++
	if ((f.ramo || '') !== '') n++
	if ((f.aseguradora_id || '') !== '') n++
	return n
}

/** RPC: devuelve la nueva next_payment_date al marcar como pagado (actual + 1 período). Opción A: llamar N veces para N periodos. */
export const getNextPaymentDateOnMarkPaidPoliza = async (polizaId: string): Promise<string | null> => {
	const { data, error } = await supabase.rpc('get_next_payment_date_on_mark_paid_poliza', {
		p_poliza_id: polizaId,
	})
	if (error) throw error
	const row = Array.isArray(data) && data.length > 0 ? data[0] : null
	const date = row?.next_payment_date
	return date ? String(date).slice(0, 10) : null
}

export const getPolizas = async (
	page = 1,
	limit = 50,
	searchTerm?: string,
	sortField: 'fecha_vencimiento' | 'numero_poliza' | 'created_at' | 'next_payment_date' = 'created_at',
	sortDirection: 'asc' | 'desc' = 'desc',
	filters?: PolizaListFilters,
) => {
	const laboratoryId = await getUserLaboratoryId()
	const f = filters ?? defaultPolizaListFilters()

	let query = supabase
		.from('polizas')
		.select(
			'*, asegurado:asegurados(id, full_name, document_id), aseguradora:aseguradoras(id, nombre)',
			{ count: 'exact' },
		)
		.eq('laboratory_id', laboratoryId)

	if (f.activo === 'activas') {
		query = query.eq('activo', true)
	} else if (f.activo === 'inactivas') {
		query = query.eq('activo', false)
	}

	if (f.estatus_poliza.trim()) {
		query = query.eq('estatus_poliza', f.estatus_poliza.trim())
	}

	if (f.estatus_pago === 'Pendiente') {
		query = query.or('estatus_pago.is.null,estatus_pago.eq.Pendiente')
	} else if (f.estatus_pago.trim()) {
		query = query.eq('estatus_pago', f.estatus_pago.trim())
	}

	if (f.modalidad_pago.trim()) {
		query = query.eq('modalidad_pago', f.modalidad_pago.trim() as Poliza['modalidad_pago'])
	}

	if (f.ramo.trim()) {
		query = query.eq('ramo', f.ramo.trim())
	}

	if (f.aseguradora_id.trim()) {
		query = query.eq('aseguradora_id', f.aseguradora_id.trim())
	}

	const trimmedSearch = searchTerm?.trim()
	if (trimmedSearch) {
		const escaped = trimmedSearch.replace(/[%_\\]/g, '\\$&')
		const [asegRes, aseguradoraRes] = await Promise.all([
			supabase
				.from('asegurados')
				.select('id')
				.eq('laboratory_id', laboratoryId)
				.or(`full_name.ilike.%${escaped}%,document_id.ilike.%${escaped}%`)
				.limit(400),
			supabase
				.from('aseguradoras')
				.select('id')
				.eq('laboratory_id', laboratoryId)
				.ilike('nombre', `%${escaped}%`)
				.limit(400),
		])
		if (asegRes.error) console.error('Búsqueda pólizas (asegurados):', asegRes.error)
		if (aseguradoraRes.error) console.error('Búsqueda pólizas (aseguradoras):', aseguradoraRes.error)

		const aseguradoIds = [...new Set((asegRes.data ?? []).map((r) => r.id))]
		const aseguradoraIds = [...new Set((aseguradoraRes.data ?? []).map((r) => r.id))]

		const orParts = [`numero_poliza.ilike.%${escaped}%`, `ramo.ilike.%${escaped}%`]
		if (aseguradoIds.length > 0) {
			orParts.push(`asegurado_id.in.(${aseguradoIds.join(',')})`)
		}
		if (aseguradoraIds.length > 0) {
			orParts.push(`aseguradora_id.in.(${aseguradoraIds.join(',')})`)
		}
		query = query.or(orParts.join(','))
	}

	const orderOpts = sortField === 'next_payment_date'
		? { ascending: sortDirection === 'asc', nullsFirst: false }
		: { ascending: sortDirection === 'asc' }
	query = query.order(sortField, orderOpts)

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

	const normalized = (data || []).map((row) => {
		const base = overdueIds.includes(row.id) ? { ...row, estatus_pago: 'En mora' } : row
		return { ...base, documentos_poliza: normalizeDocumentosPoliza(base as Record<string, unknown>) }
	})

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

	const normalized = (data || []).map((row) => {
		const base = overdueIds.includes(row.id) ? { ...row, estatus_pago: 'En mora' } : row
		return { ...base, documentos_poliza: normalizeDocumentosPoliza(base as Record<string, unknown>) }
	})
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

	const normalized = (data || []).map((row) => {
		const base = overdueIds.includes(row.id) ? { ...row, estatus_pago: 'En mora' } : row
		return { ...base, documentos_poliza: normalizeDocumentosPoliza(base as Record<string, unknown>) }
	})
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
	return list.map((row) => {
		const base = overdueIds.includes(row.id) ? { ...row, estatus_pago: 'En mora' as const } : row
		return { ...base, documentos_poliza: normalizeDocumentosPoliza(base as Record<string, unknown>) }
	})
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

	return { ...poliza, documentos_poliza: normalizeDocumentosPoliza(poliza as Record<string, unknown>) } as Poliza
}

const POLIZA_FIELD_LABELS: Record<string, string> = {
	numero_poliza: 'Número de póliza',
	ramo: 'Ramo',
	suma_asegurada: 'Suma asegurada',
	modalidad_pago: 'Modalidad de pago',
	estatus_poliza: 'Estatus póliza',
	estatus_pago: 'Estatus de pago',
	fecha_inicio: 'Fecha inicio',
	fecha_vencimiento: 'Fecha vencimiento',
	fecha_prox_vencimiento: 'Próximo vencimiento',
	agente_nombre: 'Agente',
	notas: 'Notas',
}

export const createPoliza = async (payload: PolizaInsert): Promise<Poliza> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('polizas')
		.insert({
			...payload,
			laboratory_id: laboratoryId,
		})
		.select('*')
		.single()

	if (error) throw error
	const poliza = { ...data, documentos_poliza: normalizeDocumentosPoliza(data as Record<string, unknown>) } as Poliza
	await logAseguradorasCreated('poliza', poliza.id, laboratoryId, `Póliza creada: ${poliza.numero_poliza}`)
	return poliza
}

export const updatePoliza = async (id: string, payload: PolizaUpdate): Promise<Poliza> => {
	const laboratoryId = await getUserLaboratoryId()
	const oldPoliza = await getPolizaById(id)
	const { data, error } = await supabase
		.from('polizas')
		.update({ ...payload, updated_at: new Date().toISOString() })
		.eq('id', id)
		.eq('laboratory_id', laboratoryId)
		.select('*')
		.single()

	if (error) throw error
	const poliza = { ...data, documentos_poliza: normalizeDocumentosPoliza(data as Record<string, unknown>) } as Poliza
	if (oldPoliza) {
		const changes = buildChangeRows(
			oldPoliza as unknown as Record<string, unknown>,
			payload as Record<string, unknown>,
			POLIZA_FIELD_LABELS,
		)
		await insertAseguradorasChangeLog('poliza', id, laboratoryId, changes)
	}
	return poliza
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
