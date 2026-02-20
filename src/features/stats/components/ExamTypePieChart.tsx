import React, { useState } from 'react'
import { Card } from '@shared/components/ui/card'
import { Stethoscope, Info } from 'lucide-react'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'
import { formatCurrency, formatNumber } from '@shared/utils/number-utils'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
interface ExamTypePieChartProps {
	startDate?: Date
	endDate?: Date
	onClick?: () => void
	isSpt?: boolean
}

const ExamTypePieChart: React.FC<ExamTypePieChartProps> = ({ startDate, endDate, onClick, isSpt = false }) => {
	const { data: stats, isLoading } = useDashboardStats(startDate, endDate)
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

	// Get color for exam type - using the same colors as other charts
	const getExamTypeColor = (index: number) => {
		const colors = ['#ec4899', '#a855f7', '#3b82f6']
		return colors[index % colors.length]
	}

	// Calculate total (revenue or count for SPT)
	const totalVal = isSpt
		? (stats?.revenueByExamType?.reduce((sum, item) => sum + item.count, 0) || 0)
		: (stats?.revenueByExamType?.reduce((sum, item) => sum + item.revenue, 0) || 0)

	// Prepare data for pie chart with percentages, sorted by count (most requested first)
	const pieData =
		stats?.revenueByExamType
			?.slice()
			.sort((a, b) => b.count - a.count)
			.map((item, index) => ({
				...item,
				percentage: totalVal > 0 ? ((isSpt ? item.count : item.revenue) / totalVal) * 100 : 0,
				color: getExamTypeColor(index),
			})) || []

	// Always show top 3
	const displayedData = pieData.slice(0, 3)

	if (isLoading) {
		return (
			<Card 
				className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg h-full cursor-pointer"
				onClick={onClick}
			>
				<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
					<h3 className="flex items-center justify-between text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 md:mb-6">
						Tipos de Exámenes Más Solicitados{' '}
						<Tooltip>
							<TooltipTrigger>
								<Info className="size-4" />
							</TooltipTrigger>
							<TooltipContent>
								<p>{isSpt ? 'En esta estadística puedes ver los casos más frecuentes por tipo de examen.' : 'En esta estadística puedes ver las ganancias totales por tipo de examen.'}</p>
							</TooltipContent>
						</Tooltip>
					</h3>
					<div className="flex items-center justify-center h-48 sm:h-56">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
					</div>
				</div>
			</Card>
		)
	}

	return (
		<Card 
			className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg h-full cursor-pointer"
			onClick={onClick}
		>
			<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
				<h3 className="flex items-center justify-between text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 md:mb-6">
					Exámenes Más Solicitados{' '}
					<Tooltip>
						<TooltipTrigger>
							<Info className="size-4" />
						</TooltipTrigger>
						<TooltipContent>
							<p>{isSpt ? 'En esta estadística puedes ver los casos más frecuentes por tipo de examen.' : 'En esta estadística puedes ver las ganancias totales por tipo de examen.'}</p>
						</TooltipContent>
					</Tooltip>
				</h3>

				{pieData.length > 0 ? (
					<div className="w-full lg:grid grid-cols-2 gap-4 justify-center items-center">
						{/* Pie Chart */}
						<div className="h-48 sm:h-56 relative">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={displayedData}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={false} // Sin porcentajes dentro del donut
										outerRadius={70}
										innerRadius={40} // Esto crea el efecto donut
										fill="#8884d8"
										dataKey="percentage"
										strokeWidth={0} // Sin borde blanco
										strokeLinecap="round" // Bordes redondeados
										paddingAngle={0} // Espacio adicional entre segmentos
									>
										{displayedData.map((entry, index) => {
											// Find the original index in pieData for hover state
											const originalIndex = pieData.findIndex(item => item.examType === entry.examType)
											return (
												<Cell
													key={`cell-${index}`}
													fill={entry.color}
													className="cursor-pointer"
													strokeWidth={0}
													style={{
														opacity: hoveredIndex === originalIndex || hoveredIndex === null ? 1 : 0.6,
														filter: hoveredIndex === originalIndex ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none',
														transform: hoveredIndex === originalIndex ? 'scale(1.05)' : 'scale(1)',
														transformOrigin: 'center',
														transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
													}}
													onMouseEnter={() => setHoveredIndex(originalIndex)}
													onMouseLeave={() => setHoveredIndex(null)}
												/>
											)
										})}
									</Pie>
								</PieChart>
							</ResponsiveContainer>

							{/* Total en el centro del donut */}
							<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
								<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border border-input rounded-full size-24 sm:size-28 flex flex-col items-center justify-center">
									<p className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">
										{isSpt ? formatNumber(totalVal) : formatCurrency(totalVal)}
									</p>
									<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{isSpt ? 'Casos' : 'Total del Mes'}</p>
								</div>
							</div>
						</div>

						{/* Leyenda - compacta como Distribución por Sede */}
						<div className="flex flex-col">
							{displayedData.map((entry, index) => {
								const originalIndex = pieData.findIndex(item => item.examType === entry.examType)
								return (
									<div
										key={entry.examType}
										className={`flex items-center justify-between transition-all duration-300 cursor-pointer p-2 rounded-lg ${
											hoveredIndex === originalIndex ? 'scale-105' : ''
										}`}
										onMouseEnter={() => setHoveredIndex(originalIndex)}
										onMouseLeave={() => setHoveredIndex(null)}
									>
										<div className="flex items-center gap-2">
											<div
												className={`w-3 h-3 rounded-full transition-all duration-300 shrink-0 ${
													hoveredIndex === originalIndex ? 'scale-125' : ''
												}`}
												style={{ backgroundColor: entry.color }}
											/>
											<span
												className={`text-sm transition-all duration-300 ${
													hoveredIndex === originalIndex
														? 'text-gray-900 dark:text-gray-100 font-medium'
														: 'text-gray-600 dark:text-gray-400'
												}`}
											>
												{entry.examType}
											</span>
										</div>
										<span
											className={`text-sm transition-all duration-300 ${
												hoveredIndex === originalIndex
													? 'text-gray-900 dark:text-gray-100 font-semibold'
													: 'text-gray-700 dark:text-gray-300 font-medium'
											}`}
										>
											{Math.round(entry.percentage)}% ({isSpt ? formatNumber(entry.count) : formatCurrency(entry.revenue)})
										</span>
									</div>
								)
							})}
						</div>
					</div>
				) : (
					<div className="flex items-center justify-center h-48 sm:h-56 text-gray-500 dark:text-gray-400">
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
