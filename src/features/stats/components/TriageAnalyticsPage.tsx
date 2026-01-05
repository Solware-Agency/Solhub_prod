import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Activity, Heart, Wind, Droplets, Thermometer, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react'
import { getTriageStats, getTriageTrends } from '../services/triage-stats-service'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import TriageDetailPanel, { type TriageStatType } from '@shared/components/ui/triage-detail-panel'

export const TriageAnalyticsPage: React.FC = () => {
	const { profile } = useUserProfile()
	const [days, setDays] = useState<number>(30)
	const [selectedStat, setSelectedStat] = useState<TriageStatType | null>(null)
	const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)

	// Type assertion para laboratory_id ya que no está en la interfaz generada
	const laboratoryId = (profile as any)?.laboratory_id as string | undefined

	const { data: statsData, isLoading: loadingStats } = useQuery({
		queryKey: ['triage-stats', laboratoryId, days],
		queryFn: async () => {
			if (!laboratoryId) throw new Error('No laboratory ID')
			const endDate = new Date()
			const startDate = new Date()
			startDate.setDate(startDate.getDate() - days)
			return getTriageStats(laboratoryId, startDate, endDate)
		},
		enabled: !!laboratoryId,
	})

	const { data: trendsData, isLoading: loadingTrends } = useQuery({
		queryKey: ['triage-trends', laboratoryId, days],
		queryFn: async () => {
			if (!laboratoryId) throw new Error('No laboratory ID')
			return getTriageTrends(laboratoryId, days)
		},
		enabled: !!laboratoryId,
	})

	if (loadingStats || loadingTrends) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
			</div>
		)
	}

	if (!statsData?.success || !statsData.data) {
		return (
			<div className='container mx-auto p-6'>
				<div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
					<p className='text-red-800 dark:text-red-200'>{statsData?.error || 'Error al cargar estadísticas'}</p>
				</div>
			</div>
		)
	}

	const stats = statsData.data
	const trends = trendsData?.data || []

	// Función para calcular tendencia (simplificada)
	const getTrend = (current: number | null, key: keyof typeof trends[0]) => {
		if (!current || trends.length < 2) return null
		const first = trends[0]?.[key]
		const last = trends[trends.length - 1]?.[key]
		if (!first || !last || first === last) return <Minus className='h-4 w-4 text-gray-400' />
		if (last > first) return <TrendingUp className='h-4 w-4 text-green-500' />
		return <TrendingDown className='h-4 w-4 text-red-500' />
	}

	const handleCardClick = (statType: TriageStatType) => {
		setSelectedStat(statType)
		setIsDetailPanelOpen(true)
	}

	const handleDetailPanelClose = () => {
		setIsDetailPanelOpen(false)
		setSelectedStat(null)
	}

	return (
		<>
		<div className='container mx-auto p-6 space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-3xl font-bold'>Estadísticas de Triaje</h1>
					<p className='text-muted-foreground'>Análisis anónimo de signos vitales</p>
				</div>
				<Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v, 10))}>
					<SelectTrigger className='w-[180px]'>
						<SelectValue placeholder='Período' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='7'>Últimos 7 días</SelectItem>
						<SelectItem value='30'>Últimos 30 días</SelectItem>
						<SelectItem value='90'>Últimos 90 días</SelectItem>
						<SelectItem value='365'>Último año</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Total de triajes */}
			<Card 
				className='hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer'
				onClick={() => handleCardClick('totalTriages')}
			>
				<CardHeader className='pb-3'>
					<CardTitle className='text-sm font-medium flex items-center gap-2'>
						<Users className='h-4 w-4' />
						Total de Triajes
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='text-3xl font-bold'>{stats.totalTriages}</div>
					<p className='text-xs text-muted-foreground mt-1'>en los últimos {days} días</p>
				</CardContent>
			</Card>

			{/* Promedios de signos vitales con gráficas */}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
				{/* Frecuencia cardíaca */}
				<Card 
					className='hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer'
					onClick={() => handleCardClick('heartRate')}
				>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium flex items-center justify-between'>
							<span className='flex items-center gap-2'>
								<Heart className='h-4 w-4 text-pink-500' />
								Frecuencia Cardíaca
							</span>
							{getTrend(stats.averages.heartRate, 'avgHeartRate')}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold mb-4'>
							{stats.averages.heartRate ? `${stats.averages.heartRate.toFixed(0)} lpm` : 'N/A'}
						</div>
						<div className='space-y-2'>
							{[
								{ label: 'Baja', value: stats.ranges.heartRate.low, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300' },
								{ label: 'Normal', value: stats.ranges.heartRate.normal, color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' },
								{ label: 'Alta', value: stats.ranges.heartRate.high, color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-300' }
							].map((item) => {
								const total = stats.ranges.heartRate.low + stats.ranges.heartRate.normal + stats.ranges.heartRate.high
								const percentage = total > 0 ? (item.value / total) * 100 : 0
								return (
									<div key={item.label} className='space-y-1'>
										<div className='flex justify-between text-sm'>
											<span className={item.textColor}>{item.label}</span>
											<span className='font-medium'>{item.value} ({percentage.toFixed(0)}%)</span>
										</div>
										<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
											<div
												className={`${item.color} h-2 rounded-full transition-all duration-300`}
												style={{ width: `${percentage}%` }}
											/>
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>

				{/* Frecuencia respiratoria */}
				<Card 
					className='hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer'
					onClick={() => handleCardClick('respiratoryRate')}
				>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium flex items-center justify-between'>
							<span className='flex items-center gap-2'>
								<Wind className='h-4 w-4 text-cyan-500' />
								Frecuencia Respiratoria
							</span>
							{getTrend(stats.averages.respiratoryRate, 'avgRespiratoryRate')}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold mb-4'>
							{stats.averages.respiratoryRate ? `${stats.averages.respiratoryRate.toFixed(0)} rpm` : 'N/A'}
						</div>
						<div className='space-y-2'>
							{[
								{ label: 'Baja', value: stats.ranges.respiratoryRate.low, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300' },
								{ label: 'Normal', value: stats.ranges.respiratoryRate.normal, color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' },
								{ label: 'Alta', value: stats.ranges.respiratoryRate.high, color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-300' }
							].map((item) => {
								const total = stats.ranges.respiratoryRate.low + stats.ranges.respiratoryRate.normal + stats.ranges.respiratoryRate.high
								const percentage = total > 0 ? (item.value / total) * 100 : 0
								return (
									<div key={item.label} className='space-y-1'>
										<div className='flex justify-between text-sm'>
											<span className={item.textColor}>{item.label}</span>
											<span className='font-medium'>{item.value} ({percentage.toFixed(0)}%)</span>
										</div>
										<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
											<div
												className={`${item.color} h-2 rounded-full transition-all duration-300`}
												style={{ width: `${percentage}%` }}
											/>
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>

				{/* Saturación de oxígeno */}
				<Card 
					className='hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer'
					onClick={() => handleCardClick('oxygenSaturation')}
				>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium flex items-center justify-between'>
							<span className='flex items-center gap-2'>
								<Droplets className='h-4 w-4 text-blue-500' />
								Saturación de Oxígeno
							</span>
							{getTrend(stats.averages.oxygenSaturation, 'avgOxygenSaturation')}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold mb-4'>
							{stats.averages.oxygenSaturation ? `${stats.averages.oxygenSaturation.toFixed(1)}%` : 'N/A'}
						</div>
						<div className='space-y-2'>
							{[
								{ label: 'Baja', value: stats.ranges.oxygenSaturation.low, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300' },
								{ label: 'Normal', value: stats.ranges.oxygenSaturation.normal, color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' },
								{ label: 'Alta', value: stats.ranges.oxygenSaturation.high, color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-300' }
							].map((item) => {
								const total = stats.ranges.oxygenSaturation.low + stats.ranges.oxygenSaturation.normal + stats.ranges.oxygenSaturation.high
								const percentage = total > 0 ? (item.value / total) * 100 : 0
								return (
									<div key={item.label} className='space-y-1'>
										<div className='flex justify-between text-sm'>
											<span className={item.textColor}>{item.label}</span>
											<span className='font-medium'>{item.value} ({percentage.toFixed(0)}%)</span>
										</div>
										<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
											<div
												className={`${item.color} h-2 rounded-full transition-all duration-300`}
												style={{ width: `${percentage}%` }}
											/>
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>

				{/* Temperatura */}
				<Card 
					className='hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer'
					onClick={() => handleCardClick('temperature')}
				>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium flex items-center justify-between'>
							<span className='flex items-center gap-2'>
								<Thermometer className='h-4 w-4 text-orange-500' />
								Temperatura
							</span>
							{getTrend(stats.averages.temperature, 'avgTemperature')}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold mb-4'>
							{stats.averages.temperature ? `${stats.averages.temperature.toFixed(1)}°C` : 'N/A'}
						</div>
						<div className='space-y-2'>
							{[
								{ label: 'Baja', value: stats.ranges.temperature.low, color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-300' },
								{ label: 'Normal', value: stats.ranges.temperature.normal, color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' },
								{ label: 'Alta', value: stats.ranges.temperature.high, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300' }
							].map((item) => {
								const total = stats.ranges.temperature.low + stats.ranges.temperature.normal + stats.ranges.temperature.high
								const percentage = total > 0 ? (item.value / total) * 100 : 0
								return (
									<div key={item.label} className='space-y-1'>
										<div className='flex justify-between text-sm'>
											<span className={item.textColor}>{item.label}</span>
											<span className='font-medium'>{item.value} ({percentage.toFixed(0)}%)</span>
										</div>
										<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
											<div
												className={`${item.color} h-2 rounded-full transition-all duration-300`}
												style={{ width: `${percentage}%` }}
											/>
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>

				{/* IMC */}
				<Card 
					className='hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer'
					onClick={() => handleCardClick('bmi')}
				>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium flex items-center gap-2'>
							<Activity className='h-4 w-4 text-green-500' />
							Índice de Masa Corporal
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold mb-4'>{stats.averages.bmi ? stats.averages.bmi.toFixed(1) : 'N/A'}</div>
						<div className='space-y-2'>
							{[
								{ label: 'Bajo peso', value: stats.ranges.bmi.underweight, color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-300' },
								{ label: 'Normal', value: stats.ranges.bmi.normal, color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' },
								{ label: 'Sobrepeso', value: stats.ranges.bmi.overweight, color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-300' },
								{ label: 'Obesidad', value: stats.ranges.bmi.obese, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300' }
							].map((item) => {
								const total = stats.ranges.bmi.underweight + stats.ranges.bmi.normal + stats.ranges.bmi.overweight + stats.ranges.bmi.obese
								const percentage = total > 0 ? (item.value / total) * 100 : 0
								return (
									<div key={item.label} className='space-y-1'>
										<div className='flex justify-between text-sm'>
											<span className={item.textColor}>{item.label}</span>
											<span className='font-medium'>{item.value} ({percentage.toFixed(0)}%)</span>
										</div>
										<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
											<div
												className={`${item.color} h-2 rounded-full transition-all duration-300`}
												style={{ width: `${percentage}%` }}
											/>
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>

				{/* Presión arterial */}
				<Card 
					className='hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer'
					onClick={() => handleCardClick('bloodPressure')}
				>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium flex items-center gap-2'>
							<Activity className='h-4 w-4 text-red-500' />
							Presión Arterial
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold mb-4'>
							{stats.averages.systolicBP ? `${stats.averages.systolicBP.toFixed(0)} mmHg` : 'N/A'}
						</div>
						<p className='text-xs text-muted-foreground mb-4'>Promedio sistólica</p>
						<div className='space-y-2'>
							{[
								{ label: 'Baja', value: stats.ranges.bloodPressure.low, color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-300' },
								{ label: 'Normal', value: stats.ranges.bloodPressure.normal, color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' },
								{ label: 'Alta', value: stats.ranges.bloodPressure.high, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300' }
							].map((item) => {
								const total = stats.ranges.bloodPressure.low + stats.ranges.bloodPressure.normal + stats.ranges.bloodPressure.high
								const percentage = total > 0 ? (item.value / total) * 100 : 0
								return (
									<div key={item.label} className='space-y-1'>
										<div className='flex justify-between text-sm'>
											<span className={item.textColor}>{item.label}</span>
											<span className='font-medium'>{item.value} ({percentage.toFixed(0)}%)</span>
										</div>
										<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
											<div
												className={`${item.color} h-2 rounded-full transition-all duration-300`}
												style={{ width: `${percentage}%` }}
											/>
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Hábitos psicobiológicos - Full width */}
			{(Object.keys(stats.habits.tabaco).length > 0 ||
				Object.keys(stats.habits.cafe).length > 0 ||
				Object.keys(stats.habits.alcohol).length > 0) && (
				<Card 
					className='hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer'
					onClick={() => handleCardClick('habits')}
				>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium flex items-center gap-2'>
							<Activity className='h-4 w-4 text-purple-500' />
							Hábitos Psicobiológicos
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
								{/* Tabaco */}
								{Object.keys(stats.habits.tabaco).length > 0 && (
									<div>
										<h4 className='text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300'>Tabaco</h4>
										<div className='space-y-1.5'>
											{(() => {
												const total = Object.values(stats.habits.tabaco).reduce((a, b) => a + b, 0)
												const noFuma = stats.habits.tabaco['No fuma'] || 0
												const siFuma = total - noFuma
												const noPercentage = total > 0 ? (noFuma / total) * 100 : 0
												const siPercentage = total > 0 ? (siFuma / total) * 100 : 0
												return (
													<>
														<div className='space-y-1'>
															<div className='flex justify-between text-sm'>
																<span className='text-red-700 dark:text-red-300 font-medium'>No</span>
																<span className='font-bold'>{noFuma} ({noPercentage.toFixed(0)}%)</span>
															</div>
															<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
																<div
																	className='bg-red-500 h-1.5 rounded-full transition-all duration-300'
																	style={{ width: `${noPercentage}%` }}
																/>
															</div>
														</div>
														<div className='space-y-1'>
															<div className='flex justify-between text-sm'>
																<span className='text-green-700 dark:text-green-300 font-medium'>Sí</span>
																<span className='font-bold'>{siFuma} ({siPercentage.toFixed(0)}%)</span>
															</div>
															<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
																<div
																	className='bg-green-500 h-1.5 rounded-full transition-all duration-300'
																	style={{ width: `${siPercentage}%` }}
																/>
															</div>
														</div>
													</>
												)
											})()}
										</div>
									</div>
								)}

								{/* Café */}
								{Object.keys(stats.habits.cafe).length > 0 && (
									<div>
										<h4 className='text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300'>Café</h4>
										<div className='space-y-1.5'>
											{(() => {
												const total = Object.values(stats.habits.cafe).reduce((a, b) => a + b, 0)
												const noToma = stats.habits.cafe['No toma'] || 0
												const siToma = total - noToma
												const noPercentage = total > 0 ? (noToma / total) * 100 : 0
												const siPercentage = total > 0 ? (siToma / total) * 100 : 0
												return (
													<>
														<div className='space-y-1'>
															<div className='flex justify-between text-sm'>
																<span className='text-red-700 dark:text-red-300 font-medium'>No</span>
																<span className='font-bold'>{noToma} ({noPercentage.toFixed(0)}%)</span>
															</div>
															<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
																<div
																	className='bg-red-500 h-1.5 rounded-full transition-all duration-300'
																	style={{ width: `${noPercentage}%` }}
																/>
															</div>
														</div>
														<div className='space-y-1'>
															<div className='flex justify-between text-sm'>
																<span className='text-green-700 dark:text-green-300 font-medium'>Sí</span>
																<span className='font-bold'>{siToma} ({siPercentage.toFixed(0)}%)</span>
															</div>
															<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
																<div
																	className='bg-green-500 h-1.5 rounded-full transition-all duration-300'
																	style={{ width: `${siPercentage}%` }}
																/>
															</div>
														</div>
													</>
												)
											})()}
										</div>
									</div>
								)}

								{/* Alcohol */}
								{Object.keys(stats.habits.alcohol).length > 0 && (
									<div>
										<h4 className='text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300'>Alcohol</h4>
										<div className='space-y-1.5'>
											{(() => {
												const total = Object.values(stats.habits.alcohol).reduce((a, b) => a + b, 0)
												const no = stats.habits.alcohol['No'] || 0
												const si = total - no
												const noPercentage = total > 0 ? (no / total) * 100 : 0
												const siPercentage = total > 0 ? (si / total) * 100 : 0
												return (
													<>
														<div className='space-y-1'>
															<div className='flex justify-between text-sm'>
																<span className='text-red-700 dark:text-red-300 font-medium'>No</span>
																<span className='font-bold'>{no} ({noPercentage.toFixed(0)}%)</span>
															</div>
															<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
																<div
																	className='bg-red-500 h-1.5 rounded-full transition-all duration-300'
																	style={{ width: `${noPercentage}%` }}
																/>
															</div>
														</div>
														<div className='space-y-1'>
															<div className='flex justify-between text-sm'>
																<span className='text-green-700 dark:text-green-300 font-medium'>Sí</span>
																<span className='font-bold'>{si} ({siPercentage.toFixed(0)}%)</span>
															</div>
															<div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
																<div
																	className='bg-green-500 h-1.5 rounded-full transition-all duration-300'
																	style={{ width: `${siPercentage}%` }}
																/>
															</div>
														</div>
													</>
												)
											})()}
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				)}

			{/* Nota de privacidad */}
			<Card className='hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg'>
				<CardContent className='pt-6'>
					<p className='text-xs text-muted-foreground'>
						🔒 Todas las estadísticas son completamente anónimas. No se muestra información que permita identificar
						pacientes individuales.
					</p>
				</CardContent>
			</Card>
		</div>

		{/* Modal de detalles */}
		{selectedStat && (
			<TriageDetailPanel
				isOpen={isDetailPanelOpen}
				onClose={handleDetailPanelClose}
				statType={selectedStat}
				stats={stats}
				trends={trends}
				days={days}
				isLoading={loadingStats || loadingTrends}
			/>
		)}
		</>
	)
}
