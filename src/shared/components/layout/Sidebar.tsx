import React from 'react'
import {
	Home,
	PieChart,
	FileText,
	FolderInput,
	LogOut,
	// Microscope,
	Moon,
	Sun,
	Users,
	Settings,
	History,
	User,
	ChevronDown,
	ChevronRight,
	Clipboard,
	Microscope,
	// Brain,
	FolderSearch,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@app/providers/AuthContext'
import FavIcon from '@shared/components/icons/FavIcon'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { cn } from '@shared/lib/cn'

interface NavItemProps {
	to: string
	icon: React.ReactNode
	label: string
	showFullContent: boolean
	onClick?: () => void
	title?: string
}

interface NavGroupProps {
	icon: React.ReactNode
	label: string
	showFullContent: boolean
	isExpanded: boolean
	onToggle: () => void
	children: React.ReactNode
	childPaths: string[] // Array de rutas de los items hijos
	isMobile?: boolean // Para manejar comportamiento diferente en mobile
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, showFullContent, onClick, title }) => {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				`flex justify-between items-center gap-2 sm:gap-3 cursor-pointer w-full py-2 px-1 rounded-md transition-none ${
					isActive ? 'text-Conspat border-primary' : 'hover:text-Conspat'
				}`
			}
			onClick={onClick}
			title={!showFullContent ? title || label : undefined}
		>
			<div className="flex gap-3 items-center min-w-0">
				{icon}
				<p
					className={`text-sm whitespace-nowrap transition-none ${
						showFullContent ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
					}`}
				>
					{label}
				</p>
			</div>
		</NavLink>
	)
}

