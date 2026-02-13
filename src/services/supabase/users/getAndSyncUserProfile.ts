import { supabase } from '@/services/supabase/config/config'
import type { UserProfile } from '@/services/supabase/auth/auth'

/**
 * Hace logout automático cuando el perfil no existe (usuario eliminado)
 */
const handleProfileNotFound = async () => {
	console.warn('[⚠️] Perfil no encontrado - haciendo logout automático...')
	try {
		await supabase.auth.signOut()
		// Redirigir a login después de un pequeño delay para asegurar que el logout se complete
		setTimeout(() => {
			window.location.href = '/'
		}, 500)
	} catch (logoutError) {
		console.error('[❌] Error durante logout automático:', logoutError)
		// Forzar redirección incluso si hay error
		window.location.href = '/'
	}
}

export const getAndSyncUserProfile = async (userId: string, userMeta: any): Promise<UserProfile | null> => {
	const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

	if (error || !profile) {
		console.error('[❌] Error fetching profile:', error)
		
		// Si el error es PGRST116 (no rows returned), significa que el perfil fue eliminado
		// Hacer logout automático
		if (error?.code === 'PGRST116') {
			console.warn('[⚠️] Perfil eliminado detectado (PGRST116) - haciendo logout automático')
			await handleProfileNotFound()
		}
		
		return null
	}

	let synced = false

	if (userMeta?.display_name && !profile.display_name) {
		const { error: updateError } = await supabase
			.from('profiles')
			.update({ display_name: userMeta.display_name })
			.eq('id', userId)
		if (!updateError) {
			profile.display_name = userMeta.display_name
			synced = true
		}
	}

	// Sync phone from auth metadata -> profiles (post-verification)
	if (userMeta?.phone) {
		const phoneDigits = String(userMeta.phone).replace(/\D/g, '')
		const current = (profile as unknown as { phone: string | null }).phone ?? null
		if (!current || String(current) !== phoneDigits) {
			const { error: updateError } = await supabase.from('profiles').update({ phone: phoneDigits }).eq('id', userId)
			if (!updateError) {
				;(profile as unknown as { phone: string | null }).phone = phoneDigits
				synced = true
			} else {
				console.error('[❌] Failed syncing phone to profile:', updateError)
			}
		}
	}

	if (profile.display_name && (!userMeta?.display_name || userMeta.display_name !== profile.display_name)) {
		const { error: updateError } = await supabase.auth.updateUser({
			data: {
				display_name: profile.display_name,
				phone: (profile as unknown as { phone: string | null }).phone ?? null,
			},
		})
		if (!updateError) {
			synced = true
		}
	}

	if (synced) {
		console.log('[🔄] Display name synced')
	}

	return {
		id: profile.id,
		email: profile.email,
		role: profile.role as 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner' | 'medico_tratante' | 'enfermero' | 'imagenologia' | 'call_center' | 'prueba' | 'laboratorio' | 'coordinador',
		created_at: profile.created_at || new Date().toISOString(),
		updated_at: profile.updated_at || new Date().toISOString(),
		assigned_branch: profile.assigned_branch ?? null,
		display_name: profile.display_name ?? null,
		estado: (profile.estado as 'pendiente' | 'aprobado') || undefined,
		phone: (profile as unknown as { phone: string | null }).phone ?? null,
		laboratory_id: (profile as unknown as { laboratory_id: string | null }).laboratory_id ?? null,
		signature_url: (profile as unknown as { signature_url: string | null }).signature_url ?? null,
		signature_url_2: (profile as unknown as { signature_url_2: string | null }).signature_url_2 ?? null,
		signature_url_3: (profile as unknown as { signature_url_3: string | null }).signature_url_3 ?? null,
	} as UserProfile
}
