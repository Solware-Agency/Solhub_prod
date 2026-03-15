import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Loader2, Heart, Wind, Droplets, Thermometer, Activity, FlaskConical } from 'lucide-react'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { TriageStatType, TriageRangeValue } from '@/features/stats/services/triage-stats-service'
import { getCasesByTriageRange } from '@/features/stats/services/triage-stats-service'
import CaseCard from '@/features/cases/components/CaseCard'

interface TriageCasesFilterModalProps {
	isOpen: boolean
	onClose: () => void
	statType: TriageStatType
	rangeValue: TriageRangeValue
	laboratoryId: string
	startDate?: Date
	endDate?: Date
}

const TriageCasesFilterModal: React.FC<TriageCasesFilterModalProps> = ({
	isOpen,
	onClose,
	statType,
	rangeValue,
	laboratoryId,
	startDate,
	endDate,
}) => {
	useBodyScrollLock(isOpen)
	useGlobalOverlayOpen(isOpen)

	// Consultar casos filtrados
	const { data, isLoading, error } = useQuery({
		queryKey: ['triage-cases-filter', statType, rangeValue, laboratoryId, startDate?.toISOString(), endDate?.toISOString()],
		queryFn: async () => {
			const result = await getCasesByTriageRange(statType, rangeValue, laboratoryId, startDate, endDate)
			if (!result.success) {
				throw new Error(result.error || 'Error al obtener casos')
			}
			return result.data || []
		},
		enabled: isOpen && !!laboratoryId,
		staleTime: 1000 * 60 * 5, // 5 minutos
	})

	const getTitle = () => {
		const statNames: Record<TriageStatType, string> = {
			heartRate: 'Frecuencia Cardíaca',
			respiratoryRate: 'Frecuencia Respiratoria',
			oxygenSaturation: 'Saturación de Oxígeno',
			temperature: 'Temperatura',
			bmi: 'IMC',
			bloodPressure: 'Presión Arterial',
			bloodGlucose: 'Glicemia',
		}

		const rangeNames: Record<TriageRangeValue, string> = {
			low: 'Baja',
			normal: 'Normal',
			high: 'Alta',
			underweight: 'Bajo Peso',
			overweight: 'Sobrepeso',
			obese: 'Obesidad',
		}

		return `Casos con ${statNames[statType]} ${rangeNames[rangeValue]}`
	}

	const getIcon = () => {
		const iconProps = { className: 'h-5 w-5' }
		const icons: Record<TriageStatType, React.ReactNode> = {
			heartRate: <Heart {...iconProps} className="h-5 w-5 text-pink-500" />,
			respiratoryRate: <Wind {...iconProps} className="h-5 w-5 text-cyan-500" />,
			oxygenSaturation: <Droplets {...iconProps} className="h-5 w-5 text-blue-500" />,
			temperature: <Thermometer {...iconProps} className="h-5 w-5 text-orange-500" />,
			bmi: <Activity {...iconProps} className="h-5 w-5 text-green-500" />,
			bloodPressure: <Activity {...iconProps} className="h-5 w-5 text-red-500" />,
			bloodGlucose: <FlaskConical {...iconProps} className="h-5 w-5 text-purple-500" />,
		}
		return icons[statType]
	}

	return (
		<AnimatePresence mode="wait">
			{isOpen && (
				<>
					{/* Overlay */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4"
						onClick={onClose}
					>
						{/* Modal Centrado */}
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							transition={{ type: 'spring', damping: 25, stiffness: 300 }}
							className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
								<div className="flex items-center gap-3">
									{getIcon()}
									<div>
										<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
											{getTitle()}
										</h2>
										<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
											{data?.length || 0} casos encontrados
											{startDate && endDate && (
												<>
													{' · '}
													{format(startDate, 'dd MMM', { locale: es })} -{' '}
													{format(endDate, 'dd MMM yyyy', { locale: es })}
												</>
											)}
										</p>
									</div>
								</div>
								<button
									onClick={onClose}
									className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
									aria-label="Cerrar"
								>
									<X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
								</button>
							</div>

							{/* Content */}
							<div className="flex-1 overflow-y-auto p-6">
								{isLoading ? (
									<div className="flex flex-col items-center justify-center h-64 gap-4">
										<Loader2 className="h-8 w-8 animate-spin text-blue-500" />
										<p className="text-gray-600 dark:text-gray-400">Cargando casos...</p>
									</div>
								) : error ? (
									<div className="flex items-center justify-center h-64">
										<div className="text-center">
											<p className="text-red-500 font-medium">Error al cargar casos</p>
											<p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
												{error instanceof Error ? error.message : 'Error desconocido'}
											</p>
										</div>
									</div>
								) : !data || data.length === 0 ? (
									<div className="flex items-center justify-center h-64">
										<div className="text-center">
											<div className="mb-4">
												{getIcon()}
											</div>
											<p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
												No se encontraron casos
											</p>
											<p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
												No hay casos con {getTitle().toLowerCase()}
											</p>
										</div>
									</div>
								) : (
									<>
										{/* Grid de tarjetas de casos */}
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
											{data.map((caseItem) => (
												<CaseCard
													key={caseItem.id}
													case_={caseItem}
													onView={() => {}}
													onGenerate={() => {}}
													canRequest={false}
													userRole="employee"
												/>
											))}
										</div>

										{/* Resumen al final */}
										<div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
											<div className="flex items-start gap-3">
												<div className="flex-shrink-0 mt-0.5">
													{getIcon()}
												</div>
												<div className="flex-1">
													<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
														Resumen del filtro
													</h4>
													<p className="text-sm text-gray-600 dark:text-gray-400">
														Mostrando <strong>{data.length}</strong> casos con{' '}
														<strong>{getTitle().toLowerCase()}</strong>
														{startDate && endDate && (
															<>
																{' '}
																entre el{' '}
																<strong>
																	{format(startDate, 'dd MMM yyyy', { locale: es })}
																</strong>{' '}
																y el{' '}
																<strong>
																	{format(endDate, 'dd MMM yyyy', { locale: es })}
																</strong>
															</>
														)}
													</p>
												</div>
											</div>
										</div>
									</>
								)}
							</div>
						</motion.div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

export default TriageCasesFilterModal
