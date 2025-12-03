import { Navigate } from 'react-router-dom'
import { useAuth } from '@app/providers/AuthContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import type { JSX } from 'react'

interface PrivateRouteProps {
	children: JSX.Element
	requiredRole?: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner' | Array<'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner'>
}

/**
 * Protected route component that checks authentication, email verification, and role permissions
 * Only allows access to users with verified emails and appropriate roles
 */
const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
	const { user, loading: authLoading } = useAuth()
	const { profile, isLoading: profileLoading, error: profileError } = useUserProfile()

	// Show loading spinner while checking authentication and profile
	if (authLoading || profileLoading) {
		return (
			<div className="w-screen h-screen bg-dark flex items-center justify-center">
				<div className="bg-white p-8 rounded-lg">
					<div className="flex items-center gap-3">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
						<p className="text-lg">Verificando permisos...</p>
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
		// Instead of redirecting to login, show an error message or retry
		return (
			<div className="w-screen h-screen bg-dark flex items-center justify-center">
				<div className="bg-white p-8 rounded-lg max-w-md text-center">
					<div className="text-red-500 mb-4">
						<svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 mb-2">Error de Perfil</h3>
					<p className="text-gray-600 mb-4">
						No se pudo cargar tu perfil de usuario. Esto puede ser un problema temporal.
					</p>
					<button
						onClick={() => window.location.reload()}
						className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-none"
					>
						Reintentar
					</button>
				</div>
			</div>
		)
	}

	// Check role permissions if a specific role is required
	if (requiredRole) {
		const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

		if (!allowedRoles.includes(profile.role)) {
			console.log(`User role "${profile.role}" not in allowed roles: ${allowedRoles.join(', ')}`)

			// Redirect based on actual user role to their proper home
			switch (profile.role) {
				case 'owner':
					return <Navigate to="/dashboard/home" replace />
				case 'residente':
					return <Navigate to="/medic/cases" replace />
				case 'employee':
					return <Navigate to="/employee/home" replace />
				case 'citotecno':
					return <Navigate to="/cito/cases" replace />
				case 'patologo':
					return <Navigate to="/patolo/cases" replace />
				case 'medicowner':
					return <Navigate to="/dashboard/home" replace />
				default:
					// Fallback for unknown roles
					return <Navigate to="/employee/home" replace />
			}
		}
	}

	console.log(`Access granted for user with role: ${profile.role}`)
	return children
}

export default PrivateRoute
