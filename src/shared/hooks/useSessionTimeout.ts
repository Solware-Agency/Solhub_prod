import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/services/supabase/config/config'
import type { User } from '@supabase/supabase-js'

export const SESSION_TIMEOUT_OPTIONS = [1, 5, 10, 15, 20, 30, 60] // minutes

interface UseSessionTimeoutOptions {
	user: User | null
	onTimeout?: () => void
	onWarning?: (remainingTime: number) => void
	warningThreshold?: number // seconds before timeout to show warning
}

export function useSessionTimeout({ user, onTimeout, onWarning, warningThreshold = 30 }: UseSessionTimeoutOptions) {
	const [sessionTimeout, setSessionTimeout] = useState<number>(30) // minutes
	const [isLoading, setIsLoading] = useState(true)
	const [timeRemaining, setTimeRemaining] = useState<number>(0)
	const [showWarning, setShowWarning] = useState(false)
	const [lastActivity, setLastActivity] = useState<number>(Date.now())

	// Refs to avoid stale closures
	const sessionTimeoutRef = useRef(sessionTimeout)
	const lastActivityRef = useRef(lastActivity)
	const onTimeoutRef = useRef(onTimeout)
	const onWarningRef = useRef(onWarning)

	// Update refs when values change
	useEffect(() => {
		sessionTimeoutRef.current = sessionTimeout
	}, [sessionTimeout])

	useEffect(() => {
		lastActivityRef.current = lastActivity
	}, [lastActivity])

	useEffect(() => {
		onTimeoutRef.current = onTimeout
	}, [onTimeout])

	useEffect(() => {
		onWarningRef.current = onWarning
	}, [onWarning])

	// Load user timeout from database
	useEffect(() => {
		if (!user) {
			setIsLoading(false)
			return
		}

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
					setSessionTimeout(30)
					localStorage.setItem('sessionTimeout', '30')
					return
				}

				const timeoutMinutes = data?.session_timeout || 30
				setSessionTimeout(timeoutMinutes)

				// Also save to localStorage for immediate access
				localStorage.setItem('sessionTimeout', timeoutMinutes.toString())
			} catch (error) {
				console.error('Error loading user timeout:', error)
			} finally {
				setIsLoading(false)
			}
		}

		// Try to load from localStorage first for immediate access
		const savedTimeout = localStorage.getItem('sessionTimeout')
		if (savedTimeout) {
			const timeoutMinutes = parseInt(savedTimeout, 10)
			if (!isNaN(timeoutMinutes) && SESSION_TIMEOUT_OPTIONS.includes(timeoutMinutes)) {
				setSessionTimeout(timeoutMinutes)
			}
		}

		loadUserTimeout()
	}, [user])

	// Update user timeout in database
	const updateUserTimeout = useCallback(
		async (minutes: number): Promise<boolean | undefined> => {
			if (!user) return

			try {
				const { error } = await supabase.from('user_settings').upsert(
					{
						id: user.id,
						session_timeout: minutes,
					},
					{ onConflict: 'id' },
				)

				if (error) {
					console.error('Error updating user timeout:', error)
					return false
				}

				setSessionTimeout(minutes)
				localStorage.setItem('sessionTimeout', minutes.toString())
				return true
			} catch (error) {
				console.error('Error updating user timeout:', error)
				return false
			}
		},
		[user],
	)

	// Reset session timer
	const resetSessionTimer = useCallback(() => {
		setLastActivity(Date.now())
		setShowWarning(false)
	}, [])

	// Activity handlers
	const handleActivity = useCallback(() => {
		resetSessionTimer()
	}, [resetSessionTimer])

	// Set up activity listeners
	useEffect(() => {
		if (!user) return

		const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
		let debounceTimer: NodeJS.Timeout

		const debouncedActivity = () => {
			clearTimeout(debounceTimer)
			debounceTimer = setTimeout(() => {
				handleActivity()
			}, 500)
		}

		events.forEach((event) => {
			document.addEventListener(event, debouncedActivity, true)
		})

		return () => {
			clearTimeout(debounceTimer)
			events.forEach((event) => {
				document.removeEventListener(event, debouncedActivity, true)
			})
		}
	}, [user, handleActivity])

	// Session timeout checker
	useEffect(() => {
		if (!user) return

		const interval = setInterval(() => {
			const now = Date.now()
			const timeSinceActivity = now - lastActivityRef.current
			const timeoutMs = sessionTimeoutRef.current * 60 * 1000
			const remaining = Math.max(0, timeoutMs - timeSinceActivity)

			setTimeRemaining(remaining)

			// Show warning if within threshold
			if (remaining <= warningThreshold * 1000 && remaining > 0) {
				if (!showWarning) {
					setShowWarning(true)
					onWarningRef.current?.(remaining)
				}
			}

			// Timeout reached
			if (remaining <= 0) {
				onTimeoutRef.current?.()
				clearInterval(interval)
			}
		}, 1000)

		return () => clearInterval(interval)
	}, [user, warningThreshold, showWarning])

	// Format time remaining for display
	const formatTimeRemaining = useCallback(() => {
		const seconds = Math.ceil(timeRemaining / 1000)
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}, [timeRemaining])

	// Dismiss warning
	const dismissWarning = useCallback(() => {
		setShowWarning(false)
	}, [])

	return {
		sessionTimeout,
		updateUserTimeout,
		isLoading,
		timeRemaining,
		showWarning,
		resetSessionTimer,
		formatTimeRemaining,
		dismissWarning,
	}
}
