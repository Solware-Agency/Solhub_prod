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
import { Plus, Download, Search, ChevronLeft, ChevronRight, CalendarIcon, Upload, X, Paperclip, ExternalLink } from 'lucide-react'
import { cn } from '@shared/lib/cn'
import { format, addMonths } from 'date-fns'
import { exportRowsToExcel } from '@shared/utils/exportToExcel'
import { getAseguradoras, type Aseguradora } from '@services/supabase/aseguradoras/aseguradoras-service'
import { findAseguradoById, type Asegurado } from '@services/supabase/aseguradoras/asegurados-service'
import {
	createPoliza,
	getPolizas,
	updatePoliza,
	type Poliza,
	type DocumentoPoliza,
} from '@services/supabase/aseguradoras/polizas-service'
import { AseguradoSearchAutocomplete } from '@features/aseguradoras/components/AseguradoSearchAutocomplete'
import { PolizaDetailPanel } from '@features/aseguradoras/components/PolizaDetailPanel'
import { AseguradoHistoryModal } from '@features/aseguradoras/components/AseguradoHistoryModal'
import { AseguradoraHistoryModal } from '@features/aseguradoras/components/AseguradoraHistoryModal'
import PolizaCard from '@features/aseguradoras/components/PolizaCard'
import {
	uploadDocumentoPoliza,
	validateReciboFile,
	MAX_DOCUMENTOS_POLIZA,
} from '@services/supabase/storage/pagos-poliza-recibos-service'

const STEPS = ['Asegurado', 'Datos póliza', 'Fechas', 'Documentos'] as const

/** Opciones de ramo (desc_ramo) según catálogo de aseguradoras */
const RAMOS_OPCIONES = [
	'MAQUINARIA Y EQUIPOS INDUSTRIALES',
	'AUTOMOVIL',
	'MILENIO DEL HOGAR',
	'HCM',
	'TODO RIESGO DE INCENDIO',
	'MILENIO INDUSTRIA Y COMERCIO',
	'SERVICIOS MEDICOS MERCANTIL',
	'GLOBAL BENEFITS INDIVIDUAL',
	'HCM COLECTIVO',
	'INTER INDUSTRIA Y COMERCIO',
	'SEGURO DE DINERO',
	'EQUIPOS ELECTRONICOS',
	'COMBINADO DE RESIDENCIA',
	'ROBO',
	'AVIACION',
	'TRANSPORTE TERRESTRE',
	'3D',
	'RESPONSABILIDAD CIVIL GENERAL',
	'RIESGOS ESPECIALES',
	'INCENDIO',
	'TODO RIESGO INCENDIO',
	'FIANZA',
	'ACCIDENTES PERSONALES',
	'TERREMOTO',
	'VIDA',
	'RCV EMBARCACIONES',
	'SEGURO SOLIDARIO SALUD',
	'SEGURO SOIDARIO FUNERARIO',
	'SEGURO SOLIDARIO ACCIDENTES PERSONALES',
	'SEGUROS FUNERARIOS COLECTIVO',
	'VIDA COLECTIVA',
	'ACCIDENTES PERSONALES COLECTIVO',
	'SERVICIOS DE EMERGENCIA MÉDICA',
	'SEGUROS DE INDUSTRIA Y COMERCIO',
	'GROUP BENEFITS INTEGRAL',
	'RESPONSABILIDAD CIVIL PROFESIONAL',
	'REPONSABILIDAD CIVIL PATRONAL',
	'REPONSABILIDAD CIVIL EMPRESARIAL',
	'INCENDIO Y TERREMOTO',
	'ACCIDENTES PERSONALES ESCOLARES',
	'PYME',
	'GLOBAL BENEFITS COLECTIVO',
	'RCV',
] as const

