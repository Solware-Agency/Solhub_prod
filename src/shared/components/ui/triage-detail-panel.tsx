import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Heart, Wind, Droplets, Thermometer, Activity, Users, TrendingUp, TrendingDown, Minus, FlaskConical } from 'lucide-react'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'

export type TriageStatType =
	| 'totalTriages'
	| 'heartRate'
	| 'respiratoryRate'
	| 'oxygenSaturation'
	| 'temperature'
	| 'bmi'
	| 'bloodPressure'
	| 'bloodGlucose'
	| 'habits'

interface TriageDetailPanelProps {
	isOpen: boolean
	onClose: () => void
	statType: TriageStatType
	stats: any
	trends?: any[]
	days: number
	isLoading?: boolean
}

const TriageDetailPanel: React.FC<TriageDetailPanelProps> = ({
	isOpen,
	onClose,
	statType,
	stats,
	trends = [],
	days,
	isLoading = false,
}) => {
	useBodyScrollLock(isOpen)
	useGlobalOverlayOpen(isOpen)

	const getStatTitle = () => {
		switch (statType) {
			case 'totalTriages':
				return 'Total de Historias Clínicas'
			case 'heartRate':
				return 'Frecuencia Cardíaca'
			case 'respiratoryRate':
				return 'Frecuencia Respiratoria'
			case 'oxygenSaturation':
				return 'Saturación de Oxígeno'
			case 'temperature':
				return 'Temperatura'
			case 'bmi':
				return 'Índice de Masa Corporal'
			case 'bloodPressure':
				return 'Presión Arterial'
			case 'bloodGlucose':
				return 'Glicemia'
			case 'habits':
				return 'Hábitos Psicobiológicos'
			default:
				return 'Detalles de Historia Clínica'
		}
	}

	const getStatIcon = () => {
		switch (statType) {
			case 'totalTriages':
				return <Users className="h-5 w-5 text-blue-500" />
			case 'heartRate':
				return <Heart className="h-5 w-5 text-pink-500" />
			case 'respiratoryRate':
				return <Wind className="h-5 w-5 text-cyan-500" />
			case 'oxygenSaturation':
				return <Droplets className="h-5 w-5 text-blue-500" />
			case 'temperature':
				return <Thermometer className="h-5 w-5 text-orange-500" />
			case 'bmi':
				return <Activity className="h-5 w-5 text-green-500" />
			case 'bloodPressure':
				return <Activity className="h-5 w-5 text-red-500" />
			case 'bloodGlucose':
				return <FlaskConical className="h-5 w-5 text-purple-500" />
			case 'habits':
				return <Activity className="h-5 w-5 text-purple-500" />
			default:
				return <Activity className="h-5 w-5" />
		}
	}

	const getTrend = (current: number | null, key: keyof typeof trends[0]) => {
		if (!current || !trends || trends.length < 2) return null
		const first = trends[0]?.[key]
		const last = trends[trends.length - 1]?.[key]
		if (!first || !last || first === last) return <Minus className='h-4 w-4 text-gray-400' />
		if (last > first) return <TrendingUp className='h-4 w-4 text-green-500' />
		return <TrendingDown className='h-4 w-4 text-red-500' />
	}

	const renderContent = () => {
		if (isLoading) {
			return (
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			)
		}

		if (!stats) {
			return (
				<div className="text-center py-8">
					<p className="text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
				</div>
			)
		}

		switch (statType) {
			case 'totalTriages':
				const totalTriages = stats.totalTriages || 0
				const avgDaily = days > 0 ? (totalTriages / days).toFixed(1) : '0'
				const daysWithData = trends?.filter(t => t.count > 0).length || 0
				const daysWithoutData = days - daysWithData
				
				return (
					<div className="space-y-6">
						{/* Resumen General */}
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Resumen de Historias Clínicas
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Historias Clínicas</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{totalTriages}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										en los últimos {days} días
									</p>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Promedio Diario</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{avgDaily}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">historias clínicas por día</p>
								</div>
								<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Días con Datos</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{daysWithData}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{((daysWithData / days) * 100).toFixed(1)}% del período
									</p>
								</div>
							</div>
						</div>

						{/* Gráfica de tendencia temporal */}
						{trends && trends.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
									Tendencia de Historias Clínicas por Día
								</h3>
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={trends.map(t => ({ ...t, date: format(new Date(t.date), 'dd/MM') }))}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} name="Historias Clínicas" />
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}

						{/* Estadísticas adicionales */}
						{trends && trends.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
									Estadísticas Adicionales
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{(() => {
										const maxDay = trends.reduce((max, t) => t.count > max.count ? t : max, trends[0])
										const minDay = trends.reduce((min, t) => t.count < min.count ? t : min, trends[0])
										return (
											<>
												<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
													<p className="text-sm text-gray-500 dark:text-gray-400">Día con más historias clínicas</p>
													<p className="text-lg font-bold text-gray-900 dark:text-gray-100">
														{format(new Date(maxDay.date), 'dd/MM/yyyy', { locale: es })}
													</p>
													<p className="text-sm text-gray-600 dark:text-gray-400">{maxDay.count} historias clínicas</p>
												</div>
												<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
													<p className="text-sm text-gray-500 dark:text-gray-400">Día con menos historias clínicas</p>
													<p className="text-lg font-bold text-gray-900 dark:text-gray-100">
														{format(new Date(minDay.date), 'dd/MM/yyyy', { locale: es })}
													</p>
													<p className="text-sm text-gray-600 dark:text-gray-400">{minDay.count} historias clínicas</p>
												</div>
											</>
										)
									})()}
								</div>
							</div>
						)}
					</div>
				)

			case 'heartRate':
				const hrAvg = stats.averages?.heartRate
				const hrRanges = stats.ranges?.heartRate || { low: 0, normal: 0, high: 0 }
				const hrTotal = hrRanges.low + hrRanges.normal + hrRanges.high
				const hrNormalPct = hrTotal > 0 ? ((hrRanges.normal / hrTotal) * 100).toFixed(1) : '0'
				const hrAbnormalPct = hrTotal > 0 ? (((hrRanges.low + hrRanges.high) / hrTotal) * 100).toFixed(1) : '0'

				return (
					<div className="space-y-6">
						{/* Resumen */}
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Análisis de Frecuencia Cardíaca
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg border border-pink-200 dark:border-pink-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Promedio General</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{hrAvg ? `${hrAvg.toFixed(0)} lpm` : 'N/A'}
									</p>
									<div className="mt-2">
										{getTrend(hrAvg, 'avgHeartRate')}
									</div>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Valores Normales</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{hrRanges.normal}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{hrNormalPct}% del total
									</p>
								</div>
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Valores Anormales</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{hrRanges.low + hrRanges.high}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{hrAbnormalPct}% del total
									</p>
								</div>
							</div>

							{/* Distribución detallada */}
							<div className="space-y-4">
								<h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
									Distribución por Rangos
								</h4>
								{[
								{ label: `Baja (< 60 lpm)`, value: hrRanges.low, color: '#ef4444' },
								{ label: 'Normal (60-100 lpm)', value: hrRanges.normal, color: '#22c55e' },
								{ label: `Alta (> 100 lpm)`, value: hrRanges.high, color: '#eab308' },
								].map((item) => {
									const percentage = hrTotal > 0 ? (item.value / hrTotal) * 100 : 0
									return (
										<div key={item.label} className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-gray-700 dark:text-gray-300">{item.label}</span>
												<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
											</div>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
												<div
													className="h-3 rounded-full transition-all duration-300"
													style={{ width: `${percentage}%`, backgroundColor: item.color }}
												/>
											</div>
										</div>
									)
								})}
							</div>
						</div>

						{/* Gráfica de tendencia */}
						{trends && trends.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
									Tendencia de Frecuencia Cardíaca
								</h3>
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={trends.map(t => ({ ...t, date: format(new Date(t.date), 'dd/MM') }))}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Line type="monotone" dataKey="avgHeartRate" stroke="#ec4899" strokeWidth={2} name="Promedio (lpm)" />
										<Line type="monotone" dataKey={() => 60} stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1} name="Límite Normal Inferior" />
										<Line type="monotone" dataKey={() => 100} stroke="#eab308" strokeDasharray="5 5" strokeWidth={1} name="Límite Normal Superior" />
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}
					</div>
				)

			case 'respiratoryRate':
				const rrAvg = stats.averages?.respiratoryRate
				const rrRanges = stats.ranges?.respiratoryRate || { low: 0, normal: 0, high: 0 }
				const rrTotal = rrRanges.low + rrRanges.normal + rrRanges.high
				const rrNormalPct = rrTotal > 0 ? ((rrRanges.normal / rrTotal) * 100).toFixed(1) : '0'
				const rrAbnormal = rrRanges.low + rrRanges.high
				const rrStatus = rrTotal === 0 ? 'Sin datos' : Number(rrNormalPct) >= 80 ? 'Normal' : rrAbnormal > 0 ? 'Atención' : 'Normal'

				return (
					<div className="space-y-6">
						{/* Status strip + KPI mini */}
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Análisis de Frecuencia Respiratoria
							</h3>
							{/* Status strip */}
							<div
								className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${
									rrStatus === 'Normal'
										? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
										: rrStatus === 'Atención'
											? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
											: 'bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
								}`}
							>
								<span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado:</span>
								<span
									className={`font-semibold ${
										rrStatus === 'Normal'
											? 'text-green-700 dark:text-green-300'
											: rrStatus === 'Atención'
												? 'text-amber-700 dark:text-amber-300'
												: 'text-gray-500 dark:text-gray-400'
									}`}
								>
									{rrStatus}
								</span>
								{rrTotal > 0 && (
									<span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
										{rrTotal} mediciones
									</span>
								)}
							</div>
							{/* KPI mini */}
							<div className="flex flex-wrap gap-6 mb-0">
								<div className="flex items-baseline gap-2">
									<span className="text-xs text-gray-500 dark:text-gray-400">Promedio</span>
									<span className="text-lg font-bold text-gray-900 dark:text-gray-100">
										{rrAvg ? `${rrAvg.toFixed(0)} rpm` : '—'}
									</span>
									{getTrend(rrAvg, 'avgRespiratoryRate')}
								</div>
								<div className="flex items-baseline gap-2">
									<span className="text-xs text-gray-500 dark:text-gray-400">Normales</span>
									<span className="text-lg font-semibold text-green-600 dark:text-green-400">{rrRanges.normal}</span>
									<span className="text-xs text-gray-500 dark:text-gray-400">({rrNormalPct}%)</span>
								</div>
								<div className="flex items-baseline gap-2">
									<span className="text-xs text-gray-500 dark:text-gray-400">Anormales</span>
									<span className="text-lg font-semibold text-amber-600 dark:text-amber-400">{rrAbnormal}</span>
								</div>
							</div>
						</div>

						{/* Chart arriba (antes de distribución) */}
						{trends && trends.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
									Tendencia de Frecuencia Respiratoria
								</h3>
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={trends.map(t => ({ ...t, date: format(new Date(t.date), 'dd/MM') }))}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Line type="monotone" dataKey="avgRespiratoryRate" stroke="#06b6d4" strokeWidth={2} name="Promedio (rpm)" />
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}

						{/* Distribución por Rangos */}
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
								Distribución por Rangos
							</h4>
							<div className="space-y-4">
								{[
									{ label: `Baja (< 12 rpm)`, value: rrRanges.low, color: '#ef4444' },
									{ label: 'Normal (12-20 rpm)', value: rrRanges.normal, color: '#22c55e' },
									{ label: `Alta (> 20 rpm)`, value: rrRanges.high, color: '#eab308' },
								].map((item) => {
									const percentage = rrTotal > 0 ? (item.value / rrTotal) * 100 : 0
									return (
										<div key={item.label} className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-gray-700 dark:text-gray-300">{item.label}</span>
												<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
											</div>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
												<div
													className="h-3 rounded-full transition-all duration-300"
													style={{ width: `${percentage}%`, backgroundColor: item.color }}
												/>
											</div>
										</div>
									)
								})}
							</div>
						</div>
					</div>
				)

			case 'oxygenSaturation':
				const osAvg = stats.averages?.oxygenSaturation
				const osRanges = stats.ranges?.oxygenSaturation || { low: 0, normal: 0, high: 0 }
				const osTotal = osRanges.low + osRanges.normal + osRanges.high
				const osNormalPct = osTotal > 0 ? ((osRanges.normal / osTotal) * 100).toFixed(1) : '0'

				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Análisis de Saturación de Oxígeno
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Promedio General</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{osAvg ? `${osAvg.toFixed(1)}%` : 'N/A'}
									</p>
									<div className="mt-2">
										{getTrend(osAvg, 'avgOxygenSaturation')}
									</div>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Valores Normales</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{osRanges.normal}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{osNormalPct}% del total
									</p>
								</div>
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Valores Bajos ({'< '}95%)</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{osRanges.low}
									</p>
									<p className="text-xs text-red-600 dark:text-red-400 mt-1">
										⚠️ Requiere atención
									</p>
								</div>
							</div>

							<div className="space-y-4">
								<h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
									Distribución por Rangos
								</h4>
								{[
									{ label: `Baja (< 95%)`, value: osRanges.low, color: '#ef4444' },
									{ label: 'Normal (95-100%)', value: osRanges.normal, color: '#22c55e' },
									{ label: `Alta (> 100%)`, value: osRanges.high, color: '#eab308' },
								].map((item) => {
									const percentage = osTotal > 0 ? (item.value / osTotal) * 100 : 0
									return (
										<div key={item.label} className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-gray-700 dark:text-gray-300">{item.label}</span>
												<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
											</div>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
												<div
													className="h-3 rounded-full transition-all duration-300"
													style={{ width: `${percentage}%`, backgroundColor: item.color }}
												/>
											</div>
										</div>
									)
								})}
							</div>
						</div>

						{trends && trends.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
									Tendencia de Saturación de Oxígeno
								</h3>
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={trends.map(t => ({ ...t, date: format(new Date(t.date), 'dd/MM') }))}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Line type="monotone" dataKey="avgOxygenSaturation" stroke="#3b82f6" strokeWidth={2} name="Promedio (%)" />
										<Line type="monotone" dataKey={() => 95} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} name="Límite Crítico" />
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}
					</div>
				)

			case 'temperature':
				const tempAvg = stats.averages?.temperature
				const tempRanges = stats.ranges?.temperature || { low: 0, normal: 0, high: 0 }
				const tempTotal = tempRanges.low + tempRanges.normal + tempRanges.high
				const tempNormalPct = tempTotal > 0 ? ((tempRanges.normal / tempTotal) * 100).toFixed(1) : '0'
				const feverCount = tempRanges.high

				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Análisis de Temperatura
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Promedio General</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{tempAvg ? `${tempAvg.toFixed(1)}°C` : 'N/A'}
									</p>
									<div className="mt-2">
										{getTrend(tempAvg, 'avgTemperature')}
									</div>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Valores Normales</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{tempRanges.normal}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{tempNormalPct}% del total
									</p>
								</div>
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Casos de Fiebre ({'> '}37.5°C)</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{feverCount}
									</p>
									<p className="text-xs text-red-600 dark:text-red-400 mt-1">
										⚠️ Requiere atención
									</p>
								</div>
							</div>

							<div className="space-y-4">
								<h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
									Distribución por Rangos
								</h4>
								{[
									{ label: `Baja (< 36°C)`, value: tempRanges.low, color: '#3b82f6' },
									{ label: 'Normal (36-37.5°C)', value: tempRanges.normal, color: '#22c55e' },
									{ label: `Alta/Fiebre (> 37.5°C)`, value: tempRanges.high, color: '#ef4444' },
								].map((item) => {
									const percentage = tempTotal > 0 ? (item.value / tempTotal) * 100 : 0
									return (
										<div key={item.label} className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-gray-700 dark:text-gray-300">{item.label}</span>
												<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
											</div>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
												<div
													className="h-3 rounded-full transition-all duration-300"
													style={{ width: `${percentage}%`, backgroundColor: item.color }}
												/>
											</div>
										</div>
									)
								})}
							</div>
						</div>

						{trends && trends.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
									Tendencia de Temperatura
								</h3>
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={trends.map(t => ({ ...t, date: format(new Date(t.date), 'dd/MM') }))}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Line type="monotone" dataKey="avgTemperature" stroke="#f97316" strokeWidth={2} name="Promedio (°C)" />
										<Line type="monotone" dataKey={() => 37.5} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} name="Límite Fiebre" />
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}
					</div>
				)

			case 'bmi':
				const bmiAvg = stats.averages?.bmi
				const bmiRanges = stats.ranges?.bmi || { underweight: 0, normal: 0, overweight: 0, obese: 0 }
				const bmiTotal = bmiRanges.underweight + bmiRanges.normal + bmiRanges.overweight + bmiRanges.obese
				const bmiNormalPct = bmiTotal > 0 ? ((bmiRanges.normal / bmiTotal) * 100).toFixed(1) : '0'

				const bmiChartData = [
					{ name: 'Bajo peso', value: bmiRanges.underweight, color: '#3b82f6' },
					{ name: 'Normal', value: bmiRanges.normal, color: '#22c55e' },
					{ name: 'Sobrepeso', value: bmiRanges.overweight, color: '#eab308' },
					{ name: 'Obesidad', value: bmiRanges.obese, color: '#ef4444' },
				].filter(item => item.value > 0)

				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Análisis de Índice de Masa Corporal
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Promedio General</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{bmiAvg ? bmiAvg.toFixed(1) : 'N/A'}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">kg/m²</p>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">IMC Normal</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{bmiRanges.normal}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{bmiNormalPct}% del total
									</p>
								</div>
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Sobrepeso + Obesidad</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{bmiRanges.overweight + bmiRanges.obese}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{((((bmiRanges.overweight + bmiRanges.obese) / bmiTotal) * 100) || 0).toFixed(1)}% del total
									</p>
								</div>
							</div>

							{/* Gráfico de pastel */}
							{bmiChartData.length > 0 && (
								<div className="mb-6">
									<h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
										Distribución por Categorías
									</h4>
									<ResponsiveContainer width="100%" height={300}>
										<PieChart>
											<Pie
												data={bmiChartData}
												cx="50%"
												cy="50%"
												labelLine={false}
												label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
												outerRadius={100}
												fill="#8884d8"
												dataKey="value"
											>
												{bmiChartData.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={entry.color} />
												))}
											</Pie>
											<Tooltip />
											<Legend />
										</PieChart>
									</ResponsiveContainer>
								</div>
							)}

							<div className="space-y-4">
								<h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
									Distribución Detallada
								</h4>
								{[
									{ label: `Bajo peso (< 18.5)`, value: bmiRanges.underweight, color: '#3b82f6' },
									{ label: 'Normal (18.5-25)', value: bmiRanges.normal, color: '#22c55e' },
									{ label: 'Sobrepeso (25-30)', value: bmiRanges.overweight, color: '#eab308' },
									{ label: `Obesidad (> 30)`, value: bmiRanges.obese, color: '#ef4444' },
								].map((item) => {
									const percentage = bmiTotal > 0 ? (item.value / bmiTotal) * 100 : 0
									return (
										<div key={item.label} className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-gray-700 dark:text-gray-300">{item.label}</span>
												<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
											</div>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
												<div
													className="h-3 rounded-full transition-all duration-300"
													style={{ width: `${percentage}%`, backgroundColor: item.color }}
												/>
											</div>
										</div>
									)
								})}
							</div>
						</div>
					</div>
				)

			case 'bloodPressure':
				const bpAvg = stats.averages?.systolicBP
				const bpRanges = stats.ranges?.bloodPressure || { low: 0, normal: 0, high: 0 }
				const bpTotal = bpRanges.low + bpRanges.normal + bpRanges.high
				const bpNormalPct = bpTotal > 0 ? ((bpRanges.normal / bpTotal) * 100).toFixed(1) : '0'
				const hypertensionCount = bpRanges.high

				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Análisis de Presión Arterial
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Promedio Sistólica</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{bpAvg ? `${bpAvg.toFixed(0)} mmHg` : 'N/A'}
									</p>
									<div className="mt-2">
										{getTrend(bpAvg, 'avgSystolicBP')}
									</div>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Valores Normales</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{bpRanges.normal}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{bpNormalPct}% del total
									</p>
								</div>
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Hipertensión ({'> '}120 mmHg)</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{hypertensionCount}
									</p>
									<p className="text-xs text-red-600 dark:text-red-400 mt-1">
										⚠️ Requiere atención
									</p>
								</div>
							</div>

							<div className="space-y-4">
								<h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
									Distribución por Rangos
								</h4>
								{[
									{ label: `Baja (< 90 mmHg)`, value: bpRanges.low, color: '#3b82f6' },
									{ label: 'Normal (90-120 mmHg)', value: bpRanges.normal, color: '#22c55e' },
									{ label: `Alta/Hipertensión (> 120 mmHg)`, value: bpRanges.high, color: '#ef4444' },
								].map((item) => {
									const percentage = bpTotal > 0 ? (item.value / bpTotal) * 100 : 0
									return (
										<div key={item.label} className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-gray-700 dark:text-gray-300">{item.label}</span>
												<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
											</div>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
												<div
													className="h-3 rounded-full transition-all duration-300"
													style={{ width: `${percentage}%`, backgroundColor: item.color }}
												/>
											</div>
										</div>
									)
								})}
							</div>
						</div>

						{/* Gráfica de tendencia */}
						{trends && trends.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
									Tendencia de Presión Arterial
								</h3>
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={trends.map(t => ({ ...t, date: format(new Date(t.date), 'dd/MM') }))}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Line type="monotone" dataKey="avgSystolicBP" stroke="#ef4444" strokeWidth={2} name="Promedio Sistólica (mmHg)" />
										<Line type="monotone" dataKey={() => 90} stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={1} name="Límite Normal Inferior" />
										<Line type="monotone" dataKey={() => 120} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} name="Límite Normal Superior" />
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}
					</div>
				)

			case 'bloodGlucose':
				const bgAvg = stats.averages?.bloodGlucose
				const bgRanges = stats.ranges?.bloodGlucose || { low: 0, normal: 0, high: 0 }
				const bgTotal = bgRanges.low + bgRanges.normal + bgRanges.high
				const bgNormalPct = bgTotal > 0 ? ((bgRanges.normal / bgTotal) * 100).toFixed(1) : '0'
				const hyperglycemiaCount = bgRanges.high
				const hypoglycemiaCount = bgRanges.low

				return (
					<div className="space-y-6">
						{/* Resumen */}
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Análisis de Glicemia
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Promedio General</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{bgAvg ? `${bgAvg.toFixed(1)} mg/dL` : 'N/A'}
									</p>
									<div className="mt-2">
										{getTrend(bgAvg, 'avgBloodGlucose')}
									</div>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Valores Normales</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{bgRanges.normal}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{bgNormalPct}% del total
									</p>
								</div>
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Valores Anormales</p>
									<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
										{hyperglycemiaCount + hypoglycemiaCount}
									</p>
									<p className="text-xs text-red-600 dark:text-red-400 mt-1">
										⚠️ Requiere atención
									</p>
								</div>
							</div>

							{/* Distribución detallada */}
							<div className="space-y-4">
								<h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
									Distribución por Rangos
								</h4>
								{[
									{ label: `Hipoglicemia (< 70 mg/dL)`, value: bgRanges.low, color: '#ef4444' },
									{ label: 'Normal (70-140 mg/dL)', value: bgRanges.normal, color: '#22c55e' },
									{ label: `Hiperglicemia (> 140 mg/dL)`, value: bgRanges.high, color: '#eab308' },
								].map((item) => {
									const percentage = bgTotal > 0 ? (item.value / bgTotal) * 100 : 0
									return (
										<div key={item.label} className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-gray-700 dark:text-gray-300">{item.label}</span>
												<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
											</div>
											<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
												<div
													className="h-3 rounded-full transition-all duration-300"
													style={{ width: `${percentage}%`, backgroundColor: item.color }}
												/>
											</div>
										</div>
									)
								})}
							</div>
						</div>

						{/* Gráfica de tendencia */}
						{trends && trends.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
									Tendencia de Glicemia
								</h3>
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={trends.map(t => ({ ...t, date: format(new Date(t.date), 'dd/MM') }))}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Line type="monotone" dataKey="avgBloodGlucose" stroke="#a855f7" strokeWidth={2} name="Promedio (mg/dL)" />
										<Line type="monotone" dataKey={() => 70} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} name="Límite Normal Inferior" />
										<Line type="monotone" dataKey={() => 140} stroke="#eab308" strokeDasharray="5 5" strokeWidth={1} name="Límite Normal Superior" />
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}
					</div>
				)

			case 'habits':
				const tabacoHabits = stats.habits?.tabaco || {}
				const cafeHabits = stats.habits?.cafe || {}
				const alcoholHabits = stats.habits?.alcohol || {}

				const tabacoData = Object.entries(tabacoHabits).map(([key, value]) => ({
					name: key,
					value: value as number,
				}))

				const cafeData = Object.entries(cafeHabits).map(([key, value]) => ({
					name: key,
					value: value as number,
				}))

				const alcoholData = Object.entries(alcoholHabits).map(([key, value]) => ({
					name: key,
					value: value as number,
				}))

				const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6']

				return (
					<div className="space-y-6">
						{/* Tabaco */}
						{tabacoData.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
									<Activity className="h-5 w-5 text-red-500" />
									Distribución de Tabaco
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<ResponsiveContainer width="100%" height={250}>
											<PieChart>
												<Pie
													data={tabacoData}
													cx="50%"
													cy="50%"
													labelLine={false}
													label={false}
													outerRadius={90}
													fill="#8884d8"
													dataKey="value"
												>
													{tabacoData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
													))}
												</Pie>
												<Tooltip />
											</PieChart>
										</ResponsiveContainer>
									</div>
									<div className="space-y-3">
										{tabacoData.map((item, index) => {
											const total = tabacoData.reduce((sum, d) => sum + d.value, 0)
											const percentage = total > 0 ? (item.value / total) * 100 : 0
											return (
												<div key={item.name} className="space-y-1">
													<div className="flex justify-between text-sm">
														<span className="text-gray-700 dark:text-gray-300">{item.name}</span>
														<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
													</div>
													<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
														<div
															className="h-2 rounded-full transition-all duration-300"
															style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
														/>
													</div>
												</div>
											)
										})}
									</div>
								</div>
							</div>
						)}

						{/* Café */}
						{cafeData.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
									<Activity className="h-5 w-5 text-amber-500" />
									Distribución de Café
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<ResponsiveContainer width="100%" height={250}>
											<PieChart>
												<Pie
													data={cafeData}
													cx="50%"
													cy="50%"
													labelLine={false}
													label={false}
													outerRadius={90}
													fill="#8884d8"
													dataKey="value"
												>
													{cafeData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
													))}
												</Pie>
												<Tooltip />
											</PieChart>
										</ResponsiveContainer>
									</div>
									<div className="space-y-3">
										{cafeData.map((item, index) => {
											const total = cafeData.reduce((sum, d) => sum + d.value, 0)
											const percentage = total > 0 ? (item.value / total) * 100 : 0
											return (
												<div key={item.name} className="space-y-1">
													<div className="flex justify-between text-sm">
														<span className="text-gray-700 dark:text-gray-300">{item.name}</span>
														<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
													</div>
													<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
														<div
															className="h-2 rounded-full transition-all duration-300"
															style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
														/>
													</div>
												</div>
											)
										})}
									</div>
								</div>
							</div>
						)}

						{/* Alcohol */}
						{alcoholData.length > 0 && (
							<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
									<Activity className="h-5 w-5 text-purple-500" />
									Distribución de Alcohol
								</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<ResponsiveContainer width="100%" height={250}>
											<PieChart>
												<Pie
													data={alcoholData}
													cx="50%"
													cy="50%"
													labelLine={false}
													label={false}
													outerRadius={90}
													fill="#8884d8"
													dataKey="value"
												>
													{alcoholData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
													))}
												</Pie>
												<Tooltip />
											</PieChart>
										</ResponsiveContainer>
									</div>
									<div className="space-y-3">
										{alcoholData.map((item, index) => {
											const total = alcoholData.reduce((sum, d) => sum + d.value, 0)
											const percentage = total > 0 ? (item.value / total) * 100 : 0
											return (
												<div key={item.name} className="space-y-1">
													<div className="flex justify-between text-sm">
														<span className="text-gray-700 dark:text-gray-300">{item.name}</span>
														<span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
													</div>
													<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
														<div
															className="h-2 rounded-full transition-all duration-300"
															style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
														/>
													</div>
												</div>
											)
										})}
									</div>
								</div>
							</div>
						)}

					</div>
				)

			default:
				return (
					<div className="text-center py-8">
						<p className="text-gray-500 dark:text-gray-400">
							No hay datos detallados disponibles para esta estadística
						</p>
					</div>
				)
		}
	}

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

					{/* Main Panel */}
					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="fixed right-0 top-0 h-full w-full sm:w-2/3 lg:w-1/2 xl:w-2/5 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] shadow-2xl z-[99999999] overflow-y-auto rounded-lg border-l border-input flex flex-col"
					>
						{/* Header */}
						<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] border-b border-input p-3 sm:p-6 z-10">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									{getStatIcon()}
									<div>
										<h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
											{getStatTitle()}
										</h2>
										<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
											Últimos {days} días
										</p>
									</div>
								</div>
								<button
									onClick={onClose}
									className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none"
								>
									<X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="p-3 sm:p-6 overflow-y-auto flex-1">{renderContent()}</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

export default TriageDetailPanel
export { TriageDetailPanel }

