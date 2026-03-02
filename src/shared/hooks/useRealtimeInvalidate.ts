import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { supabase } from '@/services/supabase/config/config'

export type RealtimeInvalidateOptions = {
	schema?: string
	filter?: string
	events?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
	delayMs?: number
	/** Si false, no se suscribe. Útil cuando el filter depende de datos async (ej: laboratory_id). */
	enabled?: boolean
}

/**
 * Hook genérico para suscribirse a cambios en tiempo real de una tabla de Supabase
 * e invalidar queries de React Query cuando ocurren INSERT, UPDATE o DELETE.
 *
 * @param table - Nombre de la tabla
 * @param queryKeys - Array de queryKeys a invalidar (ej: ['change-logs'], ['medical-cases'])
 * @param options - Opciones: schema, filter, events, delayMs
 */
export function useRealtimeInvalidate(
	table: string,
	queryKeys: string[],
	options: RealtimeInvalidateOptions = {},
) {
	const queryClient = useQueryClient()
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
	const {
		schema = 'public',
		filter,
		events = '*',
		delayMs = 500,
		enabled = true,
	} = options

	useEffect(() => {
		if (!enabled) return
		const timeoutId = setTimeout(() => {
			const channel = supabase
				.channel(`realtime-${table}-${Date.now()}`)
				.on(
					'postgres_changes',
					{
						event: events,
						schema,
						table,
						...(filter && { filter }),
					},
					() => {
						queryKeys.forEach((key) =>
							queryClient.invalidateQueries({
								queryKey: [key],
								exact: false,
							}),
						)
					},
				)
				.subscribe((status) => {
					if (status === 'CHANNEL_ERROR') {
						console.warn(`[Realtime] Canal ${table} no disponible. Verifica Database → Replication en Supabase.`)
					}
				})

			channelRef.current = channel
		}, delayMs)

		return () => {
			clearTimeout(timeoutId)
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current)
				channelRef.current = null
			}
		}
	}, [table, queryKeys.join(','), schema, filter ?? '', events, delayMs, enabled, queryClient])
}
