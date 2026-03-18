import { useEffect, useRef, useState, startTransition } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@app/providers/AuthContext'
import { useUserProfile } from './useUserProfile'
import { useLaboratory } from '@app/providers/LaboratoryContext'
import { preloadDashboardRoute } from '@app/routes/lazy-routes'

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
		onRedirect,
	} = options

	const navigate = useNavigate()
	const location = useLocation()
	const { user, loading: authLoading } = useAuth()
	const { profile, isLoading: profileLoading, error: profileError } = useUserProfile()
	const { laboratory } = useLaboratory()
	const [isRedirecting, setIsRedirecting] = useState(false)
	/** Evita doble redirect por Strict Mode o múltiples ejecuciones del effect */
	const hasRedirectedRef = useRef(false)

	/**
	 * Performs the actual redirect based on user role
	 */
	const redirectUser = async () => {
		// Evitar múltiples redirects (p. ej. por React Strict Mode o re-ejecución del effect)
		if (hasRedirectedRef.current) {
			return
		}

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
			hasRedirectedRef.current = true
			console.log('Email not confirmed, redirecting to verification notice')
			setIsRedirecting(true)
			startTransition(() => navigate('/email-verification-notice', { replace: true }))
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
			hasRedirectedRef.current = true
			console.log('User not approved, redirecting to pending approval page')
			setIsRedirecting(true)
			startTransition(() => navigate('/pending-approval', { replace: true }))
			setTimeout(() => setIsRedirecting(false), 500)
			return
		}

		hasRedirectedRef.current = true
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
		// Usa el laboratorio ya cargado en contexto (sin fetch adicional)
		if (laboratory) {
			const hasAseguradoras = (laboratory as any)?.features?.hasAseguradoras === true
			const canSeeAseguradoras = profile.role === 'employee' || profile.role === 'coordinador' || profile.role === 'owner' || profile.role === 'prueba'
			if (hasAseguradoras && canSeeAseguradoras) {
				redirectPath = '/aseguradoras/home'
			}
		}

		console.log(`Redirecting user with role "${profile.role}" to: ${redirectPath}`)

		// Precargar los chunks necesarios ANTES de navegar para evitar el destello blanco de Suspense
		await preloadDashboardRoute(profile.role)

		// Call callback if provided
		onRedirect?.(profile.role, redirectPath)

		// startTransition: React mantiene la UI actual visible mientras renderiza la nueva ruta
		// en segundo plano. Si algún lazy component suspende, NO muestra el fallback de Suspense
		// (sin parpadeo blanco). Solo hace el swap cuando la nueva UI está completamente lista.
		startTransition(() => {
			navigate(redirectPath, { replace: true })
		})

		setIsRedirecting(false)
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

	// Reset ref cuando no hay usuario (logout) para permitir redirect en el próximo login
	useEffect(() => {
		if (!user) {
			hasRedirectedRef.current = false
		}
	}, [user])

	// Auto-redirect on mount if enabled and all data is ready
	useEffect(() => {
		// ⚠️ CRÍTICO: No redirigir si estamos en proceso de logout
		const isLoggingOut = localStorage.getItem('is_logging_out') === 'true'
		if (isLoggingOut) {
			console.log('🚫 Redirect bloqueado - en proceso de logout')
			return
		}

		if (process.env.NODE_ENV === 'development') {
			console.log('useSecureRedirect effect:', {
				redirectOnMount,
				authLoading,
				profileLoading,
				isRedirecting,
				hasUser: !!user,
				hasProfile: !!profile,
			})
		}

		const checkingLab = localStorage.getItem('auth_checking_lab_status') === '1'
		// Usamos hasRedirectedRef (no isRedirecting) como guard para evitar re-ejecuciones innecesarias
		if (redirectOnMount && !authLoading && !profileLoading && !hasRedirectedRef.current && user && profile && !profileError && !isLoggingOut && !checkingLab) {
			const currentPath = location.pathname

			// No redirigir en flujo de restablecimiento de contraseña: el usuario debe poder ver /new-password
			if (currentPath === '/new-password') {
				console.log('Redirect skipped - user on new-password page (password reset flow)')
				return
			}
			// No redirigir en callback cuando es recovery: AuthCallback enviará a /new-password
			if (currentPath === '/auth/callback') {
				const searchParams = new URLSearchParams(location.search)
				const rawHash = location.hash?.startsWith('#') ? location.hash.slice(1) : location.hash || ''
				const hashParams = new URLSearchParams(rawHash)
				if (searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery') {
					console.log('Redirect skipped - auth callback is password recovery flow')
					return
				}
			}

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
		// eslint-disable-next-line react-hooks/exhaustive-deps -- isRedirecting y redirectUser omitidos intencionalmente: usamos hasRedirectedRef como guard
	}, [redirectOnMount, authLoading, profileLoading, user, profile, profileError, location.pathname])

	return {
		isRedirecting,
		redirectUser,
		canAccess,
	}
}