import { Navigate } from 'react-router-dom'
import { useLaboratory } from '@app/providers/LaboratoryContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'

interface InntegrasGuardProps {
	children: JSX.Element
}

const getFallbackPathByRole = (role?: string) => {
	switch (role) {
		case 'owner':
			return '/dashboard/home'
		case 'employee':
			return '/employee/home'
		case 'prueba':
			return '/prueba/home'
		default:
			return '/'
	}
}

export default function InntegrasGuard({ children }: InntegrasGuardProps) {
	const { laboratory, isLoading } = useLaboratory()
	const { profile, isLoading: profileLoading } = useUserProfile()

	if (isLoading || profileLoading || !laboratory) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
			</div>
		)
	}

	const isInntegras = laboratory?.slug === 'inntegras'
	if (!isInntegras) {
		return <Navigate to={getFallbackPathByRole(profile?.role)} replace />
	}

	return children
}
