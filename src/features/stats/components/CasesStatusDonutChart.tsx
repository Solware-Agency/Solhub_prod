import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatNumber } from '@shared/utils/number-utils'

interface CasesStatusDonutChartProps {
	completedCases: number
	incompleteCases: number
	isLoading?: boolean
}

const COLORS = {
	completed: '#10b981', // green-500
	incomplete: '#f59e0b', // amber-500
}

export const CasesStatusDonutChart: React.FC<CasesStatusDonutChartProps> = ({
	completedCases,
	incompleteCases,
	isLoading = false,
}) => {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

	const total = completedCases + incompleteCases
	const data = [
		{ name: 'Completados', value: completedCases, color: COLORS.completed },
		{ name: 'Pendientes', value: incompleteCases, color: COLORS.incomplete },
	].filter((d) => d.value > 0)

	const dataWithPercentages = data.map((item) => ({
		...item,
		percentage: total > 0 ? (item.value / total) * 100 : 0,
	}))

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		)
	}

	if (total === 0) {
		return (
			<div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
				<div className="text-center">
					<p className="text-lg font-medium">Sin datos disponibles</p>
					<p className="text-sm">No hay casos registrados para este período</p>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full lg:grid grid-cols-1 gap-4 justify-center items-center">
			<div className="h-64 relative">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={dataWithPercentages}
							cx="50%"
							cy="50%"
							labelLine={false}
							label={false}
							outerRadius={90}
							innerRadius={55}
							fill="#8884d8"
							dataKey="percentage"
							strokeWidth={0}
							strokeLinecap="round"
							paddingAngle={0}
						>
							{dataWithPercentages.map((entry, index) => (
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
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border border-input rounded-full size-32 flex flex-col items-center justify-center">
						<p className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">
							{formatNumber(total)}
						</p>
						<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Casos</p>
					</div>
				</div>
			</div>
			<div className="flex flex-col">
				{dataWithPercentages.map((entry, index) => (
					<div
						key={entry.name}
						className={`flex items-center justify-between transition-all duration-300 cursor-pointer p-2 rounded-lg ${
							hoveredIndex === index ? 'scale-105' : ''
						}`}
						onMouseEnter={() => setHoveredIndex(index)}
						onMouseLeave={() => setHoveredIndex(null)}
					>
						<div className="flex items-center gap-2">
							<div
								className={`w-3 h-3 rounded-full transition-all duration-300 ${
									hoveredIndex === index ? 'scale-125' : ''
								}`}
								style={{ backgroundColor: entry.color }}
							/>
							<span
								className={`text-sm transition-all duration-300 ${
									hoveredIndex === index
										? 'text-gray-900 dark:text-gray-100 font-medium'
										: 'text-gray-600 dark:text-gray-400'
								}`}
							>
								{entry.name}
							</span>
						</div>
						<span
							className={`text-sm transition-all duration-300 ${
								hoveredIndex === index
									? 'text-gray-900 dark:text-gray-100 font-semibold'
									: 'text-gray-700 dark:text-gray-300 font-medium'
							}`}
						>
							{Math.round(entry.percentage)}% ({formatNumber(entry.value)})
						</span>
					</div>
				))}
			</div>
		</div>
	)
}
