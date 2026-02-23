import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabase/config/config'
import type { User } from '@supabase/supabase-js'

export const SESSION_TIMEOUT_OPTIONS = [10, 15, 20, 30, 60] // minutes (60 = 1 hora)

interface UseSessionTimeoutSettingsOptions {
	user: User | null
}

export function useSessionTimeoutSettings({ user }: UseSessionTimeoutSettingsOptions) {
	const [sessionTimeout, setSessionTimeout] = useState<number>(30) // minutes
	const [isLoading, setIsLoading] = useState(true)
	const [laboratoryId, setLaboratoryId] = useState<string | null>(null)

	// Obtener laboratory_id del perfil (multi-tenant)
	useEffect(() => {
		if (!user) {
			setLaboratoryId(null)
			return
		}
		let isMounted = true
		const loadLaboratoryId = async () => {
			const { data, error } = await supabase.from('profiles').select('laboratory_id').eq('id', user.id).maybeSingle()
			if (!error && data?.laboratory_id && isMounted) {
				setLaboratoryId(data.laboratory_id)
			}
		}
		loadLaboratoryId()
		return () => {
			isMounted = false
		}
	}, [user])

	// Load user timeout from database
	useEffect(() => {
		if (!user) {
			setIsLoading(false)
			return
		}

		let isMounted = true

		const loadUserTimeout = async () => {
			try {
				const { data, error } = await supabase
					.from('user_settings')
					.select('session_timeout')
					.eq('id', user.id)
					.maybeSingle() // Use maybeSingle() instead of single() to handle empty results

				if (error) {
					console.error('Error loading user timeout:', error)
					// If there's an error, use default timeout
					if (isMounted) {
						setSessionTimeout(30)
						sessionStorage.setItem('sessionTimeout', '30')
					}
					return
				}

				const timeoutMinutes = data?.session_timeout || 30
				if (isMounted) {
					setSessionTimeout(timeoutMinutes)
				}

				// Also save to sessionStorage for immediate access
				sessionStorage.setItem('sessionTimeout', timeoutMinutes.toString())
			} catch (error) {
				console.error('Error loading user timeout:', error)
				// If there's an error, use default timeout
				if (isMounted) {
					setSessionTimeout(30)
					sessionStorage.setItem('sessionTimeout', '30')
				}
			} finally {
				if (isMounted) {
					setIsLoading(false)
				}
			}
		}

		// Try to load from sessionStorage first for immediate access
		const savedTimeout = sessionStorage.getItem('sessionTimeout')
		if (savedTimeout) {
			const timeoutMinutes = parseInt(savedTimeout, 10)
			if (!isNaN(timeoutMinutes) && SESSION_TIMEOUT_OPTIONS.includes(timeoutMinutes)) {
				setSessionTimeout(timeoutMinutes)
			}
		}

		loadUserTimeout()

		return () => {
			isMounted = false
		}
	}, [user])

	// Update user timeout in database (incluye laboratory_id por multi-tenant)
	const updateUserTimeout = useCallback(
		async (minutes: number): Promise<boolean | undefined> => {
			if (!user) return

			try {
				let labId = laboratoryId
				if (!labId) {
					const { data } = await supabase.from('profiles').select('laboratory_id').eq('id', user.id).maybeSingle()
					labId = data?.laboratory_id ?? null
				}
				if (!labId) {
					console.error('Error updating user timeout: no laboratory_id in profile')
					return false
				}

				const { error } = await supabase.from('user_settings').upsert(
					{
						id: user.id,
						laboratory_id: labId,
						session_timeout: minutes,
					},
					{ onConflict: 'id' },
				)

				if (error) {
					console.error('Error updating user timeout:', error)
					return false
				}

				setSessionTimeout(minutes)
				sessionStorage.setItem('sessionTimeout', minutes.toString())
				return true
			} catch (error) {
				console.error('Error updating user timeout:', error)
				return false
			}
		},
		[user, laboratoryId],
	)

	return {
		sessionTimeout,
		updateUserTimeout,
		isLoading,
	}
}
