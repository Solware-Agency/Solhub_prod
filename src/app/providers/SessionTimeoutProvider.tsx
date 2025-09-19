import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface SessionTimeoutContextType {
	timeRemaining: number
	formatTimeRemaining: () => string
	showWarning: boolean
	dismissWarning: () => void
	resetSessionTimer: () => void
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | null>(null)

export const useSessionTimeout = () => {
	const context = useContext(SessionTimeoutContext)
	if (!context) {
		throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider')
	}
	return context
}

export const SessionTimeoutProvider = ({ children }: { children: ReactNode }) => {
	const { user } = useAuth()
	const [timeRemaining, setTimeRemaining] = useState<number>(0)
	const [showWarning, setShowWarning] = useState(false)
	const [lastActivity, setLastActivity] = useState<number>(Date.now())

	// Get session timeout from sessionStorage or default to 30 minutes
	const getSessionTimeout = () => {
		const saved = sessionStorage.getItem('sessionTimeout')
		return saved ? parseInt(saved, 10) : 30
	}

	// Reset session timer
	const resetSessionTimer = () => {
		setLastActivity(Date.now())
		setShowWarning(false)
	}

	// Format time remaining for display
	const formatTimeRemaining = () => {
		const seconds = Math.ceil(timeRemaining / 1000)
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	// Dismiss warning
	const dismissWarning = () => {
		setShowWarning(false)
	}

	// Activity handlers
	useEffect(() => {
		if (!user) return

		const handleActivity = () => {
			resetSessionTimer()
		}

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
	}, [user])

	// Session timeout checker
	useEffect(() => {
		if (!user) return

		const interval = setInterval(() => {
			const now = Date.now()
			const timeSinceActivity = now - lastActivity
			const sessionTimeout = getSessionTimeout()
			const timeoutMs = sessionTimeout * 60 * 1000
			const remaining = Math.max(0, timeoutMs - timeSinceActivity)

			setTimeRemaining(remaining)

			// Show warning if within 30 seconds
			if (remaining <= 30 * 1000 && remaining > 0) {
				if (!showWarning) {
					setShowWarning(true)
				}
			}

			// Timeout reached - trigger logout through a custom event
			if (remaining <= 0) {
				window.dispatchEvent(new CustomEvent('sessionTimeout'))
				clearInterval(interval)
			}
		}, 1000)

		return () => clearInterval(interval)
	}, [user, lastActivity, showWarning])

	return (
		<SessionTimeoutContext.Provider
			value={{
				timeRemaining,
				formatTimeRemaining,
				showWarning,
				dismissWarning,
				resetSessionTimer,
			}}
		>
			{children}
		</SessionTimeoutContext.Provider>
	)
}
