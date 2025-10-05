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
import { cn } from '@shared/lib/cn'

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
	const parseCedula = (cedula: string) => {
		const match = cedula.match(/^([VEJC])-(.+)$/)
		if (match) {
			return { type: match[1], number: match[2] }
		}
		return { type: 'V', number: cedula }
	}

	const initialCedula = parseCedula(patient.cedula)

	const [formData, setFormData] = useState({
		nombre: patient.nombre,
		telefono: patient.telefono || '',
		email: patient.email || '',
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

			if (changes.length === 0) {
				toast({
					description: 'No se detectaron cambios que guardar.',
				})
				setIsLoading(false)
				return
			}

			// Actualizar el paciente en la nueva tabla patients
			const { error: updateError } = await supabase
				.from('patients')
				.update({
					cedula: newCedula,
					nombre: formData.nombre,
					telefono: formData.telefono || null,
					email: formData.email || null,
					edad: formData.edad,
					updated_at: new Date().toISOString(),
				})
				.eq('id', patient.id)

			if (updateError) throw updateError

			// Registrar los cambios en change_logs para el paciente
			for (const change of changes) {
				const changeLog: ChangeLog = {
					patient_id: patient.id,
					entity_type: 'patient',
					user_id: user.id,
					user_email: user.email || 'unknown@email.com',
					user_display_name: user.user_metadata?.display_name || null,
					field_name: change.field,
					field_label: change.fieldLabel,
					old_value: change.oldValue || null,
					new_value: change.newValue || null,
					changed_at: new Date().toISOString(),
				}

				const { error: logError } = await supabase.from('change_logs').insert(changeLog)

				if (logError) throw logError
			}

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
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50 z-[99999998]"
					/>

					{/* Modal */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="fixed inset-0 z-[99999999] flex items-center justify-center p-4"
						onClick={onClose}
					>
						<div
							className="bg-white/80 dark:bg-black backdrop-blur-[10px] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-input"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="sticky top-0 bg-white/80 dark:bg-black backdrop-blur-[10px] border-b border-input p-4 sm:p-6 z-10">
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
												<div className="space-y-2">
													<label className="text-sm text-gray-500 dark:text-gray-400">Nombre Completo</label>
													<Input name="nombre" value={formData.nombre} onChange={handleChange} required />
												</div>

												<div className="space-y-2">
													<label className="text-sm text-gray-500 dark:text-gray-400">Cédula</label>
													<div className="grid grid-cols-4 gap-2">
														<CustomDropdown
															options={createDropdownOptions(['V', 'E', 'J', 'C', 'S/C'])}
															value={formData.cedulaType}
															onChange={handleCedulaTypeChange}
															placeholder="Tipo"
															className="text-sm"
															direction="auto"
														/>
														<Input
															name="cedulaNumber"
															value={formData.cedulaNumber}
															onChange={handleCedulaNumberChange}
															placeholder={formData.cedulaType === 'S/C' ? 'No aplica' : '12345678'}
															className={cn(
																'col-span-3 text-sm',
																formData.cedulaType === 'S/C' && 'opacity-50 cursor-not-allowed',
															)}
															disabled={formData.cedulaType === 'S/C'}
															required={formData.cedulaType !== 'S/C'}
														/>
													</div>
												</div>

												<div className="space-y-2">
													<label className="text-sm text-gray-500 dark:text-gray-400">Teléfono</label>
													<Input name="telefono" value={formData.telefono} onChange={handleChange} />
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
				</>
			)}
		</AnimatePresence>
	)
}

export default EditPatientInfoModal
