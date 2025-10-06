import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '@services/supabase/config/config'
import { signOut as authSignOut } from '@services/supabase/auth/auth' // Rename to avoid conflicts
import { useSessionTimeoutSettings } from '@shared/hooks/useSessionTimeoutSettings'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
	user: User | null
	session: Session | null
	loading: boolean
	signOut: () => Promise<void>
	refreshUser: () => Promise<void>
	sessionTimeout: number
	updateUserTimeout: (minutes: number) => Promise<boolean | undefined>
	isLoadingTimeout: boolean
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	session: null,
	loading: true,
	signOut: async () => {},
	refreshUser: async () => {},
	sessionTimeout: 30,
	updateUserTimeout: async () => undefined,
	isLoadingTimeout: false,
})

export const useAuth = () => {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null)
	const [session, setSession] = useState<Session | null>(null)
	const [loading, setLoading] = useState(true)
	const isLoggingOut = useRef(false)
	const authSubscription = useRef<{ unsubscribe: () => void } | null>(null)

	// Handle session timeout
	const handleSessionTimeout = async () => {
		try {
			const {
				data: { session: currentSession },
				error,
			} = await supabase.auth.getSession()

			if (!currentSession || error) {
				console.warn('No active session found or error fetching session during timeout.', error)
				window.location.replace('/')
				return
			}

			const { error: signOutError } = await authSignOut()
			if (signOutError) {
				console.error('Error during timeout sign out:', signOutError)
			}
		} catch (err) {
			console.error('Unexpected error during session timeout:', err)
		} finally {
			setUser(null)
			setSession(null)
			window.location.replace('/')
		}
	}

	// Use the simplified hook that only manages settings
	const {
		sessionTimeout,
		updateUserTimeout,
		isLoading: isLoadingTimeout,
	} = useSessionTimeoutSettings({
		user,
	})

	// Listen for session timeout events from the SessionTimeoutProvider
	useEffect(() => {
		const handleTimeout = () => {
			handleSessionTimeout()
		}

		window.addEventListener('sessionTimeout', handleTimeout)
		return () => window.removeEventListener('sessionTimeout', handleTimeout)
	}, [])

	const refreshUser = async () => {
		try {
			const {
				data: { user: currentUser },
			} = await supabase.auth.getUser()
			setUser(currentUser)
		} catch (error) {
			console.error('Error refreshing user:', error)
			setUser(null)
		}
	}

	// Función para limpiar completamente el storage
	const clearAllStorage = () => {
		console.log('🧹 Limpiando todo el storage...')

		// Limpiar sessionStorage completamente
		sessionStorage.clear()
		console.log('✅ sessionStorage limpiado')

		// Limpiar cookies relacionadas con Supabase
		document.cookie.split(';').forEach(function (c) {
			document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
		})
		console.log('✅ Cookies limpiadas')
	}

	useEffect(() => {
		// Get initial session
		const getInitialSession = async () => {
			try {
				const {
					data: { session: initialSession },
				} = await supabase.auth.getSession()
				setSession(initialSession)
				setUser(initialSession?.user ?? null)
			} catch (error) {
				console.error('Error getting initial session:', error)
				await supabase.auth.signOut().catch((error) => {
					console.error('Error en signOut:', error)
				})
				setSession(null)
				setUser(null)
			} finally {
				setLoading(false)
			}
		}

		getInitialSession()

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, currentSession) => {
			// NO actualizar estado si estamos en proceso de logout
			if (isLoggingOut.current) {
				console.log('🚫 Ignoring auth state change during logout process')
				return
			}

			console.log('🔄 Auth state change:', event, currentSession?.user?.email)
			setSession(currentSession)
			setUser(currentSession?.user ?? null)
			setLoading(false)
		})

		authSubscription.current = subscription

		return () => {
			if (authSubscription.current) {
				authSubscription.current.unsubscribe()
			}
		}
	}, [])

	return (
		<AuthContext.Provider
			value={{
				user,
				session,
				loading,
				signOut: async () => {
					try {
						console.log('🚪 Iniciando proceso de logout...')

						// Marcar que estamos en proceso de logout
						isLoggingOut.current = true

						// Desuscribirse del listener de auth para evitar re-autenticación
						if (authSubscription.current) {
							authSubscription.current.unsubscribe()
							console.log('🔌 Auth subscription desuscrita')
						}

						// Limpiar estado inmediatamente
						setUser(null)
						setSession(null)
						console.log('🧹 Estado limpiado')

						// Limpiar TODO el storage
						clearAllStorage()

						// Intentar logout con Supabase
						console.log('🔐 Intentando logout con Supabase...')
						const { error } = await authSignOut()
						if (error) {
							console.error('❌ Error durante logout:', error)
						}

						// Forzar logout adicional
						await supabase.auth.signOut()
						console.log('✅ Logout adicional completado')

						// Limpiar storage nuevamente
						clearAllStorage()

						// Pausa más larga para asegurar limpieza
						await new Promise((resolve) => setTimeout(resolve, 500))
						console.log('⏳ Pausa completada')

						// Redirigir con replace para evitar navegación hacia atrás
						console.log('🔄 Redirigiendo a /')
						window.location.replace('/')
					} catch (err) {
						console.error('💥 Error inesperado durante logout:', err)
						// Aún así, limpiar y redirigir
						setUser(null)
						setSession(null)
						clearAllStorage()
						window.location.replace('/')
					} finally {
						// Resetear el flag después de un tiempo más largo
						setTimeout(() => {
							isLoggingOut.current = false
							console.log(' Flag de logout reseteado')
						}, 2000)
					}
				},
				refreshUser,
				sessionTimeout,
				updateUserTimeout,
				isLoadingTimeout,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}
