import { supabase } from './config'
import type { PostgrestError } from '@supabase/supabase-js'

export interface UserProfile {
	id: string
	email: string
	role: 'owner' | 'employee' | 'residente'
	created_at: string
	updated_at: string
	assigned_branch?: string | null
	display_name?: string | null
	estado?: 'pendiente' | 'aprobado'
	phone?: string | number | null
}

/* ------------------------------------------------------------------
   Utilidades
-------------------------------------------------------------------*/
const normalizeEmail = (v: string) => v.trim().toLowerCase()

/**
 * Wrapper mínimo para llamar RPCs con tipos sin tener el `Database` generado.
 * Evita TS2345 ("never") y no usa `any`.
 */
type RpcClient = {
	rpc<TArgs extends Record<string, unknown>, TReturn>(
		fn: string,
		args: TArgs,
	): Promise<{ data: TReturn | null; error: PostgrestError | null }>
}
const rpc = (supabase as unknown as RpcClient).rpc.bind(supabase as unknown as RpcClient)

/* ------------------------------------------------------------------
   Updates sobre profiles
-------------------------------------------------------------------*/
export const updateUserRole = async (
	userId: string,
	newRole: 'owner' | 'employee' | 'residente',
): Promise<{ data: UserProfile | null; error: PostgrestError | Error | null }> => {
	try {
		console.log(`Updating user ${userId} role to ${newRole}`)

		const { data, error } = await supabase
			.from('profiles')
			.update({
				role: newRole,
				updated_at: new Date().toISOString(),
			})
			.eq('id', userId)
			.select()

		if (error) {
			console.error('Error updating user role:', error)
			return { data: null, error }
		}
		if (!data || data.length === 0) {
			const noProfileError = new Error(`No profile found for user ID: ${userId}`)
			console.error('No profile found for update:', noProfileError)
			return { data: null, error: noProfileError }
		}

		console.log('User role updated successfully:', data[0])
		return { data: data[0] as UserProfile, error: null }
	} catch (error) {
		console.error('Unexpected error updating user role:', error)
		return { data: null, error: error as Error }
	}
}

export const updateUserBranch = async (
	userId: string,
	branch: string | null,
): Promise<{ data: UserProfile | null; error: PostgrestError | Error | null }> => {
	try {
		console.log(`Updating user ${userId} branch to ${branch || 'none'}`)

		const { data, error } = await supabase
			.from('profiles')
			.update({
				assigned_branch: branch,
				updated_at: new Date().toISOString(),
			})
			.eq('id', userId)
			.select()

		if (error) {
			console.error('Error updating user branch:', error)
			return { data: null, error }
		}
		if (!data || data.length === 0) {
			const noProfileError = new Error(`No profile found for user ID: ${userId}`)
			console.error('No profile found for update:', noProfileError)
			return { data: null, error: noProfileError }
		}

		console.log('User branch updated successfully:', data[0])
		return { data: data[0] as UserProfile, error: null }
	} catch (error) {
		console.error('Unexpected error updating user branch:', error)
		return { data: null, error: error as Error }
	}
}

export const updateUserApprovalStatus = async (
	userId: string,
	estado: 'pendiente' | 'aprobado',
): Promise<{ data: UserProfile | null; error: PostgrestError | Error | null }> => {
	try {
		console.log(`Updating user ${userId} approval status to ${estado}`)

		const { data, error } = await supabase
			.from('profiles')
			.update({
				estado,
				updated_at: new Date().toISOString(),
			})
			.eq('id', userId)
			.select()

		if (error) {
			console.error('Error updating user approval status:', error)
			return { data: null, error }
		}
		if (!data || data.length === 0) {
			const noProfileError = new Error(`No profile found for user ID: ${userId}`)
			console.error('No profile found for update:', noProfileError)
			return { data: null, error: noProfileError }
		}

		console.log('User approval status updated successfully:', data[0])
		return { data: data[0] as UserProfile, error: null }
	} catch (error) {
		console.error('Unexpected error updating user approval status:', error)
		return { data: null, error: error as Error }
	}
}

