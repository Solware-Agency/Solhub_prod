import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@app/providers/AuthContext'
import { getAndSyncUserProfile } from '@lib/supabase/services/getAndSyncUserProfile'
import { useEffect } from 'react'
import { supabase } from '@lib/supabase/config'
import { toast } from '@shared/hooks/use-toast'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Tables } from '@shared/types/types'

export const useUserProfile = () => {
	const { user, loading: authLoading } = useAuth()
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: ['userProfile', user?.id],
		queryFn: () => {
			if (!user) throw new Error('No user')
			return getAndSyncUserProfile(user.id, user.user_metadata)
		},
		enabled: !!user && !authLoading,
		// Force fresh reads on mount to avoid stale approval status after signin
		staleTime: 0,
		refetchOnMount: 'always',
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
	})

	// Realtime updates for current user's profile
	useEffect(() => {
		if (!user?.id) return

		const channel = supabase
			.channel(`realtime-profile-${user.id}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
				(payload: RealtimePostgresChangesPayload<Tables<'profiles'>>) => {
					console.log('[RT][useUserProfile] change payload:', payload)
					const nextProfile = (payload?.new as Tables<'profiles'>) ?? null
					const prevProfile = (payload?.old as Tables<'profiles'>) ?? null
					// Update React Query cache immediately for snappy UI
					queryClient.setQueryData(['userProfile', user.id], nextProfile)
					// Invalida queries que dependan del perfil para forzar re-evaluación de rutas/guards
					queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] })
					// Optional: ensure consistency by refetching in background
					query.refetch()

					// Notify when the account gets approved
					if (
						payload?.eventType === 'UPDATE' &&
						prevProfile?.estado === 'pendiente' &&
						nextProfile?.estado === 'aprobado'
					) {
						toast({
							title: '¡Cuenta aprobada!',
							description: 'Ya puedes acceder y serás redirigido automáticamente.',
						})
					}
				},
			)
			.subscribe((status) => console.log('[RT][useUserProfile] channel status:', status))

		return () => {
			supabase.removeChannel(channel)
		}
	}, [user?.id, queryClient, query])

	return {
		profile: query.data,
		isLoading: authLoading || query.isLoading,
		error: query.error?.message || null,
		refetch: query.refetch,
	}
}
