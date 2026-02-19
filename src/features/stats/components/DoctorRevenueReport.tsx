import React from 'react'
import { Card } from '@shared/components/ui/card'
import { Stethoscope, Info } from 'lucide-react'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { useBreakpoint } from '@shared/components/ui/media-query'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'
import { formatCurrency, formatNumber } from '@shared/utils/number-utils'

interface DoctorRevenueReportProps {
	startDate?: Date
	endDate?: Date
	onClick?: () => void
	isSpt?: boolean
}

const DoctorRevenueReport: React.FC<DoctorRevenueReportProps> = ({ startDate, endDate, onClick, isSpt = false }) => {
	const { data: stats, isLoading } = useDashboardStats(startDate, endDate)
	const isDesktop = useBreakpoint('lg')
	const totalVal = isSpt ? (stats?.totalCases || 0) : (stats?.totalRevenue || 0)
	const maxVal = (key: 'revenue' | 'cases') =>
		stats?.topTreatingDoctors?.length
			? Math.max(...stats.topTreatingDoctors.map((d) => (key === 'cases' ? d.cases : d.revenue)))
			: 0

	// formatCurrency is now imported from number-utils

	return (
		<Card 
			className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg h-full cursor-pointer"
			onClick={onClick}
		>
			<div className="bg-white dark:bg-background rounded-xl p-3 overflow-hidden flex flex-col h-full">
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
							<Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						</div>
						<h3 className="flex items-center justify-between text-lg font-bold text-gray-700 dark:text-gray-300">
							{isSpt ? 'Casos por Médico Tratante' : 'Ingreso por Médico Tratante'}
						</h3>
					</div>
					<Tooltip>
						<TooltipTrigger>
							<Info className="size-4" />
						</TooltipTrigger>
						<TooltipContent>
							<p>
								{isSpt
									? 'Esta estadística refleja los 5 médicos tratantes con más casos en el período.'
									: 'Esta estadistica refleja una lista de los 5 medicos tratantes con mas frecuencia de casos en Conspat.'}
							</p>
						</TooltipContent>
					</Tooltip>
				</div>

				<div className="overflow-hidden flex-1">
					{isLoading ? (
						<div className="flex items-center justify-center h-full">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
						</div>
					) : stats?.topTreatingDoctors && stats.topTreatingDoctors.length > 0 ? (
						isDesktop ? (
							<div className="flex-1">
								<table className="w-full">
									<thead className="sticky top-0 bg-white dark:bg-background z-10">
										<tr className="border-b border-gray-200 dark:border-gray-700">
											<th className="text-left py-2 px-1 text-gray-600 dark:text-gray-400 font-semibold text-xs">
												Médico Tratante
											</th>
											<th className="text-center py-2 px-1 text-gray-600 dark:text-gray-400 font-semibold text-xs">
												Casos
											</th>
											<th className="text-center py-2 px-1 text-gray-600 dark:text-gray-400 font-semibold text-xs">
												% del Total
											</th>
											{!isSpt && (
												<th className="text-right py-2 px-1 text-gray-600 dark:text-gray-400 font-semibold text-xs">
													Monto Total
												</th>
											)}
										</tr>
									</thead>
									<tbody>
										{stats.topTreatingDoctors.map((doctor, index) => (
											<tr
												key={index}
												className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
											>
												<td className="py-2 px-1">
													<p className="font-semibold text-gray-700 dark:text-gray-300 text-xs truncate">
														{doctor.doctor}
													</p>
												</td>
												<td className="py-2 px-1 text-center">
													<span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
														{doctor.cases}
													</span>
												</td>
												<td className="py-2 px-1 text-center">
													<span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
														{Math.round(totalVal > 0 ? ((isSpt ? doctor.cases : doctor.revenue) / totalVal) * 100 : 0)}%
													</span>
												</td>
												{!isSpt && (
												<td className="py-2 px-1 text-right">
													<div className="flex flex-col items-end gap-1">
														<p className="text-xs font-bold text-gray-700 dark:text-gray-300">
															{formatCurrency(doctor.revenue)}
														</p>
														<div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
															<div
																className="bg-blue-500 h-1 rounded-full transition-all duration-300"
																style={{
																	width: `${maxVal('revenue') > 0 ? (doctor.revenue / maxVal('revenue')) * 100 : 0}%`,
																}}
															></div>
														</div>
													</div>
												</td>
												)}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							// Mobile card view
							<div className="space-y-3">
								{stats.topTreatingDoctors.map((doctor, index) => (
									<div
										key={index}
										className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow"
									>
										<div className="flex items-center gap-3 mb-2">
											<div className="flex-1 min-w-0">
												<p className="font-semibold text-gray-700 dark:text-gray-300 text-sm truncate">
													{doctor.doctor}
												</p>
											</div>
											{!isSpt && (
												<p className="text-sm font-bold text-gray-700 dark:text-gray-300">
													{formatCurrency(doctor.revenue)}
												</p>
											)}
										</div>

										<div className="flex items-center justify-between mb-2">
											<span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
												{doctor.cases} caso{doctor.cases !== 1 ? 's' : ''}
											</span>
											<span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
												{Math.round(totalVal > 0 ? ((isSpt ? doctor.cases : doctor.revenue) / totalVal) * 100 : 0)}%
											</span>
										</div>

										<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
											<div
												className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
												style={{
													width: `${maxVal(isSpt ? 'cases' : 'revenue') > 0 ? ((isSpt ? doctor.cases : doctor.revenue) / maxVal(isSpt ? 'cases' : 'revenue')) * 100 : 0}%`,
												}}
											></div>
										</div>
									</div>
								))}
							</div>
						)
					) : (
						<div className="flex flex-col items-center justify-center h-full text-center">
							<div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
								<Stethoscope className="w-8 h-8 text-blue-600 dark:text-blue-400" />
							</div>
							<p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No hay datos de médicos</p>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								No se encontraron registros de médicos tratantes
							</p>
						</div>
					)}
				</div>
			</div>
		</Card>
	)
}

export default DoctorRevenueReport
