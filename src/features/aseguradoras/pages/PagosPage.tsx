import React, { useMemo, useState, useCallback } from 'react'
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
import { DollarSign, Download, Search, ChevronLeft, ChevronRight, Bell, FileText, CalendarDays, Upload, X } from 'lucide-react'
import { getPolizas, updatePoliza, type Poliza } from '@services/supabase/aseguradoras/polizas-service'
import { createPagoPoliza, getPagosPoliza } from '@services/supabase/aseguradoras/pagos-poliza-service'
import { uploadReciboPago, validateReciboFile } from '@services/supabase/storage/pagos-poliza-recibos-service'
import { exportRowsToExcel } from '@shared/utils/exportToExcel'

const addMonths = (date: Date, months: number) => {
	const d = new Date(date)
	d.setMonth(d.getMonth() + months)
	return d
}

const daysBetween = (dateStr: string | null) => {
	if (!dateStr) return null
	const today = new Date()
	const date = new Date(dateStr)
	const diff = date.getTime() - today.getTime()
	return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const PagosPage = () => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const [searchTerm, setSearchTerm] = useState('')
	const [registerSearch, setRegisterSearch] = useState('')
	const [registerPage, setRegisterPage] = useState(1)
	const [registerItemsPerPage, setRegisterItemsPerPage] = useState(4)
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(4)
	const [openModal, setOpenModal] = useState(false)
	const [selectedPoliza, setSelectedPoliza] = useState<Poliza | null>(null)
	const [form, setForm] = useState({
		fecha_pago: '',
		monto: '',
		metodo_pago: '',
		banco: '',
		referencia: '',
		documento_pago_url: '',
		notas: '',
	})
	const [saving, setSaving] = useState(false)
	const [uploadingRecibo, setUploadingRecibo] = useState(false)
	const [reciboFileName, setReciboFileName] = useState<string | null>(null)
	const fileInputRef = React.useRef<HTMLInputElement>(null)
	const [recordatorioSearch, setRecordatorioSearch] = useState('')
	const [recordatorioPage, setRecordatorioPage] = useState(1)
	const [recordatorioItemsPerPage, setRecordatorioItemsPerPage] = useState(16)

	const { data: polizasData } = useQuery({
		queryKey: ['polizas-pagos'],
		queryFn: () => getPolizas(1, 100),
		staleTime: 1000 * 60 * 5,
	})

	const { data: pagosData } = useQuery({
		queryKey: ['pagos-poliza'],
		queryFn: () => getPagosPoliza(1, 200),
		staleTime: 1000 * 60 * 5,
	})

	const { data: polizasRecordatorioData, isLoading: loadingRecordatorio } = useQuery({
		queryKey: ['polizas-recordatorios'],
		queryFn: () => getPolizas(1, 200),
		staleTime: 1000 * 60 * 5,
	})

	const polizas = useMemo(() => polizasData?.data ?? [], [polizasData])
	const polizasRecordatorio = useMemo(() => polizasRecordatorioData?.data ?? [], [polizasRecordatorioData])
	const pagos = useMemo(() => pagosData?.data ?? [], [pagosData])
	const filteredPagos = useMemo(() => {
		if (!searchTerm.trim()) return pagos
		const q = searchTerm.trim().toLowerCase()
		return pagos.filter((row) =>
			[
				row.poliza?.numero_poliza,
				row.referencia,
				row.banco,
				row.metodo_pago,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q)),
		)
	}, [pagos, searchTerm])
	const totalPages = Math.max(1, Math.ceil(filteredPagos.length / itemsPerPage))
	const pageData = useMemo(() => {
		const from = (currentPage - 1) * itemsPerPage
		return filteredPagos.slice(from, from + itemsPerPage)
	}, [filteredPagos, currentPage, itemsPerPage])

	const handleSearch = useCallback((value: string) => {
		setSearchTerm(value)
		setCurrentPage(1)
	}, [])

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page)
	}, [])

	const handleItemsPerPage = useCallback((value: string) => {
		const parsed = Number(value)
		if (!Number.isNaN(parsed)) {
			setItemsPerPage(parsed)
			setCurrentPage(1)
		}
	}, [])

	const polizasForPayment = useMemo(() => {
		const list = polizas.filter((p) => p.estatus_pago !== 'Pagado')
		if (!registerSearch.trim()) return list
		const q = registerSearch.trim().toLowerCase()
		return list.filter((row) =>
			[
				row.numero_poliza,
				row.asegurado?.full_name,
				row.asegurado?.document_id,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q)),
		)
	}, [polizas, registerSearch])

	const registerTotalPages = Math.max(1, Math.ceil(polizasForPayment.length / registerItemsPerPage))
	const registerPageData = useMemo(() => {
		const from = (registerPage - 1) * registerItemsPerPage
		return polizasForPayment.slice(from, from + registerItemsPerPage)
	}, [polizasForPayment, registerPage, registerItemsPerPage])

	const handleRegisterSearch = useCallback((value: string) => {
		setRegisterSearch(value)
		setRegisterPage(1)
	}, [])

	const handleRegisterItems = useCallback((value: string) => {
		const parsed = Number(value)
		if (!Number.isNaN(parsed)) {
			setRegisterItemsPerPage(parsed)
			setRegisterPage(1)
		}
	}, [])

	const handleRegisterPage = useCallback((page: number) => {
		setRegisterPage(page)
	}, [])

	const filteredPolizasRecordatorio = useMemo(() => {
		if (!recordatorioSearch.trim()) return polizasRecordatorio
		const q = recordatorioSearch.trim().toLowerCase()
		return polizasRecordatorio.filter((row) =>
			[row.numero_poliza, row.asegurado?.full_name, row.asegurado?.document_id]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q)),
		)
	}, [polizasRecordatorio, recordatorioSearch])
	const recordatorioTotalPages = Math.max(1, Math.ceil(filteredPolizasRecordatorio.length / recordatorioItemsPerPage))
	const recordatorioPageData = useMemo(() => {
		const from = (recordatorioPage - 1) * recordatorioItemsPerPage
		return filteredPolizasRecordatorio.slice(from, from + recordatorioItemsPerPage)
	}, [filteredPolizasRecordatorio, recordatorioPage, recordatorioItemsPerPage])

	const handleRecordatorioSearch = useCallback((value: string) => {
		setRecordatorioSearch(value)
		setRecordatorioPage(1)
	}, [])
	const handleRecordatorioPageChange = useCallback((page: number) => {
		setRecordatorioPage(page)
	}, [])
	const handleRecordatorioItemsPerPage = useCallback((value: string) => {
		const parsed = Number(value)
		if (!Number.isNaN(parsed)) {
			setRecordatorioItemsPerPage(parsed)
			setRecordatorioPage(1)
		}
	}, [])

	const openPagoModal = (poliza: Poliza) => {
		setSelectedPoliza(poliza)
		setForm({
			fecha_pago: new Date().toISOString().slice(0, 10),
			monto: '',
			metodo_pago: '',
			banco: '',
			referencia: '',
			documento_pago_url: '',
			notas: '',
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
		setSaving(true)
		try {
			await createPagoPoliza({
				poliza_id: selectedPoliza.id,
				fecha_pago: form.fecha_pago,
				monto: Number(form.monto),
				metodo_pago: form.metodo_pago || null,
				banco: form.banco || null,
				referencia: form.referencia || null,
				documento_pago_url: form.documento_pago_url || null,
				notas: form.notas || null,
			})

			const baseDate = new Date(selectedPoliza.fecha_vencimiento)
			const monthsToAdd =
				selectedPoliza.modalidad_pago === 'Mensual'
					? 1
					: selectedPoliza.modalidad_pago === 'Trimestral'
						? 3
						: selectedPoliza.modalidad_pago === 'Semestral'
							? 6
							: 12
			const nextDue = addMonths(baseDate, monthsToAdd)

			await updatePoliza(selectedPoliza.id, {
				estatus_pago: 'Pagado',
				fecha_pago_ultimo: form.fecha_pago,
				fecha_prox_vencimiento: nextDue.toISOString().slice(0, 10),
				alert_30_enviada: false,
				alert_14_enviada: false,
				alert_7_enviada: false,
				alert_dia_enviada: false,
				alert_post_enviada: false,
			})

			queryClient.invalidateQueries({ queryKey: ['pagos-poliza'] })
			queryClient.invalidateQueries({ queryKey: ['polizas-pagos'] })
			queryClient.invalidateQueries({ queryKey: ['polizas-recordatorios'] })
			toast({ title: 'Pago registrado' })
			setOpenModal(false)
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al registrar pago', variant: 'destructive' })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div>
			<div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Pagos</h1>
					<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
				</div>
				<Button
					variant="outline"
					onClick={() =>
						exportRowsToExcel(
							'pagos_poliza',
							pagos.map((row) => ({
								Póliza: row.poliza?.numero_poliza || '',
								Fecha: row.fecha_pago,
								Monto: row.monto,
								Método: row.metodo_pago || '',
								Banco: row.banco || '',
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

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<Card className="overflow-hidden flex flex-col min-w-0">
					<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
						<div className="flex flex-col sm:flex-row sm:items-center gap-3">
							<div className="relative flex-1 min-w-0">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<Input
									className="pl-9"
									placeholder="Buscar póliza pendiente"
									value={registerSearch}
									onChange={(e) => handleRegisterSearch(e.target.value)}
								/>
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-500">
								<span>Filas:</span>
								<Select value={String(registerItemsPerPage)} onValueChange={handleRegisterItems}>
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
					<div className="p-4 min-h-[220px] flex-1 flex flex-col">
						<h2 className="text-lg font-semibold mb-2">Registrar pago</h2>
						<p className="text-xs text-gray-500 mb-4">Solo se muestran pólizas con pago pendiente</p>
						{polizasForPayment.length === 0 && (
							<p className="text-sm text-gray-500">No hay pólizas pendientes de pago.</p>
						)}
						<div className="max-h-[340px] overflow-y-auto">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{registerPageData.map((poliza) => (
								<div
									key={poliza.id}
									className="relative bg-white dark:bg-background rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/70 dark:hover:border-primary/60 transition-colors duration-200 flex flex-col gap-2"
								>
									<div className="flex flex-wrap gap-1.5 mb-1.5">
										<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
											{poliza.estatus_pago || 'Pendiente'}
										</span>
										{poliza.modalidad_pago && (
											<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
												{poliza.modalidad_pago}
											</span>
										)}
									</div>
									<div className="flex items-center gap-2 mb-1.5">
										<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
										<p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{poliza.numero_poliza}</p>
									</div>
									<div className="mb-1.5">
										<p className="text-xs text-gray-500 dark:text-gray-400">Asegurado</p>
										<p className="text-sm text-gray-900 dark:text-gray-100 truncate">{poliza.asegurado?.full_name || 'Asegurado'}</p>
									</div>
									<Button size="sm" onClick={() => openPagoModal(poliza)} className="mt-auto">
										<DollarSign className="w-4 h-4 mr-2" />
										Marcar como pagado
									</Button>
								</div>
							))}
							</div>
						</div>
					</div>
					<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
						<div className="text-sm text-gray-600 dark:text-gray-400">
							Página {registerPage} de {registerTotalPages}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={registerPage <= 1}
								onClick={() => handleRegisterPage(registerPage - 1)}
							>
								<ChevronLeft className="w-4 h-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={registerPage >= registerTotalPages}
								onClick={() => handleRegisterPage(registerPage + 1)}
							>
								<ChevronRight className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</Card>

				<Card className="overflow-hidden flex flex-col min-w-0">
					<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
						<div className="flex flex-col sm:flex-row sm:items-center gap-3">
							<div className="relative flex-1 min-w-0">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<Input
									className="pl-9"
									placeholder="Buscar por póliza, referencia o banco"
									value={searchTerm}
									onChange={(e) => handleSearch(e.target.value)}
								/>
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-500">
								<span>Filas:</span>
								<Select value={String(itemsPerPage)} onValueChange={handleItemsPerPage}>
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

					<div className="p-4 min-h-[220px] flex-1 flex flex-col">
						<h2 className="text-lg font-semibold mb-2">Pagos registrados</h2>
						<p className="text-xs text-gray-500 mb-4">Histórico de pólizas ya pagadas</p>
						{filteredPagos.length === 0 && <p className="text-sm text-gray-500">No hay pagos registrados.</p>}
						<div className="max-h-[340px] overflow-y-auto">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{pageData.map((pago) => (
								<div
									key={pago.id}
									className="relative bg-white dark:bg-background rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/70 dark:hover:border-primary/60 transition-colors duration-200"
								>
									<div className="flex flex-wrap gap-1.5 mb-1.5">
										<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
											Pagado
										</span>
									</div>
									<div className="flex items-center gap-2 mb-1.5">
										<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
										<p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
											{pago.poliza?.numero_poliza || 'Póliza'} · {pago.monto}
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
											<p className="text-xs text-gray-500 dark:text-gray-400">Banco / Método</p>
											<p className="text-sm text-gray-900 dark:text-gray-100 truncate">{pago.banco || pago.metodo_pago || '—'}</p>
										</div>
									</div>
								</div>
							))}
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
						<div className="text-sm text-gray-600 dark:text-gray-400">
							Página {currentPage} de {totalPages}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage <= 1}
								onClick={() => handlePageChange(currentPage - 1)}
							>
								<ChevronLeft className="w-4 h-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage >= totalPages}
								onClick={() => handlePageChange(currentPage + 1)}
							>
								<ChevronRight className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</Card>
			</div>

			<Card className="overflow-hidden mt-4">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col lg:flex-row lg:items-center gap-3">
						<div className="relative flex-1 min-w-0">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								className="pl-9"
								placeholder="Buscar por póliza o asegurado"
								value={recordatorioSearch}
								onChange={(e) => handleRecordatorioSearch(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-2 text-sm text-gray-500">
							<span>Filas:</span>
							<Select value={String(recordatorioItemsPerPage)} onValueChange={handleRecordatorioItemsPerPage}>
								<SelectTrigger className="w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="8">8</SelectItem>
									<SelectItem value="16">16</SelectItem>
									<SelectItem value="32">32</SelectItem>
								</SelectContent>
							</Select>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									exportRowsToExcel(
										'vencimientos_polizas',
										polizasRecordatorio.map((row) => ({
											'Número póliza': row.numero_poliza,
											Asegurado: row.asegurado?.full_name || '',
											'Fecha próximo vencimiento': row.fecha_prox_vencimiento || row.fecha_vencimiento,
											'Días restantes': daysBetween(row.fecha_prox_vencimiento || row.fecha_vencimiento) ?? '',
											'Alert_30': row.alert_30_enviada ? 'Sí' : 'No',
											'Alert_14': row.alert_14_enviada ? 'Sí' : 'No',
											'Alert_7': row.alert_7_enviada ? 'Sí' : 'No',
											'Alert_Día': row.alert_dia_enviada ? 'Sí' : 'No',
											'Alert_Post': row.alert_post_enviada ? 'Sí' : 'No',
										})),
									)
								}
								className="gap-1.5"
							>
								<Download className="w-4 h-4" />
								Exportar vencimientos
							</Button>
						</div>
					</div>
				</div>
				<div className="p-4 min-h-[220px]">
					<h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
						<Bell className="w-5 h-5 text-amber-500" />
						Recordatorios
					</h2>
					<p className="text-xs text-gray-500 mb-4">Vencimientos y estado de alertas por póliza</p>
					{loadingRecordatorio && <p className="text-sm text-gray-500">Cargando pólizas...</p>}
					{!loadingRecordatorio && filteredPolizasRecordatorio.length === 0 && (
						<p className="text-sm text-gray-500">No hay pólizas registradas.</p>
					)}
					{!loadingRecordatorio && recordatorioPageData.length > 0 && (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
							{recordatorioPageData.map((row) => {
								const days = daysBetween(row.fecha_prox_vencimiento || row.fecha_vencimiento)
								const venceFecha = row.fecha_prox_vencimiento || row.fecha_vencimiento
								const isPorVencer = days != null && days <= 30 && days >= 0
								const isVencido = days != null && days < 0
								return (
									<div
										key={row.id}
										className="relative bg-white dark:bg-background rounded-lg p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/70 dark:hover:border-primary/60 transition-colors duration-200"
									>
										<div className="flex flex-wrap gap-1.5 mb-1.5">
											{days != null && (
												<span
													className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
														isVencido
															? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
															: isPorVencer
																? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
																: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
													}`}
												>
													{days < 0 ? `${Math.abs(days)} días venc.` : `${days} días`}
												</span>
											)}
										</div>
										<div className="flex items-center gap-2 mb-1.5">
											<FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
											<p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{row.numero_poliza}</p>
										</div>
										<div className="mb-1.5">
											<p className="text-xs text-gray-500 dark:text-gray-400">Asegurado</p>
											<p className="text-sm text-gray-900 dark:text-gray-100 truncate">{row.asegurado?.full_name || 'Asegurado'}</p>
										</div>
										<div className="mb-1.5">
											<p className="text-xs text-gray-500 dark:text-gray-400">Vence</p>
											<p className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1">
												<CalendarDays className="w-3 h-3 text-gray-400" />
												{venceFecha || '—'} {days != null && `· ${days} días`}
											</p>
										</div>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											30({row.alert_30_enviada ? 'Sí' : 'No'}) · 14({row.alert_14_enviada ? 'Sí' : 'No'}) ·
											7({row.alert_7_enviada ? 'Sí' : 'No'}) · D({row.alert_dia_enviada ? 'Sí' : 'No'}) ·
											Post({row.alert_post_enviada ? 'Sí' : 'No'})
										</p>
									</div>
								)
							})}
						</div>
					)}
				</div>
				<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
					<div className="text-sm text-gray-600 dark:text-gray-400">
						Página {recordatorioPage} de {recordatorioTotalPages}
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={recordatorioPage <= 1}
							onClick={() => handleRecordatorioPageChange(recordatorioPage - 1)}
						>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={recordatorioPage >= recordatorioTotalPages}
							onClick={() => handleRecordatorioPageChange(recordatorioPage + 1)}
						>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</Card>

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
							<Input type="number" value={form.monto} onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Método</Label>
							<Input value={form.metodo_pago} onChange={(e) => setForm((prev) => ({ ...prev, metodo_pago: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Banco</Label>
							<Input value={form.banco} onChange={(e) => setForm((prev) => ({ ...prev, banco: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Referencia</Label>
							<Input value={form.referencia} onChange={(e) => setForm((prev) => ({ ...prev, referencia: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Adjuntar recibo</Label>
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
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleRemoveRecibo}
										disabled={uploadingRecibo}
										className="shrink-0"
									>
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
									{uploadingRecibo ? (
										'Subiendo...'
									) : (
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
							<Input value={form.notas} onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))} />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpenModal(false)}>
							Cancelar
						</Button>
						<Button onClick={handleSave} disabled={saving}>
							{saving ? 'Guardando...' : 'Guardar pago'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default PagosPage
