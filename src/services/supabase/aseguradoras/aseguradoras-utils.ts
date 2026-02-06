import { supabase } from '@services/supabase/config/config'

export class AseguradorasError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'AseguradorasError'
	}
}

export const getUserLaboratoryId = async (): Promise<string> => {
	const {
		data: { user },
	} = await supabase.auth.getUser()
	if (!user) {
		throw new AseguradorasError('Usuario no autenticado')
	}

	const { data: profile, error } = await supabase
		.from('profiles')
		.select('laboratory_id')
		.eq('id', user.id)
		.single()

	if (error || !profile) {
		throw new AseguradorasError('Usuario no tiene laboratorio asignado')
	}

	const laboratoryId = (profile as { laboratory_id?: string }).laboratory_id
	if (!laboratoryId) {
		throw new AseguradorasError('Usuario no tiene laboratorio asignado')
	}

	return laboratoryId
}