/* ------------------------------------------------------------------
   Reads sobre profiles
-------------------------------------------------------------------*/
export const getAllUserProfiles = async (): Promise<{
	data: UserProfile[] | null
	error: PostgrestError | null
}> => {
	try {
		const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

		if (error) {
			console.error('Error fetching user profiles:', error)
			return { data: null, error }
		}
		return { data: data as UserProfile[], error: null }
	} catch (error) {
		console.error('Unexpected error fetching user profiles:', error)
		return { data: null, error: error as PostgrestError }
	}
}

export const getUserProfileById = async (
	userId: string,
): Promise<{ data: UserProfile | null; error: PostgrestError | null }> => {
	try {
		const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

		if (error) {
			console.error('Error fetching user profile:', error)
			return { data: null, error }
		}
		return { data: data as UserProfile, error: null }
	} catch (error) {
		console.error('Unexpected error fetching user profile:', error)
		return { data: null, error: error as PostgrestError }
	}
}

/**
 * ¿El usuario actual puede gestionar otros usuarios?
 */
export const canManageUsers = async (currentUserId: string): Promise<boolean> => {
	try {
		const { data, error } = await supabase.from('profiles').select('role').eq('id', currentUserId).single()

		if (error || !data) {
			console.error('Error checking user permissions:', error)
			return false
		}
		return data.role === 'owner'
	} catch (error) {
		console.error('Unexpected error checking user permissions:', error)
		return false
	}
}

/**
 * Stats básicas de profiles
 */
export const getUserStats = async (): Promise<{
	data: {
		total: number
		owners: number
		employees: number
		admins: number
		withBranch: number
		approved: number
		pending: number
	} | null
	error: PostgrestError | null
}> => {
	try {
		const { data, error } = await supabase.from('profiles').select('role, assigned_branch, estado')

		if (error) {
			console.error('Error fetching user stats:', error)
			return { data: null, error }
		}

		const stats = {
			total: data?.length || 0,
			owners: data?.filter((u) => u.role === 'owner').length || 0,
			employees: data?.filter((u) => u.role === 'employee').length || 0,
			admins: data?.filter((u) => u.role === 'residente').length || 0,
			withBranch: data?.filter((u) => u.assigned_branch).length || 0,
			approved: data?.filter((u) => u.estado === 'aprobado').length || 0,
			pending: data?.filter((u) => u.estado === 'pendiente').length || 0,
		}

		return { data: stats, error: null }
	} catch (error) {
		console.error('Unexpected error fetching user stats:', error)
		return { data: null, error: error as PostgrestError }
	}
}

/* ------------------------------------------------------------------
   Pre-check de email contra auth.users (RPC SECURITY DEFINER)
-------------------------------------------------------------------*/
export async function emailExists(email: string): Promise<{ exists: boolean; error: PostgrestError | null }> {
	try {
		const cleaned = normalizeEmail(email)
		if (!cleaned) return { exists: false, error: null }

		// wrapper tipado evita TS2345 sin Database types
		const { data, error } = await rpc<{ p_email: string }, boolean>('email_exists_auth', {
			p_email: cleaned,
		})
		if (error) return { exists: false, error }
		return { exists: Boolean(data), error: null }
	} catch (err) {
		return { exists: false, error: err as PostgrestError }
	}
}

/* ------------------------------------------------------------------
   Promoción a admin por email
   (busca el perfil para obtener el ID, luego actualiza role)
-------------------------------------------------------------------*/
export const updateUserToAdmin = async (
	email: string,
): Promise<{ success: boolean; error: PostgrestError | Error | null }> => {
	try {
		const cleaned = normalizeEmail(email)

		// 1) Buscar el perfil para obtener el id
		const { data: profile, error: profileErr } = await supabase
			.from('profiles')
			.select('id')
			.eq('email_lower', cleaned)
			.maybeSingle()

		if (profileErr) {
			console.error('Error finding profile by email:', profileErr)
			return { success: false, error: profileErr }
		}
		if (!profile) {
			return { success: false, error: new Error('User not found') }
		}

		// 2) Actualizar rol
		const { error: updateErr } = await updateUserRole(profile.id, 'residente')
		if (updateErr) {
			console.error('Error updating user to admin role:', updateErr)
			return { success: false, error: updateErr }
		}

		console.log(`User ${email} successfully updated to admin role`)
		return { success: true, error: null }
	} catch (error) {
		console.error('Unexpected error updating user to admin:', error)
		return { success: false, error: error as Error }
	}
}
