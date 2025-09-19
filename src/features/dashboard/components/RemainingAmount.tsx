import React from 'react'
import { DollarSign, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { Card } from '@shared/components/ui/card'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'

const RemainingAmount: React.FC = () => {
	const { data: stats, isLoading } = useDashboardStats()

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('es-VE', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount)
	}

	// Calculate pending payments percentage
	const pendingPaymentsPercentage = stats?.totalRevenue ? (stats.pendingPayments / stats.totalRevenue) * 100 : 0

	return (
		<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg h-full">
			<div className="bg-white dark:bg-background rounded-xl p-3 flex flex-col h-full">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
					<h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-0 flex items-center gap-2">
						<AlertCircle className="w-5 h-5 text-red-500" />
						Casos por Cobrar
					</h3>
					<Tooltip>
						<TooltipTrigger>
							<Info className="size-4" />
						</TooltipTrigger>
						<TooltipContent>
							<p>
								Esta estadistica refleja el porcentaje de ingresos pendientes de pago y el numero de casos incompletos.
							</p>
						</TooltipContent>
					</Tooltip>
				</div>

				<div className="overflow-hidden flex-1 flex flex-col">
					{isLoading ? (
						<div className="flex items-center justify-center h-full">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
						</div>
					) : (
						<div className="flex-1 flex flex-col">
							{/* Summary Cards */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
								{/* Amount Card */}
								<div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-3 border border-red-200 dark:border-red-800/30 hover:scale-[1.01] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-center">
									<div className="flex flex-col items-center text-center mb-2">
										<div className="p-2 bg-red-500 rounded-lg mb-2">
											<DollarSign className="w-5 h-5 text-white" />
										</div>
										<div>
											<p className="text-sm text-red-700 dark:text-red-300">Monto por Cobrar</p>
											<p className="text-xl font-bold text-red-800 dark:text-red-200">
												{formatCurrency(stats?.pendingPayments || 0)}
											</p>
										</div>
									</div>
									<div className="w-full bg-red-200 dark:bg-red-800/50 rounded-full h-2.5">
										<div
											className="bg-red-500 h-2.5 rounded-full flex items-center justify-end pr-2"
											style={{ width: `${Math.min(pendingPaymentsPercentage, 100)}%` }}
										>
											{pendingPaymentsPercentage > 15 && (
												<span className="text-xs text-white font-medium">{Math.round(pendingPaymentsPercentage)}%</span>
											)}
										</div>
									</div>
									{pendingPaymentsPercentage <= 15 && (
										<div className="text-xs text-red-700 dark:text-red-300 mt-1 text-center">
											{Math.round(pendingPaymentsPercentage)}% del total de ingresos
										</div>
									)}
								</div>

								{/* Cases Card */}
								<div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-3 border border-orange-200 dark:border-orange-800/30 hover:scale-[1.01] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-center">
									<div className="flex flex-col items-center text-center mb-2">
										<div className="p-2 bg-orange-500 rounded-lg mb-2">
											<AlertTriangle className="w-5 h-5 text-white" />
										</div>
										<div>
											<p className="text-sm text-orange-700 dark:text-orange-300">Casos Incompletos</p>
											<p className="text-xl font-bold text-orange-800 dark:text-orange-200">
												{stats?.incompleteCases || 0}
											</p>
										</div>
									</div>
									<div className="w-full bg-orange-200 dark:bg-orange-800/50 rounded-full h-2.5">
										<div
											className="bg-orange-500 h-2.5 rounded-full flex items-center justify-end pr-2"
											style={{
												width: `${stats?.totalCases ? (stats.incompleteCases / stats.totalCases) * 100 : 0}%`,
											}}
										>
											{stats?.totalCases && (stats.incompleteCases / stats.totalCases) * 100 > 15 && (
												<span className="text-xs text-white font-medium">
													{Math.round((stats.incompleteCases / stats.totalCases) * 100)}%
												</span>
											)}
										</div>
									</div>
									{stats?.totalCases && (stats.incompleteCases / stats.totalCases) * 100 <= 15 && (
										<div className="text-xs text-orange-700 dark:text-orange-300 mt-1 text-center">
											{Math.round((stats.incompleteCases / stats.totalCases) * 100)}% del total de casos
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</Card>
	)
}

export default RemainingAmount
