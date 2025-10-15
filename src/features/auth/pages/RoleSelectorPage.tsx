import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@app/providers/MockAuthContext'
import { User, UserCog, Stethoscope, Microscope, FlaskConical, Loader2 } from 'lucide-react'

interface RoleOption {
	key: string
	title: string
	description: string
	icon: React.ReactNode
	color: string
	bgColor: string
	route: string
}

const roles: RoleOption[] = [
	{
		key: 'owner',
		title: 'Owner',
		description: 'Acceso completo al sistema',
		icon: <User className="w-12 h-12" />,
		color: 'text-purple-600',
		bgColor: 'bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40',
		route: '/dashboard/home',
	},
	{
		key: 'employee',
		title: 'Recepcionista',
		description: 'Gestión de pacientes y registros',
		icon: <UserCog className="w-12 h-12" />,
		color: 'text-blue-600',
		bgColor: 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40',
		route: '/employee/home',
	},
	{
		key: 'residente',
		title: 'Residente',
		description: 'Revisión de casos médicos',
		icon: <Stethoscope className="w-12 h-12" />,
		color: 'text-green-600',
		bgColor: 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40',
		route: '/medic/cases',
	},
	{
		key: 'patologo',
		title: 'Patólogo',
		description: 'Análisis patológico de casos',
		icon: <Microscope className="w-12 h-12" />,
		color: 'text-orange-600',
		bgColor: 'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/40',
		route: '/patolo/cases',
	},
	{
		key: 'citotecno',
		title: 'Citotecnólogo',
		description: 'Análisis citológico de muestras',
		icon: <FlaskConical className="w-12 h-12" />,
		color: 'text-teal-600',
		bgColor: 'bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-900/40',
		route: '/cito/cases',
	},
]

export const RoleSelectorPage: React.FC = () => {
	const navigate = useNavigate()
	const { selectRole } = useAuth()
	const [selectedRole, setSelectedRole] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)

	const handleRoleSelect = async (role: RoleOption) => {
		setSelectedRole(role.key)
		setIsLoading(true)

		try {
			await selectRole(role.key)
			// Pequeña pausa para asegurar que la sesión se establezca
			await new Promise((resolve) => setTimeout(resolve, 500))
			navigate(role.route)
		} catch (error) {
			console.error('Error al seleccionar rol:', error)
			setIsLoading(false)
			setSelectedRole(null)
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
			<div className="max-w-6xl w-full">
				<div className="text-center mb-12">
					<h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">Selecciona tu Rol</h1>
					<p className="text-lg text-gray-600 dark:text-gray-400">
						Ambiente de Prueba - Elige un rol para acceder al sistema
					</p>
				</div>

				{isLoading && (
					<div className="mb-8 flex justify-center items-center gap-3 text-gray-700 dark:text-gray-300">
						<Loader2 className="w-6 h-6 animate-spin" />
						<span className="text-lg">Iniciando sesión...</span>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{roles.map((role) => (
						<button
							key={role.key}
							onClick={() => handleRoleSelect(role)}
							disabled={isLoading}
							className={`${role.bgColor} ${
								role.color
							} rounded-2xl p-8 transition-all transform hover:scale-105 hover:shadow-xl border-2 ${
								selectedRole === role.key ? 'border-current scale-105' : 'border-transparent'
							} flex flex-col items-center text-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
						>
							<div className="transform group-hover:scale-110 transition-transform">
								{selectedRole === role.key ? <Loader2 className="w-12 h-12 animate-spin" /> : role.icon}
							</div>
							<div>
								<h2 className="text-2xl font-bold mb-2">{role.title}</h2>
								<p className="text-sm opacity-75">{role.description}</p>
							</div>
						</button>
					))}
				</div>

				<div className="mt-12 text-center space-y-3">
					<div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg text-sm">
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						<span className="font-medium">Modo de prueba activado - RLS deshabilitado temporalmente</span>
					</div>
					<div className="text-sm text-gray-500 dark:text-gray-400">
						Todas las operaciones funcionarán sin autenticación real
					</div>
				</div>
			</div>
		</div>
	)
}

export default RoleSelectorPage
