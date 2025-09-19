import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@shared/components/ui/card'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useAuth } from '@app/providers/AuthContext'
import EyeTrackingComponent from './RobotTraking'
import {
	FileText,
	Users,
	History,
	Settings,
	LogOut,
	FolderInput
} from 'lucide-react'

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

	const navigationButtons = [
		{
			title: 'Formulario',
			icon: FileText,
			path: '/employee/form',
			description: 'Crear nuevo registro'
		},
		{
			title: 'Registros',
			icon: FolderInput,
			path: '/employee/records',
			description: 'Ver todos los casos'
		},
		{
			title: 'Pacientes',
			icon: Users,
			path: '/employee/patients',
			description: 'Gestionar pacientes'
		},
		{
			title: 'Historial',
			icon: History,
			path: '/employee/changelogpage',
			description: 'Ver historial de cambios'
		},
		{
			title: 'Ajustes',
			icon: Settings,
			path: '/employee/settings',
			description: 'Configuración del sistema'
		},
		{
			title: 'Cerrar Sesión',
			icon: LogOut,
			path: '/',
			description: 'Salir del sistema',
			onClick: handleLogout
		}
	]

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
						Gestiona pacientes y registros médicos de forma eficiente.
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
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									{button.description}
								</p>
							</div>
						</div>
					</Card>
				))}
			</div>
		</div>
	)
}

export default ReceptionistHomePage
