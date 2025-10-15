import { createContext, useContext, useEffect, useState } from 'react'
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
	selectRole: (role: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	session: null,
	loading: false,
	signOut: async () => {},
	refreshUser: async () => {},
	sessionTimeout: 30,
	updateUserTimeout: async () => undefined,
	isLoadingTimeout: false,
	selectRole: async () => {},
})

export const useAuth = () => {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

// Usuarios mock con datos completos para cada rol
const MOCK_USERS = {
	owner: {
		id: 'a0000000-0000-0000-0000-000000000001',
		email: 'owner@test.com',
		role: 'owner',
		display_name: 'Usuario Owner',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
	},
	employee: {
		id: 'a0000000-0000-0000-0000-000000000002',
		email: 'employee@test.com',
		role: 'employee',
		display_name: 'Usuario Recepcionista',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
	},
	residente: {
		id: 'a0000000-0000-0000-0000-000000000003',
		email: 'residente@test.com',
		role: 'residente',
		display_name: 'Usuario Residente',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
	},
	patologo: {
		id: 'a0000000-0000-0000-0000-000000000004',
		email: 'patologo@test.com',
		role: 'patologo',
		display_name: 'Usuario Patólogo',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
	},
	citotecno: {
		id: 'a0000000-0000-0000-0000-000000000005',
		email: 'citotecnologo@test.com',
		role: 'citotecno',
		display_name: 'Usuario Citotecnólogo',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
	},
}

// Función helper para crear un objeto User mock
const createMockUser = (mockData: (typeof MOCK_USERS)[keyof typeof MOCK_USERS]): User => {
	return {
		id: mockData.id,
		aud: 'authenticated',
		role: 'authenticated',
		email: mockData.email,
		email_confirmed_at: new Date().toISOString(),
		phone: '',
		confirmed_at: new Date().toISOString(),
		last_sign_in_at: new Date().toISOString(),
		app_metadata: { provider: 'mock' },
		user_metadata: {
			display_name: mockData.display_name,
			role: mockData.role,
		},
		identities: [],
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}
}

// Función helper para crear una Session mock
const createMockSession = (user: User): Session => {
	return {
		access_token: 'mock-access-token',
		refresh_token: 'mock-refresh-token',
		expires_in: 3600,
		expires_at: Math.floor(Date.now() / 1000) + 3600,
		token_type: 'bearer',
		user: user,
	}
}

export const MockAuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null)
	const [session, setSession] = useState<Session | null>(null)
	const [loading, setLoading] = useState(true)

	// Cargar rol guardado en localStorage al iniciar
	useEffect(() => {
		const savedRole = localStorage.getItem('mockUserRole')
		if (savedRole && MOCK_USERS[savedRole as keyof typeof MOCK_USERS]) {
			const mockData = MOCK_USERS[savedRole as keyof typeof MOCK_USERS]
			const mockUser = createMockUser(mockData)
			const mockSession = createMockSession(mockUser)
			setUser(mockUser)
			setSession(mockSession)
		}
		setLoading(false)
	}, [])

	const selectRole = async (role: string) => {
		const mockData = MOCK_USERS[role as keyof typeof MOCK_USERS]
		if (!mockData) {
			console.error('Rol no válido:', role)
			return
		}

		setLoading(true)

		// Pequeña pausa para simular login
		await new Promise((resolve) => setTimeout(resolve, 300))

		const mockUser = createMockUser(mockData)
		const mockSession = createMockSession(mockUser)

		setUser(mockUser)
		setSession(mockSession)
		localStorage.setItem('mockUserRole', role)

		console.log(`✅ Modo Mock: Autenticado como ${mockData.display_name} (${mockData.email})`)
		console.log('⚠️ RLS deshabilitado - Solo para pruebas')

		setLoading(false)
	}

	const signOut = async () => {
		setUser(null)
		setSession(null)
		localStorage.removeItem('mockUserRole')
		window.location.replace('/')
	}

	const refreshUser = async () => {
		console.log('Mock: refreshUser called')
	}

	const updateUserTimeout = async (minutes: number) => {
		console.log('Mock: updateUserTimeout called with', minutes)
		return true
	}

	return (
		<AuthContext.Provider
			value={{
				user,
				session,
				loading,
				signOut,
				refreshUser,
				sessionTimeout: 30,
				updateUserTimeout,
				isLoadingTimeout: false,
				selectRole,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

// Exportar también el provider con el nombre original para compatibilidad
export const AuthProvider = MockAuthProvider
