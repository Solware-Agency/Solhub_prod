// =====================================================================
// PATIENT PROFILE SELECTOR - NUEVO SISTEMA
// =====================================================================
// Componente que muestra responsable + dependientes asociados
// y permite seleccionar un perfil específico
// =====================================================================

import { useState, useEffect } from 'react'
import { Card } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import { cn } from '@shared/lib/cn'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@shared/components/ui/alert-dialog'
import { User, Baby, Dog, Plus, Check, Edit, Trash2 } from 'lucide-react'
import { getDependentsByResponsable } from '@services/supabase/patients/responsabilidades-service'
import { deletePatient } from '@services/supabase/patients/patients-service'
import { useToast } from '@shared/hooks/use-toast'
import type { PatientProfile } from './PatientSearchAutocomplete'

// =====================================================================
// TIPOS
// =====================================================================

interface PatientProfileSelectorProps {
	responsable: PatientProfile
	onSelectProfile?: (profile: PatientProfile) => void
	onAddDependent?: () => void
	onEditResponsable?: (responsable: PatientProfile) => void
	onEditDependent?: (dependent: PatientProfile) => void
	onDeleteResponsable?: () => void
	onDeleteDependent?: () => void
	selectedProfileId?: string | null
	className?: string
	refreshKey?: number // Key para forzar recarga de dependientes
}

// =====================================================================
// COMPONENTE
// =====================================================================