const NavGroup: React.FC<NavGroupProps> = ({
	icon,
	label,
	showFullContent,
	isExpanded,
	onToggle,
	children,
	childPaths,
	isMobile = false,
}) => {
	const [hoverTimeout, setHoverTimeout] = React.useState<NodeJS.Timeout | null>(null)

	// Verificar si algún item hijo está activo
	const isChildActive = childPaths.some((path) => window.location.pathname === path)

	// Funciones para hover (solo desktop)
	const handleMouseEnter = () => {
		if (isMobile) return // No hacer nada en mobile

		if (hoverTimeout) {
			clearTimeout(hoverTimeout)
			setHoverTimeout(null)
		}
		if (!isExpanded) {
			onToggle()
		}
	}

	const handleMouseLeave = () => {
		if (isMobile) return // No hacer nada en mobile

		if (hoverTimeout) {
			clearTimeout(hoverTimeout)
		}
		const timeout = setTimeout(() => {
			if (isExpanded) {
				onToggle()
			}
		}, 0) // Delay de 200ms antes de cerrar
		setHoverTimeout(timeout)
	}

	// Función para click (mobile y desktop)
	const handleClick = () => {
		if (isMobile) {
			// En mobile, solo funciona con clicks
			onToggle()
		} else {
			// En desktop, también permitir clicks para mayor flexibilidad
			if (hoverTimeout) {
				clearTimeout(hoverTimeout)
				setHoverTimeout(null)
			}
			onToggle()
		}
	}

	// Limpiar timeout al desmontar
	React.useEffect(() => {
		return () => {
			if (hoverTimeout) {
				clearTimeout(hoverTimeout)
			}
		}
	}, [hoverTimeout])

	return (
		<div className="space-y-1" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
			<div
				className={`flex justify-between items-center gap-2 sm:gap-3 cursor-pointer w-full py-2 px-1 rounded-md transition-none ${
					isExpanded || isChildActive ? 'text-Conspat' : 'hover:text-Conspat'
				}`}
				title={!showFullContent ? label : undefined}
				onClick={handleClick}
			>
				<div className="flex gap-3 items-center min-w-0">
					{icon}
					<p
						className={`text-sm whitespace-nowrap transition-none ${
							showFullContent ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
						}`}
					>
						{label}
					</p>
				</div>
				{showFullContent && (
					<div className="transition-transform duration-500">
						{isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
					</div>
				)}
			</div>

			<div
				className={cn(
					'pl-2 space-y-1 overflow-hidden transition-[max-height] duration-500',
					isExpanded ? 'max-h-96 transition-[max-height] duration-600' : 'max-h-0 transition-[max-height] duration-400',
				)}
			>
				{children}
			</div>
		</div>
	)
}

interface SidebarProps {
	onClose?: () => void
	isExpanded?: boolean
	isMobile?: boolean
	isDark: boolean
	toggleDarkMode: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ onClose, isExpanded = false, isMobile = false, isDark, toggleDarkMode }) => {
	// For mobile, always show full sidebar. For desktop, use isExpanded state
	const showFullContent = isMobile || isExpanded
	const navigate = useNavigate()
	const { signOut } = useAuth()
	const { profile } = useUserProfile()

	// Definir las rutas de cada grupo
	const clinicalPaths = ['/dashboard/cases', '/dashboard/my-cases', '/dashboard/patients', '/patients']
	const reportsPaths = ['/dashboard/stats', '/dashboard/reports']

	const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
		clinical: false,
		reports: false,
	})

	const toggleGroup = (groupName: string) => {
		setExpandedGroups((prev) => {
			// En modo mobile, cerrar todos los demás grupos antes de abrir el actual
			if (isMobile) {
				const newState = {
					clinical: false,
					reports: false,
				}
				// Solo abrir el grupo actual si no estaba ya abierto
				if (!prev[groupName]) {
					newState[groupName as keyof typeof newState] = true
				}
				return newState
			}

			// En desktop, comportamiento normal
			return {
				...prev,
				[groupName]: !prev[groupName],
			}
		})
	}

	// Función para determinar qué grupos deben estar expandidos basándose en la ruta actual
	const getExpandedGroupsForCurrentPath = () => {
		const currentPath = window.location.pathname
		const groups: Record<string, boolean> = {
			clinical: false,
			reports: false,
		}

		// Verificar si la ruta actual pertenece a algún grupo
		if (clinicalPaths.includes(currentPath)) {
			groups.clinical = true
		}
		if (reportsPaths.includes(currentPath)) {
			groups.reports = true
		}

		return groups
	}

	// Expandir grupos automáticamente cuando se abre el sidebar
	React.useEffect(() => {
		if (showFullContent) {
			// Solo expandir grupos cuando el sidebar está expandido
			const groupsToExpand = getExpandedGroupsForCurrentPath()
			setExpandedGroups(groupsToExpand)
		} else {
			// Colapsar todos los grupos cuando el sidebar está colapsado
			setExpandedGroups({
				clinical: false,
				reports: false,
			})
		}
	}, [showFullContent])

	const handleLogout = async () => {
		await signOut()
		// Clear session storage
		sessionStorage.removeItem('last_activity_time')
		sessionStorage.removeItem('session_expiry_time')
		sessionStorage.removeItem('session_timeout_minutes')
		sessionStorage.removeItem('sessionTimeout')
		navigate('/')
	}

	// Determine if user is admin role
	const isResidente = profile?.role === 'residente'
	const isOwner = profile?.role === 'owner'
	const isEmployee = profile?.role === 'employee'
	const isCitotecno = profile?.role === 'citotecno'
	const isPatologo = profile?.role === 'patologo'
	const isMedicowner = profile?.role === 'medicowner'

	return (
		<aside className="bg-white/80 dark:bg-background/50 shadow-lg shadow-primary/50 backdrop-blur-[3px] dark:backdrop-blur-[10px] flex flex-col h-screen py-4 sm:py-6 px-2 sm:px-4 gap-0 text-gray-700 dark:text-white ease-in-out overflow-hidden border-r border-input">
			{/* Zona scrollable: navegación y grupos */}
			<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 flex flex-col items-start gap-4 scrollbar-hide">
				<div className="flex justify-between items-center w-full mb-2 sm:mb-4">
					<a
						href="https://conspat.solware.agency/"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 hover:opacity-80 transition-none"
					>
						<FavIcon fill="#e82084" className="size-8 shrink-0 -ml-1" />
						<p
							className={`text-2xl font-bold whitespace-nowrap transition-none ${
								showFullContent ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
							}`}
						>
							Conspat
						</p>
					</a>
				</div>

				<div className="flex flex-col justify-center gap-2">
					{isOwner && (
						<>
							<div className="py-1">
								<NavItem
									to="/dashboard/home"
									icon={<Home className="stroke-2 size-5 shrink-0" />}
									label="Inicio"
									showFullContent={showFullContent}
									onClick={onClose}
								/>
							</div>
							<div className="py-1">
								<NavItem
									to="/dashboard/medical-form"
									icon={<FileText className="stroke-2 size-5 shrink-0" />}
									label="Formulario"
									showFullContent={showFullContent}
									onClick={onClose}
								/>
							</div>
							<NavGroup
								icon={<Microscope className="stroke-2 size-4 sm:size-5 shrink-0" />}
								label="Clínico"
								showFullContent={showFullContent}
								isExpanded={expandedGroups.clinical}
								onToggle={() => toggleGroup('clinical')}
								childPaths={clinicalPaths}
								isMobile={isMobile}
							>
								{/* Cases - For all roles */}
								<NavItem
									to="/dashboard/cases"
									icon={<FolderInput className="stroke-2 size-5 shrink-0" />}
									label="Casos"
									showFullContent={showFullContent}
									onClick={onClose}
								/>

								<NavItem
									to="/dashboard/patients"
									icon={<User className="stroke-2 size-5 shrink-0" />}
									label="Pacientes"
									showFullContent={showFullContent}
									onClick={onClose}
								/>
							</NavGroup>
							<NavGroup
								icon={<FolderSearch className="stroke-2 size-4 sm:size-5 shrink-0" />}
								label="Análisis"
								showFullContent={showFullContent}
								isExpanded={expandedGroups.reports}
								onToggle={() => toggleGroup('reports')}
								childPaths={reportsPaths}
								isMobile={isMobile}
							>
								<NavItem
									to="/dashboard/stats"
									icon={<PieChart className="stroke-2 size-5 shrink-0" />}
									label="Estadísticas"
									showFullContent={showFullContent}
									onClick={onClose}
								/>

								<NavItem
									to="/dashboard/reports"
									icon={<Clipboard className="stroke-2 size-5 shrink-0" />}
									label="Reportes"
									showFullContent={showFullContent}
									onClick={onClose}
								/>
								<NavItem
									to="/dashboard/changelog"
									icon={<History className="stroke-2 size-5 shrink-0" />}
									label="Historial"
									showFullContent={showFullContent}
									onClick={onClose}
								/>
							</NavGroup>
							<NavItem
								to="/dashboard/users"
								icon={<Users className="stroke-2 size-4 sm:size-5 shrink-0" />}
								label="Usuarios"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
						</>
					)}

					{isMedicowner && (
						<>
							<div className="py-1">
								<NavItem
									to="/dashboard/home"
									icon={<Home className="stroke-2 size-5 shrink-0" />}
									label="Inicio"
									showFullContent={showFullContent}
									onClick={onClose}
								/>
							</div>
							{/* Cases - For all roles */}
							<NavItem
								to="/dashboard/cases"
								icon={<FolderInput className="stroke-2 size-5 shrink-0" />}
								label="Casos"
								showFullContent={showFullContent}
								onClick={onClose}
							/>

							<NavItem
								to="/dashboard/patients"
								icon={<User className="stroke-2 size-5 shrink-0" />}
								label="Pacientes"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
							<NavItem
								to="/dashboard/stats"
								icon={<PieChart className="stroke-2 size-5 shrink-0" />}
								label="Estadísticas"
								showFullContent={showFullContent}
								onClick={onClose}
							/>

							<NavItem
								to="/dashboard/reports"
								icon={<Clipboard className="stroke-2 size-5 shrink-0" />}
								label="Reportes"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
						</>
					)}

					{/* Employee specific routes */}
					{isEmployee && (
						<>
							<NavItem
								to="/employee/home"
								icon={<Home className="stroke-2 size-5 shrink-0" />}
								label="Inicio"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
							<NavItem
								to="/employee/form"
								icon={<FileText className="stroke-2 size-5 shrink-0" />}
								label="Formulario"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
							<NavItem
								to="/employee/records"
								icon={<FolderInput className="stroke-2 size-5 shrink-0" />}
								label="Registros"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
							<NavItem
								to="/employee/patients"
								icon={<Users className="stroke-2 size-5 shrink-0" />}
								label="Pacientes"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
							<NavItem
								to="/employee/changelogpage"
								icon={<History className="stroke-2 size-5 shrink-0" />}
								label="Historial"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
						</>
					)}

					{isResidente && (
						<>
							{/* <NavItem
								to="/medic/form"
								icon={<FileText className="stroke-2 size-5 shrink-0" />}
								label="Formulario"
								showFullContent={showFullContent}
								onClick={onClose}
							/> */}
							<NavItem
								to="/medic/cases"
								icon={<FolderInput className="stroke-2 size-5 shrink-0" />}
								label="Casos"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
							{/* <NavItem
								to="/medic/my-cases"
								icon={<FolderInput className="stroke-2 size-5 shrink-0" />}
								label="Mis Casos"
								showFullContent={showFullContent}
								onClick={onClose}
							/> */}
							{/* <NavItem
								to="/medic/users"
								icon={<Users className="stroke-2 size-5 shrink-0" />}
								label="Usuarios"
								showFullContent={showFullContent}
								onClick={onClose}
							/> */}
						</>
					)}

					{isCitotecno && (
						<>
							<NavItem
								to="/cito/cases"
								icon={<FolderInput className="stroke-2 size-5 shrink-0" />}
								label="Casos"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
						</>
					)}

					{isPatologo && (
						<>
							<NavItem
								to="/patolo/cases"
								icon={<FolderInput className="stroke-2 size-5 shrink-0" />}
								label="Casos"
								showFullContent={showFullContent}
								onClick={onClose}
							/>
						</>
					)}

					{/* {(isOwner || isResidente) && (
						<NavItem
							to="/chat"
							icon={<Brain className="stroke-2 size-5 shrink-0" />}
							label="Chat IA"
							showFullContent={showFullContent}
							onClick={onClose}
						/>
					)} */}
				</div>
			</div>

			{/* Pie fijo: Ajustes, tema y salir */}
			<div className="shrink-0 flex flex-col justify-center gap-1 border-t border-input pt-2 sm:pt-3">
				{isOwner && (
					<NavItem
						to="/dashboard/settings"
						icon={<Settings className="stroke-2 size-4 sm:size-5 shrink-0" />}
						label="Ajustes"
						showFullContent={showFullContent}
						onClick={onClose}
					/>
				)}

				{isEmployee && (
					<NavItem
						to="/employee/settings"
						icon={<Settings className="stroke-2 size-4 sm:size-5 shrink-0" />}
						label="Ajustes"
						showFullContent={showFullContent}
						onClick={onClose}
					/>
				)}

				{isResidente && (
					<NavItem
						to="/medic/settings"
						icon={<Settings className="stroke-2 size-4 sm:size-5 shrink-0" />}
						label="Ajustes"
						showFullContent={showFullContent}
						onClick={onClose}
					/>
				)}

				{isMedicowner && (
					<NavItem
						to="/dashboard/settings"
						icon={<Settings className="stroke-2 size-4 sm:size-5 shrink-0" />}
						label="Ajustes"
						showFullContent={showFullContent}
						onClick={onClose}
					/>
				)}

				{isCitotecno && (
					<NavItem
						to="/cito/settings"
						icon={<Settings className="stroke-2 size-4 sm:size-5 shrink-0" />}
						label="Ajustes"
						showFullContent={showFullContent}
						onClick={onClose}
					/>
				)}

				{isPatologo && (
					<NavItem
						to="/patolo/settings"
						icon={<Settings className="stroke-2 size-4 sm:size-5 shrink-0" />}
						label="Ajustes"
						showFullContent={showFullContent}
						onClick={onClose}
					/>
				)}

				<div
					onClick={toggleDarkMode}
					title={!showFullContent ? 'Cambiar color' : undefined}
					className="flex items-center gap-2 cursor-pointer hover:text-primary py-2 px-1 rounded-md transition-none"
					aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
				>
					{isDark ? (
						<Sun className="stroke-2 size-4 sm:size-5 shrink-0" />
					) : (
						<Moon className="stroke-2 size-4 sm:size-5 shrink-0" />
					)}
					<p
						className={`text-sm whitespace-nowrap transition-none ${
							showFullContent ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
						}`}
					>
						{isDark ? 'Claro' : 'Oscuro'}
					</p>
				</div>
				<div
					onClick={handleLogout}
					title={!showFullContent ? 'Salir' : undefined}
					className="flex items-center gap-2 cursor-pointer hover:text-red-500 py-2 px-1 rounded-md transition-none"
				>
					<LogOut className="stroke-2 size-4 sm:size-5 shrink-0 text-red-500" />
					<p
						className={`text-sm whitespace-nowrap transition-none ${
							showFullContent ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
						}`}
					>
						Salir
					</p>
				</div>
			</div>
		</aside>
	)
}

export default Sidebar
