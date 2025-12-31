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
import { CheckCircle, CalendarIcon } from 'lucide-react'
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
import { findPatientById } from '@services/supabase/patients/patients-service'

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
	const [selectedProfile, setSelectedProfile] = useState<PatientProfile | null>(null)
	const [dependentsRefreshKey, setDependentsRefreshKey] = useState(0) // Key para refrescar lista de dependientes
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
			}
		}, 1000) // Aumentar a 1000ms para dar más tiempo

		return () => clearTimeout(timeoutId)
	}, [fullName, idNumber, phone, idType, selectedResponsable, selectedProfile])

	// =====================================================================
	// HANDLERS
	// =====================================================================

	const handleSelectResponsable = useCallback(
		(responsable: PatientProfile) => {
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
		(dependent: PatientProfile) => {
			// Incrementar refreshKey para forzar recarga de dependientes
			setDependentsRefreshKey((prev) => prev + 1)
			// Seleccionar el nuevo dependiente automáticamente
			handleSelectProfile(dependent)
		},
		[handleSelectProfile],
	)

	const handleDependentUpdated = useCallback(
		(dependent: PatientProfile) => {
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
		(updatedResponsable: PatientProfile) => {
			setSelectedResponsable(updatedResponsable)
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

	const handleDeleteDependent = useCallback(() => {
		// Si el dependiente eliminado estaba seleccionado, limpiar selección
		if (selectedProfile && dependentToEdit && selectedProfile.id === dependentToEdit.id) {
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
			{/* Paso 1: Búsqueda de Responsable */}
			<Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
				<CardHeader className="p-4 sm:p-6">
					<CardTitle className="text-base sm:text-lg">Paso 1: Buscar Responsable</CardTitle>
				</CardHeader>
				<CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
					<div className="space-y-3">
						<PatientSearchAutocomplete
							onSelectResponsable={handleSelectResponsable}
							onSelect={handleSelectProfile}
							placeholder="Buscar por cédula, nombre o teléfono del responsable..."
							className="w-full"
						/>
						<div className="flex items-center gap-2">
							<div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
							<span className="text-xs text-gray-500 dark:text-gray-400">o</span>
							<div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
						</div>
						<NewResponsableForm
							onResponsableCreated={handleSelectResponsable}
							trigger={
								<Button variant="outline" size="sm" className="w-full">
									Registrar Nuevo Responsable
								</Button>
							}
						/>
					</div>
					{selectedResponsable && (
						<div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
							<CheckCircle className="h-4 w-4" />
							<span>Responsable seleccionado: {selectedResponsable.nombre}</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Paso 2: Seleccionar Perfil (si hay responsable) */}
			{selectedResponsable && (
				<Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
					<CardHeader className="p-4 sm:p-6">
						<CardTitle className="text-base sm:text-lg">Paso 2: ¿Para quién es el caso?</CardTitle>
					</CardHeader>
					<CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
						<div className="space-y-4">
							<PatientProfileSelector
								responsable={selectedResponsable}
								onSelectProfile={handleSelectProfile}
								onEditResponsable={handleEditResponsable}
								onEditDependent={handleEditDependent}
								onDeleteResponsable={handleDeleteResponsable}
								onDeleteDependent={handleDeleteDependent}
								selectedProfileId={selectedProfile?.id || null}
								refreshKey={dependentsRefreshKey}
							/>
							{selectedResponsable && (
								<div className="flex justify-end">
									<PatientRelationshipManager
										responsable={selectedResponsable}
										onDependentAdded={handleDependentAdded}
										onDependentUpdated={handleDependentUpdated}
									/>
								</div>
							)}
						</div>
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
						{selectedProfile && (
							<div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
								<CheckCircle className="h-4 w-4" />
								<span>
									Perfil seleccionado: {selectedProfile.nombre} (
									{selectedProfile.tipo_paciente === 'adulto'
										? 'Responsable'
										: selectedProfile.tipo_paciente === 'menor'
										? 'Menor'
										: 'Animal'}
									)
								</span>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Paso 3: Datos del Paciente (si hay perfil seleccionado) */}
			{selectedProfile && (
				<Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
					<CardHeader className="p-4 sm:p-6">
						<CardTitle className="text-base sm:text-lg">Paso 3: Datos del Paciente</CardTitle>
						{selectedProfile && (
							<div className="flex items-center gap-1 text-green-600 text-xs sm:text-sm mt-2">
								<CheckCircle className="h-4 w-4" />
								<span>Datos de {selectedProfile.nombre} cargados</span>
							</div>
						)}
					</CardHeader>
					<CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
						{/* Cédula (solo lectura si es adulto) */}
						<div className="grid grid-cols-1 md:grid-cols-8 gap-2">
							<div className="grid grid-cols-5 gap-2 col-span-5">
								<FormField
									control={control}
									name="idType"
									render={({ field }) => (
										<FormItem className="space-y-2 flex flex-col col-span-2">
											<FormLabel className="whitespace-nowrap">Cédula *</FormLabel>
											<FormControl>
												<Input {...field} disabled className={cn(inputStyles, 'opacity-50 cursor-not-allowed')} />
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={control}
									name="idNumber"
									render={({ field }) => (
										<FormItem className="flex flex-col col-span-3">
											<FormLabel className="text-transparent">Número</FormLabel>
											<FormControl>
												<Input
													{...field}
													disabled={field.value === '' || !field.value || !!selectedProfile}
													placeholder={selectedProfile.cedula ? '12345678' : 'No aplica'}
													className={cn(
														inputStyles,
														(!field.value || field.value === '') && 'opacity-50 cursor-not-allowed',
													)}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<p className="text-[10px] sm:text-xs text-gray-500 mt-1 min-h-[32px] sm:min-h-[36px] leading-tight w-full col-span-full">
									{selectedProfile.cedula ? '💡 Cédula del responsable' : '👶 Menor/Animal sin cédula'}
								</p>
							</div>
							<FormField
								control={control}
								name="gender"
								render={({ field }) => (
									<FormItem className="space-y-2 flex flex-col col-span-full md:col-span-3">
										<FormLabel>Género *</FormLabel>
										<FormControl>
											<FormDropdown
												options={createDropdownOptions(['Masculino', 'Femenino'])}
												value={field.value as string}
												onChange={field.onChange}
												placeholder="Género"
												disabled={selectedProfile.tipo_paciente === 'animal' || !!selectedProfile} // Deshabilitar cuando hay perfil seleccionado
												className={cn(
													inputStyles + ' transition-none',
													(selectedProfile.tipo_paciente === 'animal' || selectedProfile) &&
														'opacity-50 cursor-not-allowed',
												)}
												id="patient-gender-new"
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>

						{/* Nombre Completo */}
						<FormField
							control={control}
							name="fullName"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Nombre Completo *</FormLabel>
									<FormControl>
										<Input
											{...field}
											onChange={(e) => {
												const { value } = e.target
												if (/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]*$/.test(value)) {
													field.onChange(e)
												}
											}}
											disabled={!!selectedProfile} // Deshabilitar cuando hay perfil seleccionado
											className={cn(inputStyles, selectedProfile && 'opacity-50 cursor-not-allowed')}
										/>
									</FormControl>
									<div className="min-h-[32px] sm:min-h-[36px]"></div>
								</FormItem>
							)}
						/>

						{/* Teléfono */}
						<FormField
							control={control}
							name="phone"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Teléfono *</FormLabel>
									<FormControl>
										<Input
											{...field}
											maxLength={15}
											onChange={(e) => {
												const { value } = e.target
												// Permitir números, guiones, espacios, paréntesis y el símbolo +
												if (/^[0-9-+\s()]*$/.test(value) && value.length <= 15) {
													field.onChange(e)
												}
											}}
											className={inputStyles}
											disabled={!!selectedProfile}
										/>
									</FormControl>
									<div className="min-h-[32px] sm:min-h-[36px]"></div>
								</FormItem>
							)}
						/>

						{/* Fecha de Nacimiento (editable) */}
						<div className="space-y-2 flex flex-col">
							<FormLabel>Fecha de Nacimiento</FormLabel>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal',
											!editableFechaNacimiento && 'text-muted-foreground',
										)}
										disabled={!!ageValue && !editableFechaNacimiento || !!selectedProfile}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{editableFechaNacimiento ? (
											format(editableFechaNacimiento, 'PPP', { locale: es })
										) : (
											<span>Seleccionar fecha</span>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={editableFechaNacimiento}
										onSelect={(date) => {
											setEditableFechaNacimiento(date)
											// Limpiar edad manual si se selecciona fecha
											if (date) {
												setValue('ageValue', 0)
												setValue('ageUnit', 'Años')
												// Calcular edad automáticamente
												const hoy = new Date()
												const diffTime = hoy.getTime() - date.getTime()
												const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
												const años = Math.floor(diffDays / 365)
												const meses = Math.floor((diffDays % 365) / 30)
												if (años > 0) {
													setValue('ageValue', años)
													setValue('ageUnit', 'Años')
												} else if (meses > 0) {
													setValue('ageValue', meses)
													setValue('ageUnit', 'Meses')
												}
											}
										}}
										initialFocus
										disabled={(date) => date > new Date()}
									/>
								</PopoverContent>
							</Popover>
							<div className="min-h-[32px] sm:min-h-[36px]"></div>
						</div>
						{/* Fecha de Nacimiento y Edad */}
						<div className="col-span-1 sm:col-span-2 lg:col-span-1">
							<div className={cn('grid grid-cols-2 gap-2', selectedProfile.fecha_nacimiento && 'mt-2')}>
								<FormField
									control={control}
									name="ageValue"
									render={({ field }) => (
										<FormItem className="space-y-2 flex flex-col col-span-1">
											<FormLabel>{selectedProfile.fecha_nacimiento ? 'Edad (calculada)' : 'Edad'}</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="number"
													placeholder="0"
													min="0"
													max="150"
													value={field.value === 0 ? '' : field.value}
													onChange={(e) => {
														const value = e.target.value
														field.onChange(value === '' ? 0 : Number(value))
													}}
													disabled={!!selectedProfile.fecha_nacimiento || !!selectedProfile} // Deshabilitar cuando hay perfil seleccionado
													className={cn(
														inputStyles,
														(selectedProfile.fecha_nacimiento || selectedProfile) && 'opacity-50 cursor-not-allowed',
														'[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
													)}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={control}
									name="ageUnit"
									render={({ field }) => (
										<FormItem className="space-y-2 flex flex-col col-span-1">
											<FormLabel className="text-transparent">Unidad</FormLabel>
											<FormControl>
												<Input
													{...field}
													disabled={!!selectedProfile.fecha_nacimiento || !!selectedProfile} // Deshabilitar cuando hay perfil seleccionado
													className={cn(
														inputStyles,
														(selectedProfile.fecha_nacimiento || selectedProfile) && 'opacity-50 cursor-not-allowed',
													)}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Email */}
						<FormField
							control={control}
							name="email"
							render={({ field }) => (
								<FormItem className="space-y-2 flex flex-col col-span-1">
									<FormLabel>Correo electrónico</FormLabel>
									<FormControl>
										<Input {...field} type="email" placeholder="email@ejemplo.com" className={inputStyles} disabled={!!selectedProfile} />
									</FormControl>
								</FormItem>
							)}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
