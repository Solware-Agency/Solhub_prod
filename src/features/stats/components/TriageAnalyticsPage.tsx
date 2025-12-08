import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/card'
import { Activity, Heart, Wind, Droplets, Thermometer, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react'
import { getTriageStats, getTriageTrends } from '../services/triage-stats-service'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'

export const TriageAnalyticsPage: React.FC = () => {
	const { profile } = useUserProfile()
	const [days, setDays] = useState<number>(30)

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

	return (
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
			<Card>
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

			{/* Promedios de signos vitales */}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
				{/* Frecuencia cardíaca */}
				<Card>
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
						<div className='text-2xl font-bold'>
							{stats.averages.heartRate ? `${stats.averages.heartRate.toFixed(0)} lpm` : 'N/A'}
						</div>
						<div className='mt-2 flex gap-2 text-xs'>
							<span className='text-red-600'>Baja: {stats.ranges.heartRate.low}</span>
							<span className='text-green-600'>Normal: {stats.ranges.heartRate.normal}</span>
							<span className='text-yellow-600'>Alta: {stats.ranges.heartRate.high}</span>
						</div>
					</CardContent>
				</Card>

				{/* Frecuencia respiratoria */}
				<Card>
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
						<div className='text-2xl font-bold'>
							{stats.averages.respiratoryRate ? `${stats.averages.respiratoryRate.toFixed(0)} rpm` : 'N/A'}
						</div>
						<div className='mt-2 flex gap-2 text-xs'>
							<span className='text-red-600'>Baja: {stats.ranges.respiratoryRate.low}</span>
							<span className='text-green-600'>Normal: {stats.ranges.respiratoryRate.normal}</span>
							<span className='text-yellow-600'>Alta: {stats.ranges.respiratoryRate.high}</span>
						</div>
					</CardContent>
				</Card>

				{/* Saturación de oxígeno */}
				<Card>
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
						<div className='text-2xl font-bold'>
							{stats.averages.oxygenSaturation ? `${stats.averages.oxygenSaturation.toFixed(1)}%` : 'N/A'}
						</div>
						<div className='mt-2 flex gap-2 text-xs'>
							<span className='text-red-600'>Baja: {stats.ranges.oxygenSaturation.low}</span>
							<span className='text-green-600'>Normal: {stats.ranges.oxygenSaturation.normal}</span>
							<span className='text-yellow-600'>Alta: {stats.ranges.oxygenSaturation.high}</span>
						</div>
					</CardContent>
				</Card>

				{/* Temperatura */}
				<Card>
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
						<div className='text-2xl font-bold'>
							{stats.averages.temperature ? `${stats.averages.temperature.toFixed(1)}°C` : 'N/A'}
						</div>
						<div className='mt-2 flex gap-2 text-xs'>
							<span className='text-blue-600'>Baja: {stats.ranges.temperature.low}</span>
							<span className='text-green-600'>Normal: {stats.ranges.temperature.normal}</span>
							<span className='text-red-600'>Alta: {stats.ranges.temperature.high}</span>
						</div>
					</CardContent>
				</Card>

				{/* IMC */}
				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium flex items-center gap-2'>
							<Activity className='h-4 w-4 text-green-500' />
							Índice de Masa Corporal
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>{stats.averages.bmi ? stats.averages.bmi.toFixed(1) : 'N/A'}</div>
						<div className='mt-2 flex flex-col gap-1 text-xs'>
							<span className='text-blue-600'>Bajo peso: {stats.ranges.bmi.underweight}</span>
							<span className='text-green-600'>Normal: {stats.ranges.bmi.normal}</span>
							<span className='text-yellow-600'>Sobrepeso: {stats.ranges.bmi.overweight}</span>
							<span className='text-red-600'>Obesidad: {stats.ranges.bmi.obese}</span>
						</div>
					</CardContent>
				</Card>

				{/* Presión arterial */}
				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm font-medium flex items-center gap-2'>
							<Activity className='h-4 w-4 text-red-500' />
							Presión Arterial
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='text-2xl font-bold'>
							{stats.averages.systolicBP ? `${stats.averages.systolicBP.toFixed(0)} mmHg` : 'N/A'}
						</div>
						<p className='text-xs text-muted-foreground mt-1'>Promedio sistólica</p>
					</CardContent>
				</Card>
			</div>

			{/* Hábitos psicobiológicos */}
			{(Object.keys(stats.habits.tabaco).length > 0 ||
				Object.keys(stats.habits.cafe).length > 0 ||
				Object.keys(stats.habits.alcohol).length > 0) && (
				<Card>
					<CardHeader>
						<CardTitle>Hábitos Psicobiológicos</CardTitle>
						<CardDescription>Distribución de hábitos reportados</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
							{/* Tabaco */}
							{Object.keys(stats.habits.tabaco).length > 0 && (
								<div>
									<h4 className='font-medium mb-2'>Tabaco</h4>
									<div className='space-y-1'>
										{Object.entries(stats.habits.tabaco).map(([level, count]) => (
											<div key={level} className='flex justify-between text-sm'>
												<span className='text-muted-foreground'>{level}</span>
												<span className='font-medium'>{count}</span>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Café */}
							{Object.keys(stats.habits.cafe).length > 0 && (
								<div>
									<h4 className='font-medium mb-2'>Café</h4>
									<div className='space-y-1'>
										{Object.entries(stats.habits.cafe).map(([level, count]) => (
											<div key={level} className='flex justify-between text-sm'>
												<span className='text-muted-foreground'>{level}</span>
												<span className='font-medium'>{count}</span>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Alcohol */}
							{Object.keys(stats.habits.alcohol).length > 0 && (
								<div>
									<h4 className='font-medium mb-2'>Alcohol</h4>
									<div className='space-y-1'>
										{Object.entries(stats.habits.alcohol).map(([level, count]) => (
											<div key={level} className='flex justify-between text-sm'>
												<span className='text-muted-foreground'>{level}</span>
												<span className='font-medium'>{count}</span>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Nota de privacidad */}
			<Card>
				<CardContent className='pt-6'>
					<p className='text-xs text-muted-foreground'>
						🔒 Todas las estadísticas son completamente anónimas. No se muestra información que permita identificar
						pacientes individuales.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
