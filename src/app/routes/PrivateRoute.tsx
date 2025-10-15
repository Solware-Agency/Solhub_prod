import { Navigate } from 'react-router-dom'
import { useAuth } from '@app/providers/MockAuthContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import type { JSX } from 'react'

interface PrivateRouteProps {
	children: JSX.Element
	requiredRole?:
		| 'owner'
		| 'employee'
		| 'residente'
		| 'citotecno'
		| 'patologo'
		| 'medicowner'
		| Array<'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner'>
}

/**
 * Protected route component that checks role permissions
 * Simplified for mock authentication environment
 */
const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
	const { user, loading: authLoading } = useAuth()
	const { profile, isLoading: profileLoading } = useUserProfile()

	// Show loading spinner while checking authentication and profile
	if (authLoading || profileLoading) {
		return (
			<div className="w-screen h-screen bg-dark flex items-center justify-center">
				<div className="bg-white dark:bg-gray-800 p-8 rounded-lg">
					<div className="flex items-center gap-3">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
						<p className="text-lg dark:text-white">Verificando permisos...</p>
					</div>
				</div>
			</div>
		)
	}

	// User must be logged in (have selected a role)
	if (!user) {
		console.log('No user found, redirecting to role selector')
		return <Navigate to="/" replace />
	}

	// Profile must exist
	if (!profile) {
		console.warn('No profile found for user:', user.id)
		return <Navigate to="/" replace />
	}

	// Check role permissions if a specific role is required
	if (requiredRole) {
		const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
		const userRole = profile.role as 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner'

		if (!allowedRoles.includes(userRole)) {
			console.log(`User role "${profile.role}" not in allowed roles: ${allowedRoles.join(', ')}`)

			// Redirect based on actual user role to their proper home
			switch (userRole) {
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
					return <Navigate to="/" replace />
			}
		}
	}

	console.log(`Access granted for user with role: ${profile.role}`)
	return children
}

export default PrivateRoute
