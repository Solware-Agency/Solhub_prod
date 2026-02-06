import React from 'react'
import { X, User, Calendar, FileText, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components/ui/dialog'
import { Button } from '@shared/components/ui/button'
import { Card } from '@shared/components/ui/card'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
// Tipo compartido para datos de change log
export type ChangeLogData = {
	id: string
	medical_record_id: string | null
	patient_id: string | null
	entity_type: string | null
	user_id: string
	user_email: string
	user_display_name?: string | null
	field_name: string
	field_label: string
	old_value: string | null
	new_value: string | null
	changed_at: string
	created_at: string | null
	deleted_record_info?: string | null
	change_session_id?: string | null
	medical_records_clean?: {
		id: string | null
		code: string | null
	} | null
	patients?: {
		id: string | null
		nombre: string | null
		cedula: string | null
	} | null
}

interface ChangeDetailsModalProps {
	isOpen: boolean
	onClose: () => void
	changes: ChangeLogData[]
}

/**
 * Modal que muestra el desglose detallado de cambios agrupados por sesión
 */
export const ChangeDetailsModal: React.FC<ChangeDetailsModalProps> = ({
	isOpen,
	onClose,
	changes,
}) => {
	const { laboratory } = useLaboratory()
	
	if (changes.length === 0) return null

	// Obtener información común del primer cambio (todos tienen la misma sesión)
	const firstChange = changes[0]
	const changedAt = new Date(firstChange.changed_at)
	const entityName =
		firstChange.entity_type === 'patient'
			? firstChange.patients?.nombre || 'Paciente eliminado'
			: firstChange.medical_records_clean?.code || 'Caso eliminado'
	const entityId =
		firstChange.entity_type === 'patient'
			? firstChange.patients?.cedula
			: firstChange.medical_records_clean?.code

	// Función para traducir nombres de campos
	const translateFieldLabel = (fieldName: string, fieldLabel: string): string => {
		if (fieldLabel !== fieldName) {
			return fieldLabel
		}
		const translations: Record<string, string> = {
			payment_method_1: 'Método de Pago 1',
			payment_amount_1: 'Monto de Pago 1',
			payment_reference_1: 'Referencia de Pago 1',
			payment_method_2: 'Método de Pago 2',
			payment_amount_2: 'Monto de Pago 2',
			payment_reference_2: 'Referencia de Pago 2',
			payment_method_3: 'Método de Pago 3',
			payment_amount_3: 'Monto de Pago 3',
			payment_reference_3: 'Referencia de Pago 3',
			payment_method_4: 'Método de Pago 4',
			payment_amount_4: 'Monto de Pago 4',
			payment_reference_4: 'Referencia de Pago 4',
		}
		return translations[fieldName] || fieldLabel
	}

	// Función para formatear valores (truncar URLs largas)
	const formatValue = (value: string | null): string => {
		if (!value || value === '(vacío)') return '(vacío)'
		if (typeof value === 'string' && value.startsWith('http') && value.length > 60) {
			return value.substring(0, 60) + '...'
		}
		return value
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]">
				<DialogHeader className="mb-4">
					<DialogTitle className="flex items-center gap-2">
						<Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						Detalles de Edición
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
					{/* Información General */}
					<Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="flex items-start gap-3">
								<Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
								<div>
									<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
										Fecha y Hora
									</p>
									<p className="text-sm text-gray-900 dark:text-gray-100">
										{format(changedAt, 'dd/MM/yyyy', { locale: es })}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{format(changedAt, 'HH:mm:ss', { locale: es })}
									</p>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<User className="w-5 h-5 text-gray-500 mt-0.5" />
								<div>
									<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
										Usuario
									</p>
									<p 
										className="text-sm"
										style={{ 
											color: firstChange.user_display_name 
												? (laboratory?.branding?.primaryColor || undefined)
												: undefined 
										}}
									>
										{firstChange.user_display_name || firstChange.user_email}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{firstChange.user_email}
									</p>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<FileText className="w-5 h-5 text-gray-500 mt-0.5" />
								<div>
									<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
										Entidad
									</p>
									{firstChange.entity_type === 'patient' ? (
										<>
											<p className="text-sm text-gray-900 dark:text-gray-100">
												{entityName}
											</p>
											{entityId && (
												<p className="text-xs text-gray-500 dark:text-gray-400">
													Cédula: {entityId}
												</p>
											)}
										</>
									) : (
										<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 w-fit">
											{entityName}
										</span>
									)}
								</div>
							</div>

							<div className="flex items-start gap-3">
								<Eye className="w-5 h-5 text-gray-500 mt-0.5" />
								<div>
									<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
										Campos Modificados
									</p>
									<p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
										{changes.length} {changes.length === 1 ? 'campo' : 'campos'}
									</p>
								</div>
							</div>
						</div>
					</Card>

					{/* Lista de Cambios */}
					<div className="space-y-3">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
							Cambios Realizados:
						</h3>

						{changes.map((change, index) => (
							<Card
								key={change.id || index}
								className="p-4 border-l-4 border-l-blue-500 dark:border-l-blue-400"
							>
								<div className="space-y-2">
									<h4 className="font-semibold text-gray-900 dark:text-gray-100">
										{translateFieldLabel(change.field_name, change.field_label)}
									</h4>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div>
											<p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
												Antes:
											</p>
											<p className="text-sm text-gray-700 dark:text-gray-300 line-through break-words">
												{formatValue(change.old_value)}
											</p>
										</div>

										<div>
											<p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
												Ahora:
											</p>
											<p className="text-sm text-green-600 dark:text-green-400 font-medium break-words">
												{formatValue(change.new_value)}
											</p>
										</div>
									</div>
								</div>
							</Card>
						))}
					</div>

					{/* Botón Cerrar */}
					<div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
						<Button onClick={onClose} variant="outline">
							<X className="w-4 h-4 mr-2" />
							Cerrar
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
