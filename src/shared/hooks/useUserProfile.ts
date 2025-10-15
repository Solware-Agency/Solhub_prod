import { useAuth } from '@app/providers/MockAuthContext'
import type { Tables } from '@shared/types/types'

// Perfiles mock basados en los usuarios mock
const MOCK_PROFILES: Record<string, Tables<'profiles'>> = {
	'a0000000-0000-0000-0000-000000000001': {
		id: 'a0000000-0000-0000-0000-000000000001',
		email: 'owner@test.com',
		email_lower: 'owner@test.com',
		role: 'owner',
		display_name: 'Usuario Owner',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	},
	'a0000000-0000-0000-0000-000000000002': {
		id: 'a0000000-0000-0000-0000-000000000002',
		email: 'employee@test.com',
		email_lower: 'employee@test.com',
		role: 'employee',
		display_name: 'Usuario Recepcionista',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	},
	'a0000000-0000-0000-0000-000000000003': {
		id: 'a0000000-0000-0000-0000-000000000003',
		email: 'residente@test.com',
		email_lower: 'residente@test.com',
		role: 'residente',
		display_name: 'Usuario Residente',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	},
	'a0000000-0000-0000-0000-000000000004': {
		id: 'a0000000-0000-0000-0000-000000000004',
		email: 'patologo@test.com',
		email_lower: 'patologo@test.com',
		role: 'patologo',
		display_name: 'Usuario Patólogo',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	},
	'a0000000-0000-0000-0000-000000000005': {
		id: 'a0000000-0000-0000-0000-000000000005',
		email: 'citotecnologo@test.com',
		email_lower: 'citotecnologo@test.com',
		role: 'citotecno',
		display_name: 'Usuario Citotecnólogo',
		estado: 'aprobado',
		assigned_branch: null,
		phone: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	},
}

export const useUserProfile = () => {
	const { user, loading: authLoading } = useAuth()

	// Retornar perfil mock basado en el ID del usuario
	const profile = user?.id ? MOCK_PROFILES[user.id] : null

	return {
		profile: profile || null,
		isLoading: authLoading,
		error: null,
		refetch: async () => {
			console.log('Mock: refetch called')
		},
	}
}
