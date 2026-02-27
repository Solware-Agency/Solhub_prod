import React, { useState, Suspense } from 'react'
import {
	Users,
	DollarSign,
	CheckCircle2,
	ArrowUpRight,
	AlertTriangle,
	Clock,
	Info,
	Stethoscope,
	Layers,
} from 'lucide-react'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { YearSelector } from '@shared/components/ui/year-selector'
import DateRangeSelector from '@shared/components/ui/date-range-selector'
import { useDateRange } from '@app/providers/DateRangeContext'
import { useLaboratory } from '@app/providers/LaboratoryContext'
import StatCard from '@shared/components/ui/stat-card'
import { Card } from '@shared/components/ui/card'
import { CustomPieChart } from '@shared/components/ui/custom-pie-chart'
import { CurrencyDonutChart } from '@shared/components/ui/currency-donut-chart'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'
import type { StatType } from '@shared/components/ui/stat-detail-panel'
import { formatCurrency, formatNumber } from '@shared/utils/number-utils'
import { startOfMonth, endOfMonth } from 'date-fns'

// Lazy loaded components
import {
	StatDetailPanel,
	ExamTypePieChart,
	DoctorRevenueReport,
	OriginRevenueReport,
	RemainingAmount,
} from '@shared/components/lazy-components'

// Loading fallback components
const ComponentFallback = () => (
	<div className="flex items-center justify-center h-64">
		<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
	</div>
)

