import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, BarChart3, DollarSign, Users, CheckCircle, XCircle, TrendingUp, TrendingDown, AlertCircle, Stethoscope, MapPin } from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { CustomPieChart } from '@shared/components/ui/custom-pie-chart'
import { CurrencyDonutChart } from '@shared/components/ui/currency-donut-chart'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'
import { formatCurrency, formatNumber, formatCurrencyWithSymbol } from '@shared/utils/number-utils'

export type StatType =
	| 'totalRevenue'
	| 'monthlyRevenue'
	| 'totalCases'
	| 'completedCases'
	| 'incompleteCases'
	| 'pendingPayments'
	| 'uniquePatients'
	| 'branchRevenue'
	| 'examTypes'
	| 'revenueTrend'
	| 'branchDistribution'
	| 'currencyDistribution'
	| 'remainingAmount'
	| 'originRevenue'
	| 'doctorRevenue'
	| 'casesByReceptionist'
	| 'casesByPathologist'
	| 'casesByMedicalType'
	| 'totalBlocks'

interface StatDetailPanelProps {
	isOpen: boolean
	onClose: () => void
	statType: StatType
	stats: any
	isLoading: boolean
	selectedMonth?: Date
	selectedYear?: number
}

const StatDetailPanel: React.FC<StatDetailPanelProps> = ({
	isOpen,
	onClose,
	statType,
	stats,
	isLoading,
	selectedMonth,
}) => {
	useBodyScrollLock(isOpen)
	useGlobalOverlayOpen(isOpen)
	// formatCurrency is now imported from number-utils

	const getStatTitle = () => {
		switch (statType) {
			case 'totalRevenue':
				return 'Ingresos Totales'
			case 'monthlyRevenue':
				return 'Ingresos Mensuales'
			case 'totalCases':
				return 'Total de Casos'
			case 'completedCases':
				return 'Casos Pagados'
			case 'incompleteCases':
				return 'Casos Incompletos'
			case 'pendingPayments':
				return 'Pagos Pendientes'
			case 'uniquePatients':
				return 'Pacientes Únicos'
			case 'branchRevenue':
				return 'Ingresos por Sede'
			case 'examTypes':
				return 'Tipos de Exámenes'
			case 'revenueTrend':
				return 'Tendencia de Ingresos'
			case 'branchDistribution':
				return 'Distribución por Sede'
			case 'currencyDistribution':
				return 'Distribución por Moneda'
			case 'remainingAmount':
				return 'Casos por Cobrar'
			case 'originRevenue':
				return 'Ingreso por Procedencia'
			case 'doctorRevenue':
				return 'Ingreso por Médico Tratante'
			case 'casesByReceptionist':
				return 'Casos por Recepcionista'
			case 'casesByPathologist':
				return 'Casos por Patólogo'
			case 'casesByMedicalType':
				return 'Casos por tipo de médico'
			case 'totalBlocks':
				return 'Bloques del período'
			default:
				return 'Detalles'
		}
	}

	const renderContent = () => {
		if (isLoading) {
			return (
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			)
		}

		if (!stats) {
			return (
				<div className="text-center py-8">
					<p className="text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
				</div>
			)
		}

		switch (statType) {
			case 'totalRevenue':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Resumen de Ingresos</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Totales</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(stats.monthlyRevenue)}
									</p>
								</div>
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Mensuales</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(stats.monthlyRevenue)}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{selectedMonth ? format(selectedMonth, 'MMMM yyyy', { locale: es }) : 'Este mes'}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Distribución por Sede</h3>
							</div>
							<div className="space-y-4">
								{stats.revenueByBranch &&
									stats.revenueByBranch.map((branch: any, index: number) => {
										const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500']
										return (
											<div key={branch.branch} className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<div className={`w-3 h-3 ${colors[index % colors.length]} rounded-full`}></div>
													<span className="text-sm text-gray-600 dark:text-gray-400">{branch.branch}</span>
												</div>
												<div className="flex flex-col items-end">
													<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
														{formatCurrency(branch.revenue)}
													</span>
													<span className="text-xs text-gray-500 dark:text-gray-400">
														{branch.percentage.toFixed(1)}%
													</span>
												</div>
											</div>
										)
									})}
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Tendencia Mensual</h3>
							</div>
							<div className="h-40 flex items-end justify-between gap-1">
								{stats.salesTrendByMonth &&
									stats.salesTrendByMonth.map((month: any) => {
										const maxRevenue = Math.max(...stats.salesTrendByMonth.map((m: any) => m.revenue))
										const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
										const isSelected = month.isSelected

										return (
											<div
												key={month.month}
												className={`flex-1 rounded-t-sm ${
													isSelected
														? 'bg-gradient-to-t from-purple-600 to-purple-400'
														: 'bg-gradient-to-t from-blue-500 to-blue-300'
												}`}
												style={{ height: `${Math.max(height, 10)}%` }}
												title={`${month.month}: ${formatCurrency(month.revenue)}`}
											></div>
										)
									})}
							</div>
							<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
								{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m) => (
									<span key={m}>{m}</span>
								))}
							</div>
						</div>
					</div>
				)

			case 'monthlyRevenue':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ingresos Mensuales</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Ingresos del Mes</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(stats.monthlyRevenue)}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{selectedMonth ? format(selectedMonth, 'MMMM yyyy', { locale: es }) : 'Este mes'}
									</p>
								</div>
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Comparación con Mes Anterior</p>
									<div className="flex items-center gap-2">
										<p className="text-2xl font-bold text-green-600 dark:text-green-400">+12.5%</p>
										<span className="text-xs text-gray-500 dark:text-gray-400">estimado</span>
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Desglose por Tipo de Examen</h3>
							</div>
							<div className="space-y-4">
								{stats.revenueByExamType &&
									stats.revenueByExamType.slice(0, 5).map((exam: any, index: number) => {
										const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500']
										return (
											<div key={exam.examType} className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<div className={`w-3 h-3 ${colors[index % colors.length]} rounded-full`}></div>
													<span className="text-sm text-gray-600 dark:text-gray-400">{exam.examType}</span>
												</div>
												<div className="flex flex-col items-end">
													<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
														{formatCurrency(exam.revenue)}
													</span>
													<span className="text-xs text-gray-500 dark:text-gray-400">
														{formatNumber(exam.count)} casos
													</span>
												</div>
											</div>
										)
									})}
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Nuevos Pacientes</h3>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
										<Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
									</div>
									<div>
										<p className="text-sm text-gray-500 dark:text-gray-400">Nuevos Pacientes</p>
										<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.newPatientsThisMonth}</p>
									</div>
								</div>
								<div className="text-sm text-green-600 dark:text-green-400">+{stats.newPatientsThisMonth} este mes</div>
							</div>
						</div>
					</div>
				)

			case 'totalCases':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Resumen de Casos</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Casos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatNumber(stats.totalCases)}
									</p>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Casos Pagados</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatNumber(stats.completedCases)}
									</p>
								</div>
								<div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Casos Incompletos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatNumber(stats.incompleteCases)}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Distribución por Tipo de Examen
							</h3>
							<div className="space-y-4">
								{stats.topExamTypes &&
									stats.topExamTypes.map((exam: any, index: number) => {
										const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500']
										return (
											<div key={exam.examType} className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<div className={`w-3 h-3 ${colors[index % colors.length]} rounded-full`}></div>
													<span className="text-sm text-gray-600 dark:text-gray-400">{exam.examType}</span>
												</div>
												<div className="flex flex-col items-end">
													<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
														{formatNumber(exam.count)}
													</span>
													<span className="text-xs text-gray-500 dark:text-gray-400">
														{formatCurrency(exam.revenue)}
													</span>
												</div>
											</div>
										)
									})}
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Médicos Tratantes</h3>
							</div>
							<div className="space-y-4">
								{stats.topTreatingDoctors &&
									stats.topTreatingDoctors.slice(0, 5).map((doctor: any, index: number) => {
										return (
											<div key={doctor.doctor} className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<span className="text-sm text-gray-600 dark:text-gray-400">
														{index + 1}. {doctor.doctor}
													</span>
												</div>
												<div className="flex flex-col items-end">
													<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
														{formatNumber(doctor.cases)} casos
													</span>
													<span className="text-xs text-gray-500 dark:text-gray-400">
														{formatCurrency(doctor.revenue)}
													</span>
												</div>
											</div>
										)
									})}
							</div>
						</div>
					</div>
				)

			case 'completedCases':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Casos Pagados</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total Pagados</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.completedCases}</p>
								</div>
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Tasa de Completitud</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{stats.totalCases > 0 ? ((stats.completedCases / stats.totalCases) * 100).toFixed(1) : 0}%
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Progreso de Completitud</h3>
							</div>
							<div className="space-y-4">
								<div>
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-2">
											<CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Casos Pagados</span>
										</div>
										<span className="text-sm font-bold text-green-700 dark:text-green-300">
											{stats.totalCases > 0 ? ((stats.completedCases / stats.totalCases) * 100).toFixed(1) : 0}%
										</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
										<div
											className="bg-green-500 h-2.5 rounded-full"
											style={{
												width: `${stats.totalCases > 0 ? (stats.completedCases / stats.totalCases) * 100 : 0}%`,
											}}
										></div>
									</div>
								</div>

								<div>
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-2">
											<XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Casos Incompletos</span>
										</div>
										<span className="text-sm font-bold text-red-700 dark:text-red-300">
											{stats.totalCases > 0 ? ((stats.incompleteCases / stats.totalCases) * 100).toFixed(1) : 0}%
										</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
										<div
											className="bg-red-500 h-2.5 rounded-full"
											style={{
												width: `${stats.totalCases > 0 ? (stats.incompleteCases / stats.totalCases) * 100 : 0}%`,
											}}
										></div>
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ingresos por Casos Pagados</h3>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
										<DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
									</div>
									<div>
										<p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Totales</p>
										<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
											{formatCurrency(stats.monthlyRevenue)}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				)

			case 'incompleteCases':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Casos Incompletos</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total Incompletos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.incompleteCases}</p>
								</div>
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Pagos Pendientes</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(stats.pendingPayments)}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Progreso de Completitud</h3>
							<div className="space-y-4">
								<div>
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-2">
											<XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Casos Incompletos</span>
										</div>
										<span className="text-sm font-bold text-red-700 dark:text-red-300">
											{stats.totalCases > 0 ? ((stats.incompleteCases / stats.totalCases) * 100).toFixed(1) : 0}%
										</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
										<div
											className="bg-red-500 h-2.5 rounded-full"
											style={{
												width: `${stats.totalCases > 0 ? (stats.incompleteCases / stats.totalCases) * 100 : 0}%`,
											}}
										></div>
									</div>
								</div>

								<div>
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-2">
											<CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Casos Pagados</span>
										</div>
										<span className="text-sm font-bold text-green-700 dark:text-green-300">
											{stats.totalCases > 0 ? ((stats.completedCases / stats.totalCases) * 100).toFixed(1) : 0}%
										</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
										<div
											className="bg-green-500 h-2.5 rounded-full"
											style={{
												width: `${stats.totalCases > 0 ? (stats.completedCases / stats.totalCases) * 100 : 0}%`,
											}}
										></div>
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<Button className="w-full bg-primary hover:bg-primary/80">
								<BarChart3 className="w-4 h-4 mr-2" />
								Ver Todos los Casos Incompletos
							</Button>
						</div>
					</div>
				)

			case 'pendingPayments':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Pagos Pendientes</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Monto Pendiente</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(stats.pendingPayments)}
									</p>
								</div>
								<div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Casos Incompletos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.incompleteCases}</p>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Porcentaje de Pagos Pendientes
							</h3>
							<div className="space-y-4">
								<div>
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Pagos Pendientes</span>
										<span className="text-sm font-bold text-red-700 dark:text-red-300">
											{stats.monthlyRevenue > 0 ? ((stats.pendingPayments / stats.monthlyRevenue) * 100).toFixed(1) : 0}
											%
										</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
										<div
											className="bg-red-500 h-2.5 rounded-full"
											style={{
												width: `${
													stats.monthlyRevenue > 0
														? Math.min((stats.pendingPayments / stats.monthlyRevenue) * 100, 100)
														: 0
												}%`,
											}}
										></div>
									</div>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										Del total de ingresos del mes: {formatCurrency(stats.monthlyRevenue)}
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<Button className="w-full bg-primary hover:bg-primary/80">
								<BarChart3 className="w-4 h-4 mr-2" />
								Ver Todos los Casos con Pagos Pendientes
							</Button>
						</div>
					</div>
				)

			case 'uniquePatients':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Pacientes Únicos</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Pacientes</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.uniquePatients}</p>
								</div>
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Nuevos este Mes</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.newPatientsThisMonth}</p>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Estadísticas de Pacientes</h3>
							</div>
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm text-gray-600 dark:text-gray-400">Casos por Paciente (Promedio)</span>
									<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
										{stats.uniquePatients > 0 ? (stats.totalCases / stats.uniquePatients).toFixed(1) : 0}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-gray-600 dark:text-gray-400">Ingresos por Paciente (Promedio)</span>
									<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
										{stats.uniquePatients > 0
											? formatCurrency(stats.monthlyRevenue / stats.uniquePatients)
											: formatCurrency(0)}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-gray-600 dark:text-gray-400">Tasa de Crecimiento Mensual</span>
									<span className="text-sm font-medium text-green-600 dark:text-green-400">
										+{stats.newPatientsThisMonth} pacientes
									</span>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
									Tendencia de Nuevos Pacientes
								</h3>
							</div>
							<div className="h-40 flex items-end justify-between gap-1">
								{stats.salesTrendByMonth &&
									stats.salesTrendByMonth.map((_month: any, index: number) => {
										// This is a placeholder - in a real implementation, you'd have actual new patients data per month
										const height = 20 + Math.random() * 80 // Random height between 20% and 100%

										return (
											<div
												key={index}
												className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-500 to-blue-300"
												style={{ height: `${height}%` }}
											></div>
										)
									})}
							</div>
							<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
								{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m) => (
									<span key={m}>{m}</span>
								))}
							</div>
						</div>
					</div>
				)

			case 'branchRevenue':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ingresos por Sede</h3>
							</div>
							{stats.revenueByBranch && (
								<CustomPieChart
									data={stats.revenueByBranch.map((branch: any) => ({
										branch: branch.branch,
										revenue: branch.revenue,
										percentage: branch.percentage,
									}))}
									total={stats.monthlyRevenue || 0}
									isLoading={isLoading}
								/>
							)}
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Comparación de Sedes</h3>
							</div>
							<div className="space-y-4">
								{stats.revenueByBranch &&
									stats.revenueByBranch.map((branch: any) => {
										const maxRevenue = Math.max(...stats.revenueByBranch.map((b: any) => b.revenue))
										const percentage = maxRevenue > 0 ? (branch.revenue / maxRevenue) * 100 : 0

										return (
											<div key={branch.branch}>
												<div className="flex items-center justify-between mb-1">
													<span className="text-sm text-gray-600 dark:text-gray-400">{branch.branch}</span>
													<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
														{formatCurrency(branch.revenue)}
													</span>
												</div>
												<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
													<div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
												</div>
											</div>
										)
									})}
							</div>
						</div>
					</div>
				)

			case 'revenueTrend':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Tendencia de Ingresos Mensuales</h3>
							<div className="h-64 flex items-end justify-between gap-1">
								{stats.salesTrendByMonth &&
									stats.salesTrendByMonth.map((month: any) => {
										const maxRevenue = Math.max(...stats.salesTrendByMonth.map((m: any) => m.revenue))
										const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
										const isSelected = month.isSelected

										return (
											<div
												key={month.month}
												className={`flex-1 rounded-t-sm transition-transform duration-200 ${
													isSelected
														? 'bg-gradient-to-t from-purple-600 to-purple-400 shadow-lg'
														: 'bg-gradient-to-t from-blue-500 to-blue-300'
												}`}
												style={{ height: `${Math.max(height, 10)}%` }}
												title={`${month.month}: ${formatCurrency(month.revenue)}`}
											></div>
										)
									})}
							</div>
							<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
								{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m) => (
									<span key={m}>{m}</span>
								))}
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Tabla de Ingresos por Mes</h3>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 dark:border-gray-700">
											<th className="text-left py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Mes</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Ingresos</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">% del Total</th>
										</tr>
									</thead>
									<tbody>
										{stats.salesTrendByMonth &&
											stats.salesTrendByMonth.map((month: any, index: number) => {
												const totalRevenue = stats.salesTrendByMonth.reduce((sum: number, m: any) => sum + m.revenue, 0)
												const percentage = totalRevenue > 0 ? (month.revenue / totalRevenue) * 100 : 0
												const prevMonth = index > 0 ? stats.salesTrendByMonth[index - 1] : null
												const growth = prevMonth && prevMonth.revenue > 0 
													? ((month.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 
													: null

												return (
													<tr
														key={month.month}
														className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
															month.isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : ''
														}`}
													>
														<td className="py-2 px-2">
															<span className="text-sm font-medium text-gray-700 dark:text-gray-300">{month.month}</span>
														</td>
														<td className="py-2 px-2 text-right">
															<span className="text-sm font-bold text-gray-900 dark:text-gray-100">
																{formatCurrency(month.revenue)}
															</span>
														</td>
														<td className="py-2 px-2 text-right">
															<div className="flex items-center justify-end gap-2">
																<span className="text-sm text-gray-600 dark:text-gray-400">{percentage.toFixed(1)}%</span>
																{growth !== null && (
																	<span
																		className={`text-xs flex items-center ${
																			growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
																		}`}
																	>
																		{growth >= 0 ? (
																			<TrendingUp className="w-3 h-3 mr-1" />
																		) : (
																			<TrendingDown className="w-3 h-3 mr-1" />
																		)}
																		{Math.abs(growth).toFixed(1)}%
																	</span>
																)}
															</div>
														</td>
													</tr>
												)
											})}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				)

			case 'branchDistribution':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Distribución por Sede</h3>
							{stats.revenueByBranch && (
								<CustomPieChart
									data={stats.revenueByBranch.map((branch: any) => ({
										branch: branch.branch,
										revenue: branch.revenue,
										percentage: branch.percentage,
									}))}
									total={stats.monthlyRevenue || 0}
									isLoading={isLoading}
								/>
							)}
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Tabla Detallada por Sede</h3>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 dark:border-gray-700">
											<th className="text-left py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Sede</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Ingresos</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">% del Total</th>
										</tr>
									</thead>
									<tbody>
										{stats.revenueByBranch &&
											stats.revenueByBranch
												.sort((a: any, b: any) => b.revenue - a.revenue)
												.map((branch: any) => {
													const maxRevenue = Math.max(...stats.revenueByBranch.map((b: any) => b.revenue))
													const percentage = maxRevenue > 0 ? (branch.revenue / maxRevenue) * 100 : 0

													return (
														<tr
															key={branch.branch}
															className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
														>
															<td className="py-2 px-2">
																<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
																	{branch.branch || 'Sin Sede'}
																</span>
															</td>
															<td className="py-2 px-2 text-right">
																<span className="text-sm font-bold text-gray-900 dark:text-gray-100">
																	{formatCurrency(branch.revenue)}
																</span>
															</td>
															<td className="py-2 px-2 text-right">
																<div className="flex items-center justify-end gap-2">
																	<span className="text-sm text-gray-600 dark:text-gray-400">
																		{branch.percentage.toFixed(1)}%
																	</span>
																	<div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
																		<div
																			className="bg-blue-500 h-2 rounded-full"
																			style={{ width: `${percentage}%` }}
																		></div>
																	</div>
																</div>
															</td>
														</tr>
													)
												})}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				)

			case 'currencyDistribution':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Distribución por Moneda</h3>
							<CurrencyDonutChart
								bolivaresTotal={stats?.monthlyRevenueBolivares || 0}
								dollarsTotal={stats?.monthlyRevenueDollars || 0}
								isLoading={isLoading}
							/>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Desglose Detallado</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
									<div className="flex items-center gap-3 mb-2">
										<div className="w-3 h-3 bg-green-500 rounded-full"></div>
										<p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bolívares (VES)</p>
									</div>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrencyWithSymbol(stats?.monthlyRevenueBolivares || 0, 'VES ')}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{stats?.monthlyRevenue && stats.monthlyRevenue > 0
											? ((stats.monthlyRevenueBolivares || 0) / stats.monthlyRevenue * 100).toFixed(1)
											: 0}% del total
									</p>
								</div>
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<div className="flex items-center gap-3 mb-2">
										<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
										<p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dólares (USD)</p>
									</div>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrencyWithSymbol(stats?.monthlyRevenueDollars || 0, 'USD ')}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{stats?.monthlyRevenue && stats.monthlyRevenue > 0
											? ((stats.monthlyRevenueDollars || 0) / stats.monthlyRevenue * 100).toFixed(1)
											: 0}% del total
									</p>
								</div>
							</div>
							<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Ingresos</span>
									<span className="text-lg font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(stats?.monthlyRevenue || 0)}
									</span>
								</div>
							</div>
						</div>
					</div>
				)

			case 'remainingAmount':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Resumen de Casos por Cobrar</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
									<div className="flex items-center gap-2 mb-2">
										<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
										<p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monto por Cobrar</p>
									</div>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(stats?.pendingPayments || 0)}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{stats?.monthlyRevenue && stats.monthlyRevenue > 0
											? ((stats.pendingPayments || 0) / stats.monthlyRevenue * 100).toFixed(1)
											: 0}% del total de ingresos
									</p>
								</div>
								<div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
									<div className="flex items-center gap-2 mb-2">
										<XCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
										<p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Casos Incompletos</p>
									</div>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatNumber(stats?.incompleteCases || 0)}
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{stats?.totalCases && stats.totalCases > 0
											? ((stats.incompleteCases || 0) / stats.totalCases * 100).toFixed(1)
											: 0}% del total de casos
									</p>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Análisis de Pagos Pendientes</h3>
							<div className="space-y-4">
								<div>
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Monto Pendiente</span>
										<span className="text-sm font-bold text-red-700 dark:text-red-300">
											{formatCurrency(stats?.pendingPayments || 0)}
										</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
										<div
											className="bg-red-500 h-3 rounded-full"
											style={{
												width: `${
													stats?.monthlyRevenue && stats.monthlyRevenue > 0
														? Math.min(((stats.pendingPayments || 0) / stats.monthlyRevenue) * 100, 100)
														: 0
												}%`,
											}}
										></div>
									</div>
								</div>
								<div>
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm font-medium text-gray-600 dark:text-gray-400">Casos Incompletos</span>
										<span className="text-sm font-bold text-orange-700 dark:text-orange-300">
											{formatNumber(stats?.incompleteCases || 0)}
										</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
										<div
											className="bg-orange-500 h-3 rounded-full"
											style={{
												width: `${
													stats?.totalCases && stats.totalCases > 0
														? ((stats.incompleteCases || 0) / stats.totalCases) * 100
														: 0
												}%`,
											}}
										></div>
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Ingresos del Período</p>
									<p className="text-xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(stats?.monthlyRevenue || 0)}
									</p>
								</div>
								<div className="text-right">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Casos</p>
									<p className="text-xl font-bold text-gray-900 dark:text-gray-100">
										{formatNumber(stats?.totalCases || 0)}
									</p>
								</div>
							</div>
						</div>
					</div>
				)

			case 'originRevenue':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ingreso por Procedencia</h3>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 dark:border-gray-700">
											<th className="text-left py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Procedencia</th>
											<th className="text-center py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Casos</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Ingresos</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">% del Total</th>
										</tr>
									</thead>
									<tbody>
										{stats.revenueByOrigin &&
											stats.revenueByOrigin
												.sort((a: any, b: any) => b.revenue - a.revenue)
												.map((origin: any) => {
													const maxRevenue = Math.max(...stats.revenueByOrigin.map((o: any) => o.revenue))
													const percentage = maxRevenue > 0 ? (origin.revenue / maxRevenue) * 100 : 0

													return (
														<tr
															key={origin.origin}
															className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
														>
															<td className="py-2 px-2">
																<div className="flex items-center gap-2">
																	<MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
																	<span className="text-sm font-medium text-gray-700 dark:text-gray-300">{origin.origin}</span>
																</div>
															</td>
															<td className="py-2 px-2 text-center">
																<span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
																	{origin.cases}
																</span>
															</td>
															<td className="py-2 px-2 text-right">
																<span className="text-sm font-bold text-gray-900 dark:text-gray-100">
																	{formatCurrency(origin.revenue)}
																</span>
															</td>
															<td className="py-2 px-2 text-right">
																<div className="flex items-center justify-end gap-2">
																	<span className="text-sm text-gray-600 dark:text-gray-400">
																		{origin.percentage.toFixed(1)}%
																	</span>
																	<div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
																		<div
																			className="bg-purple-500 h-2 rounded-full"
																			style={{ width: `${percentage}%` }}
																		></div>
																	</div>
																</div>
															</td>
														</tr>
													)
												})}
									</tbody>
								</table>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Resumen</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Procedencias</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{stats.revenueByOrigin?.length || 0}
									</p>
								</div>
								<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Casos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{stats.revenueByOrigin?.reduce((sum: number, o: any) => sum + o.cases, 0) || 0}
									</p>
								</div>
								<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Ingresos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(
											stats.revenueByOrigin?.reduce((sum: number, o: any) => sum + o.revenue, 0) || 0
										)}
									</p>
								</div>
							</div>
						</div>
					</div>
				)

			case 'doctorRevenue':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ingreso por Médico Tratante</h3>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 dark:border-gray-700">
											<th className="text-left py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Médico</th>
											<th className="text-center py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Casos</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Ingresos</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">% del Total</th>
										</tr>
									</thead>
									<tbody>
										{stats.topTreatingDoctors &&
											stats.topTreatingDoctors
												.sort((a: any, b: any) => b.revenue - a.revenue)
												.map((doctor: any, index: number) => {
													const maxRevenue = Math.max(...stats.topTreatingDoctors.map((d: any) => d.revenue))
													const percentage = maxRevenue > 0 ? (doctor.revenue / maxRevenue) * 100 : 0
													const totalRevenue = stats.totalRevenue || stats.monthlyRevenue || 0
													const revenuePercentage = totalRevenue > 0 ? (doctor.revenue / totalRevenue) * 100 : 0

													return (
														<tr
															key={doctor.doctor}
															className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
														>
															<td className="py-2 px-2">
																<div className="flex items-center gap-2">
																	<div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
																		<Stethoscope className="w-3 h-3 text-blue-600 dark:text-blue-400" />
																	</div>
																	<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
																		{index + 1}. {doctor.doctor}
																	</span>
																</div>
															</td>
															<td className="py-2 px-2 text-center">
																<span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
																	{doctor.cases}
																</span>
															</td>
															<td className="py-2 px-2 text-right">
																<span className="text-sm font-bold text-gray-900 dark:text-gray-100">
																	{formatCurrency(doctor.revenue)}
																</span>
															</td>
															<td className="py-2 px-2 text-right">
																<div className="flex items-center justify-end gap-2">
																	<span className="text-sm text-gray-600 dark:text-gray-400">
																		{revenuePercentage.toFixed(1)}%
																	</span>
																	<div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
																		<div
																			className="bg-blue-500 h-2 rounded-full"
																			style={{ width: `${percentage}%` }}
																		></div>
																	</div>
																</div>
															</td>
														</tr>
													)
												})}
									</tbody>
								</table>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Resumen</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Médicos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{stats.topTreatingDoctors?.length || 0}
									</p>
								</div>
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Casos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{stats.topTreatingDoctors?.reduce((sum: number, d: any) => sum + d.cases, 0) || 0}
									</p>
								</div>
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Ingresos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(
											stats.topTreatingDoctors?.reduce((sum: number, d: any) => sum + d.revenue, 0) || 0
										)}
									</p>
								</div>
							</div>
						</div>
					</div>
				)

			case 'casesByReceptionist': {
				const data = stats.casesByReceptionist || []
				const maxCases = Math.max(...data.map((item: any) => item.cases || 0), 1)
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Top recepcionistas
							</h3>
							{data.length === 0 ? (
								<p className="text-sm text-gray-500 dark:text-gray-400">Sin datos</p>
							) : (
								<div className="space-y-3">
									{data.slice(0, 5).map((item: any) => (
										<div key={item.id} className="space-y-1">
											<div className="flex items-center justify-between">
												<span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
													{formatNumber(item.cases)}
												</span>
											</div>
											<div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
												<div
													className="h-2 rounded-full bg-blue-500"
													style={{ width: `${(item.cases / maxCases) * 100}%` }}
												/>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Todos los recepcionistas
							</h3>
							<div className="max-h-72 overflow-auto space-y-2 pr-2">
								{data.map((item: any) => (
									<div key={item.id} className="flex items-center justify-between">
										<span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
										<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
											{formatNumber(item.cases)}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				)
			}

			case 'totalBlocks': {
				const total = stats?.totalBlocks ?? 0
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total de bloques de casos en el período seleccionado.</p>
							<p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(total)}</p>
						</div>
					</div>
				)
			}

			case 'casesByPathologist': {
				const data = stats.casesByPathologist || []
				const maxCases = Math.max(...data.map((item: any) => item.cases || 0), 1)
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Top patólogos
							</h3>
							{data.length === 0 ? (
								<p className="text-sm text-gray-500 dark:text-gray-400">Sin datos</p>
							) : (
								<div className="space-y-3">
									{data.slice(0, 5).map((item: any) => (
										<div key={item.id} className="space-y-1">
											<div className="flex items-center justify-between">
												<span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
													{formatNumber(item.cases)} casos
												</span>
											</div>
											<div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
												<div
													className="h-2 rounded-full bg-purple-500"
													style={{ width: `${(item.cases / maxCases) * 100}%` }}
												/>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Todos los patólogos
							</h3>
							<div className="max-h-72 overflow-auto space-y-2 pr-2">
								{data.map((item: any) => (
									<div key={item.id} className="flex items-center justify-between">
										<span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
										<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
											{formatNumber(item.cases)} casos
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				)
			}

			case 'casesByMedicalType': {
				const pathologistData = stats.casesByPathologist || []
				const citotecnoData = stats.casesByCitotecno || []
				const hasPathologists = pathologistData.length > 0
				const hasCitotecnos = citotecnoData.length > 0
				const maxPathCases = Math.max(...pathologistData.map((item: any) => item.cases || 0), 1)
				const maxCitoCases = Math.max(...citotecnoData.map((item: any) => item.cases || 0), 1)
				return (
					<div className="space-y-6">
						{hasPathologists && (
							<>
								<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
									<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
										Top patólogos
									</h3>
									<div className="space-y-3">
										{pathologistData.slice(0, 5).map((item: any) => (
											<div key={item.id} className="space-y-1">
												<div className="flex items-center justify-between">
													<span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
													<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
														{formatNumber(item.cases)} casos
													</span>
												</div>
												<div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
													<div
														className="h-2 rounded-full bg-purple-500"
														style={{ width: `${(item.cases / maxPathCases) * 100}%` }}
													/>
												</div>
											</div>
										))}
									</div>
								</div>
								<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
									<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
										Todos los patólogos
									</h3>
									<div className="max-h-72 overflow-auto space-y-2 pr-2">
										{pathologistData.map((item: any) => (
											<div key={item.id} className="flex items-center justify-between">
												<span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
													{formatNumber(item.cases)} casos
												</span>
											</div>
										))}
									</div>
								</div>
							</>
						)}
						{hasCitotecnos && (
							<>
								<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
									<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
										Top citotecnólogos
									</h3>
									<div className="space-y-3">
										{citotecnoData.slice(0, 5).map((item: any) => (
											<div key={item.id} className="space-y-1">
												<div className="flex items-center justify-between">
													<span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
													<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
														{formatNumber(item.cases)} casos
													</span>
												</div>
												<div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
													<div
														className="h-2 rounded-full bg-teal-500"
														style={{ width: `${(item.cases / maxCitoCases) * 100}%` }}
													/>
												</div>
											</div>
										))}
									</div>
								</div>
								<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
									<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
										Todos los citotecnólogos
									</h3>
									<div className="max-h-72 overflow-auto space-y-2 pr-2">
										{citotecnoData.map((item: any) => (
											<div key={item.id} className="flex items-center justify-between">
												<span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
													{formatNumber(item.cases)} casos
												</span>
											</div>
										))}
									</div>
								</div>
							</>
						)}
						{!hasPathologists && !hasCitotecnos && (
							<p className="text-sm text-gray-500 dark:text-gray-400">Sin datos en el período seleccionado.</p>
						)}
					</div>
				)
			}

			case 'examTypes':
				return (
					<div className="space-y-6">
						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
								Distribución por Tipo de Examen
							</h3>
							<div className="space-y-4">
								{stats.revenueByExamType &&
									stats.revenueByExamType.map((exam: any, index: number) => {
										const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-purple-500']
										const totalRevenue = stats.revenueByExamType.reduce((sum: number, e: any) => sum + e.revenue, 0)
										const percentage = totalRevenue > 0 ? (exam.revenue / totalRevenue) * 100 : 0

										return (
											<div key={exam.examType} className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<div className={`w-3 h-3 ${colors[index % colors.length]} rounded-full`}></div>
													<span className="text-sm text-gray-600 dark:text-gray-400">{exam.examType}</span>
												</div>
												<div className="flex flex-col items-end">
													<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
														{formatCurrency(exam.revenue)}
													</span>
													<span className="text-xs text-gray-500 dark:text-gray-400">
														{formatNumber(exam.count)} casos • {percentage.toFixed(1)}%
													</span>
												</div>
											</div>
										)
									})}
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Tabla Detallada de Tipos de Exámenes</h3>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 dark:border-gray-700">
											<th className="text-left py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Tipo de Examen</th>
											<th className="text-center py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Casos</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Ingresos</th>
											<th className="text-right py-2 px-2 text-sm font-semibold text-gray-600 dark:text-gray-400">% del Total</th>
										</tr>
									</thead>
									<tbody>
										{stats.revenueByExamType &&
											stats.revenueByExamType
												.slice()
												.sort((a: any, b: any) => b.count - a.count) // Sort by count descending (most requested first)
												.map((exam: any, index: number) => {
													const totalRevenue = stats.revenueByExamType.reduce((sum: number, e: any) => sum + e.revenue, 0)
													const percentage = totalRevenue > 0 ? (exam.revenue / totalRevenue) * 100 : 0
													const maxRevenue = Math.max(...stats.revenueByExamType.map((e: any) => e.revenue))
													const barPercentage = maxRevenue > 0 ? (exam.revenue / maxRevenue) * 100 : 0

													return (
														<tr
															key={exam.examType}
															className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
														>
															<td className="py-2 px-2">
																<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
																	{exam.examType}
																</span>
															</td>
															<td className="py-2 px-2 text-center">
																<span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
																	{exam.count}
																</span>
															</td>
															<td className="py-2 px-2 text-right">
																<span className="text-sm font-bold text-gray-900 dark:text-gray-100">
																	{formatCurrency(exam.revenue)}
																</span>
															</td>
															<td className="py-2 px-2 text-right">
																<div className="flex items-center justify-end gap-2">
																	<span className="text-sm text-gray-600 dark:text-gray-400">
																		{percentage.toFixed(1)}%
																	</span>
																	<div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
																		<div
																			className="bg-blue-500 h-2 rounded-full"
																			style={{ width: `${barPercentage}%` }}
																		></div>
																	</div>
																</div>
															</td>
														</tr>
													)
												})}
									</tbody>
								</table>
							</div>
						</div>

						<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-6 border border-input">
							<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Resumen</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Tipos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{stats.revenueByExamType?.length || 0}
									</p>
								</div>
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Casos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{stats.revenueByExamType?.reduce((sum: number, e: any) => sum + e.count, 0) || 0}
									</p>
								</div>
								<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
									<p className="text-sm text-gray-500 dark:text-gray-400">Total de Ingresos</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
										{formatCurrency(
											stats.revenueByExamType?.reduce((sum: number, e: any) => sum + e.revenue, 0) || 0
										)}
									</p>
								</div>
							</div>
						</div>
					</div>
				)

			default:
				return (
					<div className="text-center py-8">
						<p className="text-gray-500 dark:text-gray-400">
							No hay datos detallados disponibles para esta estadística
						</p>
					</div>
				)
		}
	}

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50 z-[99999998]"
					/>

					{/* Main Panel */}
					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="fixed right-0 top-0 h-full w-full sm:w-2/3 lg:w-1/2 xl:w-2/5 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] shadow-2xl z-[99999999] overflow-y-auto rounded-lg border-l border-input flex flex-col"
					>
						{/* Header */}
						<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] border-b border-input p-3 sm:p-6 z-10">
							<div className="flex items-center justify-between">
								<div>
									<h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{getStatTitle()}</h2>
									<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
										{selectedMonth && `Datos para ${format(selectedMonth, 'MMMM yyyy', { locale: es })}`}
									</p>
								</div>
								<button
									onClick={onClose}
									className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none"
								>
									<X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="p-3 sm:p-6 overflow-y-auto flex-1">{renderContent()}</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

export default StatDetailPanel
