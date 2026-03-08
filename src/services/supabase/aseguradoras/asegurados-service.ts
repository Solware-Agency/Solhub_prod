import { supabase } from '@services/supabase/config/config'
import { getUserLaboratoryId } from './aseguradoras-utils'

const MAX_ATTACHMENTS = 3

function normalizeAttachments(val: unknown): AseguradoAttachment[] {
	if (!Array.isArray(val)) return []
	const out: AseguradoAttachment[] = []
	for (const item of val.slice(0, MAX_ATTACHMENTS)) {
		if (item && typeof item === 'object' && typeof (item as any).url === 'string') {
			out.push({
				url: (item as any).url,
				name: typeof (item as any).name === 'string' ? (item as any).name : 'Archivo',
			})
		}
	}
	return out
}

/** Un adjunto del asegurado: URL pública y nombre para mostrar (máx. 3 por asegurado) */
export interface AseguradoAttachment {
	url: string
	name: string
}

export interface Asegurado {
	id: string
	codigo: string | null
	laboratory_id: string
	full_name: string
	document_id: string
	phone: string
	email: string | null
	fecha_nacimiento: string | null
	address: string | null
	notes: string | null
	tipo_asegurado: 'Persona natural' | 'Persona jurídica'
	activo: boolean
	attachments: AseguradoAttachment[]
	created_at: string | null
	updated_at: string | null
}

export interface AseguradoInsert {
	full_name: string
	document_id: string
	phone: string
	email?: string | null
	fecha_nacimiento?: string | null
	address?: string | null
	notes?: string | null
	tipo_asegurado: 'Persona natural' | 'Persona jurídica'
	attachments?: AseguradoAttachment[]
}

export interface AseguradoUpdate {
	full_name?: string
	document_id?: string
	phone?: string
	email?: string | null
	fecha_nacimiento?: string | null
	address?: string | null
	notes?: string | null
	tipo_asegurado?: 'Persona natural' | 'Persona jurídica'
	activo?: boolean
	attachments?: AseguradoAttachment[]
}

export const getAsegurados = async (
	page = 1,
	limit = 50,
	searchTerm?: string,
	sortField: 'full_name' | 'document_id' | 'phone' | 'email' | 'created_at' = 'created_at',
	sortDirection: 'asc' | 'desc' = 'desc',
) => {
	const laboratoryId = await getUserLaboratoryId()

	let query = supabase
		.from('asegurados')
		.select('*', { count: 'exact' })
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)

	if (searchTerm) {
		query = query.or(
			`full_name.ilike.%${searchTerm}%,document_id.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
		)
	}

	query = query.order(sortField, { ascending: sortDirection === 'asc' })

	const from = (page - 1) * limit
	const to = from + limit - 1
	const { data, error, count } = await query.range(from, to)

	if (error) {
		throw error
	}

	const normalized = (data || []).map((row) => ({
		...row,
		attachments: normalizeAttachments(row.attachments),
	}))
	return {
		data: normalized as Asegurado[],
		count: count || 0,
		page,
		limit,
		totalPages: Math.ceil((count || 0) / limit),
	}
}

export const findAseguradoById = async (id: string): Promise<Asegurado | null> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('asegurados')
		.select('*')
		.eq('id', id)
		.eq('laboratory_id', laboratoryId)
		.single()

	if (error) {
		if (error.code === 'PGRST116') return null
		throw error
	}

	return { ...data, attachments: normalizeAttachments((data as any).attachments) } as Asegurado
}

export const getAseguradosByIds = async (ids: string[]): Promise<Asegurado[]> => {
	if (ids.length === 0) return []
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('asegurados')
		.select('*')
		.eq('laboratory_id', laboratoryId)
		.in('id', ids)
		.order('full_name')

	if (error) throw error
	const normalized = (data || []).map((row) => ({
		...row,
		attachments: normalizeAttachments(row.attachments),
	}))
	return normalized as Asegurado[]
}

export const findAseguradoByDocumentId = async (documentId: string): Promise<Asegurado | null> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('asegurados')
		.select('*')
		.eq('document_id', documentId)
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)
		.single()

	if (error) {
		if (error.code === 'PGRST116') return null
		throw error
	}

	return { ...data, attachments: normalizeAttachments((data as any).attachments) } as Asegurado
}

export const searchAsegurados = async (searchTerm: string, limit = 10): Promise<Asegurado[]> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('asegurados')
		.select('id, full_name, document_id, phone, email, tipo_asegurado')
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)
		.or(`full_name.ilike.%${searchTerm}%,document_id.ilike.%${searchTerm}%`)
		.limit(limit)
		.order('full_name')

	if (error) throw error
	return (data || []) as Asegurado[]
}

export const createAsegurado = async (payload: AseguradoInsert): Promise<Asegurado> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('asegurados')
		.insert({ ...payload, laboratory_id: laboratoryId })
		.select('*')
		.single()

	if (error) {
		throw error
	}

	return { ...data, attachments: normalizeAttachments((data as any).attachments) } as Asegurado
}

export const updateAsegurado = async (id: string, payload: AseguradoUpdate): Promise<Asegurado> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('asegurados')
		.update({ ...payload, updated_at: new Date().toISOString() })
		.eq('id', id)
		.eq('laboratory_id', laboratoryId)
		.select('*')
		.single()

	if (error) throw error
	return { ...data, attachments: normalizeAttachments((data as any).attachments) } as Asegurado
}

/** Soft delete: marca asegurado como inactivo; deja de mostrarse en listados pero se conserva en BD */
export const deactivateAsegurado = async (id: string): Promise<Asegurado> => {
	return updateAsegurado(id, { activo: false })
}

export const deleteAsegurado = async (id: string) => {
	const laboratoryId = await getUserLaboratoryId()
	const { error } = await supabase.from('asegurados').delete().eq('id', id).eq('laboratory_id', laboratoryId)
	if (error) throw error
	return { deleted: true }
}
