import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, BarChart3, DollarSign, Users, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { CustomPieChart } from '@shared/components/ui/custom-pie-chart'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'
import { formatCurrency, formatNumber } from '@shared/utils/number-utils'

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
														{formatNumber(exam.count)} casos
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

			case 'examTypes':
				return (
					<div className="space-y-6">
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
														{formatNumber(exam.count)} casos
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
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ingresos por Tipo de Examen</h3>
							</div>
							<div className="space-y-4">
								{stats.revenueByExamType &&
									stats.revenueByExamType.slice(0, 5).map((exam: any) => {
										const maxRevenue = Math.max(...stats.revenueByExamType.map((e: any) => e.revenue))
										const percentage = maxRevenue > 0 ? (exam.revenue / maxRevenue) * 100 : 0

										return (
											<div key={exam.examType}>
												<div className="flex items-center justify-between mb-1">
													<span className="text-sm text-gray-600 dark:text-gray-400">{exam.examType}</span>
													<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
														{formatCurrency(exam.revenue)}
													</span>
												</div>
												<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
													<div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
												</div>
												<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
													<span>{formatNumber(exam.count)} casos</span>
													<span>
														{stats.monthlyRevenue > 0 ? ((exam.revenue / stats.monthlyRevenue) * 100).toFixed(1) : 0}%
														del total del mes
													</span>
												</div>
											</div>
										)
									})}
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
