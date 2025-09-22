import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@shared/utils/number-utils'

interface PieChartData {
	branch: string
	revenue: number
	percentage: number
}

interface CustomPieChartProps {
	data: PieChartData[]
	total: number
	isLoading?: boolean
}

// Colores de las sedes según branch-badge.tsx
const COLORS = [
	'#db2777', // STX - Pink
	'#9333ea', // PMG - Purple
	'#22c55e', // MCY - Verde
	'#eab308', // CPC - Yellow
	'#3b82f6', // CNX - Blue
	'#6B7280', // Default - Gris
]

export const CustomPieChart: React.FC<CustomPieChartProps> = ({ data, total, isLoading }) => {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

	// formatCurrency is now imported from number-utils

	// Función para obtener el color según el nombre de la sede
	const getBranchColor = (branchName: string) => {
		const branchMap: Record<string, string> = {
			STX: COLORS[0], // Pink
			PMG: COLORS[1], // Purple
			MCY: COLORS[2], // Verde
			CPC: COLORS[3], // Yellow
			CNX: COLORS[4], // Blue
		}

		// Buscar por código o nombre completo
		const upperBranch = branchName.toUpperCase()
		return branchMap[upperBranch] || branchMap[upperBranch.substring(0, 3)] || COLORS[5] // Default gray
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		)
	}

	return (
		<div className="w-full lg:grid grid-cols-2 gap-4 justify-center items-center">
			{/* Donut Chart */}
			<div className="h-64 relative">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={data}
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
							{data.map((entry, index) => (
								<Cell
									key={`cell-${index}`}
									fill={getBranchColor(entry.branch)}
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
						<p className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">{formatCurrency(total)}</p>
						<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total del Mes</p>
					</div>
				</div>
			</div>

			{/* Leyenda personalizada - Estilo original del SVG */}
			<div className="flex flex-col">
				{data.map((entry, index) => (
					<div
						key={entry.branch}
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
								style={{ backgroundColor: getBranchColor(entry.branch) }}
							/>
							<span
								className={`text-sm transition-all duration-300 ${
									hoveredIndex === index
										? 'text-gray-900 dark:text-gray-100 font-medium'
										: 'text-gray-600 dark:text-gray-400'
								}`}
							>
								{entry.branch}
							</span>
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
	)
}
