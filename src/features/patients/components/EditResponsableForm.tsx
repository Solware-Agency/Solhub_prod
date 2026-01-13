// =====================================================================
// EDIT RESPONSABLE FORM - NUEVO SISTEMA
// =====================================================================
// Componente para editar un responsable (adulto) existente
// =====================================================================

import { useState, useEffect } from 'react'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@shared/components/ui/dialog'
import { FormDropdown, createDropdownOptions } from '@shared/components/ui/form-dropdown'
import { Calendar } from '@shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { updatePatient, findPatientById } from '@services/supabase/patients/patients-service'
import { updateIdentification, getIdentificacionesByPatient } from '@services/supabase/patients/identificaciones-service'
import { useToast } from '@shared/hooks/use-toast'
import { cn } from '@shared/lib/cn'
import type { PatientProfile } from './PatientSearchAutocomplete'

// =====================================================================
// TIPOS
// =====================================================================

interface EditResponsableFormProps {
	responsable: PatientProfile
	isOpen: boolean
	onClose: () => void
	onUpdated?: (responsable: PatientProfile) => void
}

// =====================================================================
// COMPONENTE
// =====================================================================

export const EditResponsableForm = ({ responsable, isOpen, onClose, onUpdated }: EditResponsableFormProps) => {
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

	// Cargar datos del responsable al abrir el modal
	useEffect(() => {
		const loadPatientData = async () => {
			if (isOpen && responsable?.id) {
				try {
					// Obtener datos completos del paciente desde la base de datos
					const patientData = await findPatientById(responsable.id)
					
					if (!patientData) {
						toast({
							title: 'Error',
							description: 'No se pudieron cargar los datos del paciente',
							variant: 'destructive',
						})
						return
					}

					setNombre(patientData.nombre || '')
					setTelefono(patientData.telefono || '')
					setEmail(patientData.email || '')
					setGender(patientData.gender || '')

					// Parsear cédula
					if (patientData.cedula) {
						const cedulaMatch = patientData.cedula.match(/^([VEJC])-(.+)$/)
						if (cedulaMatch) {
							setCedulaTipo(cedulaMatch[1] as 'V' | 'E' | 'J' | 'C')
							setCedulaNumero(cedulaMatch[2])
						} else {
							setCedulaTipo('V')
							setCedulaNumero(patientData.cedula)
						}
					}

					// Parsear fecha de nacimiento
					if (patientData.fecha_nacimiento) {
						// La fecha viene como string (YYYY-MM-DD) desde la base de datos
						const fecha = new Date(patientData.fecha_nacimiento)
						// Validar que la fecha sea válida
						if (!isNaN(fecha.getTime())) {
							setFechaNacimiento(fecha)
						} else {
							setFechaNacimiento(undefined)
						}
					} else {
						setFechaNacimiento(undefined)
					}

					// Parsear edad
					if (patientData.edad) {
						const edadMatch = patientData.edad.match(/^(\d+)\s*(AÑOS|MESES|Años|Meses)$/i)
						if (edadMatch) {
							setEdad(edadMatch[1])
							setEdadUnidad(edadMatch[2].toUpperCase() === 'AÑOS' || edadMatch[2] === 'Años' ? 'Años' : 'Meses')
						} else {
							setEdad('')
							setEdadUnidad('Años')
						}
					} else {
						setEdad('')
						setEdadUnidad('Años')
					}
				} catch (error) {
					console.error('Error cargando datos del paciente:', error)
					toast({
						title: 'Error',
						description: 'Error al cargar los datos del paciente',
						variant: 'destructive',
					})
				}
			}
		}

		loadPatientData()
	}, [isOpen, responsable?.id, toast])

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

			// 2. Formatear edad si se proporcionó
			const edadFormatted = edad ? `${edad} ${edadUnidad}` : null

			// 3. Actualizar paciente responsable (adulto)
			const pacienteActualizado = await updatePatient(
				responsable.id,
				{
					cedula: cedulaFormatted,
					nombre: nombre.trim(),
					edad: edadFormatted,
					telefono: telefono || null,
					email: email || null,
					gender: gender && gender.trim() !== '' ? (gender.trim() as 'Masculino' | 'Femenino') : null,
					fecha_nacimiento: fechaNacimiento?.toISOString().split('T')[0] || null,
				} as any,
			)

			// 4. Actualizar identificación en la tabla identificaciones
			const identificaciones = await getIdentificacionesByPatient(responsable.id)
			if (identificaciones && identificaciones.length > 0) {
				// Actualizar la primera identificación
				await updateIdentification(identificaciones[0].id, {
					tipo_documento: cedulaTipo,
					numero: cedulaNumero.trim(),
				})
			}

			// 5. Notificar éxito
			toast({
				title: '✅ Responsable actualizado',
				description: `${nombre.trim()} ha sido actualizado correctamente`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// 6. Cerrar diálogo
			onClose()

			// 7. Notificar al componente padre
			if (onUpdated) {
				onUpdated({
					id: pacienteActualizado.id,
					nombre: pacienteActualizado.nombre,
					cedula: pacienteActualizado.cedula,
					tipo_paciente: 'adulto',
					edad: pacienteActualizado.edad,
					telefono: pacienteActualizado.telefono,
					fecha_nacimiento: fechaNacimiento?.toISOString().split('T')[0] || null,
				})
			}
		} catch (error) {
			console.error('Error actualizando responsable:', error)
			toast({
				title: '❌ Error',
				description: error instanceof Error ? error.message : 'Error al actualizar responsable',
				variant: 'destructive',
			})
		} finally {
			setIsSubmitting(false)
		}
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
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent 
				className="max-w-2xl max-h-[90vh] overflow-y-auto"
				onOpenAutoFocus={handleOpenAutoFocus}
			>
				<DialogHeader>
					<DialogTitle>Editar Paciente</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-4">
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
								value={gender || undefined}
								onChange={(value) => {
									setGender(value as 'Masculino' | 'Femenino')
								}}
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
											'w-full justify-start text-left font-normal',
											!fechaNacimiento && 'text-muted-foreground',
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{fechaNacimiento ? format(fechaNacimiento, 'PPP', { locale: es }) : <span>Fecha</span>}
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
							<div className="flex gap-2">
								<Input
									type="number"
									value={edad}
									onChange={(e) => {
										if (!fechaNacimiento) {
											setEdad(e.target.value)
										}
									}}
									placeholder="Edad"
									className={cn('flex-1', fechaNacimiento && 'opacity-50 cursor-not-allowed')}
									disabled={!!fechaNacimiento}
								/>
								<Select
									value={edadUnidad}
									onValueChange={(value) => {
										if (!fechaNacimiento) {
											setEdadUnidad(value as 'Años' | 'Meses')
										}
									}}
									disabled={!!fechaNacimiento}
								>
									<SelectTrigger className="w-24">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Años">Años</SelectItem>
										<SelectItem value="Meses">Meses</SelectItem>
									</SelectContent>
								</Select>
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
					<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button onClick={handleSubmit} disabled={isSubmitting}>
						{isSubmitting ? 'Actualizando...' : 'Actualizar Responsable'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

