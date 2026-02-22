import React, { useMemo, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@shared/components/ui/button'
import { Card } from '@shared/components/ui/card'
import { Input } from '@shared/components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@shared/components/ui/dialog'
import { Label } from '@shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { Calendar } from '@shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
import { useToast } from '@shared/hooks/use-toast'
import { Plus, Download, Search, ChevronLeft, ChevronRight, CalendarIcon, Upload, X, FileText } from 'lucide-react'
import { cn } from '@shared/lib/cn'
import { format } from 'date-fns'
import { exportRowsToExcel } from '@shared/utils/exportToExcel'
import { getAseguradoras, type Aseguradora } from '@services/supabase/aseguradoras/aseguradoras-service'
import { findAseguradoById, type Asegurado } from '@services/supabase/aseguradoras/asegurados-service'
import {
	createPoliza,
	getPolizas,
	updatePoliza,
	type Poliza,
} from '@services/supabase/aseguradoras/polizas-service'
import { AseguradoSearchAutocomplete } from '@features/aseguradoras/components/AseguradoSearchAutocomplete'
import { PolizaDetailPanel } from '@features/aseguradoras/components/PolizaDetailPanel'
import { AseguradoHistoryModal } from '@features/aseguradoras/components/AseguradoHistoryModal'
import { AseguradoraHistoryModal } from '@features/aseguradoras/components/AseguradoraHistoryModal'
import PolizaCard from '@features/aseguradoras/components/PolizaCard'
import { uploadPolizaPdf, validateReciboFile } from '@services/supabase/storage/pagos-poliza-recibos-service'

const STEPS = ['Asegurado', 'Datos póliza', 'Fechas', 'Recordatorios', 'Documentos'] as const

const PolizasPage = () => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(24)
	const [openModal, setOpenModal] = useState(false)
	const [step, setStep] = useState(0)
	const [saving, setSaving] = useState(false)
	const [selectedAsegurado, setSelectedAsegurado] = useState<Asegurado | null>(null)
	const [selectedPoliza, setSelectedPoliza] = useState<Poliza | null>(null)
	const [panelOpen, setPanelOpen] = useState(false)
	const [aseguradoHistoryOpen, setAseguradoHistoryOpen] = useState(false)
	const [selectedAseguradoForHistory, setSelectedAseguradoForHistory] = useState<Asegurado | null>(null)
	const [aseguradoraHistoryOpen, setAseguradoraHistoryOpen] = useState(false)
	const [selectedAseguradoraForHistory, setSelectedAseguradoraForHistory] = useState<Aseguradora | null>(null)
	const [editingPoliza, setEditingPoliza] = useState<Poliza | null>(null)
	const [uploadingPdf, setUploadingPdf] = useState(false)
	const [pdfFileName, setPdfFileName] = useState<string | null>(null)
	const pdfFileInputRef = React.useRef<HTMLInputElement>(null)
	const [form, setForm] = useState({
		asegurado_id: '',
		aseguradora_id: '',
		agente_nombre: '',
		numero_poliza: '',
		ramo: '',
		suma_asegurada: '',
		modalidad_pago: 'Mensual' as 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual',
		estatus_poliza: 'Activa' as 'Activa' | 'En emisión' | 'Renovación pendiente' | 'Vencida',
		estatus_pago: 'Pendiente' as 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora',
		fecha_inicio: '',
		fecha_vencimiento: '',
		dia_vencimiento: '',
		fecha_prox_vencimiento: '',
		tipo_alerta: '',
		dias_alerta: '',
		dias_frecuencia: '',
		dias_frecuencia_post: '',
		dias_recordatorio: '',
		pdf_url: '',
		notas: '',
	})

	const parseIsoDate = (value: string) => (value ? new Date(`${value}T00:00:00`) : undefined)

	const { data, isLoading, error } = useQuery({
		queryKey: ['polizas', searchTerm, currentPage, itemsPerPage],
		queryFn: () => getPolizas(currentPage, itemsPerPage, searchTerm),
		staleTime: 1000 * 60 * 5,
	})

	const { data: aseguradorasData } = useQuery({
		queryKey: ['aseguradoras-catalogo'],
		queryFn: getAseguradoras,
		staleTime: 1000 * 60 * 5,
	})

	const polizas = useMemo(() => data?.data ?? [], [data])
	const totalPages = data?.totalPages ?? 1

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

	const handleAseguradoClick = useCallback(async (aseguradoId: string) => {
		const a = await findAseguradoById(aseguradoId)
		if (a) {
			setSelectedAseguradoForHistory(a)
			setAseguradoHistoryOpen(true)
		}
	}, [])

	const handleAseguradoraClick = useCallback(
		(aseguradoraId: string) => {
			const a = (aseguradorasData || []).find((r) => r.id === aseguradoraId)
			if (a) {
				setSelectedAseguradoraForHistory(a)
				setAseguradoraHistoryOpen(true)
			}
		},
		[aseguradorasData],
	)

	const resetForm = () => {
		setForm({
			asegurado_id: '',
			aseguradora_id: '',
			agente_nombre: '',
			numero_poliza: '',
			ramo: '',
			suma_asegurada: '',
			modalidad_pago: 'Mensual',
			estatus_poliza: 'Activa',
			estatus_pago: 'Pendiente',
			fecha_inicio: '',
			fecha_vencimiento: '',
			dia_vencimiento: '',
			fecha_prox_vencimiento: '',
			tipo_alerta: '',
			dias_alerta: '',
			dias_frecuencia: '',
			dias_frecuencia_post: '',
			dias_recordatorio: '',
			pdf_url: '',
			notas: '',
		})
		setPdfFileName(null)
		if (pdfFileInputRef.current) pdfFileInputRef.current.value = ''
		setStep(0)
		setSelectedAsegurado(null)
		setEditingPoliza(null)
	}

	const openNewModal = () => {
		resetForm()
		setOpenModal(true)
	}

	const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file || !form.asegurado_id) {
			if (!form.asegurado_id) toast({ title: 'Selecciona un asegurado primero', variant: 'destructive' })
			return
		}

		const validation = validateReciboFile(file)
		if (!validation.valid) {
			toast({ title: 'Archivo inválido', description: validation.error, variant: 'destructive' })
			return
		}

		setUploadingPdf(true)
		try {
			const { data, error } = await uploadPolizaPdf(file, form.asegurado_id)
			if (error) throw error
			if (data) {
				setForm((prev) => ({ ...prev, pdf_url: data }))
				setPdfFileName(file.name)
				toast({ title: 'Archivo adjuntado' })
			}
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al subir archivo', variant: 'destructive' })
		} finally {
			setUploadingPdf(false)
			if (pdfFileInputRef.current) pdfFileInputRef.current.value = ''
		}
	}

	const handleRemovePdf = () => {
		setForm((prev) => ({ ...prev, pdf_url: '' }))
		setPdfFileName(null)
		if (pdfFileInputRef.current) pdfFileInputRef.current.value = ''
	}

	const openForEdit = useCallback((poliza: Poliza) => {
		setForm({
			asegurado_id: poliza.asegurado_id,
			aseguradora_id: poliza.aseguradora_id,
			agente_nombre: poliza.agente_nombre ?? '',
			numero_poliza: poliza.numero_poliza ?? '',
			ramo: poliza.ramo ?? '',
			suma_asegurada: poliza.suma_asegurada != null ? String(poliza.suma_asegurada) : '',
			modalidad_pago: poliza.modalidad_pago,
			estatus_poliza: poliza.estatus_poliza,
			estatus_pago: (poliza.estatus_pago ?? 'Pendiente') as 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora',
			fecha_inicio: poliza.fecha_inicio?.slice(0, 10) ?? '',
			fecha_vencimiento: poliza.fecha_vencimiento?.slice(0, 10) ?? '',
			dia_vencimiento: poliza.dia_vencimiento != null ? String(poliza.dia_vencimiento) : '',
			fecha_prox_vencimiento: poliza.fecha_prox_vencimiento?.slice(0, 10) ?? '',
			tipo_alerta: poliza.tipo_alerta ?? '',
			dias_alerta: poliza.dias_alerta != null ? String(poliza.dias_alerta) : '',
			dias_frecuencia: poliza.dias_frecuencia != null ? String(poliza.dias_frecuencia) : '',
			dias_frecuencia_post: poliza.dias_frecuencia_post != null ? String(poliza.dias_frecuencia_post) : '',
			dias_recordatorio: poliza.dias_recordatorio != null ? String(poliza.dias_recordatorio) : '',
			pdf_url: poliza.pdf_url ?? '',
			notas: poliza.notas ?? '',
		})
		setSelectedAsegurado(
			poliza.asegurado
				? ({ id: poliza.asegurado.id, full_name: poliza.asegurado.full_name, document_id: poliza.asegurado.document_id } as Asegurado)
				: null,
		)
		setPdfFileName(null)
		setEditingPoliza(poliza)
		setPanelOpen(false)
		setOpenModal(true)
		setStep(1)
	}, [])

	const openDetailPanel = (row: Poliza) => {
		setSelectedPoliza(row)
		setPanelOpen(true)
	}

	const handleSave = async () => {
		if (!editingPoliza) {
			setSaving(true)
			try {
				await createPoliza({
					asegurado_id: form.asegurado_id,
					aseguradora_id: form.aseguradora_id,
					agente_nombre: form.agente_nombre,
					numero_poliza: form.numero_poliza,
					ramo: form.ramo,
					suma_asegurada: form.suma_asegurada ? Number(form.suma_asegurada) : null,
					modalidad_pago: form.modalidad_pago,
					estatus_poliza: form.estatus_poliza,
					estatus_pago: form.estatus_pago,
					fecha_inicio: form.fecha_inicio,
					fecha_vencimiento: form.fecha_vencimiento,
					dia_vencimiento: form.dia_vencimiento ? Number(form.dia_vencimiento) : null,
					fecha_prox_vencimiento: form.fecha_prox_vencimiento || null,
					tipo_alerta: form.tipo_alerta || null,
					dias_alerta: form.dias_alerta ? Number(form.dias_alerta) : null,
					dias_frecuencia: form.dias_frecuencia ? Number(form.dias_frecuencia) : null,
					dias_frecuencia_post: form.dias_frecuencia_post ? Number(form.dias_frecuencia_post) : null,
					dias_recordatorio: form.dias_recordatorio ? Number(form.dias_recordatorio) : null,
					pdf_url: form.pdf_url || null,
					notas: form.notas || null,
				})
				queryClient.invalidateQueries({ queryKey: ['polizas'] })
				setOpenModal(false)
				toast({ title: 'Póliza creada' })
			} catch (err) {
				console.error(err)
				toast({ title: 'Error al crear póliza', variant: 'destructive' })
			} finally {
				setSaving(false)
			}
			return
		}
		setSaving(true)
		try {
			await updatePoliza(editingPoliza.id, {
				asegurado_id: form.asegurado_id,
				aseguradora_id: form.aseguradora_id,
				agente_nombre: form.agente_nombre,
				numero_poliza: form.numero_poliza,
				ramo: form.ramo,
				suma_asegurada: form.suma_asegurada ? Number(form.suma_asegurada) : null,
				modalidad_pago: form.modalidad_pago,
				estatus_poliza: form.estatus_poliza,
				estatus_pago: form.estatus_pago,
				fecha_inicio: form.fecha_inicio,
				fecha_vencimiento: form.fecha_vencimiento,
				dia_vencimiento: form.dia_vencimiento ? Number(form.dia_vencimiento) : null,
				fecha_prox_vencimiento: form.fecha_prox_vencimiento || null,
				tipo_alerta: form.tipo_alerta || null,
				dias_alerta: form.dias_alerta ? Number(form.dias_alerta) : null,
				dias_frecuencia: form.dias_frecuencia ? Number(form.dias_frecuencia) : null,
				dias_frecuencia_post: form.dias_frecuencia_post ? Number(form.dias_frecuencia_post) : null,
				dias_recordatorio: form.dias_recordatorio ? Number(form.dias_recordatorio) : null,
				pdf_url: form.pdf_url || null,
				notas: form.notas || null,
			})
			queryClient.invalidateQueries({ queryKey: ['polizas'] })
			queryClient.invalidateQueries({ queryKey: ['aseguradoras-stats'] })
			if (editingPoliza.asegurado_id) {
				queryClient.invalidateQueries({ queryKey: ['polizas-by-asegurado', editingPoliza.asegurado_id] })
			}
			if (editingPoliza.aseguradora_id) {
				queryClient.invalidateQueries({ queryKey: ['polizas-by-aseguradora', editingPoliza.aseguradora_id] })
			}
			setOpenModal(false)
			setEditingPoliza(null)
			toast({ title: 'Póliza actualizada' })
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al actualizar póliza', variant: 'destructive' })
		} finally {
			setSaving(false)
		}
	}

	const stepContent = () => {
		switch (step) {
			case 0:
				return editingPoliza ? (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Asegurado</Label>
							<p className="text-xs text-muted-foreground">El asegurado no se puede cambiar al editar la póliza.</p>
							{selectedAsegurado && (
								<div className="border rounded-md p-3 text-sm bg-muted/30">
									<p className="font-medium">{selectedAsegurado.full_name}</p>
									<p className="text-xs text-gray-500">{selectedAsegurado.document_id}</p>
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Buscar asegurado</Label>
							<AseguradoSearchAutocomplete
								onSelect={(asegurado) => {
									setForm((prev) => ({ ...prev, asegurado_id: asegurado.id }))
									setSelectedAsegurado(asegurado)
								}}
								onSearchChange={(value) => {
									const label = selectedAsegurado
										? `${selectedAsegurado.full_name} · ${selectedAsegurado.document_id}`
										: ''
									if (selectedAsegurado && value !== label) {
										setSelectedAsegurado(null)
										setForm((prev) => ({ ...prev, asegurado_id: '' }))
									}
								}}
								placeholder="Buscar por documento o nombre"
							/>
						</div>
						{selectedAsegurado && (
							<div className="border rounded-md p-3 text-sm">
								<p className="font-medium">{selectedAsegurado.full_name}</p>
								<p className="text-xs text-gray-500">
									{selectedAsegurado.document_id} · {selectedAsegurado.phone || 'Sin teléfono'}
								</p>
							</div>
						)}
					</div>
				)
			case 1:
				return (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Aseguradora</Label>
							<Select
								value={form.aseguradora_id}
								onValueChange={(value) => setForm((prev) => ({ ...prev, aseguradora_id: value }))}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccione aseguradora" />
								</SelectTrigger>
								<SelectContent>
									{(aseguradorasData || []).map((row) => (
										<SelectItem key={row.id} value={row.id}>
											{row.nombre}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Agente / Productor</Label>
							<Input value={form.agente_nombre} onChange={(e) => setForm((prev) => ({ ...prev, agente_nombre: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Número de póliza</Label>
							<Input
								value={form.numero_poliza}
								onChange={(e) => setForm((prev) => ({ ...prev, numero_poliza: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Ramo</Label>
							<Input value={form.ramo} onChange={(e) => setForm((prev) => ({ ...prev, ramo: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Suma asegurada</Label>
							<Input
								type="number"
								value={form.suma_asegurada}
								onChange={(e) => setForm((prev) => ({ ...prev, suma_asegurada: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Modalidad de pago</Label>
							<Select
								value={form.modalidad_pago}
								onValueChange={(value) =>
									setForm((prev) => ({
										...prev,
										modalidad_pago: value as 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual',
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Mensual">Mensual</SelectItem>
									<SelectItem value="Trimestral">Trimestral</SelectItem>
									<SelectItem value="Semestral">Semestral</SelectItem>
									<SelectItem value="Anual">Anual</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Estatus póliza</Label>
							<Select
								value={form.estatus_poliza}
								onValueChange={(value) =>
									setForm((prev) => ({
										...prev,
										estatus_poliza: value as 'Activa' | 'En emisión' | 'Renovación pendiente' | 'Vencida',
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Activa">Activa</SelectItem>
									<SelectItem value="En emisión">En emisión</SelectItem>
									<SelectItem value="Renovación pendiente">Renovación pendiente</SelectItem>
									<SelectItem value="Vencida">Vencida</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Estatus pago</Label>
							<Select
								value={form.estatus_pago}
								onValueChange={(value) =>
									setForm((prev) => ({
										...prev,
										estatus_pago: value as 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora',
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Pagado">Pagado</SelectItem>
									<SelectItem value="Parcial">Parcial</SelectItem>
									<SelectItem value="Pendiente">Pendiente</SelectItem>
									<SelectItem value="En mora">En mora</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				)
			case 2:
				return (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Fecha inicio</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal',
											!form.fecha_inicio && 'text-muted-foreground',
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{form.fecha_inicio ? format(parseIsoDate(form.fecha_inicio)!, 'dd/MM/yyyy') : 'Fecha'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={parseIsoDate(form.fecha_inicio)}
										onSelect={(date) =>
											setForm((prev) => ({
												...prev,
												fecha_inicio: date ? format(date, 'yyyy-MM-dd') : '',
											}))
										}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div className="space-y-2">
							<Label>Fecha vencimiento</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal',
											!form.fecha_vencimiento && 'text-muted-foreground',
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{form.fecha_vencimiento ? format(parseIsoDate(form.fecha_vencimiento)!, 'dd/MM/yyyy') : 'Fecha'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={parseIsoDate(form.fecha_vencimiento)}
										onSelect={(date) =>
											setForm((prev) => ({
												...prev,
												fecha_vencimiento: date ? format(date, 'yyyy-MM-dd') : '',
											}))
										}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div className="space-y-2">
							<Label>Día de vencimiento</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal',
											!form.dia_vencimiento && 'text-muted-foreground',
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{form.dia_vencimiento ? `Día ${form.dia_vencimiento}` : 'Seleccionar día'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={
											form.dia_vencimiento
												? new Date(new Date().getFullYear(), new Date().getMonth(), Number(form.dia_vencimiento))
												: undefined
										}
										onSelect={(date) =>
											setForm((prev) => ({
												...prev,
												dia_vencimiento: date ? String(date.getDate()) : '',
											}))
										}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div className="space-y-2">
							<Label>Fecha próximo vencimiento</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal',
											!form.fecha_prox_vencimiento && 'text-muted-foreground',
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{form.fecha_prox_vencimiento
											? format(parseIsoDate(form.fecha_prox_vencimiento)!, 'dd/MM/yyyy')
											: 'Fecha'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={parseIsoDate(form.fecha_prox_vencimiento)}
										onSelect={(date) =>
											setForm((prev) => ({
												...prev,
												fecha_prox_vencimiento: date ? format(date, 'yyyy-MM-dd') : '',
											}))
										}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
					</div>
				)
			case 3:
				return (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Tipo de alerta</Label>
							<Input value={form.tipo_alerta} onChange={(e) => setForm((prev) => ({ ...prev, tipo_alerta: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>Días de alerta</Label>
							<Input
								type="number"
								value={form.dias_alerta}
								onChange={(e) => setForm((prev) => ({ ...prev, dias_alerta: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Días frecuencia</Label>
							<Input
								type="number"
								value={form.dias_frecuencia}
								onChange={(e) => setForm((prev) => ({ ...prev, dias_frecuencia: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Frecuencia post</Label>
							<Input
								type="number"
								value={form.dias_frecuencia_post}
								onChange={(e) => setForm((prev) => ({ ...prev, dias_frecuencia_post: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Días recordatorio</Label>
							<Input
								type="number"
								value={form.dias_recordatorio}
								onChange={(e) => setForm((prev) => ({ ...prev, dias_recordatorio: e.target.value }))}
							/>
						</div>
					</div>
				)
			case 4:
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>PDF póliza</Label>
							<input
								ref={pdfFileInputRef}
								type="file"
								accept=".pdf,.jpg,.jpeg,.png"
								onChange={handlePdfFileChange}
								className="hidden"
							/>
							{form.pdf_url ? (
								<div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
									<FileText className="h-5 w-5 text-primary shrink-0" />
									<span className="text-sm truncate flex-1">{pdfFileName || 'Documento adjunto'}</span>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleRemovePdf}
										disabled={uploadingPdf}
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
									onClick={() => pdfFileInputRef.current?.click()}
									disabled={uploadingPdf || !form.asegurado_id}
								>
									{uploadingPdf ? (
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
						<div className="space-y-2">
							<Label>Notas</Label>
							<Input value={form.notas} onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))} />
						</div>
					</div>
				)
			default:
				return null
		}
	}

	return (
		<div>
			<div className="mb-4 sm:mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold">Pólizas</h1>
				<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
			</div>

			<Card className="overflow-hidden">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col lg:flex-row lg:items-center gap-3">
						<div className="relative flex-1 min-w-0">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								className="pl-9"
								placeholder="Buscar por número o ramo"
								value={searchTerm}
								onChange={(e) => handleSearch(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
							<span>Filas:</span>
							<Select value={String(itemsPerPage)} onValueChange={handleItemsPerPage}>
								<SelectTrigger className="w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="12">12</SelectItem>
									<SelectItem value="24">24</SelectItem>
									<SelectItem value="36">36</SelectItem>
								</SelectContent>
							</Select>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									exportRowsToExcel(
										'polizas',
										polizas.map((row) => ({
											Código: row.codigo ?? '',
											'Número de póliza': row.numero_poliza,
											Asegurado: row.asegurado?.full_name || '',
											Aseguradora: row.aseguradora?.nombre || '',
											Ramo: row.ramo,
											'Modalidad de pago': row.modalidad_pago,
											'Estatus póliza': row.estatus_poliza,
											'Estatus pago': row.estatus_pago || '',
											'Fecha vencimiento': row.fecha_vencimiento,
										})),
									)
								}
								className="gap-1.5 sm:gap-2 shrink-0"
								title="Exportar"
							>
								<Download className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Exportar</span>
							</Button>
							<Button size="sm" onClick={openNewModal} className="gap-1.5 sm:gap-2 shrink-0" title="Nueva póliza">
								<Plus className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Nueva póliza</span>
							</Button>
						</div>
					</div>
				</div>

				<div className="p-4 min-h-[320px]">
					{isLoading && <p className="text-sm text-gray-500">Cargando pólizas...</p>}
					{error && <p className="text-sm text-red-500">Error al cargar pólizas</p>}
					{!isLoading && !error && polizas.length === 0 && (
						<p className="text-sm text-gray-500">No hay pólizas registradas.</p>
					)}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{polizas.map((row: Poliza) => (
							<PolizaCard key={row.id} poliza={row} onClick={() => openDetailPanel(row)} />
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
					className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90dvh] flex flex-col p-4 sm:p-6 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]"
					overlayClassName="bg-black/60"
				>
					<DialogHeader className="shrink-0">
						<DialogTitle className="text-base sm:text-lg">{editingPoliza ? 'Editar póliza' : 'Nueva póliza'}</DialogTitle>
					</DialogHeader>
					<div className="flex md:hidden items-center gap-1.5 text-xs text-gray-500 mb-2 shrink-0 overflow-x-auto pb-1">
						{STEPS.map((label, idx) => (
							<span
								key={label}
								className={cn(
									'shrink-0 px-2 py-1 rounded-md',
									idx === step ? 'text-primary font-medium bg-primary/10' : 'text-muted-foreground',
								)}
							>
								{idx + 1}. {label}
							</span>
						))}
					</div>
					<div className="hidden md:flex items-center gap-2 text-sm text-gray-500 mb-2 shrink-0">
						{STEPS.map((label, idx) => (
							<span key={label} className={idx === step ? 'text-primary font-medium' : ''}>
								{label}
								{idx < STEPS.length - 1 ? ' · ' : ''}
							</span>
						))}
					</div>
					<div className="overflow-y-auto min-h-0 py-1 flex-1">
						{stepContent()}
					</div>
					<DialogFooter className="shrink-0 mt-4 pt-2 border-t border-gray-200 dark:border-gray-700 flex-col-reverse sm:flex-row flex-wrap justify-end gap-2">
						{step > 0 && (
							<Button variant="outline" onClick={() => setStep((prev) => prev - 1)} className="w-full sm:w-auto order-3 sm:order-none">
								Anterior
							</Button>
						)}
						<Button variant="outline" onClick={() => setOpenModal(false)} className="w-full sm:w-auto">
							Cancelar
						</Button>
						{step < STEPS.length - 1 ? (
							<Button onClick={() => setStep((prev) => prev + 1)} className="w-full sm:w-auto">Siguiente</Button>
						) : (
							<Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
								{saving ? 'Guardando...' : editingPoliza ? 'Actualizar póliza' : 'Guardar póliza'}
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<PolizaDetailPanel
				poliza={selectedPoliza}
				isOpen={panelOpen}
				onClose={() => setPanelOpen(false)}
				onAseguradoClick={handleAseguradoClick}
				onAseguradoraClick={handleAseguradoraClick}
				onEditClick={openForEdit}
			/>

			<AseguradoHistoryModal
				isOpen={aseguradoHistoryOpen}
				onClose={() => setAseguradoHistoryOpen(false)}
				asegurado={selectedAseguradoForHistory}
			/>

			<AseguradoraHistoryModal
				isOpen={aseguradoraHistoryOpen}
				onClose={() => setAseguradoraHistoryOpen(false)}
				aseguradora={selectedAseguradoraForHistory}
			/>
		</div>
	)
}

export default PolizasPage
