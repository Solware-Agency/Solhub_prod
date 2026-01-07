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
import { CheckCircle, CalendarIcon, Phone, Mail, User, Edit, Trash2, Baby, Dog } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import { cn } from '@shared/lib/cn'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar } from '@shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
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
				setValue('phone', patientData.telefono || '')
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
					const edadMatch = patientData.edad.match(/^(\d+)\s*(AÑOS|MESES|Años|Meses)$/i)
					if (edadMatch) {
						setValue('ageValue', Number(edadMatch[1]))
						setValue('ageUnit', edadMatch[2].toUpperCase() === 'AÑOS' || edadMatch[2] === 'Años' ? 'Años' : 'Meses')
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
		[setValue],
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
					<CardTitle className="text-base sm:text-lg">Buscar Paciente</CardTitle>
				</CardHeader>
				<CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<PatientSearchAutocomplete
							onSelectResponsable={handleSelectResponsable}
							onSelect={handleSelectProfile}
							placeholder="Buscar por cédula, nombre o teléfono del paciente..."
							className="w-full"
						/>
						<NewResponsableForm
							onResponsableCreated={handleSelectResponsable}
							trigger={
								<Button variant="outline" size="sm" className="w-full">
									Registrar Nuevo Paciente
								</Button>
							}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Seleccionar Perfil */}
			<Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
				<CardContent className="p-3 sm:p-4">
					{selectedResponsable && selectedResponsableData ? (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
							{/* Card del Responsable - Izquierda */}
							<div className="lg:col-span-5">
								<div className="bg-white dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all duration-300">
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
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0 text-destructive hover:text-destructive"
													onClick={handleDeleteResponsable}
												>
													<Trash2 className="w-4 h-4" />
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

									<div className="space-y-2">
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

							{/* División - Centro */}
							<div className="hidden lg:flex lg:col-span-1 items-center justify-center">
								<div className="w-px h-full bg-gray-200 dark:bg-gray-700"></div>
							</div>

							{/* Dependientes - Derecha */}
							<div className="lg:col-span-6">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
										Dependientes ({dependents.length})
									</h3>
									<PatientRelationshipManager
										responsable={selectedResponsable}
										onDependentAdded={handleDependentAdded}
										onDependentUpdated={handleDependentUpdated}
									/>
								</div>

								{isLoadingDependents ? (
									<div className="text-sm text-muted-foreground py-4 text-center">Cargando dependientes...</div>
								) : dependents.length === 0 ? (
									<div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
										No hay dependientes registrados
									</div>
								) : (
									<div className="space-y-2 max-h-[400px] overflow-y-auto">
										{dependents.map((dep) => (
											<div
												key={dep.id}
												className={cn(
													'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors group',
													selectedProfile?.id === dep.id
														? 'border-primary bg-primary/5'
														: 'border-gray-200 dark:border-gray-700 hover:border-primary/50',
												)}
												onClick={() => handleSelectProfile(dep)}
											>
												{dep.tipo_paciente === 'menor' ? (
													<Baby className="w-5 h-5 text-blue-500" />
												) : dep.tipo_paciente === 'animal' ? (
													<Dog className="w-5 h-5 text-green-500" />
												) : (
													<User className="w-5 h-5 text-gray-500" />
												)}
												<div className="flex-1 min-w-0">
													<div className="font-medium">{dep.nombre}</div>
													<div className="text-sm text-muted-foreground">
														{dep.tipo_paciente === 'menor' && dep.edad && `Edad: ${dep.edad}`}
														{dep.tipo_paciente === 'animal' && dep.especie && `Especie: ${dep.especie}`}
														{dep.fecha_nacimiento &&
															` • Nac: ${new Date(dep.fecha_nacimiento).toLocaleDateString()}`}
													</div>
												</div>
												<div className="flex items-center gap-2">
													{selectedProfile?.id === dep.id && <CheckCircle className="w-5 h-5 text-primary" />}
													<Button
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
														onClick={(e) => {
															e.stopPropagation()
															handleEditDependent(dep)
														}}
													>
														<Edit className="w-4 h-4" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
														onClick={(e) => {
															e.stopPropagation()
															setDependentToEdit(dep)
															handleDeleteDependent()
														}}
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					) : (
						<div className="text-center py-8 text-gray-500 dark:text-gray-400">
							<p className="text-sm">Primero debes seleccionar un paciente</p>
						</div>
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
				</CardContent>
			</Card>
		</div>
	)
}
