import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeftFromLine, Save } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@shared/components/ui/input'
import { Button } from '@shared/components/ui/button'
import { CustomDropdown } from '@shared/components/ui/custom-dropdown'
import { createDropdownOptions } from '@shared/components/ui/form-dropdown'
import { useToast } from '@shared/hooks/use-toast'
import { supabase } from '@/services/supabase/config/config'
import type { ChangeLog } from '@/services/legacy/supabase-service'
import type { Patient } from '@/services/supabase/patients/patients-service'
import { updatePatient } from '@/services/supabase/patients/patients-service'
import { cn } from '@shared/lib/cn'
import { useUserProfile } from '@shared/hooks/useUserProfile'

// Helper to parse edad string like "10 AÑOS" or "5 MESES"
function parseEdad(edad: string | null | undefined): { value: number | ''; unit: 'Años' | 'Meses' | '' } {
	if (!edad) return { value: '', unit: '' }
	const match = String(edad)
		.trim()
		.match(/^(\d+)\s*(AÑOS|MESES)$/i)
	if (!match) return { value: '', unit: '' }
	const value = Number(match[1])
	const unit = match[2].toUpperCase() === 'AÑOS' ? 'Años' : 'Meses'
	return { value: Number.isNaN(value) ? '' : value, unit }
}

interface EditPatientInfoModalProps {
	isOpen: boolean
	onClose: () => void
	patient: Patient
	onSave?: () => void
}

