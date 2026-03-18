import { Navigate } from 'react-router-dom'
import { useAuth } from '@app/providers/AuthContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useLaboratory } from '@app/providers/LaboratoryContext'
import type { JSX } from 'react'

interface PrivateRouteProps {
	children: JSX.Element
	requiredRole?: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner' | 'medico_tratante' | 'enfermero' | 'call_center' | 'prueba' | 'admin' | 'imagenologia' | 'laboratorio' | 'coordinador' | Array<'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner' | 'medico_tratante' | 'enfermero' | 'call_center' | 'prueba' | 'admin' | 'imagenologia' | 'laboratorio' | 'coordinador'>
}

/**
 * Protected route component that checks authentication, email verification, and role permissions
 * Only allows access to users with verified emails and appropriate roles
 */
const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
	const { user, loading: authLoading, signOut } = useAuth()
	const { profile, isLoading: profileLoading, error: profileError } = useUserProfile()
	const { laboratory, isLoading: labLoading } = useLaboratory()

	// Mostrar spinner mientras:
	// 1. Auth todavía resuelve
	// 2. Profile se está cargando por primera vez (no está en caché)
	// 3. Laboratory se está cargando por primera vez (para que las CSS variables estén listas antes de renderizar)
	const isInitialLoad = authLoading || (profileLoading && !profile) || (labLoading && !laboratory)

	if (isInitialLoad) {
		return (
			<div className="w-screen h-screen bg-background flex items-center justify-center">
				<div className="flex items-center gap-3">
					<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
		
		// Si el error es PGRST116 (no rows returned), significa que el perfil fue eliminado
		// Hacer logout automático y redirigir
		if (profileError?.code === 'PGRST116') {
			console.warn('⚠️ Perfil eliminado detectado (PGRST116) - haciendo logout automático')
			// Ejecutar logout en un efecto separado para evitar problemas con hooks
			signOut().then(() => {
				window.location.href = '/'
			}).catch(() => {
				// Forzar redirección incluso si hay error
				window.location.href = '/'
			})
			return (
				<div className="w-screen h-screen bg-background flex items-center justify-center">
					<div className="bg-card text-card-foreground p-8 rounded-lg border border-border max-w-md text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<p className="text-muted-foreground">Cerrando sesión...</p>
					</div>
				</div>
			)
		}
		
		// Para otros errores, mostrar mensaje de error con opción de reintentar
		return (
			<div className="w-screen h-screen bg-background flex items-center justify-center">
				<div className="bg-card text-card-foreground p-8 rounded-lg border border-border max-w-md text-center">
					<div className="text-destructive mb-4">
						<svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-semibold mb-2">Error de Perfil</h3>
					<p className="text-muted-foreground mb-4">
						No se pudo cargar tu perfil de usuario. Esto puede ser un problema temporal.
					</p>
					<button
						onClick={() => window.location.reload()}
						className="bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 transition-none"
					>
						Reintentar
					</button>
				</div>
			</div>
		)
	}

	// Check role permissions if a specific role is required
	// Rol "prueba" (godmode) tiene acceso a todo, bypass de verificación de roles
	if (requiredRole && profile.role !== 'prueba') {
		const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

		// [DEBUG] Log específico para coordinador
		if (process.env.NODE_ENV === 'development' && profile.role === 'coordinador') {
			console.log('🔍 [PrivateRoute] Usuario coordinador accediendo a ruta', {
				userRole: profile.role,
				requiredRole,
				allowedRoles,
				isAllowed: allowedRoles.includes(profile.role)
			});
		}

		if (!allowedRoles.includes(profile.role)) {
			console.log(`User role "${profile.role}" not in allowed roles: ${allowedRoles.join(', ')}`)
			console.debug('PrivateRoute debug - allowedRoles:', allowedRoles, 'profile.role:', profile.role)

			// Redirect based on actual user role to their proper home
			const userRole = profile.role as string
			switch (userRole) {
				case 'owner':
					return <Navigate to="/dashboard/home" replace />
				case 'prueba':
					return <Navigate to="/prueba/home" replace />
				case 'medicowner':
					return <Navigate to="/dashboard/home" replace />
				case 'laboratorio':
					return <Navigate to="/laboratorio/home" replace />
				// Cada rol va a su propia ruta de home (que renderiza el mismo componente)
				case 'residente':
					return <Navigate to="/medic/home" replace />
				case 'employee':
					return <Navigate to="/employee/home" replace />
				case 'coordinador':  // coordinador tiene mismos permisos que employee
					return <Navigate to="/employee/home" replace />
				case 'citotecno':
					return <Navigate to="/cito/home" replace />
				case 'patologo':
					return <Navigate to="/patolo/home" replace />
				case 'imagenologia':
					return <Navigate to="/imagenologia/home" replace />
				case 'medico_tratante':
					return <Navigate to="/medico-tratante/home" replace />
				case 'enfermero':
					return <Navigate to="/enfermero/home" replace />
				case 'call_center':
					return <Navigate to="/call-center/home" replace />
				case 'admin':
					return <Navigate to="/medic/home" replace />
				default:
					// Fallback para roles desconocidos
					return <Navigate to="/employee/home" replace />
			}
		}
	}

	console.log(`Access granted for user with role: ${profile.role}`)
	return children
}

export default PrivateRoute
