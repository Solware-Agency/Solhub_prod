import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@app/providers/AuthContext'
import { useUserProfile } from './useUserProfile'
import { supabase } from '@services/supabase/config/config'

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
	imagenologiaPath?: string
	/** Callback when redirect is about to happen */
	onRedirect?: (role: string, path: string) => void
}

interface UseSecureRedirectReturn {
	isRedirecting: boolean
	redirectUser: () => void
	canAccess: (requiredRole?: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner' | 'coordinador') => boolean
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
		imagenologiaPath = '/imagenologia/cases',
		adminPath = '/medic/cases',
		citoPath = '/cito/cases',
		patoloPath = '/patolo/cases',
		onRedirect,
	} = options

	const navigate = useNavigate()
	const location = useLocation()
	const { user, loading: authLoading } = useAuth()
	const { profile, isLoading: profileLoading, error: profileError } = useUserProfile()
	const [isRedirecting, setIsRedirecting] = useState(false)

	/**
	 * Performs the actual redirect based on user role
	 */
	const redirectUser = async () => {
		// ⚠️ CRÍTICO: No redirigir si estamos en proceso de logout
		const isLoggingOut = localStorage.getItem('is_logging_out') === 'true'
		if (isLoggingOut) {
			console.log('🚫 Redirect bloqueado - en proceso de logout')
			return
		}

		// No redirigir mientras se comprueba si el laboratorio está activo (evita parpadeo al rechazar por inactivo)
		if (localStorage.getItem('auth_checking_lab_status') === '1') {
			console.log('🚫 Redirect bloqueado - comprobando estado del laboratorio')
			return
		}

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
			case 'prueba':
				// Prueba tiene su propio home
				redirectPath = '/prueba/home'
				break
			case 'medicowner':
				redirectPath = medicownerPath
				break
			// Cada rol va a su propia ruta de home (que renderiza el mismo componente)
			case 'residente':
				redirectPath = '/medic/home'
				break
			case 'employee':
				redirectPath = employeePath
				break
			case 'coordinador':  // coordinador tiene mismos permisos que employee
				redirectPath = employeePath
				break
			case 'citotecno':
				redirectPath = '/cito/home'
				break
			case 'patologo':
				redirectPath = '/patolo/home'
				break
			case 'imagenologia':
				redirectPath = '/imagenologia/home'
				break
			case 'medico_tratante':
				redirectPath = '/medico-tratante/home'
				break
			case 'enfermero':
				redirectPath = '/enfermero/home'
				break
			case 'call_center':
				redirectPath = '/call-center/home'
				break
			case 'admin':
				redirectPath = '/medic/home'
				break
			default:
				redirectPath = employeePath // fallback
		}

		// Inntegras: enviar a módulo aseguradoras si corresponde
		try {
			const laboratoryId = (profile as { laboratory_id?: string }).laboratory_id
			if (laboratoryId) {
				const { data: laboratory } = await supabase
					.from('laboratories' as any)
					.select('slug, features')
					.eq('id', laboratoryId)
					.single()

				const hasAseguradoras = (laboratory as any)?.features?.hasAseguradoras === true
				const canSeeAseguradoras = profile.role === 'employee' || profile.role === 'coordinador' || profile.role === 'owner' || profile.role === 'prueba'
				if (hasAseguradoras && canSeeAseguradoras) {
					redirectPath = '/aseguradoras/home'
				}
			}
		} catch (error) {
			console.warn('⚠️ No se pudo obtener laboratorio para redirect:', error)
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
	const canAccess = (requiredRole?: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner' | 'imagenologia' | 'coordinador'): boolean => {
		if (!user || !profile || !user.email_confirmed_at || profileError) {
			return false
		}

		// FIXED: Only block access if estado is explicitly "pendiente"
		if (profile.estado === 'pendiente') {
			return false
		}

		// Rol "prueba" (godmode) tiene acceso a todo
		if (profile.role === 'prueba') {
			return true
		}

		if (!requiredRole) {
			return true // No specific role required
		}

		return profile.role === requiredRole
	}

	// Auto-redirect on mount if enabled and all data is ready
	useEffect(() => {
		// ⚠️ CRÍTICO: No redirigir si estamos en proceso de logout
		const isLoggingOut = localStorage.getItem('is_logging_out') === 'true'
		if (isLoggingOut) {
			console.log('🚫 Redirect bloqueado - en proceso de logout')
			return
		}

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
			isLoggingOut,
		})

		const checkingLab = localStorage.getItem('auth_checking_lab_status') === '1'
		if (redirectOnMount && !authLoading && !profileLoading && !isRedirecting && user && profile && !profileError && !isLoggingOut && !checkingLab) {
			const currentPath = location.pathname
			const authPaths = [
				'/',
				'/register',
				'/forgot-password',
				'/reset-password',
				'/new-password',
				'/email-verification-notice',
				'/pending-approval',
				'/auth/callback',
			]

			const roleAllowedPrefixes: Record<string, string[]> = {
				owner: ['/dashboard', '/chat', '/aseguradoras'],
				employee: ['/employee', '/aseguradoras'],
				prueba: ['/prueba', '/aseguradoras'],
				residente: ['/medic'],
				citotecno: ['/cito'],
				patologo: ['/patolo'],
				imagenologia: ['/imagenologia'],
				medico_tratante: ['/medico-tratante'],
				enfermero: ['/enfermero'],
				call_center: ['/call-center'],
				admin: ['/medic'],
				laboratorio: ['/laboratorio'],
				medicowner: ['/dashboard'],
			}

			const allowedPrefixes = roleAllowedPrefixes[profile.role] || []
			const isOnAllowedRoute = allowedPrefixes.some((prefix) => currentPath.startsWith(prefix))
			const isAuthRoute = authPaths.includes(currentPath)

			// Si el usuario ya está en una ruta permitida, no forzar redirect en refresh
			if (!isAuthRoute && isOnAllowedRoute) {
				return
			}
			console.log('Calling redirectUser from useEffect')
			redirectUser()
		}
	}, [redirectOnMount, authLoading, profileLoading, user, profile, profileError, isRedirecting, location.pathname])

	return {
		isRedirecting,
		redirectUser,
		canAccess,
	}
}