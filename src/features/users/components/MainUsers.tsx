import React, { useState, useEffect } from 'react'
import {
	Users,
	Mail,
	Calendar,
	Crown,
	Briefcase,
	MapPin,
	CheckCircle,
	Clock,
	User,
	ShieldCheck,
	Info,
	Copy,
	Phone,
	Wand,
	Microscope,
	Shield,
} from 'lucide-react'
import { Card } from '@shared/components/ui/card'
import { Input } from '@shared/components/ui/input'
import { CustomDropdown } from '@shared/components/ui/custom-dropdown'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase/config/config'
import {
	updateUserRole,
	updateUserBranch,
	canManageUsers,
	updateUserApprovalStatus,
} from '@/services/supabase/auth/user-management'
import { useAuth } from '@app/providers/MockAuthContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@shared/hooks/use-toast'
import { Button } from '@shared/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@shared/components/ui/dialog'
import { formatPhoneForDisplay } from '@shared/utils/phone-utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'

interface UserProfile {
	id: string
	email: string
	role: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner'
	created_at: string
	updated_at: string
	email_confirmed_at?: string
	last_sign_in_at?: string
	password?: string // Campo para almacenar la contraseña (solo para visualización)
	assigned_branch?: string | null
	display_name?: string | null
	estado?: 'pendiente' | 'aprobado'
	phone?: string | number | null
}

