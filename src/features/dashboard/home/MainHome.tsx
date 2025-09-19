import EyeTrackingComponent from '@features/dashboard/home/RobotTraking'
import {
	TrendingUp,
	Users,
	DollarSign,
	// ArrowRight,
	BarChart3,
	AlertTriangle,
	Clock,
	Stethoscope,
	Info,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { YearSelector } from '@shared/components/ui/year-selector'
import StatCard from '@shared/components/ui/stat-card'
import { Card } from '@shared/components/ui/card'
import { CustomPieChart } from '@shared/components/ui/custom-pie-chart'
import { useState, Suspense } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'

// Lazy loaded components
import { StatDetailPanel } from '@shared/components/lazy-components'

// Loading fallback for StatDetailPanel
const StatDetailPanelFallback = () => (
	<div className="flex items-center justify-center h-64">
		<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
	</div>
)

function MainHome() {
	const navigate = useNavigate()
	const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
	const { data: stats, isLoading, error } = useDashboardStats(selectedMonth, selectedYear)
	const { profile } = useUserProfile()
	const [selectedStat, setSelectedStat] = useState<any>(null)
	const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)

	if (error) {
		console.error('Error loading dashboard stats:', error)
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('es-VE', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount)
	}

	const handleMonthBarClick = (monthData: { monthIndex: number }) => {
		// FIXED: Use the monthIndex to create the correct date
		const clickedDate = new Date(selectedYear, monthData.monthIndex, 1)
		setSelectedMonth(clickedDate)
	}

	const handleYearChange = (year: number) => {
		setSelectedYear(year)
		// Update selected month to the same month in the new year
		setSelectedMonth(new Date(year, selectedMonth.getMonth(), 1))
	}

	const handleStatCardClick = (statType: any) => {
		setSelectedStat(statType)
		setIsDetailPanelOpen(true)
	}

	const handleDetailPanelClose = () => {
		setIsDetailPanelOpen(false)
	}

	return (
		<div className="overflow-x-hidden">
			<main>
				{/* Welcome Banner - Full width on mobile */}

				{/* Mobile-first responsive grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-3 md:gap-4">
					<Card
						className="col-span-1 sm:col-span-2 lg:col-span-6 row-span-1 lg:row-span-1 dark:bg-background bg-white rounded-xl py-2 sm:py-4 md:py-6 px-2 sm:px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between shadow-lg cursor-pointer hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300"
						onClick={() => handleStatCardClick('totalRevenue')}
					>
						<div className="flex-1 text-center sm:text-left mb-2 sm:mb-0">
							<div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 mb-1 sm:mb-2">
								<div>
									<h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
										Bienvenido a SolHub
									</h1>
									<div className="flex items-center justify-center sm:justify-start gap-2 mt-1 font-semibold">
										{profile?.display_name && (
											<span className="text-sm sm:text-md text-primary">{profile.display_name}</span>
										)}
									</div>
								</div>
							</div>
							<p className="text-gray-600 dark:text-gray-300 mb-1 sm:mb-2 md:mb-4 text-xs sm:text-sm md:text-base">
								Gestiona tus ingresos y estadisticas de empresa.
							</p>
						</div>
						<div className="relative">
							<div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-5 animate-pulse"></div>
							<EyeTrackingComponent className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 z-10" />
						</div>
					</Card>

					{/* Grid 2 - Revenue by Branch Chart - Simplified */}
					<Card
						className="col-span-1 sm:col-span-2 lg:col-span-6 row-span-1 lg:row-span-2 dark:bg-background bg-white rounded-xl py-2 sm:py-4 md:py-6 px-2 sm:px-4 md:px-6 cursor-pointer group shadow-lg h-full hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300"
						onClick={() => handleStatCardClick('branchRevenue')}
					>
						<div className="h-full flex flex-col">
							<h3 className="flex items-center justify-between text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 md:mb-4">
								Distribución por Sede
								<Tooltip>
									<TooltipTrigger>
										<Info className="size-4" />
									</TooltipTrigger>
									<TooltipContent>
										<p>Esta estadistica refleja el porcentaje de ingresos por sede en el mes seleccionado.</p>
									</TooltipContent>
								</Tooltip>
							</h3>
							{/* Donut Chart con Recharts */}
							<CustomPieChart
								data={stats?.revenueByBranch || []}
								total={stats?.monthlyRevenue || 0}
								isLoading={isLoading}
							/>
						</div>
					</Card>

					{/* Grid 3 - KPI Card: Monthly Revenue */}
					<StatCard
						title="Ingresos"
						value={isLoading ? '...' : formatCurrency(stats?.monthlyRevenue || 0)}
						description={format(selectedMonth, 'MMMM yyyy', { locale: es })}
						icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />}
						trend={{
							value: isLoading ? '...' : '+13%',
							icon: <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />,
							positive: true,
						}}
						onClick={() => handleStatCardClick('monthlyRevenue')}
						className="col-span-1 sm:col-span-1 lg:col-span-3 row-span-1 lg:row-span-1 transition-none`"
						statType="monthlyRevenue"
						isSelected={selectedStat === 'monthlyRevenue' && isDetailPanelOpen}
					/>

					{/* Grid 4 - KPI Card: Total de Casos */}
					<StatCard
						title="Casos"
						value={isLoading ? '...' : stats?.totalCases || 0}
						description="casos registrados"
						icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />}
						trend={{
							value: isLoading ? '...' : `+${stats?.newPatientsThisMonth || 0}`,
							icon: <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />,
							positive: true,
						}}
						onClick={() => handleStatCardClick('totalCases')}
						className="col-span-1 sm:col-span-1 lg:col-span-3 row-span-1 lg:row-span-1"
						statType="totalCases"
						isSelected={selectedStat === 'totalCases' && isDetailPanelOpen}
					/>
					{/* Grid 6 - 12-Month Sales Trend Chart with Year Selector */}
					<Card
						className="col-span-1 sm:col-span-2 lg:col-span-12 row-span-1 lg:row-span-2 dark:bg-background bg-white rounded-xl py-2 sm:py-3 md:py-5 px-2 sm:px-4 md:px-6 cursor-pointer shadow-lg hover:bg-white/90 group h-full hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300"
					>
						<div className="h-full flex flex-col">
							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-3">
								<h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-700 dark:text-gray-300 mb-1 sm:mb-0">
									Tendencia de Ventas
								</h3>
								{/* Year Selector with Arrows */}
								<div className="flex items-center gap-1 sm:gap-2">
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
												En esta estadistica puedes dar click sobre la barra del mes al que quieres filtrar y el panel
												se adaptara y te mostrara los ingresos de ese mes.
											</p>
										</TooltipContent>
									</Tooltip>
								</div>
							</div>
							<div className="relative h-14 sm:h-18 md:h-20 lg:h-24 flex items-end justify-between gap-0.5 sm:gap-1 md:gap-2">
								{isLoading ? (
									<div className="flex items-center justify-center w-full h-full">
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
									</div>
								) : (
									stats?.salesTrendByMonth.map((month) => {
										const maxRevenue = Math.max(...(stats?.salesTrendByMonth.map((m) => m.revenue) || [1]))
										const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
										const isSelected = month.isSelected
										return (
											<div
												key={month.month}
												className={`flex-1 rounded-t-sm hover:translate-y-[-4px] transition-transform duration-200 cursor-pointer ${
													isSelected
														? 'bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-500 hover:to-purple-700 shadow-lg'
														: 'bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-500 hover:to-blue-700'
												}`}
												style={{ height: `${Math.max(height, 20)}%` }} // FIXED: Increased minimum height for better UX
												title={`${month.month}: ${formatCurrency(month.revenue)}`}
												onClick={() => handleMonthBarClick(month)}
											></div>
										)
									})
								)}
							</div>
							<div className="flex justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
								{/* FIXED: Force Spanish month labels regardless of system language */}
								{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m) => (
									<span key={m}>{m}</span>
								))}
							</div>
						</div>
					</Card>

					{/* Grid 5 - Médicos Tratantes */}
					<Card className="col-span-1 sm:col-span-2 lg:col-span-3 row-span-1 lg:row-span-1 dark:bg-background bg-white rounded-xl p-3 sm:p-4 flex flex-col cursor-pointer shadow-lg hover:bg-white/90 group h-full hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300">
						<div className="h-full flex flex-col" onClick={() => navigate('/dashboard/stats')}>
							<div className="flex items-center justify-between mb-2 sm:mb-3">
								<div className="flex items-center gap-1 sm:gap-2">
									<div className="p-1 sm:p-1.5 bg-purple-100 dark:bg-purple-800/30 rounded-lg">
										<Stethoscope className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-600" />
									</div>
									<h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-700 dark:text-gray-300">
										Médicos Tratantes
									</h3>
								</div>
								<Tooltip>
									<TooltipTrigger>
										<Info className="size-4" />
									</TooltipTrigger>
									<TooltipContent>
										<p>En esta estadistica puedes ver los médicos tratantes con mas ingresos.</p>
									</TooltipContent>
								</Tooltip>
							</div>

							<div className="space-y-2 sm:space-y-3 flex-1">
								{isLoading ? (
									<div className="space-y-2 sm:space-y-3">
										{[1, 2, 3].map((i) => (
											<div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 sm:h-12 rounded-lg"></div>
										))}
									</div>
								) : stats?.topTreatingDoctors && stats.topTreatingDoctors.length > 0 ? (
									stats.topTreatingDoctors.slice(0, 3).map((doctor, index) => {
										const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500']
										return (
											<div
												key={doctor.doctor}
												className="flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-3 hover:bg-gray-50 dark:hover:bg-card rounded-lg cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300"
											>
												<div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${colors[index % colors.length]}`}></div>
												<div className="flex-1 min-w-0">
													<p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
														{doctor.doctor}
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{doctor.cases} caso{doctor.cases !== 1 ? 's' : ''} • {formatCurrency(doctor.revenue)}
													</p>
												</div>
											</div>
										)
									})
								) : (
									<div className="flex items-center justify-center h-full">
										<div className="text-center">
											<Stethoscope className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
											<p className="text-sm text-gray-500 dark:text-gray-400">No hay datos de médicos</p>
										</div>
									</div>
								)}
							</div>
						</div>
					</Card>

					{/* Grid 7 - Top Exam Types (Normalized) */}
					<Card
						className="col-span-1 sm:col-span-2 lg:col-span-6 row-span-1 lg:row-span-1 dark:bg-background bg-white rounded-xl py-2 sm:py-3 md:py-5 px-2 sm:px-4 md:px-6 cursor-pointer shadow-lg hover:bg-white/90 group h-full hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300"
						onClick={() => handleStatCardClick('examTypes')}
					>
						<div className="h-full flex flex-col">
							<div className="flex items-center justify-between mb-2 sm:mb-3">
								<h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-700 dark:text-gray-300">
									Estudios Más Frecuentes
								</h3>
								<Tooltip>
									<TooltipTrigger>
										<Info className="size-4" />
									</TooltipTrigger>
									<TooltipContent>
										<p>En esta estadistica puedes ver los estudios mas frecuentes y los que generan mas ingresos.</p>
									</TooltipContent>
								</Tooltip>
							</div>
							<div className="space-y-2 sm:space-y-3 flex-1">
								{isLoading ? (
									<div className="space-y-2 sm:space-y-3">
										{[1, 2, 3].map((i) => (
											<div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 sm:h-12 rounded-lg"></div>
										))}
									</div>
								) : (
									stats?.topExamTypes.slice(0, 3).map((exam, index) => {
										const colors = [
											{
												bg: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20',
												text: 'text-pink-600 dark:text-pink-500',
												badge: 'bg-pink-600',
											},
											{
												bg: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
												text: 'text-purple-600 dark:text-purple-500',
												badge: 'bg-purple-600',
											},
											{
												bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
												text: 'text-blue-500 dark:text-blue-400',
												badge: 'bg-blue-500',
											},
										]
										const color = colors[index]
										return (
											<div
												key={exam.examType}
												className={`flex items-center justify-between p-1.5 sm:p-2 md:p-3 bg-gradient-to-r ${color.bg} rounded-lg cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300`}
											>
												<div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
													<div
														className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 ${color.badge} rounded-lg flex items-center justify-center`}
													>
														<span className="text-white font-bold text-[10px] sm:text-xs md:text-sm">{index + 1}</span>
													</div>
													<div>
														<p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
															{exam.examType}
														</p>
														<p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
															{formatCurrency(exam.revenue)}
														</p>
													</div>
												</div>
												<span className={`text-sm sm:text-base md:text-lg font-bold ${color.text}`}>
													{exam.count} casos
												</span>
											</div>
										)
									})
								)}
							</div>
						</div>
					</Card>

					{/* Grid 8 - Quick Actions & Status Indicators */}
					<Card
						className="col-span-1 sm:col-span-2 lg:col-span-3 row-span-1 lg:row-span-1 dark:bg-background bg-white rounded-xl py-2 sm:py-3 md:py-5 px-2 sm:px-4 md:px-6 h-full hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 shadow-lg transition-transform duration-300"
						onClick={() => handleStatCardClick('incompleteCases')}
					>
						<div className="h-full flex flex-col">
							<div className="flex items-center justify-between mb-2 sm:mb-3">
								<h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-700 dark:text-gray-300">
									Estado del Sistema
								</h3>
								<Tooltip>
									<TooltipTrigger>
										<Info className="size-4" />
									</TooltipTrigger>
									<TooltipContent>
										<p>
											En esta estadistica puedes ver el estado de los casos pendientes de completar y los pagos
											pendientes de cobrar.
										</p>
									</TooltipContent>
								</Tooltip>
							</div>
							<div className="space-y-2 sm:space-y-3 flex-1">
								{/* Incomplete Cases Alert */}
								<div className="p-1.5 sm:p-2 md:p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300">
									<div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
										<AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
										<span className="text-xs sm:text-sm font-medium text-orange-800 dark:text-orange-400">
											Casos Incompletos
										</span>
									</div>
									<p className="text-[10px] sm:text-xs text-orange-700 dark:text-orange-300">
										{isLoading ? 'Cargando...' : `${stats?.incompleteCases || 0} casos pendientes de completar`}
									</p>
								</div>

								{/* Pending Payments Alert */}
								<div className="p-1.5 sm:p-2 md:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300">
									<div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
										<Clock className="w-4 h-4 text-red-500 dark:text-red-400" />
										<span className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-400">
											Pagos Pendientes
										</span>
									</div>
									<p className="text-[10px] sm:text-xs text-red-700 dark:text-red-300">
										{isLoading ? 'Cargando...' : `${formatCurrency(stats?.pendingPayments || 0)} por cobrar`}
									</p>
								</div>

								{/* Quick Actions */}
								<button
									className="w-full p-1.5 sm:p-2 md:p-3 bg-primary hover:bg-primary/80 rounded-lg transition-transform duration-300 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base hover:scale-105 hover:shadow-lg hover:shadow-primary/20 dark:text-gray-700 text-gray-300"
									onClick={(e) => {
										e.stopPropagation()
										navigate('/dashboard/stats')
									}}
								>
									<BarChart3 className="w-4 h-4" />
									<span className="hidden sm:inline">Ver Estadísticas</span>
									<span className="sm:hidden">Estadísticas</span>
								</button>
							</div>
						</div>
					</Card>
				</div>

				{/* Stat Detail Panel */}
				<Suspense fallback={<StatDetailPanelFallback />}>
					<StatDetailPanel
						isOpen={isDetailPanelOpen}
						onClose={handleDetailPanelClose}
						statType={selectedStat}
						stats={stats}
						isLoading={isLoading}
					/>
				</Suspense>
			</main>
		</div>
	)
}

export default MainHome
