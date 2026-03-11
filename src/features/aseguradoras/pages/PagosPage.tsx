import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@shared/components/ui/button'
import { Card } from '@shared/components/ui/card'
import { Input } from '@shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@shared/components/ui/dialog'
import { Label } from '@shared/components/ui/label'
import { useToast } from '@shared/hooks/use-toast'
import {
	DollarSign,
	Download,
	Search,
	ChevronLeft,
	ChevronRight,
	FileText,
	CalendarDays,
	Upload,
	X,
	Receipt,
} from 'lucide-react'
import {
	getPolizas,
	updatePoliza,
	getNextPaymentDateOnMarkPaidPoliza,
	type Poliza,
} from '@services/supabase/aseguradoras/polizas-service'
import {
	createPagoPoliza,
	getPagosPoliza,
	type PagoPoliza,
} from '@services/supabase/aseguradoras/pagos-poliza-service'
import { PolizaDetailPanel } from '@features/aseguradoras/components/PolizaDetailPanel'
import { uploadReciboPago, validateReciboFile } from '@services/supabase/storage/pagos-poliza-recibos-service'
import { exportRowsToExcel } from '@shared/utils/exportToExcel'

const METODOS_PAGO = [
	{ value: 'Zelle', label: 'Zelle' },
	{ value: 'Zinli', label: 'Zinli' },
	{ value: 'Transferencia internacional', label: 'Transferencia internacional' },
	{ value: 'Transferencia nacional', label: 'Transferencia nacional' },
	{ value: 'Efectivo', label: 'Efectivo' },
] as const

const PERIODOS_OPCIONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/** Diferencia en días entre hoy (local) y la fecha de vencimiento. La fecha se interpreta como día natural en hora local para evitar desfases por UTC. */
const daysBetween = (dateStr: string | null) => {
	if (!dateStr) return null
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const iso = dateStr.slice(0, 10).replace(/-/g, '-')
	const [y, m, d] = iso.split('-').map(Number)
	if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null
	const due = new Date(y, m - 1, d)
	due.setHours(0, 0, 0, 0)
	const diff = due.getTime() - today.getTime()
	return Math.round(diff / (1000 * 60 * 60 * 24))
}