const StatsPage: React.FC = () => {
	const { dateRange, setDateRange, selectedYear, setSelectedYear } = useDateRange()
	const { laboratory } = useLaboratory()
	const { data: stats, isLoading, error } = useDashboardStats(dateRange.start, dateRange.end, selectedYear)
	const isSpt = laboratory?.slug === 'spt'
	const hasMedicalTypeRoles =
		laboratory?.available_roles?.includes('patologo') || laboratory?.available_roles?.includes('citotecno')
	const totalCasesByMedicalType = (stats?.totalCasesWithPathologist || 0) + (stats?.totalCasesWithCitotecno || 0)
	const [selectedStat, setSelectedStat] = useState<StatType | null>(null)
	const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
	const [selectedChart, setSelectedChart] = useState<StatType | null>(null)
	const [isChartModalOpen, setIsChartModalOpen] = useState(false)

	if (error) {
		console.error('Error loading stats:', error)
	}

	// formatCurrency is now imported from number-utils

	const handleMonthBarClick = (monthData: { monthIndex: number }) => {
		// Use the monthIndex to create the correct date and update the date range
		const clickedDate = new Date(selectedYear, monthData.monthIndex, 1)
		setDateRange({
			start: startOfMonth(clickedDate),
			end: endOfMonth(clickedDate),
			mode: 'month',
		})
	}

	const handleYearChange = (year: number) => {
		setSelectedYear(year)
		// Update date range to the same month in the new year
		const newDate = new Date(year, dateRange.start.getMonth(), 1)
		setDateRange({
			start: startOfMonth(newDate),
			end: endOfMonth(newDate),
			mode: 'month',
		})
	}

	const handleStatCardClick = (statType: StatType) => {
		setSelectedStat(statType)
		setIsDetailPanelOpen(true)
	}

	const handleDetailPanelClose = () => {
		setIsDetailPanelOpen(false)
	}

	const handleChartClick = (chartType: StatType) => {
		setSelectedChart(chartType)
		setIsChartModalOpen(true)
	}

	const handleChartModalClose = () => {
		setIsChartModalOpen(false)
		setSelectedChart(null)
	}

	// Calculate some additional metrics
	const completionRate = stats?.totalCases ? (stats.completedCases / stats.totalCases) * 100 : 0

	return (
		<>
			<div>
				<div className="mb-4 sm:mb-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Estadísticas</h2>
							<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full"></div>
						</div>
						<DateRangeSelector value={dateRange} onChange={setDateRange} className="w-full sm:w-auto" />
					</div>
				</div>
				<div
					className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-5 md:mb-6 ${isSpt ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}
				>
					{/* Total Revenue / Casos del Período Card */}
					<StatCard
						title={isSpt ? 'Casos del Período' : 'Ingresos del Período'}
						value={
							isSpt
								? `${isLoading ? '...' : formatNumber(stats?.totalCases || 0)}`
								: `${isLoading ? '...' : formatCurrency(stats?.monthlyRevenue || 0)}`
						}
						description={undefined}
						icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />}
						onClick={() => handleStatCardClick(isSpt ? 'totalCases' : 'totalRevenue')}
						statType={isSpt ? 'totalCases' : 'totalRevenue'}
						isSelected={(isSpt ? selectedStat === 'totalCases' : selectedStat === 'totalRevenue') && isDetailPanelOpen}
					/>

					{/* Active Users Card */}
					<StatCard
						title="Pacientes Nuevos del Período"
						value={`${isLoading ? '...' : formatNumber(stats?.newPatientsThisMonth || 0)}`}
						description={`Total histórico: ${isLoading ? '...' : formatNumber(stats?.uniquePatients || 0)} pacientes`}
						icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />}
						onClick={() => handleStatCardClick('uniquePatients')}
						statType="uniquePatients"
						isSelected={selectedStat === 'uniquePatients' && isDetailPanelOpen}
					/>

					{/* Promedio por Recepcionista - SPT: evita redundancia con Casos del Período */}
					{isSpt && (
						<StatCard
							title="Promedio por Recepcionista"
							value={
								isLoading
									? '...'
									: (() => {
											const count = stats?.casesByReceptionist?.length ?? 0
											const total = stats?.totalCases ?? 0
											const avg = count > 0 ? Math.round(total / count) : 0
											return formatNumber(avg)
										})()
							}
							description={
								stats?.casesByReceptionist?.length
									? `${stats.casesByReceptionist.length} recepcionistas`
									: undefined
							}
							icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />}
							onClick={() => handleStatCardClick('casesByReceptionist')}
							statType="casesByReceptionist"
							isSelected={selectedStat === 'casesByReceptionist' && isDetailPanelOpen}
						/>
					)}

					{!isSpt && (
						<>
							{/* Paid Cases Card */}
							<StatCard
								title="Casos Pagados del Período"
								value={isLoading ? '...' : formatNumber(stats?.completedCases || 0)}
								description={`Total casos del período: ${isLoading ? '...' : formatNumber(stats?.totalCases || 0)}`}
								icon={<CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />}
								trend={{
									value: isLoading ? '...' : `${Math.round(completionRate)}%`,
									icon: <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />,
									positive: true,
								}}
								onClick={() => handleStatCardClick('completedCases')}
								statType="completedCases"
								isSelected={selectedStat === 'completedCases' && isDetailPanelOpen}
							/>

							{/* Incomplete Cases Card */}
							<StatCard
								title="Casos Incompletos del Período"
								value={isLoading ? '...' : formatNumber(stats?.incompleteCases || 0)}
								description={`Pagos pendientes: ${isLoading ? '...' : formatCurrency(stats?.pendingPayments || 0)}`}
								icon={<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />}
								trend={{
									value: 'Pendientes',
									icon: <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />,
									positive: false,
								}}
								onClick={() => handleStatCardClick('incompleteCases')}
								statType="incompleteCases"
								isSelected={selectedStat === 'incompleteCases' && isDetailPanelOpen}
							/>
						</>
					)}
				</div>

				{/* KPI Cards: Recepcionistas / Bloques / Patólogos - Casos por Recepcionista ya está en primera línea para SPT */}
				{(!isSpt || hasMedicalTypeRoles) && (
					<div
						className={`grid grid-cols-1 gap-3 sm:gap-4 mb-3 sm:mb-5 md:mb-6 ${isSpt ? 'sm:grid-cols-1' : 'sm:grid-cols-3'}`}
					>
						{!isSpt && (
							<StatCard
								title="Casos por Recepcionista"
								value={isLoading ? '...' : `Total ${formatNumber(stats?.totalCases || 0)}`}
								icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />}
								onClick={() => handleStatCardClick('casesByReceptionist')}
								statType="casesByReceptionist"
								isSelected={selectedStat === 'casesByReceptionist' && isDetailPanelOpen}
							/>
						)}

						{!isSpt && (
							<StatCard
								title="Bloques del período"
								value={isLoading ? '...' : formatNumber(stats?.totalBlocks ?? 0)}
								icon={<Layers className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-400" />}
								onClick={() => handleStatCardClick('totalBlocks')}
								statType="totalBlocks"
								isSelected={selectedStat === 'totalBlocks' && isDetailPanelOpen}
							/>
						)}

						{hasMedicalTypeRoles && (
							<StatCard
								title="Casos por tipo de médico"
								value={isLoading ? '...' : `Total ${formatNumber(totalCasesByMedicalType)}`}
								icon={<Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />}
								onClick={() => handleStatCardClick('casesByMedicalType')}
								statType="casesByMedicalType"
								isSelected={selectedStat === 'casesByMedicalType' && isDetailPanelOpen}
							/>
						)}
					</div>
				)}

				{/* Charts Section */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5 mb-3 sm:mb-5 md:mb-6">
					{/* 12-Month Revenue Trend Chart with Interactive Bars */}
					<Card
						className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer"
						onClick={() => handleChartClick('revenueTrend')}
					>
						<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4">
							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-3">
								<h3 className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-0">
									{isSpt ? 'Tendencia de Casos' : 'Tendencia de Ingresos'}
								</h3>
								<div className="flex items-center gap-2 sm:gap-4">
									<YearSelector
										selectedYear={selectedYear}
										onYearChange={handleYearChange}
										minYear={2020}
										maxYear={new Date().getFullYear() + 2}
									/>
									<Tooltip>
										<TooltipTrigger>
											<Info className="size-4 text-gray-600 dark:text-gray-400" />
										</TooltipTrigger>
										<TooltipContent>
											<p>
												{isSpt
													? 'En esta estadística puedes dar click sobre la barra del mes al que quieres filtrar y el panel se adaptará y te mostrará los casos de ese mes.'
													: 'En esta estadística puedes dar click sobre la barra del mes al que quieres filtrar y el panel se adaptará y te mostrará los ingresos de ese mes.'}
											</p>
										</TooltipContent>
									</Tooltip>
								</div>
							</div>
							<div className="relative h-24 sm:h-32 md:h-40 flex items-end justify-between gap-0.5 sm:gap-1 md:gap-2">
								{isLoading ? (
									<div className="flex items-center justify-center w-full h-full">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
									</div>
								) : (
									stats?.salesTrendByMonth.map((month) => {
										const maxRevenue = Math.max(...(stats?.salesTrendByMonth.map((m) => m.revenue) || [1]))
										const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
										const isSelected = month.isSelected
										return (
											<div
												key={month.month}
												className={`flex-1 rounded-t-sm transition-transform duration-200 cursor-pointer hover:translate-y-[-4px] ${
													isSelected
														? 'bg-linear-to-t from-purple-600 to-purple-400 shadow-lg'
														: 'bg-linear-to-t from-blue-500 to-blue-300 hover:from-blue-600 hover:to-blue-400'
												}`}
												style={{ height: `${Math.max(height, 20)}%` }} // FIXED: Increased minimum height for better UX
												title={`${month.month}: ${isSpt ? formatNumber(month.revenue) : formatCurrency(month.revenue)}`}
												onClick={() => handleMonthBarClick(month)}
											></div>
										)
									})
								)}
							</div>
							<div className="flex justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2">
								{/* FIXED: Force Spanish month labels regardless of system language */}
								{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((month) => (
									<span key={month} className="shrink-0">
										{month}
									</span>
								))}
							</div>
						</div>
					</Card>

					{/* Service Distribution by Branch */}
					<Card
						className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer"
						onClick={() => handleChartClick('branchDistribution')}
					>
						<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
							<h3 className="flex items-center justify-between text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 md:mb-6">
								Distribución por Sede{' '}
								<Tooltip>
									<TooltipTrigger>
										<Info className="size-4" />
									</TooltipTrigger>
									<TooltipContent>
										<p>
											{isSpt
												? 'Esta estadística refleja el porcentaje de casos por sede en el período seleccionado.'
												: 'Esta estadística refleja el porcentaje de ingresos por sede en el período seleccionado.'}
										</p>
									</TooltipContent>
								</Tooltip>
							</h3>
							{/* Donut Chart con Recharts */}
							<CustomPieChart
								data={stats?.revenueByBranch || []}
								total={isSpt ? stats?.totalCases || 0 : stats?.monthlyRevenue || 0}
								isLoading={isLoading}
								valueMode={isSpt ? 'cases' : 'revenue'}
							/>
						</div>
					</Card>
				</div>

				{/* Charts Grid + Reports - SPT: Exámenes más solicitados y Casos por médico en misma línea */}
				<div className={`grid grid-cols-1 gap-4 mb-6 ${isSpt ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
					{/* Exam Type Pie Chart - Exámenes más solicitados */}
					<Suspense fallback={<ComponentFallback />}>
						<ExamTypePieChart
							startDate={dateRange.start}
							endDate={dateRange.end}
							onClick={() => handleChartClick('examTypes')}
							isSpt={isSpt}
						/>
					</Suspense>

					{/* Doctor Revenue Report - Casos por médico tratante - en misma línea que Exámenes para SPT */}
					{isSpt && (
						<Suspense fallback={<ComponentFallback />}>
							<DoctorRevenueReport
								startDate={dateRange.start}
								endDate={dateRange.end}
								onClick={() => handleChartClick('doctorRevenue')}
								isSpt={isSpt}
							/>
						</Suspense>
					)}

					{/* Currency Distribution / Completados vs Pendientes (solo no-SPT) */}
					{!isSpt && (
						<>
							<Card
								className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg cursor-pointer"
								onClick={() => handleChartClick('currencyDistribution')}
							>
								<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
									<h3 className="flex items-center justify-between text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 md:mb-6">
										Distribución por Moneda{' '}
										<Tooltip>
											<TooltipTrigger>
												<Info className="size-4" />
											</TooltipTrigger>
											<TooltipContent>
												<p>
													Esta estadística refleja la distribución de ingresos entre Bolívares y Dólares en el período
													seleccionado.
												</p>
											</TooltipContent>
										</Tooltip>
									</h3>
									<CurrencyDonutChart
										bolivaresTotal={stats?.monthlyRevenueBolivares || 0}
										dollarsTotal={stats?.monthlyRevenueDollars || 0}
										isLoading={isLoading}
									/>
								</div>
							</Card>
							{/* Remaining Amount / Casos Pendientes */}
							<Suspense fallback={<ComponentFallback />}>
								<RemainingAmount
									startDate={dateRange.start}
									endDate={dateRange.end}
									onClick={() => handleChartClick('remainingAmount')}
									isSpt={false}
								/>
							</Suspense>
						</>
					)}
				</div>

				{/* Additional Reports Grid - solo no-SPT (Origin + Doctor); SPT ya tiene Doctor en la línea anterior */}
				{!isSpt && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<Suspense fallback={<ComponentFallback />}>
							<OriginRevenueReport
								startDate={dateRange.start}
								endDate={dateRange.end}
								onClick={() => handleChartClick('originRevenue')}
								isSpt={isSpt}
							/>
						</Suspense>

						<Suspense fallback={<ComponentFallback />}>
							<DoctorRevenueReport
								startDate={dateRange.start}
								endDate={dateRange.end}
								onClick={() => handleChartClick('doctorRevenue')}
								isSpt={isSpt}
							/>
						</Suspense>
					</div>
				)}
			</div>

			{/* Stat Detail Panel for KPI Cards */}
			<Suspense fallback={<ComponentFallback />}>
				<StatDetailPanel
					isOpen={isDetailPanelOpen}
					onClose={handleDetailPanelClose}
					statType={selectedStat || 'totalRevenue'}
					stats={stats}
					isLoading={isLoading}
					isSpt={laboratory?.slug === 'spt'}
				/>
			</Suspense>

			{/* Stat Detail Panel for Charts */}
			<Suspense fallback={<ComponentFallback />}>
				<StatDetailPanel
					isOpen={isChartModalOpen}
					onClose={handleChartModalClose}
					statType={selectedChart || 'revenueTrend'}
					stats={stats}
					isLoading={isLoading}
					isSpt={laboratory?.slug === 'spt'}
				/>
			</Suspense>
		</>
	)
}

export default StatsPage
