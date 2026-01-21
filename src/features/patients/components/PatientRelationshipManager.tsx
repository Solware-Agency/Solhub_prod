// =====================================================================
// PATIENT RELATIONSHIP MANAGER - NUEVO SISTEMA
// =====================================================================
// Componente para gestionar responsabilidades (agregar dependientes)
// =====================================================================

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@shared/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { Calendar } from '@shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
import { cn } from '@shared/lib/cn'
import { Plus, CalendarIcon, Baby, Dog } from 'lucide-react'
import { format } from 'date-fns'
import { createResponsibility } from '@services/supabase/patients/responsabilidades-service'
import { createPatient, updatePatient, findPatientById } from '@services/supabase/patients/patients-service'
import { useToast } from '@shared/hooks/use-toast'
import type { PatientProfile } from './PatientSearchAutocomplete'

// =====================================================================
// TIPOS
// =====================================================================

interface PatientRelationshipManagerProps {
	responsable: PatientProfile
	onDependentAdded?: (dependent: PatientProfile) => void
	onDependentUpdated?: (dependent: PatientProfile) => void
	trigger?: React.ReactNode
	dependentToEdit?: PatientProfile | null // Si se proporciona, modo edición
}

// =====================================================================
// COMPONENTE
// =====================================================================

export const PatientRelationshipManager = ({
	responsable,
	onDependentAdded,
	onDependentUpdated,
	trigger,
	dependentToEdit = null, // Modo edición
}: PatientRelationshipManagerProps) => {
	const [isOpen, setIsOpen] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [tipoDependiente, setTipoDependiente] = useState<'menor' | 'animal'>('menor')
	const [nombre, setNombre] = useState('')
	const [fechaNacimiento, setFechaNacimiento] = useState<Date | undefined>(undefined)
	const [edad, setEdad] = useState('')
	const [edadUnidad, setEdadUnidad] = useState<'Años' | 'Meses' | 'Días'>('Años')
	const [especie, setEspecie] = useState('')
	const [telefono, setTelefono] = useState('')
	const [email, setEmail] = useState('')
	const [gender, setGender] = useState<'Masculino' | 'Femenino' | ''>('')

	const { toast } = useToast()

	// =====================================================================
	// CALCULAR EDAD DESDE FECHA DE NACIMIENTO
	// =====================================================================

	const calculateAgeFromDate = (birthDate: Date): { value: string; unidad: 'Años' | 'Meses' | 'Días' } => {
		const today = new Date()
		const birth = new Date(birthDate)

		// Calcular años y meses
		let years = today.getFullYear() - birth.getFullYear()
		let months = today.getMonth() - birth.getMonth()
		let days = today.getDate() - birth.getDate()

		// Ajustar si el día de cumpleaños aún no ha llegado este año
		if (days < 0) {
			months--
			// Obtener días del mes anterior
			const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
			days += lastMonth.getDate()
		}

		// Ajustar si el mes de cumpleaños aún no ha llegado este año
		if (months < 0) {
			years--
			months += 12
		}

		// Calcular días totales para decidir formato
		const totalDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
		const totalMonths = years * 12 + months

		// Si tiene 12 meses o más (1 año o más), mostrar en años
		if (totalMonths >= 12) {
			return { value: years.toString(), unidad: 'Años' }
		}
		// Si tiene menos de 12 meses pero más de 0 meses, mostrar en meses
		else if (totalMonths >= 1) {
			return { value: totalMonths.toString(), unidad: 'Meses' }
		}
		// Si tiene menos de 1 mes, mostrar en días
		else {
			return { value: totalDays.toString(), unidad: 'Días' }
		}
	}

	// Calcular edad cuando hay fecha de nacimiento
	const calculatedAge = useMemo(() => {
		if (!fechaNacimiento) return null
		return calculateAgeFromDate(fechaNacimiento)
	}, [fechaNacimiento])

	// =====================================================================
	// HANDLERS
	// =====================================================================

	const handleSubmit = async () => {
		// Validaciones
		if (!nombre.trim()) {
			toast({
				title: 'Error',
				description: 'El nombre es obligatorio',
				variant: 'destructive',
			})
			return
		}

		if (tipoDependiente === 'animal' && !especie.trim()) {
			toast({
				title: 'Error',
				description: 'La especie es obligatoria para animales',
				variant: 'destructive',
			})
			return
		}

		if (!fechaNacimiento && !edad) {
			toast({
				title: 'Error',
				description: 'Debe proporcionar fecha de nacimiento o edad',
				variant: 'destructive',
			})
			return
		}

		setIsSubmitting(true)

		try {
			// Formatear edad: usar edad calculada si hay fecha, sino usar edad manual
			const edadFormatted =
				fechaNacimiento && calculatedAge
					? `${calculatedAge.value} ${calculatedAge.unidad}`
					: edad
					? `${edad} ${edadUnidad}`
					: null

			if (dependentToEdit) {
				// MODO EDICIÓN: Actualizar dependiente existente
				const pacienteActualizado = await updatePatient(dependentToEdit.id, {
					nombre: nombre.trim(),
					edad: edadFormatted,
					telefono: null, // Los dependientes no tienen teléfono propio
					email: email || null,
					gender: gender && gender.trim() !== '' ? gender : null,
					fecha_nacimiento: fechaNacimiento?.toISOString().split('T')[0] || null,
					especie: tipoDependiente === 'animal' ? especie.trim() : null,
				} as any)

				// Notificar éxito
				toast({
					title: 'Éxito',
					description: `${tipoDependiente === 'menor' ? 'Menor' : 'Animal'} actualizado correctamente`,
				})

				// Resetear formulario
				resetForm()

				// Cerrar diálogo
				setIsOpen(false)

				// Notificar al componente padre (esto permitirá que el padre cierre el modal)
				if (onDependentUpdated) {
					onDependentUpdated({
						id: pacienteActualizado.id,
						nombre: pacienteActualizado.nombre,
						cedula: null,
						tipo_paciente: tipoDependiente,
						edad: edadFormatted,
						telefono: pacienteActualizado.telefono,
						fecha_nacimiento: fechaNacimiento?.toISOString().split('T')[0] || null,
						especie: tipoDependiente === 'animal' ? especie : null,
					})
				}
			} else {
				// MODO CREACIÓN: Crear nuevo dependiente
				// Para dependientes (menores/animales), usar NULL en lugar de 'S/C'
				// El constraint unique_cedula_per_laboratory solo aplica cuando cedula IS NOT NULL
				// Esto permite múltiples dependientes sin cédula en el mismo laboratorio
				// Usar as any temporalmente hasta que se actualicen los tipos de PatientInsert
				const nuevoPaciente = await createPatient({
					cedula: null, // NULL para dependientes (no viola constraint unique_cedula_per_laboratory)
					nombre: nombre.trim(),
					edad: edadFormatted,
				telefono: null, // Los dependientes no tienen teléfono propio
				email: email || null,
				gender: gender && gender.trim() !== '' ? gender : null, // Asegurar que no se guarde cadena vacía
				tipo_paciente: tipoDependiente,
				fecha_nacimiento: fechaNacimiento?.toISOString().split('T')[0] || null,
				especie: tipoDependiente === 'animal' ? especie.trim() : null,
			} as any)

			// Crear relación de responsabilidad
			await createResponsibility({
			paciente_id_responsable: responsable.id,
			paciente_id_dependiente: nuevoPaciente.id,
			tipo: tipoDependiente,
		})

		// Notificar éxito
		toast({
			title: 'Éxito',
			description: `${tipoDependiente === 'menor' ? 'Menor' : 'Animal'} agregado correctamente`,
		})

		// Resetear formulario
		resetForm()
				if (onDependentAdded) {
					onDependentAdded({
						id: nuevoPaciente.id,
						nombre: nuevoPaciente.nombre,
						cedula: null,
						tipo_paciente: tipoDependiente,
						edad: edadFormatted,
						telefono: nuevoPaciente.telefono,
						fecha_nacimiento: fechaNacimiento?.toISOString().split('T')[0] || null,
						especie: tipoDependiente === 'animal' ? especie : null,
					})
				}
			}
		} catch (error) {
			console.error('Error creando dependiente:', error)
			
			let errorMessage = 'No se pudo registrar el dependiente. Por favor, intenta de nuevo.'
			
			if (error instanceof Error) {
				if (error.message.includes('no autenticado')) {
					errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
				} else if (error.message.includes('laboratorio')) {
					errorMessage = 'No tienes un laboratorio asignado. Contacta al administrador.'
				} else if (error.message.includes('duplicate') || error.message.includes('unique')) {
					errorMessage = 'Ya existe un dependiente con estos datos.'
				} else if (error.message.includes('required') || error.message.includes('null')) {
					errorMessage = 'Por favor, completa todos los campos obligatorios: nombre y edad.'
				} else if (error.message.includes('responsabilidad')) {
					errorMessage = 'No se pudo vincular al dependiente con el responsable.'
				}
			}
			
			toast({
				title: '❌ Error al registrar dependiente',
				description: errorMessage,
				variant: 'destructive',
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const resetForm = () => {
		setTipoDependiente('menor')
		setNombre('')
		setFechaNacimiento(undefined)
		setEdad('')
		setEdadUnidad('Años')
		setEspecie('')
		setTelefono(responsable.telefono || '') // Siempre del responsable
		setEmail('')
		setGender('')
	}

	// =====================================================================
	// RENDER
	// =====================================================================

	// Controlar apertura del diálogo cuando se pasa dependentToEdit
	useEffect(() => {
		const loadDependentData = async () => {
			if (dependentToEdit?.id) {
				try {
					// Obtener datos completos del dependiente desde la base de datos
					const patientData = await findPatientById(dependentToEdit.id)

					if (!patientData) {
						toast({
							title: 'Error',
							description: 'No se pudieron cargar los datos del dependiente',
							variant: 'destructive',
						})
						return
					}

					// Cargar datos del dependiente a editar
					setTipoDependiente((patientData.tipo_paciente as 'menor' | 'animal') || 'menor')
					setNombre(patientData.nombre || '')
					// Teléfono siempre del responsable
					setTelefono(responsable.telefono || '')
					setEmail(patientData.email || '')
					setGender(patientData.gender || '')
					setEspecie(patientData.especie || '')

					// Manejar fecha de nacimiento
					if (patientData.fecha_nacimiento) {
						// La fecha viene como string (YYYY-MM-DD) desde la base de datos
						// Parsear manualmente para evitar problemas de zona horaria
						const fechaParts = patientData.fecha_nacimiento.split('-')
						if (fechaParts.length === 3) {
							const year = parseInt(fechaParts[0], 10)
							const month = parseInt(fechaParts[1], 10) - 1 // Los meses en JS son 0-indexed
							const day = parseInt(fechaParts[2], 10)
							const fecha = new Date(year, month, day)
							// Validar que la fecha sea válida
							if (!isNaN(fecha.getTime())) {
								setFechaNacimiento(fecha)
								setEdad('') // Limpiar edad manual si hay fecha
							} else {
								setFechaNacimiento(undefined)
							}
						} else {
							setFechaNacimiento(undefined)
						}
					} else if (patientData.edad) {
						// Parsear edad manual (formato: "5 Años", "3 Meses" o "10 Días")
						const edadMatch = patientData.edad.match(/(\d+)\s+(Años|Meses|Días|AÑOS|MESES|DÍAS)/i)
						if (edadMatch) {
							setEdad(edadMatch[1])
							const unidad = edadMatch[2].toUpperCase()
							if (unidad === 'AÑOS' || edadMatch[2] === 'Años') {
								setEdadUnidad('Años')
							} else if (unidad === 'DÍAS' || edadMatch[2] === 'Días') {
								setEdadUnidad('Días')
							} else {
								setEdadUnidad('Meses')
							}
							setFechaNacimiento(undefined) // Limpiar fecha si hay edad manual
						} else {
							setFechaNacimiento(undefined)
							setEdad('')
						}
					} else {
						setFechaNacimiento(undefined)
						setEdad('')
					}

					setIsOpen(true)
				} catch (error) {
					console.error('Error cargando datos del dependiente:', error)
					toast({
						title: 'Error',
						description: 'Error al cargar los datos del dependiente',
						variant: 'destructive',
					})
				}
			} else if (!trigger) {
				// Si no hay trigger y no hay dependentToEdit, mantener cerrado
				setIsOpen(false)
			}
		}

		loadDependentData()
	}, [dependentToEdit?.id, trigger, toast])

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				setIsOpen(open)
				if (!open) {
					// Si se cierra, resetear formulario
					resetForm()
					// Si estaba en modo edición, notificar al padre que se cerró
					if (dependentToEdit && onDependentUpdated) {
						// No hacer nada, solo resetear
					}
				}
			}}
		>
			{/* Solo renderizar el trigger si NO está en modo edición */}
			{!dependentToEdit && (
				<DialogTrigger asChild>
					{trigger || (
						<Button variant="outline" size="sm">
							<Plus className="w-4 h-4 mr-2" />
							Agregar Dependiente
						</Button>
					)}
				</DialogTrigger>
			)}
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-visible bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]">
				<DialogHeader>
					<DialogTitle>
						{dependentToEdit ? 'Editar' : 'Agregar'} Dependiente
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-4 px-2 overflow-y-auto max-h-[calc(90vh-180px)]">
					{/* Tipo de dependiente */}
					<div className="space-y-2">
						<Label>Tipo de Dependiente</Label>
						<Select value={tipoDependiente} onValueChange={(value) => setTipoDependiente(value as 'menor' | 'animal')}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="menor">
									<div className="flex items-center gap-2">
										<Baby className="w-4 h-4" />
										Menor de Edad
									</div>
								</SelectItem>
								<SelectItem value="animal">
									<div className="flex items-center gap-2">
										<Dog className="w-4 h-4" />
										Animal
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Primera línea: Nombre Completo y Género/Especie */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="nombre">Nombre Completo *</Label>
							<Input
								id="nombre"
								value={nombre}
								onChange={(e) => setNombre(e.target.value)}
								placeholder="Nombre completo"
							/>
						</div>

						<div className="space-y-2">
							{tipoDependiente === 'menor' ? (
								<>
									<Label>Género</Label>
									<Select
										value={gender || undefined}
										onValueChange={(value) => {
											setGender(value as 'Masculino' | 'Femenino')
										}}
									>
										<SelectTrigger>
											<SelectValue placeholder="Seleccionar género" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Masculino">Masculino</SelectItem>
											<SelectItem value="Femenino">Femenino</SelectItem>
										</SelectContent>
									</Select>
								</>
							) : (
								<>
									<Label htmlFor="especie">Especie *</Label>
									<Input
										id="especie"
										value={especie}
										onChange={(e) => setEspecie(e.target.value)}
										placeholder="Ej: Perro, Gato, etc."
									/>
								</>
							)}
						</div>
					</div>

					{/* Fecha de nacimiento o Edad */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Fecha de Nacimiento</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal min-w-0',
											!fechaNacimiento && 'text-muted-foreground',
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
										<span className="truncate">
											{fechaNacimiento ? format(fechaNacimiento, 'dd/MM/yyyy') : 'Fecha'}
										</span>
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={fechaNacimiento}
										onSelect={(date) => {
											setFechaNacimiento(date)
											// Limpiar edad manual si se selecciona fecha
											if (date) {
												setEdad('')
											}
										}}
										defaultMonth={fechaNacimiento || new Date()}
										initialFocus
										disabled={(date) => {
											const today = new Date()
											today.setHours(0, 0, 0, 0)
											const dateToCompare = new Date(date)
											dateToCompare.setHours(0, 0, 0, 0)
											return dateToCompare > today
										}}
									/>
								</PopoverContent>
							</Popover>
						</div>

						<div className="space-y-2">
							<Label>Edad</Label>
							<div className="flex gap-2">
								<Input
									type="number"
									value={fechaNacimiento && calculatedAge ? calculatedAge.value : edad}
									onChange={(e) => {
										if (!fechaNacimiento) {
											setEdad(e.target.value)
										}
									}}
									placeholder={fechaNacimiento && calculatedAge ? 'Calculada automáticamente' : 'Edad'}
									className={cn(
										'flex-1',
										fechaNacimiento && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
									)}
									disabled={!!fechaNacimiento}
									readOnly={!!fechaNacimiento}
								/>
								<Select
									value={fechaNacimiento && calculatedAge ? calculatedAge.unidad : edadUnidad}
									onValueChange={(value) => {
										if (!fechaNacimiento) {
											setEdadUnidad(value as 'Años' | 'Meses' | 'Días')
										}
									}}
									disabled={!!fechaNacimiento}
								>
									<SelectTrigger
										className={cn(
											'w-24',
											fechaNacimiento && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
										)}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Años">Años</SelectItem>
										<SelectItem value="Meses">Meses</SelectItem>
										<SelectItem value="Días">Días</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>


					{/* Última línea: Teléfono y Email */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="telefono">Teléfono (del responsable)</Label>
							<Input
								id="telefono"
								value={telefono}
								disabled
								readOnly
								placeholder="Teléfono del responsable"
								maxLength={15}
								className="opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Email (opcional)"
							/>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting
							? dependentToEdit
								? 'Actualizando...'
								: 'Guardando...'
							: dependentToEdit
							? 'Actualizar'
							: 'Guardar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