export const PatientProfileSelector = ({
	responsable,
	onSelectProfile,
	onAddDependent,
	onEditResponsable,
	onEditDependent,
	onDeleteResponsable,
	onDeleteDependent,
	selectedProfileId,
	className,
	refreshKey = 0, // Key para forzar recarga
}: PatientProfileSelectorProps) => {
	const [dependientes, setDependientes] = useState<PatientProfile[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [patientToDelete, setPatientToDelete] = useState<{ profile: PatientProfile; isResponsable: boolean } | null>(
		null,
	)
	const [isDeleting, setIsDeleting] = useState(false)
	const { toast } = useToast()

	// =====================================================================
	// CARGAR DEPENDIENTES
	// =====================================================================

	useEffect(() => {
		const loadDependientes = async () => {
			try {
				setIsLoading(true)
				const deps = await getDependentsByResponsable(responsable.id)
				setDependientes(
					deps.map((dep: any) => ({
						id: dep.dependiente.id,
						nombre: dep.dependiente.nombre,
						cedula: dep.dependiente.cedula || null, // Mantener null si no tiene cédula
						tipo_paciente: dep.dependiente.tipo_paciente || dep.tipo,
						edad: dep.dependiente.edad,
						telefono: dep.dependiente.telefono,
						fecha_nacimiento: dep.dependiente.fecha_nacimiento,
						especie: dep.dependiente.especie,
					})),
				)
			} catch (error) {
				console.error('Error cargando dependientes:', error)
				setDependientes([])
			} finally {
				setIsLoading(false)
			}
		}

		if (responsable.id) {
			loadDependientes()
		}
	}, [responsable.id, refreshKey]) // Agregar refreshKey como dependencia

	// =====================================================================
	// ICONOS
	// =====================================================================

	const getProfileIcon = (tipo?: string | null) => {
		switch (tipo) {
			case 'menor':
				return <Baby className="w-5 h-5 text-blue-500" />
			case 'animal':
				return <Dog className="w-5 h-5 text-green-500" />
			default:
				return <User className="w-5 h-5 text-gray-500" />
		}
	}

	const getProfileLabel = (tipo?: string | null) => {
		switch (tipo) {
			case 'menor':
				return 'Menor'
			case 'animal':
				return 'Animal'
			default:
				return 'Adulto'
		}
	}

	// =====================================================================
	// HANDLERS
	// =====================================================================

	const handleSelectProfile = (profile: PatientProfile) => {
		if (onSelectProfile) {
			onSelectProfile(profile)
		}
	}

	const handleEditResponsable = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (onEditResponsable) {
			onEditResponsable(responsable)
		}
	}

	const handleEditDependent = (e: React.MouseEvent, dependent: PatientProfile) => {
		e.preventDefault()
		e.stopPropagation()
		if (onEditDependent) {
			onEditDependent(dependent)
		}
	}

	const handleDeleteResponsable = async (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setPatientToDelete({ profile: responsable, isResponsable: true })
		setDeleteDialogOpen(true)
	}

	const handleDeleteDependent = async (e: React.MouseEvent, dependent: PatientProfile) => {
		e.preventDefault()
		e.stopPropagation()
		setPatientToDelete({ profile: dependent, isResponsable: false })
		setDeleteDialogOpen(true)
	}

	const confirmDelete = async () => {
		if (!patientToDelete) return

		setIsDeleting(true)
		try {
			const result = await deletePatient(patientToDelete.profile.id)

			toast({
				title: '✅ Paciente eliminado',
				description: `${patientToDelete.profile.nombre} ha sido eliminado${
					result.casesCount > 0 ? ` junto con ${result.casesCount} caso(s) médico(s)` : ''
				}${
					patientToDelete.isResponsable && result.dependentsCount > 0
						? ` y ${result.dependentsCount} dependiente(s)`
						: ''
				}`,
			})

			if (patientToDelete.isResponsable && onDeleteResponsable) {
				onDeleteResponsable()
			} else if (!patientToDelete.isResponsable && onDeleteDependent) {
				onDeleteDependent()
			}

			setDeleteDialogOpen(false)
			setPatientToDelete(null)
		} catch (error) {
			console.error('Error eliminando paciente:', error)
			toast({
				title: '❌ Error',
				description: error instanceof Error ? error.message : 'Error al eliminar paciente',
				variant: 'destructive',
			})
		} finally {
			setIsDeleting(false)
		}
	}

	// =====================================================================
	// RENDER
	// =====================================================================

	return (
		<Card className={cn('p-4 space-y-4', className)}>
			{/* Responsable */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</h3>
				</div>
				<div
					className={cn(
						'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors group',
						selectedProfileId === responsable.id
							? 'border-primary bg-primary/5'
							: 'border-gray-200 dark:border-gray-700 hover:border-primary/50',
					)}
					onClick={() => handleSelectProfile(responsable)}
				>
					{getProfileIcon('adulto')}
					<div className="flex-1 min-w-0">
						<div className="font-medium">{responsable.nombre}</div>
						<div className="text-sm text-muted-foreground">
							{responsable.cedula || 'Sin cédula'}
							{responsable.telefono && ` • ${responsable.telefono}`}
						</div>
					</div>
					<div className="flex items-center gap-2">
						{selectedProfileId === responsable.id && <Check className="w-5 h-5 text-primary" />}
						{onEditResponsable && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={handleEditResponsable}
							>
								<Edit className="w-4 h-4" />
							</Button>
						)}
						{onDeleteResponsable && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
								onClick={handleDeleteResponsable}
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Dependientes */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
						Dependientes ({dependientes.length})
					</h3>
					{onAddDependent && (
						<Button variant="outline" size="sm" onClick={onAddDependent} className="h-7 text-xs">
							<Plus className="w-3 h-3 mr-1" />
							Agregar
						</Button>
					)}
				</div>

				{isLoading ? (
					<div className="text-sm text-muted-foreground py-4 text-center">Cargando dependientes...</div>
				) : dependientes.length === 0 ? (
					<div className="text-sm text-muted-foreground py-4 text-center">
						No hay dependientes registrados
						{onAddDependent && (
							<Button variant="link" size="sm" onClick={onAddDependent} className="h-auto p-0 ml-1">
								Agregar uno
							</Button>
						)}
					</div>
				) : (
					<div className="space-y-2">
						{dependientes.map((dep) => (
							<div
								key={dep.id}
								className={cn(
									'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors group',
									selectedProfileId === dep.id
										? 'border-primary bg-primary/5'
										: 'border-gray-200 dark:border-gray-700 hover:border-primary/50',
								)}
								onClick={() => handleSelectProfile(dep)}
							>
								{getProfileIcon(dep.tipo_paciente)}
								<div className="flex-1 min-w-0">
									<div className="font-medium">{dep.nombre}</div>
									<div className="text-sm text-muted-foreground">
										{dep.tipo_paciente === 'menor' && dep.edad && `Edad: ${dep.edad}`}
										{dep.tipo_paciente === 'animal' && dep.especie && `Especie: ${dep.especie}`}
										{dep.fecha_nacimiento && ` • Nac: ${new Date(dep.fecha_nacimiento).toLocaleDateString()}`}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">{getProfileLabel(dep.tipo_paciente)}</span>
									{selectedProfileId === dep.id && <Check className="w-5 h-5 text-primary" />}
									{onEditDependent && (
										<Button
											variant="ghost"
											size="sm"
											className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
											onClick={(e) => handleEditDependent(e, dep)}
										>
											<Edit className="w-4 h-4" />
										</Button>
									)}
									{onDeleteDependent && (
										<Button
											variant="ghost"
											size="sm"
											className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
											onClick={(e) => handleDeleteDependent(e, dep)}
										>
											<Trash2 className="w-4 h-4" />
										</Button>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Diálogo de confirmación de eliminación */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
						<AlertDialogDescription>
							{patientToDelete?.isResponsable ? (
								<>
									Se eliminará el responsable <strong>{patientToDelete.profile.nombre}</strong> junto con:
									<ul className="list-disc list-inside mt-2 space-y-1">
										<li>Todos sus casos médicos</li>
										<li>Todos sus dependientes (menores y animales)</li>
									</ul>
									<p className="mt-2 text-red-600 font-semibold">Esta acción no se puede deshacer.</p>
								</>
							) : (
								<>
									Se eliminará el dependiente <strong>{patientToDelete?.profile.nombre}</strong> junto con:
									<ul className="list-disc list-inside mt-2 space-y-1">
										<li>Todos sus casos médicos</li>
									</ul>
									<p className="mt-2 text-red-600 font-semibold">Esta acción no se puede deshacer.</p>
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? 'Eliminando...' : 'Eliminar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	)
}
