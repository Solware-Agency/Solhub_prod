import { supabase } from '@services/supabase/config/config'
import { getUserLaboratoryId } from './aseguradoras-utils'
import {
	buildChangeRows,
	insertAseguradorasChangeLog,
	logAseguradorasCreated,
} from './aseguradoras-change-log'

export interface Aseguradora {
	id: string
	codigo: string | null
	laboratory_id: string
	nombre: string
	codigo_interno: string | null
	rif: string | null
	telefono: string | null
	email: string | null
	web: string | null
	direccion: string | null
	activo: boolean
	created_at: string | null
	updated_at: string | null
}

export interface AseguradoraInsert {
	nombre: string
	codigo_interno?: string | null
	rif?: string | null
	telefono?: string | null
	email?: string | null
	web?: string | null
	direccion?: string | null
	activo?: boolean
}

export type AseguradoraUpdate = AseguradoraInsert

export type AseguradoraActivoListFilter = 'all' | 'activas' | 'inactivas'

export interface AseguradoraListFilters {
	activo: AseguradoraActivoListFilter
}

export const defaultAseguradoraListFilters = (): AseguradoraListFilters => ({
	activo: 'activas',
})

/** Cuántos criterios difieren del listado por defecto (solo activas). */
export const countActiveAseguradoraListFilters = (f: AseguradoraListFilters): number => {
	const d = defaultAseguradoraListFilters()
	let n = 0
	if (f.activo !== d.activo) n++
	return n
}

export const getAseguradoras = async (filters?: AseguradoraListFilters) => {
	const laboratoryId = await getUserLaboratoryId()
	const f = filters ?? defaultAseguradoraListFilters()
	
	let query = supabase
		.from('aseguradoras')
		.select('*')
		.eq('laboratory_id', laboratoryId)

	if (f.activo === 'activas') {
		query = query.eq('activo', true)
	} else if (f.activo === 'inactivas') {
		query = query.eq('activo', false)
	}
	// 'all' no agrega filtro

	query = query.order('created_at', { ascending: false })

	const { data, error } = await query
	if (error) throw error
	return (data || []) as Aseguradora[]
}

const ASEGURADORAS_EXPORT_PAGE_SIZE = 500

/** Todas las aseguradoras del laboratorio respetando filtros (paginado en servidor por si hay más del límite por defecto de PostgREST). */
export const getAllAseguradorasForExport = async (filters?: AseguradoraListFilters): Promise<Aseguradora[]> => {
	const laboratoryId = await getUserLaboratoryId()
	const f = filters ?? defaultAseguradoraListFilters()
	const out: Aseguradora[] = []
	let from = 0
	for (;;) {
		let query = supabase
			.from('aseguradoras')
			.select('*')
			.eq('laboratory_id', laboratoryId)

		if (f.activo === 'activas') {
			query = query.eq('activo', true)
		} else if (f.activo === 'inactivas') {
			query = query.eq('activo', false)
		}
		// 'all' no agrega filtro

		query = query.order('created_at', { ascending: false })
			.range(from, from + ASEGURADORAS_EXPORT_PAGE_SIZE - 1)

		const { data, error } = await query
		if (error) throw error
		const batch = (data || []) as Aseguradora[]
		out.push(...batch)
		if (batch.length < ASEGURADORAS_EXPORT_PAGE_SIZE) break
		from += ASEGURADORAS_EXPORT_PAGE_SIZE
	}
	return out
}

/** Soft delete: marca aseguradora como inactiva; deja de mostrarse en listados pero se conserva en BD */
export const deactivateAseguradora = async (id: string): Promise<Aseguradora> => {
	return updateAseguradora(id, { activo: false })
}

export const findAseguradoraById = async (id: string): Promise<Aseguradora | null> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('aseguradoras')
		.select('*')
		.eq('id', id)
		.eq('laboratory_id', laboratoryId)
		.single()

	if (error) {
		if (error.code === 'PGRST116') return null
		throw error
	}
	return data as Aseguradora
}

const ASEGURADORA_FIELD_LABELS: Record<string, string> = {
	nombre: 'Nombre',
	codigo_interno: 'Código interno',
	rif: 'RIF',
	telefono: 'Teléfono',
	email: 'Email',
	web: 'Web',
	direccion: 'Dirección',
	activo: 'Activo',
}

export const createAseguradora = async (payload: AseguradoraInsert): Promise<Aseguradora> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('aseguradoras')
		.insert({ ...payload, laboratory_id: laboratoryId })
		.select('*')
		.single()

	if (error) throw error
	const aseguradora = data as Aseguradora
	await logAseguradorasCreated('aseguradora', aseguradora.id, laboratoryId, `Compañía creada: ${aseguradora.nombre}`)
	return aseguradora
}

export const updateAseguradora = async (id: string, payload: AseguradoraUpdate): Promise<Aseguradora> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data: oldRow } = await supabase.from('aseguradoras').select('*').eq('id', id).eq('laboratory_id', laboratoryId).single()
	const { data, error } = await supabase
		.from('aseguradoras')
		.update({ ...payload, updated_at: new Date().toISOString() })
		.eq('id', id)
		.eq('laboratory_id', laboratoryId)
		.select('*')
		.single()

	if (error) throw error
	const aseguradora = data as Aseguradora
	if (oldRow) {
		const changes = buildChangeRows(
			oldRow as Record<string, unknown>,
			payload as Record<string, unknown>,
			ASEGURADORA_FIELD_LABELS,
		)
		await insertAseguradorasChangeLog('aseguradora', id, laboratoryId, changes)
	}
	return aseguradora
}

export const deleteAseguradora = async (id: string) => {
	const laboratoryId = await getUserLaboratoryId()
	const { error } = await supabase.from('aseguradoras').delete().eq('id', id).eq('laboratory_id', laboratoryId)
	if (error) throw error
	return { deleted: true }
}
