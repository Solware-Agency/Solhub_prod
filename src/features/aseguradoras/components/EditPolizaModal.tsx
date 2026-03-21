import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addMonths, format, isValid, parse } from 'date-fns'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@shared/components/ui/dialog'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { DateField } from '@shared/components/ui/date-field'
import { useToast } from '@shared/hooks/use-toast'
import { ExternalLink, Paperclip, Upload, X } from 'lucide-react'
import { cn } from '@shared/lib/cn'
import { getAseguradoras } from '@services/supabase/aseguradoras/aseguradoras-service'
import type { Asegurado } from '@services/supabase/aseguradoras/asegurados-service'
import {
	getPolizaById,
	updatePoliza,
	type Poliza,
	type DocumentoPoliza,
} from '@services/supabase/aseguradoras/polizas-service'
import {
	uploadDocumentoPoliza,
	validateReciboFile,
	MAX_DOCUMENTOS_POLIZA,
} from '@services/supabase/storage/pagos-poliza-recibos-service'
import {
	POLIZA_FORM_STEPS as STEPS,
	RAMOS_OPCIONES,
	buildPaymentColumnsFromForm,
} from '@features/aseguradoras/lib/poliza-form-shared'

export interface EditPolizaModalProps {
	isOpen: boolean
	onClose: () => void
	/** Póliza a editar; con el modal abierto debe estar definida */
	poliza: Poliza | null
	/** Tras guardar correctamente, con relaciones asegurado/aseguradora */
	onSaved?: (updated: Poliza) => void
}

