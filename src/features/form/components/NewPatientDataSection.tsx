// =====================================================================
// NEW PATIENT DATA SECTION - NUEVO SISTEMA
// =====================================================================
// Componente que usa el nuevo sistema de pacientes multi-tipo
// Integra PatientSearchAutocomplete, PatientProfileSelector y PatientRelationshipManager
// =====================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { type Control } from 'react-hook-form'
import { type FormValues } from '@features/form/lib/form-schema'
import { FormField, FormItem, FormLabel, FormControl } from '@shared/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Input } from '@shared/components/ui/input'
import { Button } from '@shared/components/ui/button'
import { FormDropdown, createDropdownOptions } from '@shared/components/ui/form-dropdown'
import { CheckCircle, CalendarIcon, Phone, Mail, User, Edit, Baby, Dog, Info } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import { cn } from '@shared/lib/cn'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar } from '@shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@shared/components/ui/tooltip'
import { PatientSearchAutocomplete, type PatientProfile } from '@features/patients/components/PatientSearchAutocomplete'
import { PatientProfileSelector } from '@features/patients/components/PatientProfileSelector'
import { PatientRelationshipManager } from '@features/patients/components/PatientRelationshipManager'
import { NewResponsableForm } from '@features/patients/components/NewResponsableForm'
import { EditResponsableForm } from '@features/patients/components/EditResponsableForm'
import { findPatientById, type Patient } from '@services/supabase/patients/patients-service'
import { getDependentsByResponsable } from '@services/supabase/patients/responsabilidades-service'

interface NewPatientDataSectionProps {
	control: Control<FormValues>
	inputStyles: string
}

// =====================================================================
// COMPONENTE
// =====================================================================

