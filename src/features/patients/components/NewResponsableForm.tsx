// =====================================================================
// NEW RESPONSABLE FORM - NUEVO SISTEMA
// =====================================================================
// Componente para registrar un nuevo responsable (adulto) cuando no existe
// =====================================================================

import { useState, useMemo } from 'react'
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
import { FormDropdown, createDropdownOptions } from '@shared/components/ui/form-dropdown'
import { Calendar } from '@shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
import { UserPlus, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { createPatient, PatientError } from '@services/supabase/patients/patients-service'
import { createIdentification } from '@services/supabase/patients/identificaciones-service'
import { useToast } from '@shared/hooks/use-toast'
import { cn } from '@shared/lib/cn'
import type { PatientProfile } from './PatientSearchAutocomplete'

// =====================================================================
// TIPOS
// =====================================================================

interface NewResponsableFormProps {
	onResponsableCreated?: (responsable: PatientProfile) => void
	trigger?: React.ReactNode
}

// =====================================================================
// COMPONENTE
// =====================================================================

export const NewResponsableForm = ({ onResponsableCreated, trigger }: NewResponsableFormProps) => {
	const [isOpen, setIsOpen] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [nombre, setNombre] = useState('')
	const [cedulaTipo, setCedulaTipo] = useState<'V' | 'E' | 'J' | 'C'>('V')
	const [cedulaNumero, setCedulaNumero] = useState('')
	const [fechaNacimiento, setFechaNacimiento] = useState<Date | undefined>(undefined)
	const [edad, setEdad] = useState('')
	const [edadUnidad, setEdadUnidad] = useState<'Años' | 'Meses'>('Años')
	const [telefono, setTelefono] = useState('')
	const [email, setEmail] = useState('')
	const [gender, setGender] = useState<'Masculino' | 'Femenino' | ''>('')

	const { toast } = useToast()

	// =====================================================================
	// CALCULAR EDAD DESDE FECHA DE NACIMIENTO
	// =====================================================================

	const calculateAgeFromDate = (birthDate: Date): { value: string; unidad: 'Años' | 'Meses' } => {
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

		// Calcular meses totales para decidir formato
		const totalMonths = years * 12 + months

		// Si tiene 12 meses o más (1 año o más), mostrar en años
		if (totalMonths >= 12) {
			return { value: years.toString(), unidad: 'Años' }
		}
		// Si tiene menos de 12 meses pero más de 0 meses, mostrar en meses
		else if (totalMonths >= 1) {
			return { value: totalMonths.toString(), unidad: 'Meses' }
		}
		// Si tiene menos de 1 mes, mostrar como "0 Meses" (recién nacido)
		else {
			return { value: '0', unidad: 'Meses' }
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

		if (!cedulaNumero.trim()) {
			toast({
				title: 'Error',
				description: 'El número de cédula es obligatorio para responsables',
				variant: 'destructive',
			})
			return
		}

		// Validar que el número de cédula sea numérico
		if (!/^[0-9]+$/.test(cedulaNumero.trim())) {
			toast({
				title: 'Error',
				description: 'El número de cédula debe contener solo números',
				variant: 'destructive',
			})
			return
		}

		setIsSubmitting(true)

		try {
			// 1. Formatear cédula completa
			const cedulaFormatted = `${cedulaTipo}-${cedulaNumero.trim()}`

			// 2. Formatear edad: usar edad calculada si hay fecha, sino usar edad manual
			const edadFormatted =
				fechaNacimiento && calculatedAge
					? `${calculatedAge.value} ${calculatedAge.unidad}`
					: edad
					? `${edad} ${edadUnidad}`
					: null

			// 3. Crear paciente responsable (adulto)
			const nuevoPaciente = await createPatient({
				cedula: cedulaFormatted,
				nombre: nombre.trim(),
				edad: edadFormatted,
				telefono: telefono || null,
				email: email || null,
				gender: gender && gender.trim() !== '' ? gender : null, // Asegurar que no se guarde cadena vacía
				tipo_paciente: 'adulto',
				fecha_nacimiento: fechaNacimiento?.toISOString().split('T')[0] || null,
			} as any)

			// 4. Crear identificación en la tabla identificaciones
			await createIdentification({
				paciente_id: nuevoPaciente.id,
				tipo_documento: cedulaTipo,
				numero: cedulaNumero.trim(),
			})

			// 5. Notificar éxito
			toast({
				title: '✅ Paciente registrado',
				description: `${nombre.trim()} ha sido registrado correctamente`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// 6. Resetear formulario
			resetForm()

			// 7. Cerrar diálogo
			setIsOpen(false)

			// 8. Notificar al componente padre
			if (onResponsableCreated) {
				onResponsableCreated({
					id: nuevoPaciente.id,
					nombre: nuevoPaciente.nombre,
					cedula: nuevoPaciente.cedula,
					tipo_paciente: 'adulto',
					edad: nuevoPaciente.edad,
					telefono: nuevoPaciente.telefono,
					fecha_nacimiento: fechaNacimiento?.toISOString().split('T')[0] || null,
				})
			}
		} catch (error) {
			console.error('Error creando responsable:', error)

			let errorMessage = 'No se pudo registrar el paciente. Por favor, intenta de nuevo.'

			if (error instanceof PatientError) {
				// Usar códigos de error en lugar de mensajes
				switch (error.code) {
					case 'USER_NOT_AUTHENTICATED':
						errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
						break
					case 'USER_NO_LABORATORY':
						errorMessage = 'No tienes un laboratorio asignado. Contacta al administrador.'
						break
					case 'PATIENT_DUPLICATE':
						errorMessage = 'Ya existe un paciente con esta cédula.'
						break
					case 'PATIENT_REQUIRED_FIELD':
						errorMessage = 'Por favor, completa todos los campos obligatorios.'
						break
					case 'DATABASE_ERROR':
						errorMessage = 'Error al guardar en la base de datos. Por favor, intenta de nuevo.'
						break
					case 'UNKNOWN_ERROR':
					default:
						errorMessage = error.message || 'No se pudo registrar el paciente. Por favor, intenta de nuevo.'
						break
				}
			} else if (error instanceof Error) {
				// Fallback para errores que no son PatientError
				errorMessage = error.message || 'No se pudo registrar el paciente. Por favor, intenta de nuevo.'
			}

			toast({
				title: '❌ No se pudo registrar el paciente',
				description: errorMessage,
				variant: 'default',
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const resetForm = () => {
		setNombre('')
		setCedulaTipo('V')
		setCedulaNumero('')
		setFechaNacimiento(undefined)
		setEdad('')
		setEdadUnidad('Años')
		setTelefono('')
		setEmail('')
		setGender('')
	}

	// =====================================================================
	// RENDER
	// =====================================================================

	// Prevenir auto-focus en responsive (mobile)
	const handleOpenAutoFocus = (e: Event) => {
		// Detectar si es mobile (ancho menor a 640px - breakpoint sm de Tailwind)
		if (window.innerWidth < 640) {
			e.preventDefault()
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline" size="sm">
						<UserPlus className="w-4 h-4 mr-2" />
						Registrar Nuevo Responsable
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-visible" onOpenAutoFocus={handleOpenAutoFocus}>
				<DialogHeader>
					<DialogTitle>Registrar Nuevo Paciente</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
					{/* Primera línea: Nombre Completo y Teléfono */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="nombre">Nombre Completo *</Label>
							<Input
								id="nombre"
								value={nombre}
								onChange={(e) => {
									const { value } = e.target
									if (/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]*$/.test(value)) {
										setNombre(value)
									}
								}}
								placeholder="Nombre completo"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="telefono">Teléfono</Label>
							<Input
								id="telefono"
								value={telefono}
								onChange={(e) => {
									const { value } = e.target
									// Permitir números, guiones, espacios, paréntesis y el símbolo +
									if (/^[0-9-+\s()]*$/.test(value) && value.length <= 15) {
										setTelefono(value)
									}
								}}
								placeholder="Teléfono de contacto"
								maxLength={15}
							/>
						</div>
					</div>

					{/* Segunda línea: Cédula y Género */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Cédula *</Label>
							<div className="grid grid-cols-6 sm:grid-cols-5 gap-2">
								<div className="col-span-2 sm:col-span-1 min-w-[60px]">
									<FormDropdown
										options={createDropdownOptions([
											{ value: 'V', label: 'V -' },
											{ value: 'E', label: 'E -' },
											{ value: 'J', label: 'J -' },
											{ value: 'C', label: 'C -' },
										])}
										value={cedulaTipo}
										onChange={(value) => setCedulaTipo(value as 'V' | 'E' | 'J' | 'C')}
										placeholder="Tipo"
										className="transition-none text-xs sm:text-sm"
										id="cedula-tipo"
									/>
								</div>
								<div className="col-span-4 sm:col-span-4">
									<Input
										id="cedula-numero"
										value={cedulaNumero}
										onChange={(e) => {
											const { value } = e.target
											// Solo permitir números
											if (/^[0-9]*$/.test(value)) {
												setCedulaNumero(value)
											}
										}}
										placeholder="12345678"
										maxLength={10}
									/>
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<Label>Género</Label>
							<FormDropdown
								options={createDropdownOptions(['Masculino', 'Femenino'])}
								value={gender}
								onChange={(value) => setGender(value as 'Masculino' | 'Femenino' | '')}
								placeholder="Seleccionar género"
								className="transition-none"
								id="responsable-gender"
							/>
						</div>
					</div>

					{/* Tercera línea: Fecha de Nacimiento o Edad */}
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
							<div className="flex gap-2 relative">
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
								<FormDropdown
									options={createDropdownOptions(['Años', 'Meses'])}
									value={fechaNacimiento && calculatedAge ? calculatedAge.unidad : edadUnidad}
									onChange={(value) => {
										if (!fechaNacimiento) {
											setEdadUnidad(value as 'Años' | 'Meses')
										}
									}}
									placeholder="Unidad"
									className={cn(
										'w-24 transition-none',
										fechaNacimiento && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
									)}
									disabled={!!fechaNacimiento}
									direction="auto"
									id="edad-unidad"
								/>
							</div>
						</div>
					</div>

					{/* Última línea: Email (opcional) */}
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

				<DialogFooter>
					<Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? 'Registrando...' : 'Registrar Paciente'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