const formatDateForDisplay = (dateStr: string) => {
	const d = new Date(dateStr + 'T12:00:00')
	return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type PagoWithPoliza = PagoPoliza & { poliza?: { id: string; numero_poliza: string } }

const PagosPage = () => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const [polizaSearch, setPolizaSearch] = useState('')
	const [polizaPage, setPolizaPage] = useState(1)
	const [polizaItemsPerPage, setPolizaItemsPerPage] = useState(8)
	const [historialSearch, setHistorialSearch] = useState('')
	const [historialPage, setHistorialPage] = useState(1)
	const [historialItemsPerPage, setHistorialItemsPerPage] = useState(8)
	const [openModal, setOpenModal] = useState(false)
	const [selectedPoliza, setSelectedPoliza] = useState<Poliza | null>(null)
	const [polizaPanelOpen, setPolizaPanelOpen] = useState(false)
	const [selectedPolizaForPanel, setSelectedPolizaForPanel] = useState<Poliza | null>(null)
	const [form, setForm] = useState({
		fecha_pago: '',
		monto: '',
		metodo_pago: '',
		referencia: '',
		documento_pago_url: '',
		notas: '',
		periodosAPagar: 1,
	})
	const [saving, setSaving] = useState(false)
	const [uploadingRecibo, setUploadingRecibo] = useState(false)
	const [reciboFileName, setReciboFileName] = useState<string | null>(null)
	const fileInputRef = React.useRef<HTMLInputElement>(null)
	const [nextPaymentDateAlert, setNextPaymentDateAlert] = useState<string | null>(null)
	const [detallePagoOpen, setDetallePagoOpen] = useState(false)
	const [selectedPago, setSelectedPago] = useState<PagoWithPoliza | null>(null)

	const { data: polizasData } = useQuery({
		queryKey: ['polizas-pagos'],
		queryFn: () => getPolizas(1, 500, undefined, 'next_payment_date', 'asc'),
		staleTime: 1000 * 60 * 5,
	})

	const { data: pagosData } = useQuery({
		queryKey: ['pagos-poliza'],
		queryFn: () => getPagosPoliza(1, 300),
		staleTime: 1000 * 60 * 5,
	})

	const polizas = useMemo(() => polizasData?.data ?? [], [polizasData])
	const pagos = useMemo(() => pagosData?.data ?? [], [pagosData])

	const polizasSorted = useMemo(() => {
		const list = [...polizas]
		list.sort((a, b) => {
			const dateA = a.next_payment_date ?? a.fecha_prox_vencimiento ?? a.fecha_vencimiento ?? ''
			const dateB = b.next_payment_date ?? b.fecha_prox_vencimiento ?? b.fecha_vencimiento ?? ''
			if (!dateA && !dateB) return 0
			if (!dateA) return 1
			if (!dateB) return -1
			return dateA.localeCompare(dateB)
		})
		return list
	}, [polizas])

	const filteredPolizas = useMemo(() => {
		if (!polizaSearch.trim()) return polizasSorted
		const q = polizaSearch.trim().toLowerCase()
		return polizasSorted.filter(
			(row) =>
				[row.numero_poliza, row.asegurado?.full_name, row.asegurado?.document_id]
					.filter(Boolean)
					.some((v) => String(v).toLowerCase().includes(q)),
		)
	}, [polizasSorted, polizaSearch])

	const filteredPagos = useMemo(() => {
		if (!historialSearch.trim()) return pagos
		const q = historialSearch.trim().toLowerCase()
		return pagos.filter((row) =>
			[row.poliza?.numero_poliza, row.referencia, row.metodo_pago].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
		)
	}, [pagos, historialSearch])

	const polizaTotalPages = Math.max(1, Math.ceil(filteredPolizas.length / polizaItemsPerPage))
	const polizaPageData = useMemo(() => {
		const from = (polizaPage - 1) * polizaItemsPerPage
		return filteredPolizas.slice(from, from + polizaItemsPerPage)
	}, [filteredPolizas, polizaPage, polizaItemsPerPage])

	const historialTotalPages = Math.max(1, Math.ceil(filteredPagos.length / historialItemsPerPage))
	const historialPageData = useMemo(() => {
		const from = (historialPage - 1) * historialItemsPerPage
		return filteredPagos.slice(from, from + historialItemsPerPage)
	}, [filteredPagos, historialPage, historialItemsPerPage])

	const openPagoModal = (poliza: Poliza) => {
		setSelectedPoliza(poliza)
		setForm({
			fecha_pago: new Date().toLocaleDateString('en-CA'),
			monto: '',
			metodo_pago: '',
			referencia: '',
			documento_pago_url: '',
			notas: '',
			periodosAPagar: 1,
		})
		setReciboFileName(null)
		if (fileInputRef.current) fileInputRef.current.value = ''
		setOpenModal(true)
	}

	const handleReciboFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file || !selectedPoliza) return
		const validation = validateReciboFile(file)
		if (!validation.valid) {
			toast({ title: 'Archivo inválido', description: validation.error, variant: 'destructive' })
			return
		}
		setUploadingRecibo(true)
		try {
			const { data, error } = await uploadReciboPago(file, selectedPoliza.id)
			if (error) throw error
			if (data) {
				setForm((prev) => ({ ...prev, documento_pago_url: data }))
				setReciboFileName(file.name)
				toast({ title: 'Archivo adjuntado' })
			}
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al subir archivo', variant: 'destructive' })
		} finally {
			setUploadingRecibo(false)
			if (fileInputRef.current) fileInputRef.current.value = ''
		}
	}

	const handleRemoveRecibo = () => {
		setForm((prev) => ({ ...prev, documento_pago_url: '' }))
		setReciboFileName(null)
		if (fileInputRef.current) fileInputRef.current.value = ''
	}

	const handleSave = async () => {
		if (!selectedPoliza) return
		const periodos = Math.max(1, Math.min(12, Number(form.periodosAPagar) || 1))
		if (!form.fecha_pago || !form.monto) {
			toast({ title: 'Completa fecha y monto', variant: 'destructive' })
			return
		}
		setSaving(true)
		try {
			await createPagoPoliza({
				poliza_id: selectedPoliza.id,
				fecha_pago: form.fecha_pago,
				monto: Number(form.monto),
				metodo_pago: form.metodo_pago || null,
				referencia: form.referencia || null,
				documento_pago_url: form.documento_pago_url || null,
				notas: form.notas || null,
			})

			let nextDate: string | null = null
			for (let i = 0; i < periodos; i++) {
				nextDate = await getNextPaymentDateOnMarkPaidPoliza(selectedPoliza.id)
				if (!nextDate) break
				await updatePoliza(selectedPoliza.id, {
					next_payment_date: nextDate,
					payment_status: 'current',
					fecha_prox_vencimiento: nextDate,
					estatus_pago: 'Pagado',
				})
			}

			queryClient.invalidateQueries({ queryKey: ['pagos-poliza'] })
			queryClient.invalidateQueries({ queryKey: ['polizas-pagos'] })
			toast({ title: 'Pago registrado' })
			setOpenModal(false)
			if (nextDate) setNextPaymentDateAlert(nextDate)
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al registrar pago', variant: 'destructive' })
		} finally {
			setSaving(false)
		}
	}

	const openDetallePago = (pago: PagoWithPoliza) => {
		setSelectedPago(pago)
		setDetallePagoOpen(true)
	}

	return (
		<div>
			<div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Pagos</h1>
					<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
				</div>
			</div>

			{/* Sección 1: Pólizas (cards ordenadas por próximo vencimiento) */}
			<Card className="overflow-hidden flex flex-col min-w-0 mb-4">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col sm:flex-row sm:items-center gap-3">
						<div className="relative flex-1 min-w-0">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								className="pl-9"
								placeholder="Buscar por póliza o asegurado"
								value={polizaSearch}
								onChange={(e) => {
									setPolizaSearch(e.target.value)
									setPolizaPage(1)
								}}
							/>
						</div>
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<span>Filas:</span>
							<Select
								value={String(polizaItemsPerPage)}
								onValueChange={(v) => {
									const n = Number(v)
									if (!Number.isNaN(n)) setPolizaItemsPerPage(n)
									setPolizaPage(1)
								}}
							>
								<SelectTrigger className="w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="4">4</SelectItem>
									<SelectItem value="8">8</SelectItem>
									<SelectItem value="16">16</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				<div className="p-4 min-h-55 flex-1 flex flex-col">
					<h2 className="text-lg font-semibold mb-2">Pólizas</h2>
					<p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
						Ordenadas por próximo vencimiento (menor a mayor). Marca como pagado para registrar el pago y actualizar la próxima fecha.
					</p>
					{filteredPolizas.length === 0 && (
						<p className="text-sm text-gray-500">No hay pólizas activas.</p>
					)}
					<div className="max-h-105 overflow-y-auto">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
							{polizaPageData.map((poliza) => {
								const dueDate = poliza.next_payment_date ?? poliza.fecha_prox_vencimiento ?? poliza.fecha_vencimiento
								const days = daysBetween(dueDate)
								const isVencido = days != null && days < 0
								const isHoy = days === 0
								const badgeText = isVencido
									? `Venció hace ${Math.abs(days)} días`
									: isHoy
										? 'Vence hoy'
										: days != null
											? `${days} días`
											: '—'
								const badgeClass = isVencido
									? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
									: isHoy
										? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
										: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
								return (
									<div
										key={poliza.id}
										className="relative bg-white dark:bg-background rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/70 dark:hover:border-primary/60 transition-colors duration-200 flex flex-col gap-2"
									>
										<div className="flex flex-wrap gap-1.5 mb-1.5">
											<span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
												{badgeText}
											</span>
											{poliza.payment_status === 'overdue' && (
												<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
													En mora
												</span>
											)}
											{poliza.modalidad_pago && (
												<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
													{poliza.modalidad_pago}
												</span>
											)}
										</div>
										<div className="flex items-center gap-2 mb-1.5">
											<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
											<p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{poliza.numero_poliza}</p>
										</div>
										<div className="mb-1.5">
											<p className="text-xs text-gray-500 dark:text-gray-400">Asegurado</p>
											<p className="text-sm text-gray-900 dark:text-gray-100 truncate">{poliza.asegurado?.full_name || 'Asegurado'}</p>
										</div>
										<div className="mb-1.5">
											<p className="text-xs text-gray-500 dark:text-gray-400">Vence</p>
											<p className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1 flex-wrap">
												<CalendarDays className="w-3 h-3 text-gray-400 shrink-0" />
												{dueDate ? formatDateForDisplay(dueDate) : '—'}
												{days != null && ` - ${days < 0 ? Math.abs(days) + ' días venc.' : days + ' días'}`}
											</p>
										</div>
										<Button
											size="sm"
											onClick={() => openPagoModal(poliza)}
											className="mt-auto"
										>
											<DollarSign className="w-4 h-4 mr-2" />
											Marcar como pagado
										</Button>
									</div>
								)
							})}
						</div>
					</div>
				</div>
				<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Página {polizaPage} de {polizaTotalPages}
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" disabled={polizaPage <= 1} onClick={() => setPolizaPage((p) => p - 1)}>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<Button variant="outline" size="sm" disabled={polizaPage >= polizaTotalPages} onClick={() => setPolizaPage((p) => p + 1)}>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</Card>

			{/* Sección 2: Historial de pagos (cards) */}
			<Card className="overflow-hidden flex flex-col min-w-0">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col sm:flex-row sm:items-center gap-3">
						<div className="relative flex-1 min-w-0">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								className="pl-9"
								placeholder="Buscar por póliza, referencia o método"
								value={historialSearch}
								onChange={(e) => {
									setHistorialSearch(e.target.value)
									setHistorialPage(1)
								}}
							/>
						</div>
						<div className="flex items-center gap-2">
							<div className="flex items-center gap-2 text-sm text-gray-500">
								<span>Filas:</span>
								<Select
									value={String(historialItemsPerPage)}
									onValueChange={(v) => {
										const n = Number(v)
										if (!Number.isNaN(n)) setHistorialItemsPerPage(n)
										setHistorialPage(1)
									}}
								>
									<SelectTrigger className="w-20">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="4">4</SelectItem>
										<SelectItem value="8">8</SelectItem>
										<SelectItem value="16">16</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									exportRowsToExcel(
										'pagos_poliza',
										filteredPagos.map((row) => ({
											Póliza: row.poliza?.numero_poliza || '',
											Fecha: row.fecha_pago,
											Monto: row.monto,
											Método: row.metodo_pago || '',
											Referencia: row.referencia || '',
										})),
									)
								}
								className="gap-2"
							>
								<Download className="w-4 h-4" />
								Exportar
							</Button>
						</div>
					</div>
				</div>
				<div className="p-4 min-h-55 flex-1 flex flex-col">
					<h2 className="text-lg font-semibold mb-2">Historial de pagos</h2>
					<p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
						Haz clic en una card para ver el detalle y el comprobante de pago.
					</p>
					{filteredPagos.length === 0 && <p className="text-sm text-gray-500">No hay pagos registrados.</p>}
					<div className="max-h-105 overflow-y-auto">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
							{historialPageData.map((pago) => (
								<div
									key={pago.id}
									role="button"
									tabIndex={0}
									onClick={() => openDetallePago(pago)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault()
											openDetallePago(pago)
										}
									}}
									className="relative bg-white dark:bg-background rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/70 dark:hover:border-primary/60 transition-colors duration-200 cursor-pointer"
								>
									<div className="flex flex-wrap gap-1.5 mb-1.5">
										<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
											Pagado
										</span>
									</div>
									<div className="flex items-center gap-2 mb-1.5">
										<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
										<p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
											{pago.poliza?.numero_poliza || 'Póliza'} {pago.referencia ? `· ${pago.referencia}` : ''}
										</p>
									</div>
									<div className="grid grid-cols-1 gap-1.5">
										<div>
											<p className="text-xs text-gray-500 dark:text-gray-400">Fecha</p>
											<p className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1">
												<CalendarDays className="w-3 h-3 text-gray-400" />
												{pago.fecha_pago}
											</p>
										</div>
										<div>
											<p className="text-xs text-gray-500 dark:text-gray-400">Método</p>
											<p className="text-sm text-gray-900 dark:text-gray-100 truncate">{pago.metodo_pago || '—'}</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
				<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Página {historialPage} de {historialTotalPages}
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" disabled={historialPage <= 1} onClick={() => setHistorialPage((p) => p - 1)}>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<Button variant="outline" size="sm" disabled={historialPage >= historialTotalPages} onClick={() => setHistorialPage((p) => p + 1)}>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</Card>

			{/* Modal Registrar pago */}
			<Dialog open={openModal} onOpenChange={setOpenModal}>
				<DialogContent
					className="max-w-lg bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]"
					overlayClassName="bg-black/60"
				>
					<DialogHeader>
						<DialogTitle>Registrar pago</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Fecha</Label>
							<Input type="date" value={form.fecha_pago} onChange={(e) => setForm((prev) => ({ ...prev, fecha_pago: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Monto</Label>
							<Input
								type="number"
								placeholder="Ej. 150"
								value={form.monto}
								onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Periodos a pagar</Label>
							<Select
								value={String(form.periodosAPagar)}
								onValueChange={(v) => setForm((prev) => ({ ...prev, periodosAPagar: Number(v) || 1 }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PERIODOS_OPCIONES.map((n) => (
										<SelectItem key={n} value={String(n)}>
											{n} {n === 1 ? 'período' : 'períodos'}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-gray-500">Cada período avanza la próxima fecha (ej. 1 mes). Si eliges 2, se sumarán 2 períodos.</p>
						</div>
						<div className="space-y-2">
							<Label>Método</Label>
							<Select
								value={form.metodo_pago || undefined}
								onValueChange={(value) => setForm((prev) => ({ ...prev, metodo_pago: value }))}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione método" />
								</SelectTrigger>
								<SelectContent>
									{METODOS_PAGO.map((m) => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Referencia</Label>
							<Input
								placeholder="Ej. REF-001"
								value={form.referencia}
								onChange={(e) => setForm((prev) => ({ ...prev, referencia: e.target.value }))}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Adjuntar comprobante</Label>
							<input
								ref={fileInputRef}
								type="file"
								accept=".pdf,.jpg,.jpeg,.png"
								onChange={handleReciboFileChange}
								className="hidden"
							/>
							{form.documento_pago_url ? (
								<div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
									<FileText className="h-5 w-5 text-primary shrink-0" />
									<span className="text-sm truncate flex-1">{reciboFileName || 'Archivo adjunto'}</span>
									<Button type="button" variant="ghost" size="sm" onClick={handleRemoveRecibo} disabled={uploadingRecibo} className="shrink-0">
										<X className="h-4 w-4" />
									</Button>
								</div>
							) : (
								<Button
									type="button"
									variant="outline"
									className="w-full"
									onClick={() => fileInputRef.current?.click()}
									disabled={uploadingRecibo || !selectedPoliza}
								>
									{uploadingRecibo ? 'Subiendo...' : (
										<>
											<Upload className="h-4 w-4 mr-2" />
											PDF, JPG o PNG
										</>
									)}
								</Button>
							)}
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Notas</Label>
							<Input placeholder="Opcional" value={form.notas} onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))} />
						</div>
					</div>
					<DialogFooter className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
						<Button variant="outline" onClick={() => setOpenModal(false)}>
							Cancelar
						</Button>
						<Button onClick={handleSave} disabled={saving}>
							{saving ? 'Guardando...' : 'Guardar pago'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Modal advertencia: próxima fecha de pago */}
			<Dialog open={!!nextPaymentDateAlert} onOpenChange={(open) => !open && setNextPaymentDateAlert(null)}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Pago registrado</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						La <strong>próxima fecha de pago</strong> de esta póliza será:{' '}
						<strong className="text-primary">{nextPaymentDateAlert ? formatDateForDisplay(nextPaymentDateAlert) : ''}</strong>.
					</p>
					<p className="text-xs text-gray-500 mt-2">
						Si marcas como pagado otra vez por error, se sumará otro período a la próxima fecha.
					</p>
					<DialogFooter>
						<Button onClick={() => setNextPaymentDateAlert(null)}>Entendido</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Modal detalle de pago (comprobante) */}
			<Dialog open={detallePagoOpen} onOpenChange={setDetallePagoOpen}>
				<DialogContent className="max-w-lg bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Receipt className="w-5 h-5" />
							Detalle del pago
						</DialogTitle>
					</DialogHeader>
					{selectedPago && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-3 text-sm">
								<div>
									<p className="text-xs text-gray-500 dark:text-gray-400">Póliza</p>
									<p className="font-medium">{selectedPago.poliza?.numero_poliza || '—'}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500 dark:text-gray-400">Fecha de pago</p>
									<p className="font-medium">{selectedPago.fecha_pago}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500 dark:text-gray-400">Monto</p>
									<p className="font-medium">{selectedPago.monto}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500 dark:text-gray-400">Método</p>
									<p className="font-medium">{selectedPago.metodo_pago || '—'}</p>
								</div>
								{selectedPago.banco && (
									<div>
										<p className="text-xs text-gray-500 dark:text-gray-400">Banco</p>
										<p className="font-medium">{selectedPago.banco}</p>
									</div>
								)}
								{selectedPago.referencia && (
									<div className="col-span-2">
										<p className="text-xs text-gray-500 dark:text-gray-400">Referencia</p>
										<p className="font-medium">{selectedPago.referencia}</p>
									</div>
								)}
								{selectedPago.notas && (
									<div className="col-span-2">
										<p className="text-xs text-gray-500 dark:text-gray-400">Notas</p>
										<p className="font-medium">{selectedPago.notas}</p>
									</div>
								)}
							</div>
							{selectedPago.documento_pago_url && (
								<div>
									<p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Comprobante de pago</p>
									<div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900/50">
										<a
											href={selectedPago.documento_pago_url}
											target="_blank"
											rel="noopener noreferrer"
											className="block"
										>
											{/\.(pdf)$/i.test(selectedPago.documento_pago_url) ? (
												<div className="p-6 text-center">
													<FileText className="w-12 h-12 mx-auto text-primary mb-2" />
													<p className="text-sm text-primary font-medium">Abrir PDF</p>
												</div>
											) : (
												<img
													src={selectedPago.documento_pago_url}
													alt="Comprobante"
													className="w-full max-h-80 object-contain"
												/>
											)}
										</a>
									</div>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>

			<PolizaDetailPanel
				poliza={selectedPolizaForPanel}
				isOpen={polizaPanelOpen}
				onClose={() => {
					setPolizaPanelOpen(false)
					setSelectedPolizaForPanel(null)
				}}
			/>
		</div>
	)
}

export default PagosPage
