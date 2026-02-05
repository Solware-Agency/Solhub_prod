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
import { DollarSign, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPolizas, updatePoliza, type Poliza } from '@services/supabase/aseguradoras/polizas-service'
import { createPagoPoliza, getPagosPoliza } from '@services/supabase/aseguradoras/pagos-poliza-service'
import { exportRowsToExcel } from '@shared/utils/exportToExcel'

const addMonths = (date: Date, months: number) => {
	const d = new Date(date)
	d.setMonth(d.getMonth() + months)
	return d
}

const PagosPage = () => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const [searchTerm, setSearchTerm] = useState('')
	const [registerSearch, setRegisterSearch] = useState('')
	const [registerPage, setRegisterPage] = useState(1)
	const [registerItemsPerPage, setRegisterItemsPerPage] = useState(16)
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(16)
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

	const polizas = useMemo(() => polizasData?.data ?? [], [polizasData])
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
		setOpenModal(true)
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

			<Card className="overflow-hidden mb-6">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col lg:flex-row lg:items-center gap-3">
						<div className="relative flex-1">
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
									<SelectItem value="8">8</SelectItem>
									<SelectItem value="16">16</SelectItem>
									<SelectItem value="32">32</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				<div className="p-4 min-h-[220px]">
					<h2 className="text-lg font-semibold mb-2">Registrar pago</h2>
					<p className="text-xs text-gray-500 mb-4">Solo se muestran pólizas con pago pendiente</p>
					{polizasForPayment.length === 0 && (
						<p className="text-sm text-gray-500">No hay pólizas pendientes de pago.</p>
					)}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{registerPageData.map((poliza) => (
							<Card key={poliza.id} className="p-3 flex flex-col gap-2">
								<div>
									<p className="font-medium">{poliza.numero_poliza}</p>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{poliza.asegurado?.full_name || 'Asegurado'} · {poliza.estatus_pago || 'Pendiente'}
									</p>
								</div>
								<Button size="sm" onClick={() => openPagoModal(poliza)}>
									<DollarSign className="w-4 h-4 mr-2" />
									Marcar como pagado
								</Button>
							</Card>
						))}
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

			<Card className="overflow-hidden">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col lg:flex-row lg:items-center gap-3">
						<div className="relative flex-1">
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
									<SelectItem value="8">8</SelectItem>
									<SelectItem value="16">16</SelectItem>
									<SelectItem value="32">32</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<div className="p-4 min-h-[320px]">
					<h2 className="text-lg font-semibold mb-2">Pagos registrados</h2>
					<p className="text-xs text-gray-500 mb-4">Histórico de pólizas ya pagadas</p>
					{filteredPagos.length === 0 && <p className="text-sm text-gray-500">No hay pagos registrados.</p>}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{pageData.map((pago) => (
							<Card key={pago.id} className="p-3 flex flex-col gap-2">
								<div>
									<p className="font-medium">
										{pago.poliza?.numero_poliza || 'Póliza'} · {pago.monto}
									</p>
									<p className="text-sm text-gray-600 dark:text-gray-400">{pago.fecha_pago}</p>
									<p className="text-xs text-gray-500">{pago.banco || pago.metodo_pago || 'Sin banco'}</p>
								</div>
							</Card>
						))}
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
							<Label>URL recibo</Label>
							<Input value={form.documento_pago_url} onChange={(e) => setForm((prev) => ({ ...prev, documento_pago_url: e.target.value }))} />
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