/** Construye las 5 columnas de cobro/recordatorios desde los valores del formulario. */
function buildPaymentColumnsFromForm(form: {
	fecha_prox_vencimiento: string
	fecha_vencimiento: string
	dia_vencimiento: string
	modalidad_pago: 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual'
	suma_asegurada: string
	estatus_pago: 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora'
}) {
	const nextPaymentDate = form.fecha_prox_vencimiento || form.fecha_vencimiento || null
	const renewalDay = form.dia_vencimiento ? Number(form.dia_vencimiento) : null
	const paymentFrequency =
		form.modalidad_pago === 'Mensual'
			? 'monthly'
			: form.modalidad_pago === 'Trimestral'
				? 'quarterly'
				: form.modalidad_pago === 'Semestral'
					? 'semiannual'
					: 'yearly'
	const billingAmount = form.suma_asegurada ? Number(form.suma_asegurada) : null
	let paymentStatus: 'current' | 'overdue' =
		form.estatus_pago === 'Pagado'
			? 'current'
			: form.estatus_pago === 'En mora'
				? 'overdue'
				: (() => {
						const refDate = nextPaymentDate || form.fecha_vencimiento
						if (!refDate) return 'current'
						const ref = new Date(refDate)
						ref.setHours(0, 0, 0, 0)
						const today = new Date()
						today.setHours(0, 0, 0, 0)
						return ref < today ? 'overdue' : 'current'
					})()
	return {
		next_payment_date: nextPaymentDate || null,
		renewal_day_of_month: renewalDay,
		payment_frequency: paymentFrequency,
		billing_amount: billingAmount,
		payment_status: paymentStatus,
	}
}

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
	const [documentFiles, setDocumentFiles] = useState<File[]>([])
	const [existingDocumentos, setExistingDocumentos] = useState<DocumentoPoliza[]>([])
	const [removedDocIndices, setRemovedDocIndices] = useState<Set<number>>(new Set())
	const docFileInputRef = React.useRef<HTMLInputElement>(null)
	const [form, setForm] = useState({
		asegurado_id: '',
		aseguradora_id: '',
		agente_nombre: '',
		numero_poliza: '',
		ramo: '',
		suma_asegurada: '',
		modalidad_pago: 'Mensual' as 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual',
		estatus_poliza: 'Activa' as 'Activa' | 'Anulada',
		estatus_pago: 'Pendiente' as 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora',
		fecha_inicio: '',
		fecha_vencimiento: '',
		dia_vencimiento: '',
		fecha_prox_vencimiento: '',
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
			notas: '',
		})
		setDocumentFiles([])
		setExistingDocumentos([])
		setRemovedDocIndices(new Set())
		if (docFileInputRef.current) docFileInputRef.current.value = ''
		setStep(0)
		setSelectedAsegurado(null)
		setEditingPoliza(null)
	}

	const openNewModal = () => {
		resetForm()
		setOpenModal(true)
	}

	const keptExistingCount = existingDocumentos.length - removedDocIndices.size
	const totalDocCount = keptExistingCount + documentFiles.length
	const canAddMoreDocs = totalDocCount < MAX_DOCUMENTOS_POLIZA

	const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? [])
		if (!form.asegurado_id && !editingPoliza) {
			toast({ title: 'Selecciona un asegurado primero', variant: 'destructive' })
			return
		}
		const valid: File[] = []
		for (const file of files) {
			if (totalDocCount + valid.length >= MAX_DOCUMENTOS_POLIZA) break
			const v = validateReciboFile(file)
			if (v.valid) valid.push(file)
			else toast({ title: v.error, variant: 'destructive' })
		}
		setDocumentFiles((prev) => [...prev, ...valid].slice(0, MAX_DOCUMENTOS_POLIZA - keptExistingCount))
		e.target.value = ''
	}

	const removeDocFile = (index: number) => {
		setDocumentFiles((prev) => prev.filter((_, i) => i !== index))
	}

	const removeExistingDoc = (index: number) => {
		setRemovedDocIndices((prev) => new Set([...prev, index]))
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
			estatus_poliza: (poliza.estatus_poliza === 'Anulada' ? 'Anulada' : 'Activa') as 'Activa' | 'Anulada',
			estatus_pago: (poliza.estatus_pago ?? 'Pendiente') as 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora',
			fecha_inicio: poliza.fecha_inicio?.slice(0, 10) ?? '',
			fecha_vencimiento: poliza.fecha_vencimiento?.slice(0, 10) ?? '',
			dia_vencimiento: poliza.dia_vencimiento != null ? String(poliza.dia_vencimiento) : '',
			fecha_prox_vencimiento: poliza.fecha_prox_vencimiento?.slice(0, 10) ?? '',
			notas: poliza.notas ?? '',
		})
		setSelectedAsegurado(
			poliza.asegurado
				? ({ id: poliza.asegurado.id, full_name: poliza.asegurado.full_name, document_id: poliza.asegurado.document_id } as Asegurado)
				: null,
		)
		setExistingDocumentos(poliza.documentos_poliza ?? [])
		setRemovedDocIndices(new Set())
		setDocumentFiles([])
		setEditingPoliza(poliza)
		setPanelOpen(false)
		setOpenModal(true)
		setStep(1)
	}, [])

	const openDetailPanel = (row: Poliza) => {
		setSelectedPoliza(row)
		setPanelOpen(true)
	}

	/** Validación unificada por paso. Devuelve los campos obligatorios faltantes agrupados por sección. */
	const getValidationErrors = (): { step: string; fields: string[] }[] => {
		const errors: { step: string; fields: string[] }[] = []

		// Paso 1: Asegurado (solo al crear)
		if (!editingPoliza && !form.asegurado_id?.trim()) {
			errors.push({ step: 'Asegurado', fields: ['Seleccione un asegurado'] })
		}

		// Paso 2: Datos póliza
		const part2: string[] = []
		if (!form.aseguradora_id?.trim()) part2.push('Aseguradora')
		if (!form.agente_nombre?.trim()) part2.push('Agente / Productor')
		if (!form.numero_poliza?.trim()) part2.push('Número de póliza')
		if (!form.ramo?.trim()) part2.push('Ramo')
		if (!form.suma_asegurada?.trim()) part2.push('Suma asegurada')
		if (part2.length > 0) errors.push({ step: 'Datos póliza', fields: part2 })

		// Paso 3: Fechas (requeridos por backend)
		const fechas: string[] = []
		if (!form.fecha_inicio?.trim()) fechas.push('Fecha de emisión')
		if (!form.fecha_vencimiento?.trim()) fechas.push('Fecha vencimiento')
		if (fechas.length > 0) errors.push({ step: 'Fechas', fields: fechas })

		return errors
	}

	/** Validación solo del paso actual (para botón Siguiente) */
	const getValidationErrorsForStep = (stepIndex: number): string[] => {
		if (stepIndex === 0) {
			if (!editingPoliza && !form.asegurado_id?.trim()) return ['Seleccione un asegurado']
			return []
		}
		if (stepIndex === 1) {
			const err: string[] = []
			if (!form.aseguradora_id?.trim()) err.push('Aseguradora')
			if (!form.agente_nombre?.trim()) err.push('Agente / Productor')
			if (!form.numero_poliza?.trim()) err.push('Número de póliza')
			if (!form.ramo?.trim()) err.push('Ramo')
			if (!form.suma_asegurada?.trim()) err.push('Suma asegurada')
			return err
		}
		if (stepIndex === 2) {
			const err: string[] = []
			if (!form.fecha_inicio?.trim()) err.push('Fecha de emisión')
			if (!form.fecha_vencimiento?.trim()) err.push('Fecha vencimiento')
			return err
		}
		return []
	}

	const showValidationToast = (errors: { step: string; fields: string[] }[]) => {
		const description = errors.map((e) => `En ${e.step}: ${e.fields.join(', ')}`).join('. ')
		toast({
			title: 'Complete los campos obligatorios',
			description,
			variant: 'destructive',
		})
	}

	const handleSave = async () => {
		const allErrors = getValidationErrors()
		if (allErrors.length > 0) {
			showValidationToast(allErrors)
			return
		}
		if (!editingPoliza) {
			setSaving(true)
			try {
				const paymentCols = buildPaymentColumnsFromForm(form)
				const newPoliza = await createPoliza({
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
					pdf_url: null,
					notas: form.notas || null,
					...paymentCols,
				})
				const documentos: DocumentoPoliza[] = []
				for (const file of documentFiles.slice(0, MAX_DOCUMENTOS_POLIZA)) {
					setUploadingPdf(true)
					const { data, error } = await uploadDocumentoPoliza(file, newPoliza.id)
					setUploadingPdf(false)
					if (error) toast({ title: `Error al subir ${file.name}`, description: error.message, variant: 'destructive' })
					else if (data) documentos.push({ url: data.url, name: data.name })
				}
				if (documentos.length > 0) {
					await updatePoliza(newPoliza.id, {
						documentos_poliza: documentos,
						pdf_url: documentos[0]?.url ?? null,
					})
				}
				queryClient.invalidateQueries({ queryKey: ['polizas'] })
				setOpenModal(false)
				toast({ title: 'Póliza creada' })
			} catch (err) {
				console.error(err)
				toast({ title: 'Error al crear póliza', variant: 'destructive' })
			} finally {
				setSaving(false)
				setUploadingPdf(false)
			}
			return
		}
		setSaving(true)
		try {
			const keptExisting = existingDocumentos.filter((_, i) => !removedDocIndices.has(i))
			const documentos: DocumentoPoliza[] = [...keptExisting]
			for (const file of documentFiles) {
				setUploadingPdf(true)
				const { data, error } = await uploadDocumentoPoliza(file, editingPoliza.id)
				setUploadingPdf(false)
				if (error) toast({ title: `Error al subir ${file.name}`, description: error.message, variant: 'destructive' })
				else if (data) documentos.push({ url: data.url, name: data.name })
			}
			const finalDocumentos = documentos.slice(0, MAX_DOCUMENTOS_POLIZA)
			const paymentCols = buildPaymentColumnsFromForm(form)
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
				documentos_poliza: finalDocumentos,
				pdf_url: finalDocumentos[0]?.url ?? null,
				notas: form.notas || null,
				...paymentCols,
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
							<Label>Aseguradora <span className="text-destructive">*</span></Label>
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
							<Label>Agente / Productor <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Ej. John Doe"
								value={form.agente_nombre}
								onChange={(e) => setForm((prev) => ({ ...prev, agente_nombre: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Número de póliza <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Ej. POL-2024-001"
								value={form.numero_poliza}
								onChange={(e) => setForm((prev) => ({ ...prev, numero_poliza: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Ramo <span className="text-destructive">*</span></Label>
							<Select
								value={form.ramo}
								onValueChange={(value) => setForm((prev) => ({ ...prev, ramo: value }))}
							>
								<SelectTrigger className="min-w-0">
									<SelectValue placeholder="Seleccionar ramo" />
								</SelectTrigger>
								<SelectContent
									className="max-h-60 max-w-[var(--radix-select-trigger-width)]"
									position="popper"
								>
									{RAMOS_OPCIONES.map((ramo) => (
										<SelectItem key={ramo} value={ramo} className="min-w-0 [&>span:last-child]:truncate">
											{ramo}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Suma asegurada <span className="text-destructive">*</span></Label>
							<Input
								type="number"
								placeholder="Ej. 100000"
								value={form.suma_asegurada}
								onChange={(e) => setForm((prev) => ({ ...prev, suma_asegurada: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Modalidad de pago <span className="text-destructive">*</span></Label>
							<Select
								value={form.modalidad_pago}
								onValueChange={(value) => {
									const modalidad = value as 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual'
									const months =
										modalidad === 'Mensual' ? 1 : modalidad === 'Trimestral' ? 3 : modalidad === 'Semestral' ? 6 : 12
									setForm((prev) => {
										const baseDate = prev.fecha_inicio ? new Date(prev.fecha_inicio + 'T12:00:00') : null
										const proxStr =
											baseDate && !isNaN(baseDate.getTime())
												? format(addMonths(baseDate, months), 'yyyy-MM-dd')
												: prev.fecha_prox_vencimiento
										const dia = proxStr ? String(new Date(proxStr + 'T12:00:00').getDate()) : prev.dia_vencimiento
										return {
											...prev,
											modalidad_pago: modalidad,
											fecha_prox_vencimiento: proxStr,
											dia_vencimiento: dia,
										}
									})
								}}
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
							<Label>Estatus póliza <span className="text-destructive">*</span></Label>
							<Select
								value={form.estatus_poliza}
								onValueChange={(value) =>
									setForm((prev) => ({
										...prev,
										estatus_poliza: value as 'Activa' | 'Anulada',
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Activa">Activa</SelectItem>
									<SelectItem value="Anulada">Anulada</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Estatus pago <span className="text-destructive">*</span></Label>
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
									<SelectItem value="Pendiente">Pendiente</SelectItem>
									<SelectItem value="Pagado">Pagado</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				)
			case 2:
				return (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Fecha de emisión <span className="text-destructive">*</span></Label>
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
										onSelect={(date) => {
											const fechaStr = date ? format(date, 'yyyy-MM-dd') : ''
											const months =
												form.modalidad_pago === 'Mensual'
													? 1
													: form.modalidad_pago === 'Trimestral'
														? 3
														: form.modalidad_pago === 'Semestral'
															? 6
															: 12
											const proxStr =
												fechaStr && date
													? format(addMonths(date, months), 'yyyy-MM-dd')
													: ''
											setForm((prev) => ({
												...prev,
												fecha_inicio: fechaStr,
												fecha_prox_vencimiento: proxStr,
												dia_vencimiento: proxStr ? String(new Date(proxStr + 'T12:00:00').getDate()) : prev.dia_vencimiento,
											}))
										}}
										allowFutureDates
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div className="space-y-2">
							<Label>Fecha vencimiento <span className="text-destructive">*</span></Label>
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
										onSelect={(date) => {
											const fechaStr = date ? format(date, 'yyyy-MM-dd') : ''
											// fecha_prox_vencimiento = fecha_emisión + periodo; si no hay emisión, usar vencimiento
											const baseDate = form.fecha_inicio ? new Date(form.fecha_inicio + 'T12:00:00') : date
											const months =
												form.modalidad_pago === 'Mensual'
													? 1
													: form.modalidad_pago === 'Trimestral'
														? 3
														: form.modalidad_pago === 'Semestral'
															? 6
															: 12
											const proxDate =
												baseDate && !isNaN(baseDate.getTime()) ? addMonths(baseDate, months) : date
											const proxStr = proxDate ? format(proxDate, 'yyyy-MM-dd') : fechaStr
											setForm((prev) => ({
												...prev,
												fecha_vencimiento: fechaStr,
												dia_vencimiento: proxDate ? String(proxDate.getDate()) : '',
												fecha_prox_vencimiento: proxStr,
											}))
										}}
										allowFutureDates
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div className="space-y-2">
							<Label className="text-muted-foreground">Día de vencimiento</Label>
							<div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
								{form.dia_vencimiento ? `Día ${form.dia_vencimiento}` : ''}
							</div>
						</div>
						<div className="space-y-2">
							<Label className="text-muted-foreground">Fecha próximo vencimiento</Label>
							<div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
								{form.fecha_prox_vencimiento
									? format(parseIsoDate(form.fecha_prox_vencimiento)!, 'dd/MM/yyyy')
									: ''}
							</div>
						</div>
					</div>
				)
			case 3:
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Paperclip className="h-4 w-4" />
								Documentos de póliza (máx. {MAX_DOCUMENTOS_POLIZA})
							</Label>
							<p className="text-xs text-muted-foreground">PDF, JPG o PNG. Máximo 10 MB por archivo.</p>
							{existingDocumentos.some((_, i) => !removedDocIndices.has(i)) && (
								<ul className="space-y-1.5 mb-2">
									{existingDocumentos.map((doc, i) =>
										removedDocIndices.has(i) ? null : (
											<li key={i} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-muted/50">
												<a
													href={doc.url}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-2 truncate text-primary hover:underline"
												>
													<ExternalLink className="h-4 w-4 shrink-0" />
													<span className="truncate">{doc.name || `Documento ${i + 1}`}</span>
												</a>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => removeExistingDoc(i)}
													className="shrink-0 h-8 w-8 p-0"
													aria-label="Quitar"
												>
													<X className="h-4 w-4" />
												</Button>
											</li>
										),
									)}
								</ul>
							)}
							{canAddMoreDocs && (
								<label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md border border-dashed border-input bg-muted/30 hover:bg-muted/50 cursor-pointer text-sm">
									<Upload className="h-4 w-4" />
									{uploadingPdf ? 'Subiendo...' : 'Seleccionar archivos'}
									<input
										ref={docFileInputRef}
										type="file"
										accept=".pdf,.jpg,.jpeg,.png"
										multiple
										className="hidden"
										onChange={handleDocFileChange}
										disabled={uploadingPdf || (!form.asegurado_id && !editingPoliza)}
									/>
								</label>
							)}
							{documentFiles.length > 0 && (
								<ul className="space-y-1.5">
									{documentFiles.map((file, i) => (
										<li key={i} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-muted/50">
											<span className="truncate">{file.name}</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => removeDocFile(i)}
												disabled={uploadingPdf}
												className="shrink-0 h-8 w-8 p-0"
												aria-label="Quitar"
											>
												<X className="h-4 w-4" />
											</Button>
										</li>
									))}
								</ul>
							)}
						</div>
						<div className="space-y-2">
							<Label>Notas</Label>
							<Input
								placeholder="Observaciones o comentarios"
								value={form.notas}
								onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
							/>
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
					<div className="flex md:hidden items-center justify-center gap-1.5 text-xs text-gray-500 mb-2 shrink-0 pb-1">
						{STEPS.map((label, idx) => (
							<span
								key={label}
								className={cn(
									'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
									idx === step ? 'text-primary font-medium bg-primary/10' : 'text-muted-foreground',
								)}
								title={label}
							>
								{idx + 1}
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
					<DialogFooter className="shrink-0 mt-4 pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-row flex-wrap justify-end gap-2">
						{step > 0 && (
							<Button variant="outline" onClick={() => setStep((prev) => prev - 1)} size="sm" className="shrink-0">
								Anterior
							</Button>
						)}
						<Button variant="outline" onClick={() => setOpenModal(false)} size="sm" className="shrink-0">
							Cancelar
						</Button>
						{step < STEPS.length - 1 ? (
							<Button
								onClick={() => {
									const stepErrors = getValidationErrorsForStep(step)
									if (stepErrors.length > 0) {
										const stepName = STEPS[step]
										toast({
											title: 'Campos obligatorios',
											description: `En ${stepName}: ${stepErrors.join(', ')}`,
											variant: 'destructive',
										})
										return
									}
									setStep((prev) => prev + 1)
								}}
								size="sm"
								className="shrink-0"
							>
								Siguiente
							</Button>
						) : (
							<Button onClick={handleSave} disabled={saving} size="sm" className="shrink-0">
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