const defaultForm = () => ({
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

function polizaToFormState(p: Poliza) {
	return {
		asegurado_id: p.asegurado_id,
		aseguradora_id: p.aseguradora_id,
		agente_nombre: p.agente_nombre ?? '',
		numero_poliza: p.numero_poliza ?? '',
		ramo: p.ramo ?? '',
		suma_asegurada: p.suma_asegurada != null ? String(p.suma_asegurada) : '',
		modalidad_pago: p.modalidad_pago,
		estatus_poliza: (p.estatus_poliza === 'Anulada' ? 'Anulada' : 'Activa') as 'Activa' | 'Anulada',
		estatus_pago: (p.estatus_pago ?? 'Pendiente') as 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora',
		fecha_inicio: p.fecha_inicio?.slice(0, 10) ?? '',
		fecha_vencimiento: p.fecha_vencimiento?.slice(0, 10) ?? '',
		dia_vencimiento: p.dia_vencimiento != null ? String(p.dia_vencimiento) : '',
		fecha_prox_vencimiento: p.fecha_prox_vencimiento?.slice(0, 10) ?? '',
		notas: p.notas ?? '',
	}
}

export const EditPolizaModal: React.FC<EditPolizaModalProps> = ({ isOpen, onClose, poliza, onSaved }) => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const docFileInputRef = useRef<HTMLInputElement>(null)
	const [step, setStep] = useState(1)
	const [saving, setSaving] = useState(false)
	const [uploadingPdf, setUploadingPdf] = useState(false)
	const [editingPoliza, setEditingPoliza] = useState<Poliza | null>(null)
	const [selectedAsegurado, setSelectedAsegurado] = useState<Asegurado | null>(null)
	const [form, setForm] = useState(defaultForm)
	const [documentFiles, setDocumentFiles] = useState<File[]>([])
	const [existingDocumentos, setExistingDocumentos] = useState<DocumentoPoliza[]>([])
	const [removedDocIndices, setRemovedDocIndices] = useState<Set<number>>(new Set())

	const { data: aseguradorasData } = useQuery({
		queryKey: ['aseguradoras-catalogo'],
		queryFn: getAseguradoras,
		staleTime: 1000 * 60 * 5,
		enabled: isOpen,
	})

	const parseIsoDate = (value: string) => (value ? new Date(`${value}T00:00:00`) : undefined)

	useLayoutEffect(() => {
		if (!isOpen || !poliza) return
		setEditingPoliza(poliza)
		setForm(polizaToFormState(poliza))
		setSelectedAsegurado(
			poliza.asegurado
				? ({
						id: poliza.asegurado.id,
						full_name: poliza.asegurado.full_name,
						document_id: poliza.asegurado.document_id,
					} as Asegurado)
				: null,
		)
		setExistingDocumentos(poliza.documentos_poliza ?? [])
		setRemovedDocIndices(new Set())
		setDocumentFiles([])
		if (docFileInputRef.current) docFileInputRef.current.value = ''
		setStep(1)
	}, [isOpen, poliza])

	const resetLocal = useCallback(() => {
		setEditingPoliza(null)
		setForm(defaultForm())
		setSelectedAsegurado(null)
		setDocumentFiles([])
		setExistingDocumentos([])
		setRemovedDocIndices(new Set())
		if (docFileInputRef.current) docFileInputRef.current.value = ''
		setStep(1)
		setSaving(false)
		setUploadingPdf(false)
	}, [])

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				resetLocal()
				onClose()
			}
		},
		[onClose, resetLocal],
	)

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

	const getValidationErrors = (): { step: string; fields: string[] }[] => {
		const errors: { step: string; fields: string[] }[] = []
		const part2: string[] = []
		if (!form.aseguradora_id?.trim()) part2.push('Aseguradora')
		if (!form.agente_nombre?.trim()) part2.push('Agente / Productor')
		if (!form.numero_poliza?.trim()) part2.push('Número de póliza')
		if (!form.ramo?.trim()) part2.push('Ramo')
		if (!form.suma_asegurada?.trim()) part2.push('Suma asegurada')
		if (part2.length > 0) errors.push({ step: 'Datos póliza', fields: part2 })
		const fechas: string[] = []
		if (!form.fecha_inicio?.trim()) fechas.push('Fecha de emisión')
		if (!form.fecha_vencimiento?.trim()) fechas.push('Fecha vencimiento')
		if (fechas.length > 0) errors.push({ step: 'Fechas', fields: fechas })
		return errors
	}

	const getValidationErrorsForStep = (stepIndex: number): string[] => {
		if (stepIndex === 0) return []
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
		if (!editingPoliza?.id) return
		const allErrors = getValidationErrors()
		if (allErrors.length > 0) {
			showValidationToast(allErrors)
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
			await queryClient.invalidateQueries({ queryKey: ['polizas'] })
			await queryClient.invalidateQueries({ queryKey: ['aseguradoras-stats'] })
			if (editingPoliza.asegurado_id) {
				await queryClient.invalidateQueries({ queryKey: ['polizas-by-asegurado', editingPoliza.asegurado_id] })
			}
			if (editingPoliza.aseguradora_id) {
				await queryClient.invalidateQueries({ queryKey: ['polizas-by-aseguradora', editingPoliza.aseguradora_id] })
			}
			const refreshed = await getPolizaById(editingPoliza.id)
			toast({ title: 'Póliza actualizada' })
			resetLocal()
			onClose()
			if (refreshed) onSaved?.(refreshed)
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al actualizar póliza', variant: 'destructive' })
		} finally {
			setSaving(false)
			setUploadingPdf(false)
		}
	}

	const stepContent = () => {
		switch (step) {
			case 0:
				return (
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
				)
			case 1:
				return (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>
								Aseguradora <span className="text-destructive">*</span>
							</Label>
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
							<Label>
								Agente / Productor <span className="text-destructive">*</span>
							</Label>
							<Input
								placeholder="Ej. John Doe"
								value={form.agente_nombre}
								onChange={(e) => setForm((prev) => ({ ...prev, agente_nombre: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>
								Número de póliza <span className="text-destructive">*</span>
							</Label>
							<Input
								placeholder="Ej. POL-2024-001"
								value={form.numero_poliza}
								onChange={(e) => setForm((prev) => ({ ...prev, numero_poliza: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>
								Ramo <span className="text-destructive">*</span>
							</Label>
							<Select value={form.ramo} onValueChange={(value) => setForm((prev) => ({ ...prev, ramo: value }))}>
								<SelectTrigger className="min-w-0">
									<SelectValue placeholder="Seleccionar ramo" />
								</SelectTrigger>
								<SelectContent className="max-h-60 max-w-(--radix-select-trigger-width)" position="popper">
									{RAMOS_OPCIONES.map((ramo) => (
										<SelectItem key={ramo} value={ramo} className="min-w-0 [&>span:last-child]:truncate">
											{ramo}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>
								Suma asegurada <span className="text-destructive">*</span>
							</Label>
							<Input
								type="number"
								placeholder="Ej. 100000"
								value={form.suma_asegurada}
								onChange={(e) => setForm((prev) => ({ ...prev, suma_asegurada: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>
								Modalidad de pago <span className="text-destructive">*</span>
							</Label>
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
							<Label>
								Estatus póliza <span className="text-destructive">*</span>
							</Label>
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
							<Label>
								Estatus pago <span className="text-destructive">*</span>
							</Label>
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
									<SelectItem value="Parcial">Parcial</SelectItem>
									<SelectItem value="En mora">En mora</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				)
			case 2:
				return (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2 min-w-0">
							<Label>
								Fecha de emisión <span className="text-destructive">*</span>
							</Label>
							<DateField
								value={form.fecha_inicio}
								onChange={(fechaStr) => {
									const months =
										form.modalidad_pago === 'Mensual'
											? 1
											: form.modalidad_pago === 'Trimestral'
												? 3
												: form.modalidad_pago === 'Semestral'
													? 6
													: 12
									const date = fechaStr ? parse(fechaStr, 'yyyy-MM-dd', new Date()) : null
									const proxStr =
										fechaStr && date && isValid(date) ? format(addMonths(date, months), 'yyyy-MM-dd') : ''
									setForm((prev) => ({
										...prev,
										fecha_inicio: fechaStr,
										fecha_prox_vencimiento: proxStr,
										dia_vencimiento: proxStr ? String(new Date(proxStr + 'T12:00:00').getDate()) : prev.dia_vencimiento,
									}))
								}}
								placeholder="DD/MM/AAAA"
							/>
						</div>
						<div className="space-y-2 min-w-0">
							<Label>
								Fecha vencimiento <span className="text-destructive">*</span>
							</Label>
							<DateField
								value={form.fecha_vencimiento}
								onChange={(fechaStr) => {
									const baseDate = form.fecha_inicio ? new Date(form.fecha_inicio + 'T12:00:00') : (fechaStr ? new Date(fechaStr + 'T12:00:00') : null)
									const months =
										form.modalidad_pago === 'Mensual'
											? 1
											: form.modalidad_pago === 'Trimestral'
												? 3
												: form.modalidad_pago === 'Semestral'
													? 6
													: 12
									const proxDate = baseDate && !isNaN(baseDate.getTime()) ? addMonths(baseDate, months) : (fechaStr ? new Date(fechaStr + 'T12:00:00') : null)
									const proxStr = proxDate && !isNaN(proxDate.getTime()) ? format(proxDate, 'yyyy-MM-dd') : fechaStr
									setForm((prev) => ({
										...prev,
										fecha_vencimiento: fechaStr,
										dia_vencimiento: proxDate && !isNaN(proxDate.getTime()) ? String(proxDate.getDate()) : '',
										fecha_prox_vencimiento: proxStr,
									}))
								}}
								placeholder="DD/MM/AAAA"
							/>
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
								{form.fecha_prox_vencimiento ? format(parseIsoDate(form.fecha_prox_vencimiento)!, 'dd/MM/yyyy') : ''}
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
		<Dialog open={Boolean(isOpen && poliza)} onOpenChange={handleOpenChange}>
			<DialogContent
				className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90dvh] flex flex-col rounded-2xl sm:rounded-xl p-4 sm:p-6 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] z-[999999999999999999]"
				overlayClassName="bg-black/60"
			>
				<DialogHeader className="shrink-0">
					<DialogTitle className="text-base sm:text-lg">Editar póliza</DialogTitle>
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
				<div className="overflow-y-auto min-h-0 py-1 flex-1">{stepContent()}</div>
				<DialogFooter className="shrink-0 mt-4 pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-row flex-wrap justify-end gap-2">
					{step > 0 && (
						<Button variant="outline" onClick={() => setStep((prev) => prev - 1)} size="sm" className="shrink-0">
							Anterior
						</Button>
					)}
					<Button variant="outline" onClick={() => handleOpenChange(false)} size="sm" className="shrink-0">
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
							{saving ? 'Guardando...' : 'Actualizar póliza'}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
