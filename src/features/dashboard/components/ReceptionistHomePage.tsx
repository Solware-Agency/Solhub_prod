import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@shared/components/ui/card'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useAuth } from '@app/providers/AuthContext'
import EyeTrackingComponent from './RobotTraking'
import { FileText, Users, History, Settings, LogOut, FolderInput } from 'lucide-react'
import type { UserRole } from '@services/supabase/laboratories/laboratory-roles-service'

// Mapeo de rutas por rol
const ROLE_ROUTES: Record<string, { cases?: string; patients?: string; settings?: string; form?: string; changelog?: string; home?: string }> = {
	employee: {
		home: '/employee/home',
		cases: '/employee/records',
		patients: '/employee/patients',
		settings: '/employee/settings',
		form: '/employee/form',
		changelog: '/employee/changelog',
	},
	residente: {
		home: '/medic/home',
		cases: '/medic/cases',
		settings: '/medic/settings',
	},
	citotecno: {
		home: '/cito/home',
		cases: '/cito/cases',
		settings: '/cito/settings',
	},
	patologo: {
		home: '/patolo/home',
		cases: '/patolo/cases',
		settings: '/patolo/settings',
	},
	imagenologia: {
		home: '/imagenologia/home',
		cases: '/imagenologia/cases',
		patients: '/imagenologia/patients',
	},
	medico_tratante: {
		home: '/medico-tratante/home',
		cases: '/medico-tratante/cases',
		patients: '/medico-tratante/patients',
		settings: '/medico-tratante/settings',
	},
	enfermero: {
		home: '/enfermero/home',
		cases: '/enfermero/cases',
		patients: '/enfermero/patients',
		settings: '/enfermero/settings',
	},
	call_center: {
		home: '/call-center/home',
		cases: '/call-center/cases',
		patients: '/call-center/patients',
		settings: '/call-center/settings',
	},
}

// Función para determinar qué botones mostrar según el rol
const getAvailableButtonsForRole = (role: UserRole | undefined) => {
	if (!role) return []

	const routes = ROLE_ROUTES[role] || {}
	const buttons: Array<{
		title: string
		icon: React.ComponentType<{ className?: string }>
		path?: string
		description: string
		onClick?: () => void
	}> = []

	// Formulario: Solo employee
	if (role === 'employee' && routes.form) {
		buttons.push({
			title: 'Formulario',
			icon: FileText,
			path: routes.form,
			description: 'Crear nuevo registro',
		})
	}

	// Casos: Todos los roles (excepto owner)
	if (routes.cases) {
		buttons.push({
			title: 'Casos',
			icon: FolderInput,
			path: routes.cases,
			description: 'Ver todos los casos',
		})
	}

	// Pacientes: employee, imagenologia, medico_tratante, enfermero, call_center
	if (routes.patients) {
		buttons.push({
			title: 'Pacientes',
			icon: Users,
			path: routes.patients,
			description: 'Gestionar pacientes',
		})
	}

	// Historial: Solo employee
	if (role === 'employee' && routes.changelog) {
		buttons.push({
			title: 'Historial',
			icon: History,
			path: routes.changelog,
			description: 'Ver historial de cambios',
		})
	}

	// Ajustes: Todos los roles (excepto owner)
	if (routes.settings) {
		buttons.push({
			title: 'Ajustes',
			icon: Settings,
			path: routes.settings,
			description: 'Configuración del sistema',
		})
	}

	return buttons
}

const ReceptionistHomePage: React.FC = () => {
	const navigate = useNavigate()
	const { profile } = useUserProfile()
	const { signOut } = useAuth()

	const handleLogout = async () => {
		try {
			await signOut()
			// Clear session storage
			sessionStorage.removeItem('last_activity_time')
			sessionStorage.removeItem('session_expiry_time')
			sessionStorage.removeItem('session_timeout_minutes')
			sessionStorage.removeItem('sessionTimeout')
			navigate('/')
		} catch (error) {
			console.error('Error during logout:', error)
			// Fallback: redirect to login even if logout fails
			navigate('/')
		}
	}

	// Obtener botones disponibles según el rol
	const navigationButtons = useMemo(() => {
		const buttons = getAvailableButtonsForRole(profile?.role as UserRole)
		
		// Agregar botón de cerrar sesión al final
		buttons.push({
			title: 'Cerrar Sesión',
			icon: LogOut,
			path: '/',
			description: 'Salir del sistema',
			onClick: handleLogout,
		})

		return buttons
	}, [profile?.role])

	return (
		<div className="max-w-6xl mx-auto h-full flex flex-col">
			{/* Welcome Banner - Compact */}
			<Card className="mb-4 dark:bg-background bg-white rounded-xl py-4 px-6 flex flex-col sm:flex-row items-center justify-between shadow-lg cursor-pointer hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300">
				<div className="flex-1 text-center sm:text-left mb-3 sm:mb-0">
					<div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-1">
						<div>
							<h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
								Bienvenido a SolHub
							</h1>
							<div className="flex items-center justify-center sm:justify-start gap-2 mt-1 font-semibold">
								{profile?.display_name && (
									<span className="text-sm sm:text-md text-primary">{profile.display_name}</span>
								)}
							</div>
						</div>
					</div>
					<p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
						Accede a las herramientas y funcionalidades disponibles para tu rol.
					</p>
				</div>
				<div className="relative">
					<div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-5 animate-pulse"></div>
					<EyeTrackingComponent className="w-20 h-20 sm:w-24 sm:h-24 z-10" />
				</div>
			</Card>

			{/* Navigation Grid - Compact spacing */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
				{navigationButtons.map((button, index) => (
					<Card
						key={index}
						className="dark:bg-background bg-white rounded-xl p-4 cursor-pointer hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 group"
						onClick={() => {
							if (button.onClick) {
								button.onClick()
							} else if (button.path) {
								navigate(button.path)
							}
						}}
					>
						<div className="flex flex-col items-center text-center space-y-3">
							<div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 group-hover:from-blue-600 group-hover:to-purple-600 transition-transform duration-300">
								<button.icon className="w-6 h-6 text-white" />
							</div>
							<div>
								<h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary">
									{button.title}
								</h3>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{button.description}</p>
							</div>
						</div>
					</Card>
				))}
			</div>
		</div>
	)
}

export default ReceptionistHomePage
