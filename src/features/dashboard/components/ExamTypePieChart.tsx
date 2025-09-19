import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@shared/components/ui/card'
import { Stethoscope, Activity, FlaskRound, Info } from 'lucide-react'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'
const ExamTypePieChart: React.FC = () => {
	const { data: stats, isLoading } = useDashboardStats()
	const [hoveredSegmentIndex, setHoveredSegmentIndex] = useState<number | null>(null)
	const [chartSize, setChartSize] = useState({ width: 0, height: 0 })
	const containerRef = useRef<HTMLDivElement>(null)

	// Update chart size based on container size
	useEffect(() => {
		const updateSize = () => {
			if (containerRef.current) {
				const { width } = containerRef.current.getBoundingClientRect()
				const size = Math.min(width * 0.7, 220) // Limit max size
				setChartSize({ width: size, height: size })
			}
		}

		updateSize()
		window.addEventListener('resize', updateSize)
		return () => window.removeEventListener('resize', updateSize)
	}, [])

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('es-VE', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount)
	}

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

	// Prepare data for pie chart
	const pieData =
		stats?.revenueByExamType?.map((item, index) => ({
			...item,
			percentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0,
			color: getExamTypeColor(index),
			startAngle:
				index === 0
					? 0
					: stats.revenueByExamType
							.slice(0, index)
							.reduce((sum, i) => sum + (totalRevenue > 0 ? (i.revenue / totalRevenue) * 360 : 0), 0),
			endAngle: stats.revenueByExamType
				.slice(0, index + 1)
				.reduce((sum, i) => sum + (totalRevenue > 0 ? (i.revenue / totalRevenue) * 360 : 0), 0),
		})) || []

	// SVG path for pie slice
	const createPieSlice = (startAngle: number, endAngle: number, radius: number, centerX: number, centerY: number) => {
		const start = {
			x: centerX + radius * Math.cos((startAngle - 90) * (Math.PI / 180)),
			y: centerY + radius * Math.sin((startAngle - 90) * (Math.PI / 180)),
		}
		const end = {
			x: centerX + radius * Math.cos((endAngle - 90) * (Math.PI / 180)),
			y: centerY + radius * Math.sin((endAngle - 90) * (Math.PI / 180)),
		}

		const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

		return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
	}

	return (
		<Card className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg h-full">
			<div className="bg-white dark:bg-background rounded-xl p-3 overflow-hidden flex flex-col h-full">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
					<h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-0">
						Tipos de Exámenes Más Solicitados{' '}
					</h3>
					<Tooltip>
						<TooltipTrigger>
							<Info className="size-4" />
						</TooltipTrigger>
						<TooltipContent>
							<p>En esta estadistica puedes ver las ganancias totales por tipo de examen.</p>
						</TooltipContent>
					</Tooltip>
				</div>

				<div className="flex flex-col lg:flex-row items-center gap-3 flex-1">
					{/* Pie Chart */}
					<div
						ref={containerRef}
						className="relative flex items-center justify-center w-full lg:w-1/2 flex-shrink-0 p-2"
					>
						{isLoading ? (
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
						) : pieData.length > 0 ? (
							<div className="relative">
								<svg
									width={chartSize.width}
									height={chartSize.height}
									viewBox={`-10 -10 ${chartSize.width + 20} ${chartSize.height + 20}`}
									className="transform -rotate-90"
								>
									{pieData.map((item, index) => {
										const radius = (chartSize.width - 20) / 2
										const centerX = chartSize.width / 2
										const centerY = chartSize.height / 2
										const isHovered = hoveredSegmentIndex === index

										return (
											<path
												key={index}
												d={createPieSlice(
													item.startAngle,
													item.endAngle,
													radius * (isHovered ? 0.95 : 0.9),
													centerX,
													centerY,
												)}
												fill={item.color}
												stroke="white"
												strokeWidth={isHovered ? 3 : 1}
												onMouseEnter={() => setHoveredSegmentIndex(index)}
												onMouseLeave={() => setHoveredSegmentIndex(null)}
												style={{
													transition: 'all 0.3s ease',
													cursor: 'pointer',
													filter: isHovered ? 'drop-shadow(0 0 5px rgba(0,0,0,0.3))' : 'none',
												}}
											/>
										)
									})}

									{/* Center circle for donut effect */}
									<circle
										cx={chartSize.width / 2}
										cy={chartSize.height / 2}
										r={(chartSize.width - 20) / 4}
										fill="white"
										className="dark:fill-background"
									/>
								</svg>

								{/* Total amount in center - positioned absolutely for better centering */}
								<div className="absolute inset-0 flex flex-col items-center justify-center">
									<p className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">
										{formatCurrency(totalRevenue)}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
								</div>
							</div>
						) : (
							<div className="text-center py-8">
								<Stethoscope className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
								<p className="text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
							</div>
						)}
					</div>

					{/* Legend */}
					<div className="max-w-full lg:w-1/2 space-y-2 lg:mt-0 flex-1 min-h-0">
						{isLoading ? (
							<div className="space-y-2">
								{[1, 2, 3].map((i) => (
									<div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 rounded-lg"></div>
								))}
							</div>
						) : pieData.length > 0 ? (
							<div className="space-y-1.5 max-h-full overflow-y-auto pr-2">
								{pieData.map((item, index) => (
									<div
										key={index}
										className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-transform duration-200 cursor-pointer"
										onMouseEnter={() => setHoveredSegmentIndex(index)}
										onMouseLeave={() => setHoveredSegmentIndex(null)}
									>
										<div className="flex items-center gap-2">
											<div
												className="w-7 h-7 rounded-lg flex items-center justify-center"
												style={{ backgroundColor: item.color }}
											>
												{getExamTypeIcon(item.examType)}
											</div>
											<div>
												<p className="font-medium text-gray-700 dark:text-gray-300 text-sm">{item.examType}</p>
												<div className="flex items-center gap-2">
													<span className="text-xs text-gray-500 dark:text-gray-400">
														{item.count} caso{item.count !== 1 ? 's' : ''}
													</span>
													<span className="text-xs text-gray-500 dark:text-gray-400">
														{Math.round(item.percentage)}%
													</span>
												</div>
											</div>
										</div>
										<p className="text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
											{formatCurrency(item.revenue)}
										</p>
									</div>
								))}
							</div>
						) : null}
					</div>
				</div>
			</div>
		</Card>
	)
}

export default ExamTypePieChart
