import { supabase } from '@services/supabase/config/config'
import { getUserLaboratoryId } from './aseguradoras-utils'

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

export interface AseguradoraUpdate extends AseguradoraInsert {}

export const getAseguradoras = async () => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('aseguradoras')
		.select('*')
		.eq('laboratory_id', laboratoryId)
		.eq('activo', true)
		.order('created_at', { ascending: false })

	if (error) throw error
	return (data || []) as Aseguradora[]
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

export const createAseguradora = async (payload: AseguradoraInsert): Promise<Aseguradora> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('aseguradoras')
		.insert({ ...payload, laboratory_id: laboratoryId })
		.select('*')
		.single()

	if (error) throw error
	return data as Aseguradora
}

export const updateAseguradora = async (id: string, payload: AseguradoraUpdate): Promise<Aseguradora> => {
	const laboratoryId = await getUserLaboratoryId()
	const { data, error } = await supabase
		.from('aseguradoras')
		.update({ ...payload, updated_at: new Date().toISOString() })
		.eq('id', id)
		.eq('laboratory_id', laboratoryId)
		.select('*')
		.single()

	if (error) throw error
	return data as Aseguradora
}

export const deleteAseguradora = async (id: string) => {
	const laboratoryId = await getUserLaboratoryId()
	const { error } = await supabase.from('aseguradoras').delete().eq('id', id).eq('laboratory_id', laboratoryId)
	if (error) throw error
	return { deleted: true }
}