const MainUsers: React.FC = () => {
	const { user: currentUser } = useAuth()
	const { profile } = useUserProfile()
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [searchTerm, setSearchTerm] = useState('')
	const [roleFilter, setRoleFilter] = useState<string>('')
	const [statusFilter] = useState<string>('all')
	const [branchFilter, setbranchFilter] = useState<string>('')
	const [approvalFilter, setApprovalFilter] = useState<string>('')
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

	const [userToUpdate, setUserToUpdate] = useState<{
		id: string
		email: string
		newRole: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner'
	} | null>(null)

	// Query para obtener usuarios
	const {
		data: users,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ['users'],
		queryFn: async (): Promise<UserProfile[]> => {
			try {
				// Obtener perfiles de usuarios
				const { data: profiles, error: profilesError } = await supabase
					.from('profiles')
					.select('*')
					.order('created_at', { ascending: false })

				if (profilesError) throw profilesError

				// Simular contraseñas para demostración (en un sistema real, nunca se deberían mostrar contraseñas)
				// Esto es solo para fines de demostración
				const usersWithPasswords =
					profiles?.map((profile) => ({
						...profile,
						email_confirmed_at: undefined, // Placeholder
						last_sign_in_at: undefined, // Placeholder
						password: '********', // Contraseña simulada para demostración
						role: profile.role as 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner', // Asegurar que el tipo sea correcto
						created_at: profile.created_at || new Date().toISOString(), // Asegurar que created_at no sea null
						updated_at: profile.updated_at || new Date().toISOString(), // Asegurar que updated_at no sea null
						estado: (profile.estado as 'pendiente' | 'aprobado') || undefined, // Asegurar que el tipo sea correcto
					})) || []

				return usersWithPasswords
			} catch (error) {
				console.error('Error fetching users:', error)
				throw error
			}
		},
		staleTime: 1000 * 60 * 5, // 5 minutos
	})

	// Set default filter for admin users
	useEffect(() => {
		if (profile?.role === 'residente') {
			// Admin users can only see admin users
			setRoleFilter('residente')
		}
	}, [profile?.role])

	// Realtime: refetch users when profiles change (insert/update/delete)
	useEffect(() => {
		const channel = supabase
			.channel('realtime-users')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
				// O bien invalidar la query, o usar refetch directo
				queryClient.invalidateQueries({ queryKey: ['users'] })
			})
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [queryClient])

	// Query para verificar permisos del usuario actual
	const { data: canManage } = useQuery({
		queryKey: ['can-manage-users', currentUser?.id],
		queryFn: async () => {
			if (!currentUser?.id) return false
			return await canManageUsers(currentUser.id)
		},
		enabled: !!currentUser?.id,
	})

	const getRoleIcon = (role: string) => {
		switch (role) {
			case 'owner':
				return <Crown className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
			case 'employee':
				return <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
			case 'residente':
				return <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
			case 'citotecno':
				return <Wand className="w-4 h-4 text-pink-600 dark:text-pink-400" />
			case 'patologo':
				return <Microscope className="w-4 h-4 text-green-600 dark:text-green-400" />
			case 'medicowner':
				return <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
			default:
				return <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
		}
	}

	const getRoleColor = (role: string) => {
		switch (role) {
			case 'owner':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
			case 'employee':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
			case 'residente':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
			case 'citotecno':
				return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
			case 'patologo':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
			case 'medicowner':
				return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
		}
	}

	const getApprovalIcon = (estado?: string) => {
		switch (estado) {
			case 'aprobado':
				return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
			case 'pendiente':
				return <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
			default:
				return <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
		}
	}

	const getApprovalColor = (estado?: string) => {
		switch (estado) {
			case 'aprobado':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
			case 'pendiente':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
		}
	}

	const getBranchColor = (branch: string | null | undefined) => {
		if (!branch) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'

		switch (branch) {
			case 'PMG':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
			case 'CPC':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
			case 'CNX':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
			case 'STX':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
			case 'MCY':
				return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
		}
	}

	const handleCopyToClipboard = async (value: string, label: string) => {
		try {
			await navigator.clipboard.writeText(value)
			toast({
				title: '📋 Copiado',
				description: `${label} copiado al portapapeles`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch {
			toast({
				title: '❌ No se pudo copiar',
				description: 'Intenta nuevamente.',
				variant: 'destructive',
			})
		}
	}

	const handleRoleChange = async (
		userId: string,
		newRole: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner',
	) => {
		// Verificar permisos antes de permitir edición
		if (!canManage) {
			toast({
				title: '❌ Sin permisos',
				description: 'No tienes permisos para editar usuarios.',
				variant: 'destructive',
			})
			return
		}

		// No permitir que un usuario se edite a sí mismo
		if (userId === currentUser?.id) {
			toast({
				title: '❌ Acción no permitida',
				description: 'No puedes cambiar tu propio rol.',
				variant: 'destructive',
			})
			return
		}

		// Obtener el usuario que se va a actualizar
		const userToEdit = users?.find((u) => u.id === userId)
		if (!userToEdit) {
			toast({
				title: '❌ Usuario no encontrado',
				description: 'No se pudo encontrar el usuario para editar.',
				variant: 'destructive',
			})
			return
		}

		// Si el nuevo rol es admin, mostrar diálogo de confirmación
		if (newRole === 'residente') {
			setUserToUpdate({
				id: userId,
				email: userToEdit.email,
				newRole: newRole,
			})
			setConfirmDialogOpen(true)
			return
		}

		// Para otros roles, proceder directamente
		try {
			const { error } = await updateUserRole(userId, newRole)

			if (error) {
				throw error
			}

			toast({
				title: '✅ Rol actualizado',
				description: `El rol del usuario ha sido cambiado a ${
					{
						owner: 'Propietario',
						residente: 'Residente',
						employee: 'Recepcionista',
						citotecno: 'Citotecnologo',
						patologo: 'Patologo',
						medicowner: 'Medico Owner',
					}[newRole]
				}.`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// Refrescar la lista de usuarios
			refetch()
		} catch (error) {
			console.error('Error updating user role:', error)
			toast({
				title: '❌ Error al actualizar',
				description: 'Hubo un problema al cambiar el rol del usuario. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		}
	}

	const confirmRoleChange = async () => {
		if (!userToUpdate) return

		try {
			const { error } = await updateUserRole(userToUpdate.id, userToUpdate.newRole)

			if (error) {
				throw error
			}

			toast({
				title: '✅ Rol actualizado',
				description: `El rol del usuario ha sido cambiado a ${
					{
						owner: 'Propietario',
						residente: 'Residente',
						employee: 'Recepcionista',
						citotecno: 'Citotecnologo',
						patologo: 'Patologo',
						medicowner: 'Medico Owner',
					}[userToUpdate.newRole]
				}.`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// Refrescar la lista de usuarios
			refetch()
		} catch (error) {
			console.error('Error updating user role:', error)
			toast({
				title: '❌ Error al actualizar',
				description: 'Hubo un problema al cambiar el rol del usuario. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setConfirmDialogOpen(false)
			setUserToUpdate(null)
		}
	}

	const handleBranchChange = async (userId: string, branch: string | null) => {
		// Verificar permisos antes de permitir edición
		if (!canManage) {
			toast({
				title: '❌ Sin permisos',
				description: 'No tienes permisos para editar usuarios.',
				variant: 'destructive',
			})
			return
		}

		try {
			const { error } = await updateUserBranch(userId, branch === 'none' ? null : branch)

			if (error) {
				throw error
			}

			toast({
				title: '✅ Sede actualizada',
				description:
					branch === 'none'
						? 'Se ha eliminado la restricción de sede para este usuario.'
						: `La sede del usuario ha sido cambiada a ${branch}.`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// Refrescar la lista de usuarios
			refetch()
		} catch (error) {
			console.error('Error updating user branch:', error)
			toast({
				title: '❌ Error al actualizar',
				description: 'Hubo un problema al cambiar la sede del usuario. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		}
	}

	const handleApprovalChange = async (userId: string, newStatus: 'pendiente' | 'aprobado') => {
		// Verificar permisos antes de permitir edición
		if (!canManage) {
			toast({
				title: '❌ Sin permisos',
				description: 'No tienes permisos para aprobar usuarios.',
				variant: 'destructive',
			})
			return
		}

		// No permitir que un usuario se edite a sí mismo
		if (userId === currentUser?.id) {
			toast({
				title: '❌ Acción no permitida',
				description: 'No puedes cambiar tu propio estado de aprobación.',
				variant: 'destructive',
			})
			return
		}

		try {
			const { error } = await updateUserApprovalStatus(userId, newStatus)

			if (error) {
				throw error
			}

			toast({
				title: newStatus === 'aprobado' ? '✅ Usuario aprobado' : '⏱️ Usuario pendiente',
				description:
					newStatus === 'aprobado'
						? 'El usuario ha sido aprobado y ahora puede acceder al sistema.'
						: 'El usuario ha sido marcado como pendiente y no podrá acceder al sistema.',
				className:
					newStatus === 'aprobado'
						? 'bg-green-100 border-green-400 text-green-800'
						: 'bg-orange-100 border-orange-400 text-orange-800',
			})

			// Refrescar la lista de usuarios
			refetch()
		} catch (error) {
			console.error('Error updating user approval status:', error)
			toast({
				title: '❌ Error al actualizar',
				description: 'Hubo un problema al cambiar el estado de aprobación. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		}
	}

	// Filtrar usuarios
	const filteredUsers =
		users?.filter((user) => {
			// If current user is admin, only show admin users
			if (profile?.role === 'residente' && user.role !== 'residente') {
				return false
			}

			const matchesSearch =
				user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
				(user.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
			const matchesRole = roleFilter === '' || roleFilter === 'all' || user.role === roleFilter
			const matchesStatus =
				statusFilter === 'all' ||
				(statusFilter === 'verified' && user.email_confirmed_at) ||
				(statusFilter === 'unverified' && !user.email_confirmed_at)
			const matchesBranch =
				branchFilter === '' ||
				branchFilter === 'all' ||
				(branchFilter === 'assigned' && user.assigned_branch) ||
				(branchFilter === 'unassigned' && !user.assigned_branch) ||
				user.assigned_branch === branchFilter
			const matchesApproval =
				approvalFilter === '' ||
				approvalFilter === 'all' ||
				(approvalFilter === 'aprobado' && user.estado === 'aprobado') ||
				(approvalFilter === 'pendiente' && user.estado === 'pendiente')

			return matchesSearch && matchesRole && matchesStatus && matchesBranch && matchesApproval
		}) || []

	// Estadísticas
	const stats = {
		total: users?.length || 0,
		owners: users?.filter((u) => u.role === 'owner').length || 0,
		medicowners: users?.filter((u) => u.role === 'medicowner').length || 0,
		employees: users?.filter((u) => u.role === 'employee').length || 0,
		admins: users?.filter((u) => u.role === 'residente').length || 0,
		citotecnos: users?.filter((u) => u.role === 'citotecno').length || 0,
		patologos: users?.filter((u) => u.role === 'patologo').length || 0,
		verified: users?.filter((u) => u.email_confirmed_at).length || 0,
		withBranch: users?.filter((u) => u.assigned_branch).length || 0,
		approved: users?.filter((u) => u.estado === 'aprobado').length || 0,
		pending: users?.filter((u) => u.estado === 'pendiente').length || 0,
	}

	if (isLoading) {
		return (
			<div className="p-3 sm:p-6">
				<div className="flex items-center justify-center py-12">
					<div className="flex items-center gap-3">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
						<span className="text-lg text-gray-700 dark:text-gray-300">Cargando usuarios...</span>
					</div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="p-3 sm:p-6">
				<div className="text-center py-12">
					<div className="text-red-500 dark:text-red-400">
						<p className="text-lg font-medium">Error al cargar los usuarios</p>
						<p className="text-sm mt-2">Verifica tu conexión a internet o contacta al administrador</p>
						<button
							onClick={() => refetch()}
							className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-none"
						>
							Reintentar
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div>
			{/* Page Title */}
			<div className="mb-4 sm:mb-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
						{profile?.role === 'residente' ? 'Gestión de Médicos' : 'Gestión de Usuarios'}
					</h1>
					<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
				</div>
				<p className="text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
					{profile?.role === 'residente'
						? 'Administra los médicos del sistema y sus permisos'
						: 'Administra los usuarios del sistema y sus permisos'}
				</p>
			</div>

			{/* Instrucciones */}
			<div className="mt-4 sm:mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-3 sm:mb-5">
				<h3 className="text-base sm:text-lg font-semibold text-blue-800 dark:text-blue-300 mb-1 sm:mb-2">
					{profile?.role === 'residente' ? 'Información de Médicos' : 'Instrucciones de Uso'}
				</h3>
				<ul className="list-disc list-inside space-y-1 sm:space-y-2 text-xs sm:text-sm text-blue-700 dark:text-blue-400">
					{profile?.role === 'residente' ? (
						<>
							<li>
								<strong>Médicos:</strong> En esta sección puedes ver y gestionar los usuarios con rol de médico.
							</li>
							<li>
								<strong>Asignación de Sede:</strong> Los médicos con una sede asignada solo podrán ver los casos médicos
								de esa sede.
							</li>
							<li>
								<strong>Generación de Casos:</strong> Los médicos pueden generar diagnósticos para casos de biopsia.
							</li>
						</>
					) : (
						<>
							<li>
								<strong>Aprobación de Usuarios:</strong> Los nuevos usuarios se crean con estado "Pendiente" y deben ser
								aprobados por un propietario antes de poder acceder al sistema.
							</li>
							<li>
								<strong>Asignación de Sede:</strong> Los Recepcionistas con una sede asignada solo podrán ver los casos
								médicos de esa sede.
							</li>
							<li>
								<strong>Sin Restricción:</strong> Los Recepcionistas sin sede asignada pueden ver todos los casos.
							</li>
							<li>
								<strong>Propietarios:</strong> Los usuarios con rol de propietario siempre pueden ver todos los casos,
								independientemente de la sede asignada.
							</li>
							<li>
								<strong>Residentes:</strong> Los usuarios con rol de residente tienen acceso a registros, casos
								generados, médicos y ajustes.
							</li>
						</>
					)}
				</ul>
			</div>

			{/* Filtros, búsqueda y estadísticas */}
			<Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg mb-3 sm:mb-5">
				<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-6">
					{/* Todo en una sola línea horizontal */}
					<div className="flex items-center justify-between gap-2 overflow-x-auto" style={{ overflowY: 'visible' }}>
						{/* Lado izquierdo: Búsqueda y filtros */}
						<div className="flex items-center gap-3 flex-shrink-0">
							{/* Búsqueda */}
							<div className="relative w-56">
								<Input
									type="text"
									placeholder="Buscar usuarios"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
							</div>

							{/* Filtros */}
							<div className="flex items-center gap-2">
								{/* Filtro por aprobación */}
								<CustomDropdown
									value={approvalFilter}
									onChange={setApprovalFilter}
									options={[
										{ value: 'all', label: 'Todos' },
										{ value: 'aprobado', label: 'Aprobados' },
										{ value: 'pendiente', label: 'Pendientes' },
									]}
									placeholder="Estado"
									className="w-32 text-sm"
								/>

								{/* Filtro por sede */}
								<CustomDropdown
									value={branchFilter}
									onChange={setbranchFilter}
									options={[
										{ value: 'all', label: 'Todas' },
										{ value: 'assigned', label: 'Asignada' },
										{ value: 'unassigned', label: 'Sin sede' },
										{ value: 'PMG', label: 'PMG' },
										{ value: 'CPC', label: 'CPC' },
										{ value: 'CNX', label: 'CNX' },
										{ value: 'STX', label: 'STX' },
										{ value: 'MCY', label: 'MCY' },
									]}
									placeholder="Sede"
									className="w-32 text-sm"
								/>
							</div>
						</div>

						{/* Lado derecho: Estadísticas compactas como filtros */}
						<div className="flex items-center gap-2 flex-shrink-0">
							{/* Total Usuarios */}
							<div
								onClick={() => profile?.role !== 'residente' && setRoleFilter('')}
								className={`flex items-center gap-2 rounded px-3 py-2 w-32 ${
									profile?.role === 'residente'
										? 'cursor-not-allowed opacity-50 bg-gray-50 dark:bg-gray-900/20'
										: 'cursor-pointer'
								} ${
									roleFilter === '' || roleFilter === 'all'
										? 'bg-green-200 dark:bg-green-800 border-2 border-green-400 dark:border-green-600'
										: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
								}`}
							>
								<User className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total</span>
									<span className="text-sm font-bold text-green-700 dark:text-green-300">{stats.total}</span>
								</div>
							</div>

							{/* Propietarios */}
							<div
								onClick={() => profile?.role !== 'residente' && setRoleFilter('owner')}
								className={`flex items-center gap-2 rounded px-3 py-2 w-32 ${
									profile?.role === 'residente'
										? 'cursor-not-allowed opacity-50 bg-gray-50 dark:bg-gray-900/20'
										: 'cursor-pointer'
								} ${
									roleFilter === 'owner'
										? 'bg-yellow-200 dark:bg-yellow-800 border-2 border-yellow-400 dark:border-yellow-600'
										: 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
								}`}
							>
								<Crown className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="text-xs font-medium text-gray-600 dark:text-gray-400">Propietarios</span>
									<span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">{stats.owners}</span>
								</div>
							</div>

							{/* Recepcionistas */}
							<div
								onClick={() => profile?.role !== 'residente' && setRoleFilter('employee')}
								className={`flex items-center gap-2 rounded px-3 py-2 w-32 ${
									profile?.role === 'residente'
										? 'cursor-not-allowed opacity-50 bg-gray-50 dark:bg-gray-900/20'
										: 'cursor-pointer'
								} ${
									roleFilter === 'employee'
										? 'bg-blue-200 dark:bg-blue-800 border-2 border-blue-400 dark:border-blue-600'
										: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
								}`}
							>
								<Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="text-xs font-medium text-gray-600 dark:text-gray-400">Recepcionistas</span>
									<span className="text-sm font-bold text-blue-700 dark:text-blue-300">{stats.employees}</span>
								</div>
							</div>

							{/* Residentes */}
							<div
								onClick={() => setRoleFilter('residente')}
								className={`flex items-center gap-2 rounded px-3 py-2 cursor-pointer w-32 ${
									roleFilter === 'residente'
										? 'bg-purple-200 dark:bg-purple-800 border-2 border-purple-400 dark:border-purple-600'
										: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30'
								}`}
							>
								<ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="text-xs font-medium text-gray-600 dark:text-gray-400">Residentes</span>
									<span className="text-sm font-bold text-purple-700 dark:text-purple-300">{stats.admins}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Card>

			{/* Tabla de usuarios */}
			<Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg">
				<div className="bg-white dark:bg-background rounded-xl">
					{/* Vista móvil - Cards */}
					<div className="block lg:hidden p-3 sm:p-4">
						<div className="space-y-3 sm:space-y-4">
							{filteredUsers.map((user) => (
								<div
									key={user.id}
									className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700"
								>
									{/* Header con rol y estado */}
									<div className="flex items-center justify-between mb-2 sm:mb-3">
										<span
											className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${getRoleColor(
												user.role,
											)}`}
										>
											{getRoleIcon(user.role)}
											{user.role === 'owner'
												? 'Propietario'
												: user.role === 'residente'
												? 'Residente'
												: 'Recepcionista'}
										</span>
									</div>

									{/* Email */}
									<div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
										<Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
										<p className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">
											{user.email}
										</p>
									</div>

									{/* Display Name */}
									{user.display_name && (
										<div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
											<User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
											<p className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate">
												{user.display_name}
											</p>
										</div>
									)}

									{/* Estado de aprobación */}
									<div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
										{getApprovalIcon(user.estado)}
										<span
											className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${getApprovalColor(
												user.estado,
											)}`}
										>
											{user.estado === 'aprobado' ? 'Aprobado' : 'Pendiente de aprobación'}
										</span>
									</div>

									{/* Sede asignada */}
									<div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
										<MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
										<div className="flex items-center gap-2">
											{user.assigned_branch ? (
												<span
													className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${getBranchColor(
														user.assigned_branch,
													)}`}
												>
													{user.assigned_branch}
												</span>
											) : (
												<span className="text-sm text-gray-500 dark:text-gray-400">Sin sede asignada</span>
											)}
										</div>
									</div>

									{/* Fecha de registro */}
									<div className="flex items-center text gap-1.5 sm:gap-2 mb-2 sm:mb-3">
										<Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
										<p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
											Registrado: {format(new Date(user.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
										</p>
									</div>

									{/* Selector de aprobación */}
									{canManage && user.id !== currentUser?.id && (
										<div className="mt-3">
											<label
												htmlFor={`approval-status-${user.id}`}
												className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
											>
												Estado de Aprobación:
											</label>
											<CustomDropdown
												id={`approval-status-${user.id}`}
												defaultValue={user.estado || 'pendiente'}
												onChange={(value) => handleApprovalChange(user.id, value as 'pendiente' | 'aprobado')}
												options={[
													{ value: 'aprobado', label: 'Aprobado' },
													{ value: 'pendiente', label: 'Pendiente' },
												]}
												placeholder="Seleccionar estado"
												className="w-full"
											/>
										</div>
									)}

									{/* Selector de rol */}
									{canManage && user.id !== currentUser?.id && (
										<div className="mt-3">
											<label
												htmlFor={`user-role-${user.id}`}
												className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
											>
												Cambiar Rol:
											</label>
											<CustomDropdown
												id={`user-role-${user.id}`}
												defaultValue={user.role}
												onChange={(value) =>
													handleRoleChange(
														user.id,
														value as 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner',
													)
												}
												options={[
													{ value: 'owner', label: 'Propietario' },
													{ value: 'employee', label: 'Recepcionista' },
													{ value: 'residente', label: 'Residente' },
													{ value: 'citotecno', label: 'Citotecnologo' },
													{ value: 'patologo', label: 'Patologo' },
													{ value: 'medicowner', label: 'Medico Owner' },
												]}
												placeholder="Seleccionar rol"
												className="w-full"
											/>
										</div>
									)}

									{/* Selector de sede */}
									{canManage && (
										<div className="mt-3">
											<label
												htmlFor={`user-branch-${user.id}`}
												className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
											>
												Asignar Sede:
											</label>
											<CustomDropdown
												id={`user-branch-${user.id}`}
												defaultValue={user.assigned_branch || 'none'}
												onChange={(value) => handleBranchChange(user.id, value === 'none' ? null : value)}
												options={[
													{ value: 'none', label: 'Sin restricción de sede' },
													{ value: 'PMG', label: 'PMG' },
													{ value: 'CPC', label: 'CPC' },
													{ value: 'CNX', label: 'CNX' },
													{ value: 'STX', label: 'STX' },
													{ value: 'MCY', label: 'MCY' },
												]}
												placeholder="Seleccionar sede"
												className="w-full"
											/>
										</div>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Vista desktop - Tabla */}
					<div className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[60vh] relative">
						<table className="w-full responsive-table">
							<thead className="bg-gray-50/50 dark:bg-background/50 backdrop-blur-[10px] sticky top-0 z-20 rounded-t-lg">
								<tr>
									<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
										Usuario
									</th>
									<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
										Rol
									</th>
									<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
										Sede Asignada
									</th>
									<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
										Estado
									</th>
									<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
										Fecha de Registro
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
								{filteredUsers.map((user) => (
									<tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-none">
										<td className="px-6 py-4">
											<div className="flex items-center justify-between gap-3">
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.display_name}</p>
												<Tooltip>
													<TooltipTrigger>
														<Info className="size-4" />
													</TooltipTrigger>
													<TooltipContent className="p-3">
														<div className="flex flex-col gap-3 text-xs">
															<div className="flex items-center justify-between gap-3">
																<div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
																	<Mail className="w-3 h-3 text-gray-600 dark:text-gray-400 flex-shrink-0" />
																	<span className="break-all">{user.email}</span>
																</div>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-6 w-6 flex-shrink-0"
																	onClick={(e) => {
																		e.stopPropagation()
																		handleCopyToClipboard(user.email, 'Email')
																	}}
																	aria-label="Copiar email"
																>
																	<Copy className="w-3 h-3" />
																</Button>
															</div>

															{user.phone && (
																<div className="flex items-center justify-between gap-3">
																	<div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
																		<Phone className="w-3 h-3 text-gray-600 dark:text-gray-400 flex-shrink-0" />
																		<span className="break-all">{formatPhoneForDisplay(user.phone)}</span>
																	</div>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="h-6 w-6 flex-shrink-0"
																		onClick={(e) => {
																			e.stopPropagation()
																			handleCopyToClipboard(formatPhoneForDisplay(user.phone), 'Teléfono')
																		}}
																		aria-label="Copiar teléfono"
																	>
																		<Copy className="w-3 h-3" />
																	</Button>
																</div>
															)}
														</div>
													</TooltipContent>
												</Tooltip>
											</div>
										</td>
										<td className="px-6 py-4">
											{canManage && user.id !== currentUser?.id ? (
												<CustomDropdown
													defaultValue={user.role}
													onChange={(value) =>
														handleRoleChange(
															user.id,
															value as 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner',
														)
													}
													options={[
														{ value: 'owner', label: 'Propietario' },
														{ value: 'employee', label: 'Recepcionista' },
														{ value: 'residente', label: 'Residente' },
														{ value: 'citotecno', label: 'Citotecnologo' },
														{ value: 'patologo', label: 'Patologo' },
														{ value: 'medicowner', label: 'Medico Owner' },
													]}
													placeholder="Seleccionar rol"
													className="w-40"
												/>
											) : (
												<span
													className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
														user.role,
													)}`}
												>
													{getRoleIcon(user.role)}
													{user.role === 'owner'
														? 'Propietario'
														: user.role === 'residente'
														? 'Residente'
														: 'Recepcionista'}
												</span>
											)}
										</td>
										<td className="px-6 py-4">
											{canManage ? (
												<CustomDropdown
													defaultValue={user.assigned_branch || 'none'}
													onChange={(value) => handleBranchChange(user.id, value === 'none' ? null : value)}
													options={[
														{ value: 'none', label: 'Sin restricción' },
														{ value: 'PMG', label: 'PMG' },
														{ value: 'CPC', label: 'CPC' },
														{ value: 'CNX', label: 'CNX' },
														{ value: 'STX', label: 'STX' },
														{ value: 'MCY', label: 'MCY' },
													]}
													placeholder="Seleccionar sede"
													className="w-40"
												/>
											) : user.assigned_branch ? (
												<span
													className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getBranchColor(
														user.assigned_branch,
													)}`}
												>
													<MapPin className="w-3 h-3" />
													{user.assigned_branch}
												</span>
											) : (
												<span className="text-sm text-gray-500 dark:text-gray-400">Sin restricción</span>
											)}
										</td>
										<td className="px-6 py-4">
											{canManage && user.id !== currentUser?.id ? (
												<CustomDropdown
													defaultValue={user.estado || 'pendiente'}
													onChange={(value) => handleApprovalChange(user.id, value as 'pendiente' | 'aprobado')}
													options={[
														{ value: 'aprobado', label: 'Aprobado' },
														{ value: 'pendiente', label: 'Pendiente' },
													]}
													placeholder="Seleccionar estado"
													className="w-40"
												/>
											) : (
												<span
													className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getApprovalColor(
														user.estado,
													)}`}
												>
													{getApprovalIcon(user.estado)}
													{user.estado === 'aprobado' ? 'Aprobado' : 'Pendiente'}
												</span>
											)}
										</td>
										<td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
											{format(new Date(user.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Estado vacío */}
					{filteredUsers.length === 0 && (
						<div className="text-center py-12">
							<div className="text-gray-500 dark:text-gray-400">
								<p className="text-lg font-medium">
									{profile?.role === 'residente' ? 'No se encontraron médicos' : 'No se encontraron usuarios'}
								</p>
								<p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
							</div>
						</div>
					)}
				</div>
			</Card>

			{/* Diálogo de confirmación para cambio a admin */}
			<Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirmar cambio de rol</DialogTitle>
						<DialogDescription>
							¿Está seguro que desea cambiar el rol del usuario {userToUpdate?.email} a Residente? Este cambio
							modificará los permisos y accesos del usuario en el sistema.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={confirmRoleChange}>Confirmar</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default MainUsers