const EditPatientInfoModal = ({ isOpen, onClose, patient, onSave }: EditPatientInfoModalProps) => {
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(false)

	// Parse the initial edad value
	const initialEdad = parseEdad(patient.edad)

	// Parse the cedula to extract type and number
	const parseCedula = (cedula: string | null | undefined) => {
		if (!cedula) {
			return { type: 'V', number: '' }
		}
		const match = cedula.match(/^([VEJC])-(.+)$/)
		if (match) {
			return { type: match[1], number: match[2] }
		}
		return { type: 'V', number: cedula }
	}

	const initialCedula = parseCedula(patient.cedula)

	const { profile } = useUserProfile()
	const isImagenologia = profile?.role === 'imagenologia'

	// Verificar si es dependiente (menor o animal)
	const isDependiente = patient.tipo_paciente === 'menor' || patient.tipo_paciente === 'animal'

	const [formData, setFormData] = useState({
		nombre: patient.nombre,
		telefono: patient.telefono || '',
		email: patient.email || '',
		image_url: (patient as any).image_url || '',
		edad: patient.edad || '',
		cedulaType: initialCedula.type,
		cedulaNumber: initialCedula.number,
	})

	const [edadValue, setEdadValue] = useState(initialEdad.value)
	const [edadUnit, setEdadUnit] = useState<'Años' | 'Meses'>(initialEdad.unit || 'Años')

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setFormData((prev) => ({ ...prev, [name]: value }))
	}

	const handleCedulaTypeChange = (type: string) => {
		setFormData((prev) => ({
			...prev,
			cedulaType: type,
			// Limpiar el número de cédula cuando se selecciona S/C
			cedulaNumber: type === 'S/C' ? '' : prev.cedulaNumber,
		}))
	}

	const handleCedulaNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = e.target
		// Only allow numbers
		if (/^[0-9]*$/.test(value)) {
			setFormData((prev) => ({ ...prev, cedulaNumber: value }))
		}
	}

	const handleEdadChange = (value: number | '') => {
		setEdadValue(value)
		// Update formData.edad with the combined string
		const newEdad = value === '' ? '' : `${value} ${edadUnit}`
		setFormData((prev) => ({ ...prev, edad: newEdad }))
	}

	const handleEdadUnitChange = (unit: string) => {
		const newUnit = unit as 'Años' | 'Meses'
		setEdadUnit(newUnit)
		// Update formData.edad with the combined string
		const newEdad = edadValue === '' ? '' : `${edadValue} ${newUnit}`
		setFormData((prev) => ({ ...prev, edad: newEdad }))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)

		try {
			// Obtener el usuario actual para el registro de cambios
			const {
				data: { user },
			} = await supabase.auth.getUser()
			if (!user) throw new Error('No se pudo obtener el usuario actual')

			// Preparar los cambios para el registro usando nueva estructura
			const changes = []
			const newCedula = `${formData.cedulaType}-${formData.cedulaNumber}`

			if (formData.nombre !== patient.nombre) {
				changes.push({
					field: 'nombre',
					fieldLabel: 'Nombre Completo',
					oldValue: patient.nombre,
					newValue: formData.nombre,
				})
			}
			if (newCedula !== patient.cedula) {
				changes.push({
					field: 'cedula',
					fieldLabel: 'Cédula',
					oldValue: patient.cedula,
					newValue: newCedula,
				})
			}
			if (formData.telefono !== (patient.telefono || '')) {
				changes.push({
					field: 'telefono',
					fieldLabel: 'Teléfono',
					oldValue: patient.telefono,
					newValue: formData.telefono || null,
				})
			}
			if (formData.email !== (patient.email || '')) {
				changes.push({
					field: 'email',
					fieldLabel: 'Email',
					oldValue: patient.email,
					newValue: formData.email || null,
				})
			}
			if (formData.edad !== patient.edad) {
				changes.push({
					field: 'edad',
					fieldLabel: 'Edad',
					oldValue: patient.edad?.toString(),
					newValue: formData.edad.toString(),
				})
			}

			// Solo registrar cambio de image_url si el usuario es imagenologia
			if (isImagenologia && formData.image_url !== (patient as any).image_url) {
				changes.push({
					field: 'image_url',
					fieldLabel: 'URL de Imagen',
					oldValue: (patient as any).image_url || null,
					newValue: formData.image_url || null,
				})
			}

			if (changes.length === 0) {
				toast({
					description: 'No se detectaron cambios que guardar.',
				})
				setIsLoading(false)
				return
			}

			// Actualizar el paciente usando el servicio (incluye dual-write automático)
			// Construir payload de update; solo incluir image_url si imagenologia
			const updatePayload: any = {
				cedula: formData.cedulaType === 'S/C' ? null : newCedula,
				nombre: formData.nombre,
				telefono: formData.telefono || null,
				email: formData.email || null,
				edad: formData.edad,
			}
			if (isImagenologia) {
				updatePayload.image_url = formData.image_url || null
			}

			// Usar updatePatient que incluye dual-write automático a identificaciones
			// y registro automático de cambios en change_logs (con agrupación por session_id)
			await updatePatient(patient.id, updatePayload, user.id)

			toast({
				description: 'Datos del paciente actualizados exitosamente.',
			})

			if (onSave) onSave()
			onClose()
		} catch (error) {
			console.error('Error al actualizar datos del paciente:', error)
			toast({
				variant: 'destructive',
				description: 'Error al actualizar los datos. Por favor intenta de nuevo.',
			})
		} finally {
			setIsLoading(false)
		}
	}

	if (!isOpen) return null
	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[99999] flex items-center justify-center">
					{/* Overlay de fondo con opacidad desde el inicio */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50"
					/>

					{/* Contenido del modal con animación */}
					<motion.div
						initial={{ scale: 0.95 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0.95 }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="relative z-10 w-full max-w-4xl mx-4"
					>
						<div
							className="bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border border-input"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-4 sm:p-6 z-10">
								<div className="flex items-center justify-between">
									<div>
										<div>
											<h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
												Editando Paciente: {patient.nombre}
											</h2>
										</div>
										<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Cédula: {patient.cedula}</p>
									</div>
									<button
										onClick={onClose}
										className="p-1.5 sm:p-2 rounded-lg transition-none flex items-center gap-2 cursor-pointer"
									>
										<ArrowLeftFromLine className="size-4" />
										Volver
									</button>
								</div>
							</div>

							{/* Content */}
							<form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
								{/* Patient Info */}
								<div className="flex-1 overflow-y-auto p-4">
									<div className="space-y-4">
										<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border border-input rounded-lg p-4 hover:shadow-md transition-shadow">
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
													{isImagenologia && (
														<div className="space-y-2">
															<label className="text-sm text-gray-500 dark:text-gray-400">URL de Imagen</label>
															<Input name="image_url" value={formData.image_url} onChange={(e) => setFormData(prev => ({...prev, image_url: e.target.value}))} placeholder="https://..." />
														</div>
													)}
												<div className="space-y-2">
													<label className="text-sm text-gray-500 dark:text-gray-400">Nombre Completo</label>
													<Input name="nombre" value={formData.nombre} onChange={handleChange} required />
												</div>

												<div className="space-y-2">
													<label className="text-sm text-gray-500 dark:text-gray-400">Cédula</label>
													<div className="grid grid-cols-6 sm:grid-cols-5 gap-2">
														<div className="col-span-2 sm:col-span-1 min-w-[60px]">
															<CustomDropdown
																options={createDropdownOptions(['V', 'E', 'J', 'C', 'S/C'])}
																value={formData.cedulaType}
																onChange={handleCedulaTypeChange}
																placeholder="Tipo"
																className="text-sm"
																direction="auto"
															/>
														</div>
														<div className="col-span-4 sm:col-span-4">
															<Input
																name="cedulaNumber"
																value={formData.cedulaNumber}
																onChange={handleCedulaNumberChange}
																placeholder={formData.cedulaType === 'S/C' ? 'No aplica' : '12345678'}
																className={cn(
																	'text-sm',
																	formData.cedulaType === 'S/C' && 'opacity-50 cursor-not-allowed',
																)}
																disabled={formData.cedulaType === 'S/C'}
																required={formData.cedulaType !== 'S/C'}
															/>
														</div>
													</div>
												</div>

												<div className="space-y-2">
													<label className="text-sm text-gray-500 dark:text-gray-400">
														Teléfono{isDependiente && ' (del responsable)'}
													</label>
													<Input 
														name="telefono" 
														value={formData.telefono} 
														onChange={handleChange}
														disabled={isDependiente}
														readOnly={isDependiente}
														className={isDependiente ? 'opacity-50 cursor-not-allowed' : ''}
													/>
												</div>

												<div className="space-y-2">
													<label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
													<Input type="email" name="email" value={formData.email} onChange={handleChange} />
												</div>

												<div className="space-y-2">
													<label className="text-sm text-gray-500 dark:text-gray-400">Edad</label>
													<div className="grid grid-cols-2 gap-2">
														<Input
															type="number"
															placeholder="0"
															value={edadValue === '' ? '' : edadValue}
															min={0}
															max={150}
															onChange={(e) => {
																const newValue = e.target.value
																const numeric = newValue === '' ? '' : Number(newValue)
																handleEdadChange(numeric)
															}}
															className="text-sm"
														/>
														<CustomDropdown
															options={createDropdownOptions(['Meses', 'Años'])}
															value={edadUnit}
															onChange={handleEdadUnitChange}
															placeholder="Unidad"
															className="text-sm"
															direction="auto"
														/>
													</div>
												</div>

												{/* <div className="space-y-2">
													<label className="text-sm text-gray-500 dark:text-gray-400">Cédula</label>
													<Input value={patient.id_number} disabled className="bg-gray-100 dark:bg-gray-800" />
												</div> */}
											</div>
										</div>
									</div>
								</div>

								{/* Footer con botones */}
								<div className="sticky bottom-0 bg-white/80 dark:bg-black backdrop-blur-[10px] border-t border-input p-4 flex justify-end gap-2">
									<Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
										Cancelar
									</Button>
									<Button type="submit" disabled={isLoading}>
										{isLoading ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
												Guardando...
											</>
										) : (
											<>
												<Save className="w-4 h-4 mr-2" />
												Guardar Cambios
											</>
										)}
									</Button>
								</div>
							</form>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	)
}

export default EditPatientInfoModal