export const NewPatientDataSection = ({ control, inputStyles }: NewPatientDataSectionProps) => {
	const { setValue } = useFormContext<FormValues>()
	const [selectedResponsable, setSelectedResponsable] = useState<PatientProfile | null>(null)
	const [selectedResponsableData, setSelectedResponsableData] = useState<Patient | null>(null) // Información completa del responsable
	const [selectedProfile, setSelectedProfile] = useState<PatientProfile | null>(null)
	const [dependentsRefreshKey, setDependentsRefreshKey] = useState(0) // Key para refrescar lista de dependientes
	const [dependents, setDependents] = useState<PatientProfile[]>([]) // Lista de dependientes
	const [isLoadingDependents, setIsLoadingDependents] = useState(false)
	const [editableFechaNacimiento, setEditableFechaNacimiento] = useState<Date | undefined>(undefined) // Fecha de nacimiento editable
	const [editResponsableOpen, setEditResponsableOpen] = useState(false) // Modal de edición de responsable
	const [editDependentOpen, setEditDependentOpen] = useState(false) // Modal de edición de dependiente
	const [dependentToEdit, setDependentToEdit] = useState<PatientProfile | null>(null) // Dependiente a editar
	const justSelectedRef = useRef(false) // Ref para rastrear selección reciente
	const ageValue = useWatch({ control, name: 'ageValue' }) // Observar edad para deshabilitar fecha

	// Exponer selectedProfile globalmente para que PatientDataSection pueda acceder
	useEffect(() => {
		(window as any).__selectedProfile = selectedProfile;
	}, [selectedProfile]);

	// Observar valores del formulario para detectar cuando se limpia
	const fullName = useWatch({ control, name: 'fullName' })
	const idNumber = useWatch({ control, name: 'idNumber' })
	const phone = useWatch({ control, name: 'phone' })
	const idType = useWatch({ control, name: 'idType' })

	// Detectar cuando el formulario se limpia y volver al paso 1
	useEffect(() => {
		// Si acabamos de seleccionar un responsable, no resetear
		if (justSelectedRef.current) {
			justSelectedRef.current = false
			return
		}

		// Si todos los campos están en sus valores iniciales (vacíos o por defecto)
		// y había un responsable o perfil seleccionado, resetear al paso 1
		// Usar un timeout para evitar reseteos durante la selección de responsables/perfiles
		const timeoutId = setTimeout(() => {
			const isFormReset =
				!fullName && (!idNumber || idNumber === '') && (!phone || phone === '') && (idType === 'V' || idType === 'S/C') // Valores iniciales de idType

			if (isFormReset && (selectedResponsable || selectedProfile)) {
				setSelectedResponsable(null)
				setSelectedProfile(null)
				setSelectedResponsableData(null)
				setDependents([])
			}
		}, 1000) // Aumentar a 1000ms para dar más tiempo

		return () => clearTimeout(timeoutId)
	}, [fullName, idNumber, phone, idType, selectedResponsable, selectedProfile])

	// Recargar dependientes cuando cambie el dependentsRefreshKey
	useEffect(() => {
		if (selectedResponsable && dependentsRefreshKey > 0) {
			const loadDependents = async () => {
				try {
					setIsLoadingDependents(true)
					const deps = await getDependentsByResponsable(selectedResponsable.id)
					setDependents(
						deps.map((dep: any) => ({
							id: dep.dependiente.id,
							nombre: dep.dependiente.nombre,
							cedula: dep.dependiente.cedula || null,
							tipo_paciente: dep.dependiente.tipo_paciente || dep.tipo,
							edad: dep.dependiente.edad,
							telefono: dep.dependiente.telefono,
							fecha_nacimiento: dep.dependiente.fecha_nacimiento,
							especie: dep.dependiente.especie,
						})),
					)
				} catch (error) {
					console.error('Error cargando dependientes:', error)
					setDependents([])
				} finally {
					setIsLoadingDependents(false)
				}
			}
			loadDependents()
		}
	}, [dependentsRefreshKey, selectedResponsable])

	// =====================================================================
	// HANDLERS
	// =====================================================================

	const handleSelectResponsable = useCallback(
		async (responsable: PatientProfile) => {
			justSelectedRef.current = true // Marcar que acabamos de seleccionar
			setSelectedResponsable(responsable)
			setSelectedProfile(null)
			setEditableFechaNacimiento(undefined) // Limpiar fecha editable
			// Limpiar campos del formulario
			setValue('fullName', '')
			setValue('idType', 'V')
			setValue('idNumber', '')
			setValue('phone', '')
			setValue('email', '')
			setValue('gender', '')

			// Cargar información completa del responsable
			try {
				const patientData = await findPatientById(responsable.id)
				if (patientData) {
					setSelectedResponsableData(patientData)
				}
			} catch (error) {
				console.error('Error cargando datos del responsable:', error)
			}

			// Cargar dependientes
			try {
				setIsLoadingDependents(true)
				const deps = await getDependentsByResponsable(responsable.id)
				setDependents(
					deps.map((dep: any) => ({
						id: dep.dependiente.id,
						nombre: dep.dependiente.nombre,
						cedula: dep.dependiente.cedula || null,
						tipo_paciente: dep.dependiente.tipo_paciente || dep.tipo,
						edad: dep.dependiente.edad,
						telefono: dep.dependiente.telefono,
						fecha_nacimiento: dep.dependiente.fecha_nacimiento,
						especie: dep.dependiente.especie,
					})),
				)
			} catch (error) {
				console.error('Error cargando dependientes:', error)
				setDependents([])
			} finally {
				setIsLoadingDependents(false)
			}
		},
		[setValue],
	)

	const handleSelectProfile = useCallback(
		async (profile: PatientProfile) => {
			justSelectedRef.current = true // Marcar que acabamos de seleccionar
			setSelectedProfile(profile)

			try {
				// Obtener datos completos del paciente desde la base de datos
				const patientData = await findPatientById(profile.id)

				if (!patientData) {
					console.error('No se pudieron cargar los datos completos del paciente')
					// Usar datos básicos del profile como fallback
					setValue('fullName', profile.nombre)
					setValue('phone', profile.telefono || '')
					return
				}

				// Llenar formulario con datos del perfil seleccionado
				if (patientData.cedula) {
					const cedulaMatch = patientData.cedula.match(/^([VEJC])-(.+)$/)
					if (cedulaMatch) {
						setValue('idType', cedulaMatch[1] as 'V' | 'E' | 'J' | 'C')
						setValue('idNumber', cedulaMatch[2])
					} else {
						setValue('idType', 'V')
						setValue('idNumber', patientData.cedula)
					}
				} else {
					setValue('idType', 'S/C')
					setValue('idNumber', '')
				}

				setValue('fullName', patientData.nombre)
			
			// Si el dependiente no tiene teléfono, usar el del responsable
			const phoneToUse = patientData.telefono || selectedResponsableData?.telefono || ''
			setValue('phone', phoneToUse, { shouldValidate: true, shouldDirty: true })
			setValue('email', patientData.email || '')

				// Calcular edad desde fecha de nacimiento si está disponible
				if (patientData.fecha_nacimiento) {
					const fechaNac = new Date(patientData.fecha_nacimiento)
					setEditableFechaNacimiento(fechaNac) // Establecer fecha editable
					const hoy = new Date()
					const diffTime = hoy.getTime() - fechaNac.getTime()
					const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

					// Calcular años y meses
					const años = Math.floor(diffDays / 365)
					const meses = Math.floor((diffDays % 365) / 30)

					if (años > 0) {
						setValue('ageValue', años)
						setValue('ageUnit', 'Años')
					} else if (meses > 0) {
						setValue('ageValue', meses)
						setValue('ageUnit', 'Meses')
					} else {
						// Menos de un mes, mostrar en días aproximados
						setValue('ageValue', Math.floor(diffDays))
						setValue('ageUnit', 'Meses')
					}
				} else if (patientData.edad) {
					// Si no hay fecha de nacimiento, usar edad manual
					setEditableFechaNacimiento(undefined) // Limpiar fecha editable
					const edadMatch = patientData.edad.match(/^(\d+)\s*(AÑOS|MESES|DÍAS|Años|Meses|Días)$/i)
					if (edadMatch) {
						setValue('ageValue', Number(edadMatch[1]))
						const unidadUpper = edadMatch[2].toUpperCase()
						if (unidadUpper === 'AÑOS' || edadMatch[2] === 'Años') {
							setValue('ageUnit', 'Años')
						} else if (unidadUpper === 'DÍAS' || edadMatch[2] === 'Días') {
							setValue('ageUnit', 'Días')
						} else {
							setValue('ageUnit', 'Meses')
						}
					}
				} else {
					setEditableFechaNacimiento(undefined) // Limpiar si no hay fecha ni edad
				}

				// Género solo para adultos y menores
				if (patientData.tipo_paciente !== 'animal') {
					setValue('gender', patientData.gender || '')
				} else {
					setValue('gender', '')
				}
			} catch (error) {
				console.error('Error cargando datos del paciente:', error)
				// Usar datos básicos del profile como fallback
				setValue('fullName', profile.nombre)
				setValue('phone', profile.telefono || '')
			}
		},
		[setValue, selectedResponsableData],
	)

	const handleDependentAdded = useCallback(
		async (dependent: PatientProfile) => {
			// Incrementar refreshKey para forzar recarga de dependientes
			setDependentsRefreshKey((prev) => prev + 1)
			// Recargar dependientes
			if (selectedResponsable) {
				try {
					setIsLoadingDependents(true)
					const deps = await getDependentsByResponsable(selectedResponsable.id)
					setDependents(
						deps.map((dep: any) => ({
							id: dep.dependiente.id,
							nombre: dep.dependiente.nombre,
							cedula: dep.dependiente.cedula || null,
							tipo_paciente: dep.dependiente.tipo_paciente || dep.tipo,
							edad: dep.dependiente.edad,
							telefono: dep.dependiente.telefono,
							fecha_nacimiento: dep.dependiente.fecha_nacimiento,
							especie: dep.dependiente.especie,
						})),
					)
				} catch (error) {
					console.error('Error cargando dependientes:', error)
				} finally {
					setIsLoadingDependents(false)
				}
			}
			// Seleccionar el nuevo dependiente automáticamente
			handleSelectProfile(dependent)
		},
		[handleSelectProfile, selectedResponsable],
	)

	const handleDependentUpdated = useCallback(
		async (dependent: PatientProfile) => {
			// Incrementar refreshKey para forzar recarga de dependientes
			setDependentsRefreshKey((prev) => prev + 1)
			// Actualizar el perfil seleccionado si es el que se editó
			if (selectedProfile && dependentToEdit && selectedProfile.id === dependentToEdit.id) {
				setSelectedProfile(dependent)
				handleSelectProfile(dependent)
			}
			// Cerrar modal de edición
			setEditDependentOpen(false)
			setDependentToEdit(null)
		},
		[handleSelectProfile, selectedProfile, dependentToEdit],
	)

	const handleResponsableUpdated = useCallback(
		async (updatedResponsable: PatientProfile) => {
			setSelectedResponsable(updatedResponsable)
			// Recargar información completa del responsable
			try {
				const patientData = await findPatientById(updatedResponsable.id)
				if (patientData) {
					setSelectedResponsableData(patientData)
				}
			} catch (error) {
				console.error('Error cargando datos del responsable:', error)
			}
			// Recargar dependientes
			try {
				setIsLoadingDependents(true)
				const deps = await getDependentsByResponsable(updatedResponsable.id)
				setDependents(
					deps.map((dep: any) => ({
						id: dep.dependiente.id,
						nombre: dep.dependiente.nombre,
						cedula: dep.dependiente.cedula || null,
						tipo_paciente: dep.dependiente.tipo_paciente || dep.tipo,
						edad: dep.dependiente.edad,
						telefono: dep.dependiente.telefono,
						fecha_nacimiento: dep.dependiente.fecha_nacimiento,
						especie: dep.dependiente.especie,
					})),
				)
			} catch (error) {
				console.error('Error cargando dependientes:', error)
				setDependents([])
			} finally {
				setIsLoadingDependents(false)
			}
			// Si el responsable está seleccionado, actualizar también
			if (selectedProfile?.id === updatedResponsable.id) {
				setSelectedProfile(updatedResponsable)
				handleSelectProfile(updatedResponsable)
			}
			setEditResponsableOpen(false)
		},
		[handleSelectProfile, selectedProfile],
	)

	const handleEditResponsable = useCallback(() => {
		setEditResponsableOpen(true)
	}, [])

	const handleEditDependent = useCallback((dependent: PatientProfile) => {
		setDependentToEdit(dependent)
		setEditDependentOpen(true)
	}, [])

	const handleDeleteResponsable = useCallback(() => {
		// Limpiar todo y volver al paso 1
		setSelectedResponsable(null)
		setSelectedProfile(null)
		setDependentsRefreshKey((prev) => prev + 1)
		// Limpiar formulario
		setValue('fullName', '')
		setValue('idType', 'V')
		setValue('idNumber', '')
		setValue('phone', '')
		setValue('email', '')
		setValue('gender', '')
		setEditableFechaNacimiento(undefined)
	}, [setValue])

	const handleDeleteDependent = useCallback(async () => {
		if (!dependentToEdit) return

		// Si el dependiente eliminado estaba seleccionado, limpiar selección
		if (selectedProfile && selectedProfile.id === dependentToEdit.id) {
			setSelectedProfile(null)
			setValue('fullName', '')
			setValue('idType', 'V')
			setValue('idNumber', '')
			setValue('phone', '')
			setValue('email', '')
			setValue('gender', '')
			setEditableFechaNacimiento(undefined)
		}
		// Incrementar refreshKey para forzar recarga de dependientes
		setDependentsRefreshKey((prev) => prev + 1)
		setDependentToEdit(null)
	}, [selectedProfile, dependentToEdit, setValue])

	// =====================================================================
	// RENDER
	// =====================================================================

	return (
		<div className="space-y-4">
			{/* Búsqueda de Paciente */}
			<Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
				<CardHeader className="p-4 sm:p-6">
					<div className="flex items-center gap-2">
						<CardTitle className="text-base sm:text-lg">Buscar Paciente</CardTitle>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Info className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
								</TooltipTrigger>
								<TooltipContent className="!max-w-lg w-auto" style={{ maxWidth: '32rem' }}>
									<p className="text-sm whitespace-normal text-left">
										Busca un paciente existente por cédula, nombre o teléfono. Si el paciente no existe, puedes registrarlo como nuevo paciente.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</CardHeader>
				<CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<PatientSearchAutocomplete
							onSelectResponsable={handleSelectResponsable}
							onSelect={handleSelectProfile}
							placeholder="Buscar por cédula, nombre o teléfono del paciente"
							className="w-full"
						/>
						<NewResponsableForm
							onResponsableCreated={handleSelectResponsable}
							trigger={
								<Button type="button" variant="outline" size="sm" className="w-full">
									Registrar Nuevo Paciente
								</Button>
							}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Seleccionar Perfil */}
			{selectedResponsable && selectedResponsableData && (
				<Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
					<CardContent className="p-3 sm:p-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
							{/* Card del Responsable - Izquierda */}
							<div className="flex flex-col">
								<div className="bg-white dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
									<div className="mb-3">
										<div className="flex items-center justify-between mb-2">
											<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</h3>
											<div className="flex items-center gap-2">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0"
													onClick={handleEditResponsable}
												>
													<Edit className="w-4 h-4" />
												</Button>
											</div>
										</div>
										<p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
											{selectedResponsableData.nombre}
										</p>
										<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3">
											Cédula: {selectedResponsableData.cedula || 'No disponible'}
										</p>
									</div>

									<div className="space-y-2 flex-grow">
										{selectedResponsableData.edad && (
											<div className="flex items-center text-xs sm:text-sm">
												<span className="text-gray-600 dark:text-gray-300">{selectedResponsableData.edad}</span>
											</div>
										)}

										{selectedResponsableData.telefono && (
											<div className="flex items-center text-xs sm:text-sm">
												<Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-2 flex-shrink-0" />
												<span className="text-gray-600 dark:text-gray-300 truncate">
													{selectedResponsableData.telefono}
												</span>
											</div>
										)}

										{selectedResponsableData.email && (
											<div className="flex items-center text-xs sm:text-sm">
												<Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-2 flex-shrink-0" />
												<span className="text-gray-600 dark:text-gray-300 truncate">
													{selectedResponsableData.email}
												</span>
											</div>
										)}
									</div>

									{/* Botón para seleccionar responsable */}
									<Button
										type="button"
										variant={selectedProfile?.id === selectedResponsable.id ? 'default' : 'outline'}
										size="sm"
										className="w-full mt-4"
										onClick={() => handleSelectProfile(selectedResponsable)}
									>
										{selectedProfile?.id === selectedResponsable.id ? (
											<>
												<CheckCircle className="w-4 h-4 mr-2" />
												Seleccionado
											</>
										) : (
											'Seleccionar este paciente'
										)}
									</Button>
								</div>
							</div>

							{/* Dependientes - Derecha */}
							<div className="flex flex-col h-full">
								<div className="bg-white dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
									<div className="flex items-center justify-between mb-3">
										<div className="flex items-center gap-2">
											<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
												Dependientes ({dependents.length})
											</h3>
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
													</TooltipTrigger>
													<TooltipContent className="!max-w-lg w-auto" style={{ maxWidth: '32rem' }}>
														<p className="text-sm whitespace-normal text-left">
															Los dependientes son pacientes asociados a un responsable (por ejemplo, hijos menores, mascotas u otros familiares). Puedes seleccionar un dependiente para registrar un caso médico en su nombre.
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
										<PatientRelationshipManager
											responsable={selectedResponsable}
											onDependentAdded={handleDependentAdded}
											onDependentUpdated={handleDependentUpdated}
										/>
									</div>

									{isLoadingDependents ? (
										<div className="text-sm text-muted-foreground py-4 text-center flex-grow flex items-center justify-center">Cargando dependientes...</div>
									) : dependents.length === 0 ? (
										<div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex-grow flex items-center justify-center">
											No hay dependientes registrados
										</div>
									) : (
										<div 
											className={cn(
												"grid grid-cols-2 gap-2 min-h-[180px]",
												dependents.length > 6 
													? "max-h-[180px] overflow-y-auto pr-1" 
													: ""
											)}
										>
											{dependents.map((dep) => (
												<div
													key={dep.id}
													className={cn(
														'flex flex-col gap-1 px-2 py-1.5 rounded-lg border-2 cursor-pointer transition-colors group relative h-[55px]',
														selectedProfile?.id === dep.id
															? 'border-primary bg-primary/5'
															: 'border-gray-200 dark:border-gray-700 hover:border-primary/50',
													)}
													onClick={() => handleSelectProfile(dep)}
												>
													<div className="flex items-center justify-between gap-1.5">
														<div className="flex items-center gap-1.5 flex-1 min-w-0">
															{dep.tipo_paciente === 'menor' ? (
																<Baby className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
															) : dep.tipo_paciente === 'animal' ? (
																<Dog className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
															) : (
																<User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
															)}
															<div className="font-medium text-xs truncate">{dep.nombre}</div>
														</div>
														<div className="flex items-center gap-0.5 flex-shrink-0">
															{selectedProfile?.id === dep.id && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
															<Button
																type="button"
																variant="ghost"
																size="sm"
																className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
																onClick={(e) => {
																	e.stopPropagation()
																	handleEditDependent(dep)
																}}
															>
																<Edit className="w-3 h-3" />
															</Button>
														</div>
													</div>
													<div className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">
														{[
															dep.tipo_paciente === 'menor' && dep.edad && `Edad: ${dep.edad}`,
															dep.tipo_paciente === 'animal' && dep.especie && `Especie: ${dep.especie}`,
															dep.fecha_nacimiento && new Date(dep.fecha_nacimiento).toLocaleDateString()
														].filter(Boolean).join(' • ')}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
			{/* Modal de edición de responsable */}
			{selectedResponsable && (
				<EditResponsableForm
					responsable={selectedResponsable}
					isOpen={editResponsableOpen}
					onClose={() => setEditResponsableOpen(false)}
					onUpdated={handleResponsableUpdated}
				/>
			)}
			{/* Modal de edición de dependiente */}
			{selectedResponsable && editDependentOpen && dependentToEdit && (
				<PatientRelationshipManager
					responsable={selectedResponsable}
					onDependentUpdated={handleDependentUpdated}
					dependentToEdit={dependentToEdit}
				/>
			)}
		</div>
	)
}
