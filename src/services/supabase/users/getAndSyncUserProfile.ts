import { supabase } from '@/services/supabase/config/config'
import type { UserProfile } from '@/services/supabase/auth/auth'

export const getAndSyncUserProfile = async (userId: string, userMeta: any): Promise<UserProfile | null> => {
	const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

	if (error || !profile) {
		console.error('[❌] Error fetching profile:', error)
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
		...profile,
		role: profile.role as 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner',
		created_at: profile.created_at || new Date().toISOString(),
		updated_at: profile.updated_at || new Date().toISOString(),
		estado: (profile.estado as 'pendiente' | 'aprobado') || undefined,
	}
}
