import React, { useState } from 'react'
import { Card } from '@shared/components/ui/card'
import { Stethoscope, Activity, FlaskRound, Info } from 'lucide-react'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'
import { formatCurrency } from '@shared/utils/number-utils'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
const ExamTypePieChart: React.FC = () => {
	const { data: stats, isLoading } = useDashboardStats()
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

	// Get exam type icon based on type (tolerant to accents/variants)
	const getExamTypeIcon = (examType: string) => {
		const normalized = examType
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
		if (normalized.includes('citologia')) {
			return <Stethoscope className="w-4 h-4 text-white" />
		}
		if (normalized.includes('biopsia')) {
			return <Activity className="w-4 h-4 text-white" />
		}
		if (normalized.includes('inmunohistoquimica') || normalized.includes('inmuno')) {
			return <FlaskRound className="w-4 h-4 text-white" />
		}
		return <Stethoscope className="w-4 h-4 text-white" />
	}

	// Get color for exam type - using the same colors as other charts
	const getExamTypeColor = (index: number) => {
		const colors = ['#ec4899', '#a855f7', '#3b82f6']
		return colors[index % colors.length]
	}

	// Calculate total revenue
	const totalRevenue = stats?.revenueByExamType?.reduce((sum, item) => sum + item.revenue, 0) || 0

	// Prepare data for pie chart with percentages
	const pieData =
		stats?.revenueByExamType?.map((item, index) => ({
			...item,
			percentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0,
			color: getExamTypeColor(index),
		})) || []

	if (isLoading) {
		return (
			<Card className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg h-full">
				<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
					<h3 className="flex items-center justify-between text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 md:mb-6">
						Tipos de Exámenes Más Solicitados{' '}
						<Tooltip>
							<TooltipTrigger>
								<Info className="size-4" />
							</TooltipTrigger>
							<TooltipContent>
								<p>En esta estadística puedes ver las ganancias totales por tipo de examen.</p>
							</TooltipContent>
						</Tooltip>
					</h3>
					<div className="flex items-center justify-center h-64">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
					</div>
				</div>
			</Card>
		)
	}

	return (
		<Card className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg h-full">
			<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
				<h3 className="flex items-center justify-between text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 md:mb-6">
					Tipos de Exámenes Más Solicitados{' '}
					<Tooltip>
						<TooltipTrigger>
							<Info className="size-4" />
						</TooltipTrigger>
						<TooltipContent>
							<p>En esta estadística puedes ver las ganancias totales por tipo de examen.</p>
						</TooltipContent>
					</Tooltip>
				</h3>

				{pieData.length > 0 ? (
					<div className="w-full lg:grid grid-cols-1 gap-4 justify-center items-center">
						{/* Pie Chart */}
						<div className="h-64 relative">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={pieData}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={false} // Sin porcentajes dentro del donut
										outerRadius={90}
										innerRadius={55} // Esto crea el efecto donut
										fill="#8884d8"
										dataKey="percentage"
										strokeWidth={0} // Sin borde blanco
										strokeLinecap="round" // Bordes redondeados
										paddingAngle={0} // Espacio adicional entre segmentos
									>
										{pieData.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={entry.color}
												className="cursor-pointer"
												strokeWidth={0}
												style={{
													opacity: hoveredIndex === index || hoveredIndex === null ? 1 : 0.6,
													filter: hoveredIndex === index ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none',
													transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
													transformOrigin: 'center',
													transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
												}}
												onMouseEnter={() => setHoveredIndex(index)}
												onMouseLeave={() => setHoveredIndex(null)}
											/>
										))}
									</Pie>
								</PieChart>
							</ResponsiveContainer>

							{/* Total en el centro del donut */}
							<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
								<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border border-input rounded-full size-32 flex flex-col items-center justify-center">
									<p className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">
										{formatCurrency(totalRevenue)}
									</p>
									<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total del Mes</p>
								</div>
							</div>
						</div>

						{/* Leyenda personalizada - Estilo original del SVG */}
						<div className="flex flex-col">
							{pieData.map((entry, index) => (
								<div
									key={entry.examType}
									className={`flex items-center justify-between transition-all duration-300 cursor-pointer p-2 rounded-lg ${
										hoveredIndex === index ? 'scale-105' : ''
									}`}
									onMouseEnter={() => setHoveredIndex(index)}
									onMouseLeave={() => setHoveredIndex(null)}
								>
									<div className="flex items-center gap-2">
										<div
											className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
												hoveredIndex === index ? 'scale-125' : ''
											}`}
											style={{ backgroundColor: entry.color }}
										>
											{getExamTypeIcon(entry.examType)}
										</div>
										<div>
											<span
												className={` flex items-center gap-2 text-sm transition-all duration-300 ${
													hoveredIndex === index
														? 'text-gray-900 dark:text-gray-100 font-medium'
														: 'text-gray-600 dark:text-gray-400'
												}`}
											>
												{entry.examType}
												<div className="text-xs text-gray-500 dark:text-gray-400">
													({entry.count} caso{entry.count !== 1 ? 's' : ''})
												</div>
											</span>
										</div>
									</div>
									<span
										className={`text-sm transition-all duration-300 ${
											hoveredIndex === index
												? 'text-gray-900 dark:text-gray-100 font-semibold'
												: 'text-gray-700 dark:text-gray-300 font-medium'
										}`}
									>
										{Math.round(entry.percentage)}% ({formatCurrency(entry.revenue)})
									</span>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
						<div className="text-center">
							<Stethoscope className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
							<p className="text-lg font-medium">Sin datos disponibles</p>
							<p className="text-sm">No hay exámenes registrados para este período</p>
						</div>
					</div>
				)}
			</div>
		</Card>
	)
}

export default ExamTypePieChart
