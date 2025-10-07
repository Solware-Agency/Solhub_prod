import React, { useState } from 'react'
import { Card } from '@shared/components/ui/card'
import { Building } from 'lucide-react'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { useBreakpoint } from '@shared/components/ui/media-query'
import { formatCurrency } from '@shared/utils/number-utils'

interface BranchRevenueReportProps {
	startDate?: Date
	endDate?: Date
}

const BranchRevenueReport: React.FC<BranchRevenueReportProps> = ({ startDate, endDate }) => {
	const { data: stats, isLoading } = useDashboardStats(startDate, endDate)
	const [hoveredBranchIndex, setHoveredBranchIndex] = useState<number | null>(null)
	const isDesktop = useBreakpoint('lg')

	// formatCurrency is now imported from number-utils

	const getBranchColor = (index: number) => {
		const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
		return colors[index % colors.length]
	}

	return (
		<Card className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg h-full">
			<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 overflow-hidden h-full flex flex-col">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4">
					<h3 className="text-sm sm:text-base font-bold text-gray-700 dark:text-gray-300 mb-1 sm:mb-0 flex items-center gap-2">
						<Building className="w-4 h-4 text-blue-500" />
						Ingreso por Sede
					</h3>
				</div>

				<div className="flex items-center justify-center mb-3 sm:mb-4 flex-1">
					<div className="relative size-32 sm:size-36">
						<svg className="size-full -rotate-90" viewBox="0 0 36 36">
							<circle
								cx="18"
								cy="18"
								r="14"
								fill="none"
								className="stroke-current text-gray-200 dark:text-neutral-700"
								strokeWidth="4"
							></circle>
							{isLoading
								? null
								: stats?.revenueByBranch.map((branch, index) => {
										const offset = stats.revenueByBranch.slice(0, index).reduce((sum, b) => sum + b.percentage, 0)
										return (
											<circle
												key={branch.branch}
												cx="18"
												cy="18"
												r="14"
												fill="none"
												stroke={getBranchColor(index)}
												strokeWidth={hoveredBranchIndex === index ? '5' : '4'}
												strokeDasharray={`${branch.percentage} ${100 - branch.percentage}`}
												strokeDashoffset={-offset}
												strokeLinecap="butt"
												onMouseEnter={() => setHoveredBranchIndex(index)}
												onMouseLeave={() => setHoveredBranchIndex(null)}
												style={{
													cursor: 'pointer',
													filter:
														hoveredBranchIndex === index ? `drop-shadow(0 0 3px ${getBranchColor(index)})` : 'none',
												}}
											></circle>
										)
								  })}
						</svg>
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="text-center">
								<p className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">
									{isLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
								</p>
								<p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
							</div>
						</div>
					</div>
				</div>

				<div className="w-full flex-1">
					{isDesktop ? (
						<table className="w-full min-w-full">
							<thead>
								<tr className="border-b border-gray-200 dark:border-gray-700">
									<th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium text-xs">Sede</th>
									<th className="text-center py-2 text-gray-600 dark:text-gray-400 font-medium text-xs">%</th>
									<th className="text-right py-2 text-gray-600 dark:text-gray-400 font-medium text-xs">Monto</th>
								</tr>
							</thead>
							<tbody>
								{isLoading ? (
									<tr>
										<td colSpan={3} className="py-4 text-center">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
										</td>
									</tr>
								) : stats?.revenueByBranch && stats.revenueByBranch.length > 0 ? (
									stats.revenueByBranch.map((branch, index) => (
										<tr
											key={index}
											className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-transform duration-300"
											onMouseEnter={() => setHoveredBranchIndex(index)}
											onMouseLeave={() => setHoveredBranchIndex(null)}
											style={{
												cursor: 'pointer',
											}}
										>
											<td className="py-2 px-2">
												<div className="flex items-center gap-1.5">
													<div
														className={`w-2 h-2 rounded-full ${hoveredBranchIndex === index ? 'animate-pulse' : ''}`}
														style={{ backgroundColor: getBranchColor(index) }}
													></div>
													<p className="font-medium text-gray-700 dark:text-gray-300 text-xs">{branch.branch}</p>
												</div>
											</td>
											<td className="py-2 text-center">
												<span className="text-xs font-medium text-gray-700 dark:text-gray-300">
													{branch.percentage.toFixed(1)}%
												</span>
											</td>
											<td className="py-2 text-right pr-2">
												<p className="text-xs font-bold text-gray-700 dark:text-gray-300">
													{formatCurrency(branch.revenue)}
												</p>
												<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-0.5">
													<div
														className="h-1 rounded-full transition-transform duration-300"
														style={{
															backgroundColor: getBranchColor(index),
															width: `${
																stats.revenueByBranch.length > 0
																	? (branch.revenue / Math.max(...stats.revenueByBranch.map((b) => b.revenue))) * 100
																	: 0
															}%`,
															filter: hoveredBranchIndex === index ? 'brightness(1.2)' : 'brightness(1)',
														}}
													></div>
												</div>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={3} className="py-4 text-center">
											<div className="text-gray-500 dark:text-gray-400">
												<Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
												<p className="text-sm font-medium">No hay datos</p>
											</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					) : (
						// Mobile card view
						<div className="space-y-2 w-full">
							{isLoading ? (
								<div className="animate-pulse space-y-2">
									{[1, 2, 3].map((i) => (
										<div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
									))}
								</div>
							) : stats?.revenueByBranch && stats.revenueByBranch.length > 0 ? (
								stats.revenueByBranch.map((branch, index) => (
									<div
										key={index}
										className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 w-full"
										onMouseEnter={() => setHoveredBranchIndex(index)}
										onMouseLeave={() => setHoveredBranchIndex(null)}
									>
										<div className="flex items-center justify-between mb-1">
											<div className="flex items-center gap-1.5">
												<div
													className={`w-2 h-2 rounded-full ${hoveredBranchIndex === index ? 'animate-pulse' : ''}`}
													style={{ backgroundColor: getBranchColor(index) }}
												></div>
												<p className="font-medium text-gray-700 dark:text-gray-300 text-xs">{branch.branch}</p>
											</div>
											<div className="flex flex-col items-end">
												<p className="text-xs font-bold text-gray-700 dark:text-gray-300">
													{formatCurrency(branch.revenue)}
												</p>
												<p className="text-xs text-gray-500 dark:text-gray-400">{branch.percentage.toFixed(1)}%</p>
											</div>
										</div>
										<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
											<div
												className="h-1 rounded-full"
												style={{
													backgroundColor: getBranchColor(index),
													width: `${
														stats.revenueByBranch.length > 0
															? (branch.revenue / Math.max(...stats.revenueByBranch.map((b) => b.revenue))) * 100
															: 0
													}%`,
												}}
											></div>
										</div>
									</div>
								))
							) : (
								<div className="text-center py-4">
									<Building className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
									<p className="text-xs text-gray-500 dark:text-gray-400">No hay datos</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</Card>
	)
}

export default BranchRevenueReport
