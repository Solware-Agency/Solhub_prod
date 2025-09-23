import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrencyWithSymbol } from '@shared/utils/number-utils'

interface CurrencyDonutChartProps {
	bolivaresTotal: number
	dollarsTotal: number
	isLoading?: boolean
}

// Colores para las monedas
const COLORS = {
	bolivares: '#10b981', // green-500
	dollars: '#3b82f6', // blue-500
}

// Componente de tooltip personalizado
const CustomTooltip = ({
	active,
	payload,
}: {
	active?: boolean
	payload?: Array<{ payload: { name: string; value: number; currency: string } }>
}) => {
	if (active && payload && payload.length) {
		const data = payload[0].payload
		return (
			<div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
				<p className="font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Monto: {formatCurrencyWithSymbol(data.value, data.currency)}
				</p>
			</div>
		)
	}
	return null
}

export const CurrencyDonutChart: React.FC<CurrencyDonutChartProps> = ({
	bolivaresTotal,
	dollarsTotal,
	isLoading = false,
}) => {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

	const data = [
		{
			name: 'Bolívares',
			value: bolivaresTotal,
			currency: 'VES ',
			color: COLORS.bolivares,
			percentage: 0, // Se calculará después
		},
		{
			name: 'Dólares',
			value: dollarsTotal,
			currency: 'USD ',
			color: COLORS.dollars,
			percentage: 0, // Se calculará después
		},
	]

	const totalAmount = bolivaresTotal + dollarsTotal

	// Calcular porcentajes
	const dataWithPercentages = data.map((item) => ({
		...item,
		percentage: totalAmount > 0 ? (item.value / totalAmount) * 100 : 0,
	}))

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		)
	}

	// Si no hay datos, mostrar mensaje
	if (totalAmount === 0) {
		return (
			<div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
				<div className="text-center">
					<p className="text-lg font-medium">Sin datos disponibles</p>
					<p className="text-sm">No hay ingresos registrados para este período</p>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full lg:grid grid-cols-1 gap-4 justify-center items-center">
			{/* Pie Chart */}
			<div className="h-64 relative">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={dataWithPercentages}
							cx="50%"
							cy="50%"
							labelLine={false}
							label={false} // Sin porcentajes dentro del pie
							outerRadius={90}
							innerRadius={0} // Esto crea el efecto pie chart (sin agujero)
							fill="#8884d8"
							dataKey="percentage"
							strokeWidth={0} // Sin borde blanco
							strokeLinecap="round" // Bordes redondeados
							paddingAngle={0} // Espacio adicional entre segmentos
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
						<Tooltip content={<CustomTooltip />} />
					</PieChart>
				</ResponsiveContainer>
			</div>

			{/* Leyenda personalizada - Estilo original del SVG */}
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
							{Math.round(entry.percentage)}% ({formatCurrencyWithSymbol(entry.value, entry.currency)})
						</span>
					</div>
				))}
			</div>
		</div>
	)
}
