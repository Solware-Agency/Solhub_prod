import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@app/providers/MockAuthContext'
import { useUserProfile } from './useUserProfile'

interface UseSecureRedirectOptions {
	/** Whether to redirect immediately on mount */
	redirectOnMount?: boolean
	/** Custom redirect paths */
	ownerPath?: string
	medicownerPath?: string
	employeePath?: string
	adminPath?: string
	citoPath?: string
	patoloPath?: string
	/** Callback when redirect is about to happen */
	onRedirect?: (role: string, path: string) => void
}

interface UseSecureRedirectReturn {
	isRedirecting: boolean
	redirectUser: () => void
	canAccess: (requiredRole?: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner') => boolean
}

/**
 * Custom hook for secure role-based redirects
 * Handles user authentication, email verification, and role-based routing
 */
export const useSecureRedirect = (options: UseSecureRedirectOptions = {}): UseSecureRedirectReturn => {
	const {
		redirectOnMount = true,
		ownerPath = '/dashboard/home',
		medicownerPath = '/dashboard/home',
		employeePath = '/employee/home',
		adminPath = '/medic/cases',
		citoPath = '/cito/cases',
		patoloPath = '/patolo/cases',
		onRedirect,
	} = options

	const navigate = useNavigate()
	const { user, loading: authLoading } = useAuth()
	const { profile, isLoading: profileLoading, error: profileError } = useUserProfile()
	const [isRedirecting, setIsRedirecting] = useState(false)

	/**
	 * Performs the actual redirect based on user role
	 */
	const redirectUser = () => {
		// Don't redirect if still loading
		if (authLoading || profileLoading || isRedirecting) {
			console.log('Redirect skipped - still loading or already redirecting')
			return
		}

		// Don't redirect if no user
		if (!user) {
			console.log('Redirect skipped - no user')
			return
		}

		// Check if email is verified
		if (!user.email_confirmed_at) {
			console.log('Email not confirmed, redirecting to verification notice')
			setIsRedirecting(true)
			navigate('/email-verification-notice', { replace: true })
			setTimeout(() => setIsRedirecting(false), 500)
			return
		}

		// Don't redirect if profile has error or is missing
		if (profileError || !profile) {
			console.warn('Redirect skipped - profile error or missing:', profileError)
			return
		}

		// Check if user is approved - FIXED: Only redirect to pending approval if estado is explicitly "pendiente"
		if (profile.estado === 'pendiente') {
			console.log('User not approved, redirecting to pending approval page')
			setIsRedirecting(true)
			// Hard refresh of profile to avoid stale read after recent approval
			// The hook useUserProfile already refetches on mount, but in case of a race we refetch explicitly
			// and only if sigue pendiente, entonces sí redirigimos
			setTimeout(async () => {
				try {
					// leverages useUserProfile's refetch via navigation side-effects; no direct call here
					navigate('/pending-approval', { replace: true })
				} finally {
					setTimeout(() => setIsRedirecting(false), 500)
				}
			}, 0)
			return
		}

		setIsRedirecting(true)

		// Determine redirect path based on role
		let redirectPath: string
		switch (profile.role) {
			case 'owner':
				redirectPath = ownerPath
				break
			case 'residente':
				redirectPath = adminPath
				break
			case 'medicowner':
				redirectPath = medicownerPath
				break
			case 'employee':
				redirectPath = employeePath
				break
			case 'citotecno':
				redirectPath = citoPath
				break
			case 'patologo':
				redirectPath = patoloPath
				break
			default:
				redirectPath = employeePath // fallback to employee
		}

		console.log(`Redirecting user with role "${profile.role}" to: ${redirectPath}`)

		// Call callback if provided
		onRedirect?.(profile.role, redirectPath)

		// Perform redirect
		navigate(redirectPath, { replace: true })

		// Reset redirecting state after a short delay
		setTimeout(() => setIsRedirecting(false), 500)
	}

	/**
	 * Checks if user can access a specific role-protected route
	 */
	const canAccess = (requiredRole?: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner'): boolean => {
		if (!user || !profile || !user.email_confirmed_at || profileError) {
			return false
		}

		// FIXED: Only block access if estado is explicitly "pendiente"
		if (profile.estado === 'pendiente') {
			return false
		}

		if (!requiredRole) {
			return true // No specific role required
		}

		return profile.role === requiredRole
	}

	// Auto-redirect on mount if enabled and all data is ready
	useEffect(() => {
		console.log('useSecureRedirect effect:', {
			redirectOnMount,
			authLoading,
			profileLoading,
			isRedirecting,
			hasUser: !!user,
			hasProfile: !!profile,
			profileError,
			userEmail: user?.email,
			profileRole: profile?.role,
			profileEstado: profile?.estado,
		})

		if (redirectOnMount && !authLoading && !profileLoading && !isRedirecting && user && profile && !profileError) {
			console.log('Calling redirectUser from useEffect')
			redirectUser()
		}
	}, [redirectOnMount, authLoading, profileLoading, user, profile, profileError, isRedirecting])

	return {
		isRedirecting,
		redirectUser,
		canAccess,
	}
}