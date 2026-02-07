import EyeTrackingComponent from '@features/dashboard/components/RobotTraking'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { getAseguradorasStats } from '@services/supabase/aseguradoras/aseguradoras-stats-service'
import { getPolizaById } from '@services/supabase/aseguradoras/polizas-service'
import { findAseguradoraById } from '@services/supabase/aseguradoras/aseguradoras-service'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@shared/utils/number-utils'
import { Building2, DollarSign, Calendar, TrendingUp, ChevronRight, Users, FileCheck, CalendarClock, XCircle, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { PolizaDetailPanel } from '@features/aseguradoras/components/PolizaDetailPanel'
import { AseguradoraHistoryModal } from '@features/aseguradoras/components/AseguradoraHistoryModal'
import AseguradorasStatDetailPanel, { type AseguradorasCardType } from '@features/aseguradoras/components/AseguradorasStatDetailPanel'

const AseguradorasHomePage = () => {
	const [selectedMesIndex, setSelectedMesIndex] = useState<number | null>(null)
	const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null)
	const [selectedPolizaId, setSelectedPolizaId] = useState<string | null>(null)
	const [selectedAseguradoraId, setSelectedAseguradoraId] = useState<string | null>(null)
	const [selectedCardDetail, setSelectedCardDetail] = useState<AseguradorasCardType | null>(null)

	const { data, isLoading } = useQuery({
		queryKey: ['aseguradoras-stats'],
		queryFn: getAseguradorasStats,
		staleTime: 1000 * 60 * 5,
	})
	const { data: selectedPoliza, isLoading: loadingPoliza } = useQuery({
		queryKey: ['poliza', selectedPolizaId],
		queryFn: () => getPolizaById(selectedPolizaId!),
		enabled: !!selectedPolizaId,
		staleTime: 1000 * 60 * 2,
	})
	const { data: selectedAseguradora } = useQuery({
		queryKey: ['aseguradora', selectedAseguradoraId],
		queryFn: () => findAseguradoraById(selectedAseguradoraId!),
		enabled: !!selectedAseguradoraId,
		staleTime: 1000 * 60 * 2,
	})
	const { profile } = useUserProfile()
	const { laboratory } = useLaboratory()

	return (
		<div className="overflow-x-hidden">
			<div className="mb-4 sm:mb-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
					<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
						Resumen del módulo de aseguradoras de Inntegras
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-3 md:gap-4">
				<Card className="col-span-1 sm:col-span-2 lg:col-span-12 dark:bg-background bg-white rounded-xl py-2 sm:py-4 md:py-6 px-2 sm:px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20">
					<div className="flex-1 text-center sm:text-left mb-2 sm:mb-0">
						<div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 mb-1 sm:mb-2">
							<div>
								<h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
									Bienvenido a {laboratory?.name || 'Inntegras'}
								</h1>
								<div className="flex items-center justify-center sm:justify-start gap-2 mt-1 font-semibold">
									{profile?.display_name && (
										<span className="text-sm sm:text-md" style={{ color: laboratory?.branding?.primaryColor || undefined }}>
											{profile.display_name}
										</span>
									)}
								</div>
							</div>
						</div>
						<p className="text-gray-600 dark:text-gray-300 mb-1 sm:mb-2 md:mb-4 text-xs sm:text-sm md:text-base">
							Gestiona el portafolio de asegurados, pólizas y pagos.
						</p>
					</div>
					<div className="relative">
						<div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-5 animate-pulse"></div>
						<EyeTrackingComponent className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 z-10" />
					</div>
				</Card>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 mt-4">
				<Card className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer">
					<CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-4">
						<Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
						<CardTitle className="text-xs sm:text-sm text-gray-500">Asegurados</CardTitle>
					</CardHeader>
					<CardContent className="text-xl sm:text-2xl font-semibold p-3 pt-0 sm:p-4 sm:pt-0">
						{isLoading ? '...' : data?.asegurados ?? 0}
					</CardContent>
				</Card>
				<Card className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer">
					<CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-4">
						<Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
						<CardTitle className="text-xs sm:text-sm text-gray-500">Aseguradoras</CardTitle>
					</CardHeader>
					<CardContent className="text-xl sm:text-2xl font-semibold p-3 pt-0 sm:p-4 sm:pt-0">
						{isLoading ? '...' : data?.aseguradoras ?? 0}
					</CardContent>
				</Card>
				<Card className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer">
					<CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-4">
						<FileCheck className="w-4 h-4 text-gray-500 flex-shrink-0" />
						<CardTitle className="text-xs sm:text-sm text-gray-500">Pólizas</CardTitle>
					</CardHeader>
					<CardContent className="text-xl sm:text-2xl font-semibold p-3 pt-0 sm:p-4 sm:pt-0">
						{isLoading ? '...' : data?.polizas ?? 0}
					</CardContent>
				</Card>
				<Card className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer">
					<CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-4">
						<CalendarClock className="w-4 h-4 text-gray-500 flex-shrink-0" />
						<CardTitle className="text-xs sm:text-sm text-gray-500">Por vencer (30d)</CardTitle>
					</CardHeader>
					<CardContent className="text-xl sm:text-2xl font-semibold p-3 pt-0 sm:p-4 sm:pt-0">
						{isLoading ? '...' : data?.porVencer ?? 0}
					</CardContent>
				</Card>
				<Card className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer">
					<CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-4">
						<XCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
						<CardTitle className="text-xs sm:text-sm text-gray-500">Vencidas</CardTitle>
					</CardHeader>
					<CardContent className="text-xl sm:text-2xl font-semibold p-3 pt-0 sm:p-4 sm:pt-0">
						{isLoading ? '...' : data?.vencidas ?? 0}
					</CardContent>
				</Card>
				<Card className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer">
					<CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-4">
						<CreditCard className="w-4 h-4 text-gray-500 flex-shrink-0" />
						<CardTitle className="text-xs sm:text-sm text-gray-500">Pagos</CardTitle>
					</CardHeader>
					<CardContent className="text-xl sm:text-2xl font-semibold p-3 pt-0 sm:p-4 sm:pt-0">
						{isLoading ? '...' : data?.pagos ?? 0}
					</CardContent>
				</Card>
				<Card className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer">
					<CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-4">
						<DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
						<CardTitle className="text-xs sm:text-sm text-gray-500">Mes</CardTitle>
					</CardHeader>
					<CardContent className="text-lg sm:text-2xl font-semibold text-green-600 dark:text-green-400 p-3 pt-0 sm:p-4 sm:pt-0">
						{isLoading ? '...' : formatCurrency(data?.totalCobradoMes ?? 0)}
					</CardContent>
				</Card>
				<Card className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer">
					<CardHeader className="flex flex-row items-center gap-2 p-3 sm:p-4">
						<TrendingUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
						<CardTitle className="text-xs sm:text-sm text-gray-500">Año</CardTitle>
					</CardHeader>
					<CardContent className="text-lg sm:text-2xl font-semibold text-green-600 dark:text-green-400 p-3 pt-0 sm:p-4 sm:pt-0">
						{isLoading ? '...' : formatCurrency(data?.totalCobrado12M ?? 0)}
					</CardContent>
				</Card>
			</div>

			{/* Próximos vencimientos + Top aseguradoras */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-4 md:gap-5">
				<Card
					className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
					onClick={() => setSelectedCardDetail('proximos_vencimientos')}
				>
					<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
						<div className="flex items-center justify-between mb-3 sm:mb-4">
							<h3 className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
								<Calendar className="w-5 h-5 text-amber-500" />
								Próximos vencimientos
							</h3>
							<Link
								to="/aseguradoras/pagos"
								className="text-sm font-medium text-primary hover:underline flex items-center gap-0.5"
								onClick={(e) => e.stopPropagation()}
							>
								Ver todas <ChevronRight className="w-4 h-4" />
							</Link>
						</div>
						{isLoading ? (
							<div className="flex items-center justify-center h-32">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
							</div>
						) : (data?.proximosVencimientos?.length ?? 0) > 0 ? (
							<ul className="space-y-2">
								{data!.proximosVencimientos.map((p) => (
									<li
										key={p.id}
										className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:border-primary/30"
									>
										<div className="min-w-0">
											<p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
												{p.numero_poliza} · {p.asegurado_nombre}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												{format(new Date(p.fecha_prox_vencimiento), "d MMM yyyy", { locale: es })}
											</p>
										</div>
									</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
								No hay vencimientos próximos
							</p>
						)}
					</div>
				</Card>

				<Card
					className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
					onClick={() => setSelectedCardDetail('top_aseguradoras')}
				>
					<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
						<h3 className="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 flex items-center gap-2">
							<Building2 className="w-5 h-5 text-primary" />
							Top aseguradoras (por pólizas)
						</h3>
						{isLoading ? (
							<div className="flex items-center justify-center h-32">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
							</div>
						) : (data?.topAseguradorasPorPolizas?.length ?? 0) > 0 ? (
							<div className="space-y-2">
								{data!.topAseguradorasPorPolizas.map((a, i) => {
									const maxP = Math.max(...data!.topAseguradorasPorPolizas.map((x) => x.polizas), 1)
									const pct = (a.polizas / maxP) * 100
									return (
										<div
											key={a.id}
											className="group space-y-1 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800/50"
										>
											<div className="flex items-center justify-between text-sm">
												<span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">
													{a.nombre}
												</span>
												<span className="text-gray-500 dark:text-gray-400 font-semibold">
													{a.polizas} pólizas
												</span>
											</div>
											<div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
												<div
													className="h-2 rounded-full bg-primary/80 transition-all duration-300 group-hover:bg-primary"
													style={{ width: `${pct}%` }}
												/>
											</div>
										</div>
									)
								})}
							</div>
						) : (
							<p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
								Sin datos
							</p>
						)}
					</div>
				</Card>
			</div>

			{/* Gráficas */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-4 md:gap-5">
				{/* Donut: Pólizas por estado */}
				<Card
					className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
					onClick={() => setSelectedCardDetail('polizas_por_estado')}
				>
					<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
						<h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
							Pólizas por estado
						</h3>
						{isLoading ? (
							<div className="flex items-center justify-center h-64">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							</div>
						) : (() => {
							const pieData = [
								{ name: 'Vigentes', value: data?.vigentes ?? 0, color: '#22c55e' },
								{ name: 'Por vencer (30d)', value: data?.porVencer ?? 0, color: '#f59e0b' },
								{ name: 'Vencidas', value: data?.vencidas ?? 0, color: '#ef4444' },
							].filter((d) => d.value > 0)
							return (
							<div className="flex flex-col sm:flex-row items-center gap-4">
								<div className="h-56 w-full sm:w-56 relative flex-shrink-0">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart onMouseLeave={() => setHoveredPieIndex(null)}>
											<Pie
												data={pieData.length ? pieData : [{ name: 'Sin datos', value: 1, color: '#e5e7eb' }]}
												cx="50%"
												cy="50%"
												innerRadius={48}
												outerRadius={72}
												paddingAngle={2}
												dataKey="value"
												activeIndex={hoveredPieIndex ?? undefined}
												activeShape={{ outerRadius: 76, strokeWidth: 2, stroke: 'currentColor', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
												onMouseEnter={(_: unknown, index: number) => setHoveredPieIndex(index)}
												onMouseLeave={() => setHoveredPieIndex(null)}
											>
												{(pieData.length ? pieData : [{ name: 'Sin datos', value: 1, color: '#e5e7eb' }]).map((entry, idx) => (
													<Cell
														key={entry.name}
														fill={entry.color}
														stroke="transparent"
														className="transition-opacity duration-200"
														style={{ opacity: hoveredPieIndex === null || hoveredPieIndex === idx ? 1 : 0.7 }}
													/>
												))}
											</Pie>
										</PieChart>
									</ResponsiveContainer>
									<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
										<div className="text-center">
											<p className="text-lg font-bold text-gray-700 dark:text-gray-300">{data?.polizas ?? 0}</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
										</div>
									</div>
								</div>
								<div className="flex flex-col gap-2 justify-center sm:justify-start">
									{[
										{ label: 'Vigentes', value: data?.vigentes ?? 0, color: '#22c55e' },
										{ label: 'Por vencer (30d)', value: data?.porVencer ?? 0, color: '#f59e0b' },
										{ label: 'Vencidas', value: data?.vencidas ?? 0, color: '#ef4444' },
									].map((item) => (
										<div
											key={item.label}
											className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-default"
											onMouseEnter={() => {
												const idx = pieData.findIndex((d) => d.name === item.label)
												setHoveredPieIndex(idx >= 0 ? idx : null)
											}}
											onMouseLeave={() => setHoveredPieIndex(null)}
										>
											<div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{item.label}: <strong>{item.value}</strong>
											</span>
										</div>
									))}
								</div>
							</div>
							)
						})()}
					</div>
				</Card>

				{/* Barras: Pagos por mes */}
				<Card
					className="shadow-lg transition-transform duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
					onClick={() => setSelectedCardDetail('pagos_por_mes')}
				>
					<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-4 md:p-6">
						<h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300 mb-1">
							Pagos por mes
						</h3>
						{!isLoading && data?.pagosPorMes?.length && selectedMesIndex !== null && data.pagosPorMes[selectedMesIndex] && (
							<p className="text-sm text-green-600 dark:text-green-400 font-semibold mb-3">
								{data.pagosPorMes[selectedMesIndex].month}: {formatCurrency(data.pagosPorMes[selectedMesIndex].monto)}
								<span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
									({data.pagosPorMes[selectedMesIndex].count} pagos)
								</span>
							</p>
						)}
						{isLoading ? (
							<div className="flex items-center justify-center h-64">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							</div>
						) : (
							<>
								<div className="relative h-36 sm:h-48 md:h-56 flex items-end justify-between gap-0.5 sm:gap-1 md:gap-2">
									{(data?.pagosPorMes?.length ? data.pagosPorMes : []).map((mes, index) => {
										const maxCount = Math.max(...(data?.pagosPorMes?.map((m) => m.count) || [1]), 1)
										const height = maxCount > 0 ? (mes.count / maxCount) * 100 : 0
										const isSelected = selectedMesIndex === index
										return (
											<button
												type="button"
												key={mes.monthShort + mes.monthIndex + index}
												className={`flex-1 rounded-t-sm transition-all duration-200 cursor-pointer min-w-0 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 ${
													isSelected
														? 'bg-gradient-to-t from-primary to-primary/90 ring-2 ring-primary ring-offset-2 dark:ring-offset-background'
														: 'bg-gradient-to-t from-primary/80 to-primary hover:from-primary hover:to-primary/90'
												}`}
												style={{ height: `${Math.max(height, 4)}%` }}
												title={`${mes.month}: ${mes.count} pagos · ${formatCurrency(mes.monto)}`}
												onClick={(e) => {
													e.stopPropagation()
													setSelectedMesIndex(index)
												}}
											/>
										)
									})}
								</div>
								<div className="flex justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-4">
									{(data?.pagosPorMes || []).map((mes, index) => (
										<button
											type="button"
											key={mes.monthShort + mes.monthIndex + index}
											className={`flex-shrink-0 truncate hover:text-primary ${selectedMesIndex === index ? 'text-primary font-semibold' : ''}`}
											title={mes.month}
											onClick={(e) => {
												e.stopPropagation()
												setSelectedMesIndex(index)
											}}
										>
											{mes.monthShort}
										</button>
									))}
								</div>
							</>
						)}
					</div>
				</Card>
			</div>

			{/* Panel detalle póliza (desde Próximos vencimientos) */}
			<PolizaDetailPanel
				poliza={selectedPoliza ?? null}
				isOpen={!!selectedPolizaId}
				onClose={() => setSelectedPolizaId(null)}
			/>

			{/* Modal historial aseguradora (desde Top aseguradoras) */}
			<AseguradoraHistoryModal
				isOpen={!!selectedAseguradoraId}
				onClose={() => setSelectedAseguradoraId(null)}
				aseguradora={selectedAseguradora ?? null}
			/>

			{/* Panel lateral detalle (como StatDetailPanel en dashboard) */}
			<AseguradorasStatDetailPanel
				isOpen={!!selectedCardDetail}
				onClose={() => setSelectedCardDetail(null)}
				cardType={selectedCardDetail}
				stats={data ?? null}
				isLoading={isLoading}
				onPolizaClick={setSelectedPolizaId}
				onAseguradoraClick={setSelectedAseguradoraId}
			/>
		</div>
	)
}

export default AseguradorasHomePage
