import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Calendar, Building2, PieChart as PieChartIcon, BarChart3 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency } from '@shared/utils/number-utils'
import type { AseguradorasStats } from '@services/supabase/aseguradoras/aseguradoras-stats-service'
import { getPolizasByEstado, type Poliza } from '@services/supabase/aseguradoras/polizas-service'
import { getPagosByMonth } from '@services/supabase/aseguradoras/pagos-poliza-service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs'

export type AseguradorasCardType =
	| 'proximos_vencimientos'
	| 'top_aseguradoras'
	| 'polizas_por_estado'
	| 'pagos_por_mes'

interface AseguradorasStatDetailPanelProps {
	isOpen: boolean
	onClose: () => void
	cardType: AseguradorasCardType | null
	stats: AseguradorasStats | null
	isLoading: boolean
	onPolizaClick?: (id: string) => void
	onAseguradoraClick?: (id: string) => void
}

const AseguradorasStatDetailPanel: React.FC<AseguradorasStatDetailPanelProps> = ({
	isOpen,
	onClose,
	cardType,
	stats,
	isLoading,
	onPolizaClick,
	onAseguradoraClick,
}) => {
	useBodyScrollLock(isOpen)
	useGlobalOverlayOpen(isOpen)

	const [pagosPanelMonthIndex, setPagosPanelMonthIndex] = useState<number>(11)

	const getTitle = () => {
		switch (cardType) {
			case 'proximos_vencimientos':
				return 'Próximos vencimientos'
			case 'top_aseguradoras':
				return 'Top aseguradoras (por pólizas)'
			case 'polizas_por_estado':
				return 'Pólizas por estado'
			case 'pagos_por_mes':
				return 'Pagos por mes'
			default:
				return 'Detalle'
		}
	}

	const renderContent = () => {
		if (!cardType) return null
		if (isLoading || !stats) {
			return (
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
				</div>
			)
		}

		switch (cardType) {
			case 'proximos_vencimientos': {
				const list = stats.proximosVencimientos ?? []
				return (
					<div className="space-y-4">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Pólizas con próximo vencimiento en los próximos 30 días.
						</p>
						{list.length === 0 ? (
							<p className="text-sm text-gray-500 dark:text-gray-400 py-4">No hay vencimientos próximos.</p>
						) : (
							<ul className="space-y-2">
								{list.map((p) => (
									<li
										key={p.id}
										role="button"
										tabIndex={0}
										onClick={() => onPolizaClick?.(p.id)}
										onKeyDown={(e) => e.key === 'Enter' && onPolizaClick?.(p.id)}
										className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer"
									>
										<span className="text-sm font-medium text-gray-800 dark:text-gray-200">
											{p.numero_poliza} · {p.asegurado_nombre}
										</span>
										<span className="text-xs text-gray-500 dark:text-gray-400">
											{format(new Date(p.fecha_prox_vencimiento), 'd MMM yyyy', { locale: es })}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>
				)
			}

			case 'top_aseguradoras': {
				const list = stats.topAseguradorasPorPolizas ?? []
				const maxP = Math.max(...list.map((x) => x.polizas), 1)
				return (
					<div className="space-y-4">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Aseguradoras con más pólizas en el laboratorio.
						</p>
						{list.length === 0 ? (
							<p className="text-sm text-gray-500 dark:text-gray-400 py-4">Sin datos.</p>
						) : (
							<div className="space-y-2">
								{list.map((a) => (
									<div
										key={a.id}
										role="button"
										tabIndex={0}
										onClick={() => onAseguradoraClick?.(a.id)}
										onKeyDown={(e) => e.key === 'Enter' && onAseguradoraClick?.(a.id)}
										className="group space-y-1 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
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
												className="h-2 rounded-full bg-primary/80 transition-all group-hover:bg-primary"
												style={{ width: `${(a.polizas / maxP) * 100}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)
			}

			case 'polizas_por_estado':
				return <PolizasPorEstadoContent onPolizaClick={onPolizaClick} />

			case 'pagos_por_mes':
				return (
					<PagosPorMesContent
						stats={stats}
						selectedMonthIndex={pagosPanelMonthIndex}
						onMonthChange={setPagosPanelMonthIndex}
					/>
				)

			default:
				return null
		}
	}

	if (!isOpen) return null

	return (
		<AnimatePresence>
			{isOpen && cardType && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50 z-[99999998]"
					/>
					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="fixed right-0 top-0 h-full w-full sm:w-2/3 lg:w-1/2 xl:w-2/5 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] shadow-2xl z-[99999999] overflow-y-auto rounded-lg border-l border-input flex flex-col"
					>
						<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[10px] border-b border-input p-3 sm:p-6 z-10">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									{cardType === 'proximos_vencimientos' && <Calendar className="w-5 h-5 text-amber-500" />}
									{cardType === 'top_aseguradoras' && <Building2 className="w-5 h-5 text-primary" />}
									{cardType === 'polizas_por_estado' && <PieChartIcon className="w-5 h-5 text-primary" />}
									{cardType === 'pagos_por_mes' && <BarChart3 className="w-5 h-5 text-primary" />}
									<h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{getTitle()}</h2>
								</div>
								<button
									onClick={onClose}
									className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
									aria-label="Cerrar"
								>
									<X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
								</button>
							</div>
						</div>
						<div className="p-3 sm:p-6 overflow-y-auto flex-1">{renderContent()}</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

function PolizasPorEstadoContent({ onPolizaClick }: { onPolizaClick?: (id: string) => void }) {
	const [activeTab, setActiveTab] = useState<'vigentes' | 'por_vencer' | 'vencidas'>('vigentes')
	const { data: list = [], isLoading } = useQuery({
		queryKey: ['polizas-by-estado', activeTab],
		queryFn: () => getPolizasByEstado(activeTab),
		staleTime: 1000 * 60,
	})

	return (
		<div className="space-y-4">
			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="vigentes">Vigentes</TabsTrigger>
					<TabsTrigger value="por_vencer">Por vencer (30d)</TabsTrigger>
					<TabsTrigger value="vencidas">Vencidas</TabsTrigger>
				</TabsList>
				<TabsContent value={activeTab} className="mt-4">
					{isLoading ? (
						<div className="flex justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
						</div>
					) : list.length === 0 ? (
						<p className="text-sm text-gray-500 dark:text-gray-400 py-4">No hay pólizas en este estado.</p>
					) : (
						<ul className="space-y-2">
							{list.map((p: Poliza) => (
								<li
									key={p.id}
									role="button"
									tabIndex={0}
									onClick={() => onPolizaClick?.(p.id)}
									onKeyDown={(e) => e.key === 'Enter' && onPolizaClick?.(p.id)}
									className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer"
								>
									<span className="text-sm font-medium text-gray-800 dark:text-gray-200">
										{p.numero_poliza}
										{p.asegurado?.full_name && ` · ${p.asegurado.full_name}`}
									</span>
									<span className="text-xs text-gray-500 dark:text-gray-400">
										{format(new Date(p.fecha_prox_vencimiento || p.fecha_vencimiento), 'd MMM yyyy', { locale: es })}
									</span>
								</li>
							))}
						</ul>
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}

function PagosPorMesContent({
	stats,
	selectedMonthIndex,
	onMonthChange,
}: {
	stats: AseguradorasStats
	selectedMonthIndex: number
	onMonthChange: (index: number) => void
}) {
	const pagosPorMes = stats.pagosPorMes ?? []
	const hasData = pagosPorMes.length > 0
	const safeIndex = hasData ? Math.min(selectedMonthIndex, pagosPorMes.length - 1) : 0
	const selectedMonth = hasData ? pagosPorMes[safeIndex] : null
	const d =
		hasData && pagosPorMes[safeIndex]
			? new Date(new Date().getFullYear(), new Date().getMonth() - 11 + safeIndex, 1)
			: new Date()
	const year = d.getFullYear()
	const month = d.getMonth() + 1

	const { data: pagosList = [], isLoading } = useQuery({
		queryKey: ['pagos-by-mes', year, month],
		queryFn: () => getPagosByMonth(year, month),
		enabled: hasData,
		staleTime: 1000 * 60,
	})

	return (
		<div className="space-y-4">
			{hasData && (
				<>
					<div className="flex flex-wrap gap-2">
						{pagosPorMes.map((mes, index) => (
							<button
								key={mes.monthShort + index}
								type="button"
								onClick={() => onMonthChange(index)}
								className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
									index === safeIndex
										? 'bg-primary text-primary-foreground'
										: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
								}`}
							>
								{mes.monthShort}
							</button>
						))}
					</div>
					{selectedMonth && (
						<p className="text-sm text-green-600 dark:text-green-400 font-semibold">
							{selectedMonth.month}: {formatCurrency(selectedMonth.monto)}
							<span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
								({selectedMonth.count} pagos)
							</span>
						</p>
					)}
				</>
			)}
			{!hasData && <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos de pagos por mes.</p>}
			{hasData && (
				<>
					{isLoading ? (
						<div className="flex justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
						</div>
					) : pagosList.length === 0 ? (
						<p className="text-sm text-gray-500 dark:text-gray-400 py-4">No hay pagos en este mes.</p>
					) : (
						<ul className="space-y-2">
							{pagosList.map(
								(pago: {
									id: string
									monto: number
									fecha_pago: string
									metodo_pago?: string | null
									poliza?: { numero_poliza?: string }
								}) => (
									<li
										key={pago.id}
										className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
									>
										<div>
											<p className="text-sm font-medium text-gray-800 dark:text-gray-200">
												{formatCurrency(pago.monto)}
												{pago.poliza?.numero_poliza && ` · ${pago.poliza.numero_poliza}`}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												{format(new Date(pago.fecha_pago), 'd MMM yyyy', { locale: es })}
												{pago.metodo_pago && ` · ${pago.metodo_pago}`}
											</p>
										</div>
									</li>
								),
							)}
						</ul>
					)}
				</>
			)}
		</div>
	)
}

export default AseguradorasStatDetailPanel
