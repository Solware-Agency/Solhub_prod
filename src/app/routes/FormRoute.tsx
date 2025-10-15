import { Navigate } from 'react-router-dom'
import { useAuth } from '@app/providers/MockAuthContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import type { JSX } from 'react'

/**
 * Route protection for the form page
 * Allows access to employees and redirects owners to dashboard
 */
const FormRoute = ({ children }: { children: JSX.Element }) => {
	const { user, loading: authLoading } = useAuth()
	const { profile, isLoading: profileLoading, error: profileError } = useUserProfile()

	// Show loading spinner while checking authentication and profile
	if (authLoading || profileLoading) {
		return (
			<div className="w-screen h-screen bg-background flex items-center justify-center">
				<div className="bg-background p-8 rounded-lg">
					<div className="flex items-center gap-3">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
						<p className="text-lg">Cargando...</p>
					</div>
				</div>
			</div>
		)
	}

	// User must be logged in
	if (!user) {
		console.log('No user found, redirecting to login')
		return <Navigate to="/" replace />
	}

	// CRITICAL: User must have verified their email
	if (!user.email_confirmed_at) {
		console.log('User email not confirmed, redirecting to verification notice')
		return <Navigate to="/email-verification-notice" replace />
	}

	// Check if user is approved - FIXED: Only redirect to pending approval if estado is explicitly "pendiente"
	if (profile?.estado === 'pendiente') {
		console.log('User not approved, redirecting to pending approval page')
		return <Navigate to="/pending-approval" replace />
	}

	// Handle profile loading errors or missing profile
	if (profileError || !profile) {
		console.warn('Profile issue for user:', user.id, 'Error:', profileError)
		// Show error message instead of redirecting to login
		return (
			<div className="w-screen h-screen bg-background flex items-center justify-center">
				<div className="bg-background p-8 rounded-lg max-w-md text-center">
					<div className="text-red-500 mb-4">
						<svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">Error de Perfil</h3>
					<p className="text-gray-600 mb-4">
						No se pudo cargar tu perfil de usuario. Esto puede ser un problema temporal.
					</p>
					<button
						onClick={() => window.location.reload()}
						className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 transition-none"
					>
						Reintentar
					</button>
				</div>
			</div>
		)
	}

	// If user is the owner or admin, redirect to dashboard
	if (profile.role === 'owner' || profile.role === 'residente') {
		console.log(`${profile.role} user accessing form route, redirecting to dashboard`)
		return <Navigate to="/dashboard/cases" replace />
	}

	// Allow access for employees and other roles
	console.log(`Form access granted for user with role: ${profile.role}`)
	return children
}

export default FormRoute