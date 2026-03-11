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
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
import { Calendar } from '@shared/components/ui/calendar'
import { useToast } from '@shared/hooks/use-toast'
import { Plus, Download, Search, ChevronLeft, ChevronRight, CalendarIcon, Paperclip, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@shared/lib/cn'
import { exportRowsToExcel } from '@shared/utils/exportToExcel'
import AseguradoCard from '@features/aseguradoras/components/AseguradoCard'
import {
	createAsegurado,
	getAsegurados,
	updateAsegurado,
	type Asegurado,
} from '@services/supabase/aseguradoras/asegurados-service'
import {
	uploadAseguradoAttachment,
	validateReciboFile,
	MAX_ASEGURADO_ATTACHMENTS,
} from '@services/supabase/storage/pagos-poliza-recibos-service'
import { AseguradoHistoryModal } from '@features/aseguradoras/components/AseguradoHistoryModal'

const AseguradosPage = () => {
	const queryClient = useQueryClient()
	const { toast } = useToast()
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(32)
	const [openModal, setOpenModal] = useState(false)
	const [selectedAsegurado, setSelectedAsegurado] = useState<Asegurado | null>(null)
	const [historyModalOpen, setHistoryModalOpen] = useState(false)
	const [form, setForm] = useState({
		full_name: '',
		document_tipo: 'V' as 'V' | 'J',
		document_numero: '',
		phone: '',
		email: '',
		fecha_nacimiento: '' as string,
		address: '',
		notes: '',
		tipo_asegurado: 'Persona natural' as 'Persona natural' | 'Persona jurídica',
	})
	const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
	const [saving, setSaving] = useState(false)

	const { data, isLoading, error } = useQuery({
		queryKey: ['asegurados', searchTerm, currentPage, itemsPerPage],
		queryFn: () => getAsegurados(currentPage, itemsPerPage, searchTerm),
		staleTime: 1000 * 60 * 5,
	})

	const asegurados = useMemo(() => data?.data ?? [], [data])
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

	const resetForm = () => {
		setForm({
			full_name: '',
			document_tipo: 'V',
			document_numero: '',
			phone: '',
			email: '',
			fecha_nacimiento: '',
			address: '',
			notes: '',
			tipo_asegurado: 'Persona natural',
		})
		setAttachmentFiles([])
	}

	const openNewModal = () => {
		resetForm()
		setOpenModal(true)
	}

	const openHistoryModal = (row: Asegurado) => {
		setSelectedAsegurado(row)
		setHistoryModalOpen(true)
	}

	/** Solo caracteres válidos en correo: letras, números, @ . - _ + */
	const isValidEmailChar = (char: string) => /[a-zA-Z0-9@._+-]/.test(char)
	const isValidEmail = (value: string): boolean => {
		const t = value.trim()
		if (!t.includes('@')) return false
		return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t)
	}

	const parseIsoDate = (value: string) => (value ? new Date(`${value}T00:00:00`) : undefined)

	const buildDocumentId = (): string => {
		const n = form.document_numero.replace(/\D/g, '')
		if (!n) return ''
		if (form.document_tipo === 'J' && n.length === 9) {
			return `J-${n.slice(0, 8)}-${n.slice(8)}`
		}
		return `${form.document_tipo}-${n}`
	}

	const getValidationErrors = (): string[] => {
		const err: string[] = []
		if (!form.full_name?.trim()) err.push('Nombre / Razón social')
		if (!form.document_numero?.trim()) err.push('Documento')
		if (!form.phone?.trim()) err.push('Teléfono')
		if (!form.email?.trim()) {
			err.push('Email')
		} else if (!form.email.includes('@')) {
			err.push('Email debe contener @')
		} else if (!isValidEmail(form.email)) {
			err.push('Email con formato inválido')
		}
		if (!form.address?.trim()) err.push('Dirección')
		return err
	}

	const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? [])
		const valid: File[] = []
		for (const file of files) {
			if (valid.length >= MAX_ASEGURADO_ATTACHMENTS) break
			const v = validateReciboFile(file)
			if (v.valid) valid.push(file)
			else toast({ title: v.error, variant: 'destructive' })
		}
		setAttachmentFiles((prev) => {
			const next = [...prev, ...valid].slice(0, MAX_ASEGURADO_ATTACHMENTS)
			return next
		})
		e.target.value = ''
	}

	const removeAttachment = (index: number) => {
		setAttachmentFiles((prev) => prev.filter((_, i) => i !== index))
	}

	const handleSave = async () => {
		const errors = getValidationErrors()
		if (errors.length > 0) {
			toast({
				title: 'Campos obligatorios',
				description: `Complete: ${errors.join(', ')}`,
				variant: 'destructive',
			})
			return
		}
		if (attachmentFiles.length > MAX_ASEGURADO_ATTACHMENTS) {
			toast({
				title: `Máximo ${MAX_ASEGURADO_ATTACHMENTS} archivos`,
				variant: 'destructive',
			})
			return
		}
		setSaving(true)
		try {
			const newAsegurado = await createAsegurado({
				full_name: form.full_name,
				document_id: buildDocumentId(),
				phone: form.phone,
				email: form.email,
				fecha_nacimiento: form.fecha_nacimiento?.trim() || null,
				address: form.address,
				notes: form.notes,
				tipo_asegurado: form.tipo_asegurado,
			})
			const attachments: { url: string; name: string }[] = []
			for (const file of attachmentFiles.slice(0, MAX_ASEGURADO_ATTACHMENTS)) {
				const { data, error } = await uploadAseguradoAttachment(file, newAsegurado.id)
				if (error) {
					toast({ title: `Error al subir ${file.name}`, description: error.message, variant: 'destructive' })
				} else if (data) {
					attachments.push({ url: data.url, name: data.name })
				}
			}
			if (attachments.length > 0) {
				await updateAsegurado(newAsegurado.id, { attachments })
			}
			toast({ title: 'Asegurado creado' })
			queryClient.invalidateQueries({ queryKey: ['asegurados'] })
			setOpenModal(false)
			resetForm()
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al guardar asegurado', variant: 'destructive' })
		} finally {
			setSaving(false)
		}
	}

	return (
		<div>
			<div className="mb-4 sm:mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold">Asegurados</h1>
				<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
			</div>

			<Card className="overflow-hidden">
				<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex flex-col lg:flex-row lg:items-center gap-3">
						<div className="relative flex-1 min-w-0">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								className="pl-9"
								placeholder="Buscar por nombre o documento"
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
									<SelectItem value="16">16</SelectItem>
									<SelectItem value="32">32</SelectItem>
									<SelectItem value="50">50</SelectItem>
								</SelectContent>
							</Select>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									exportRowsToExcel(
										'asegurados',
										asegurados.map((row) => ({
											Código: row.codigo ?? '',
											Nombre: row.full_name,
											Documento: row.document_id,
											Teléfono: row.phone,
											Email: row.email ?? '',
											'Fecha nac.': row.fecha_nacimiento ?? '',
											Tipo: row.tipo_asegurado,
										})),
									)
								}
								className="gap-1.5 sm:gap-2 shrink-0"
								title="Exportar"
							>
								<Download className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Exportar</span>
							</Button>
							<Button size="sm" onClick={openNewModal} className="gap-1.5 sm:gap-2 shrink-0" title="Nuevo asegurado">
								<Plus className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline">Nuevo asegurado</span>
							</Button>
						</div>
					</div>
				</div>

				<div className="p-4 min-h-80">
					{isLoading && <p className="text-sm text-gray-500">Cargando asegurados...</p>}
					{error && <p className="text-sm text-red-500">Error al cargar asegurados</p>}
					{!isLoading && !error && asegurados.length === 0 && (
						<p className="text-sm text-gray-500">No hay asegurados registrados.</p>
					)}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{asegurados.map((row) => (
							<AseguradoCard key={row.id} asegurado={row} onClick={() => openHistoryModal(row)} />
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
					className="w-[calc(100vw-2rem)] max-w-xl max-h-[90dvh] flex flex-col p-4 sm:p-6 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]"
					overlayClassName="bg-black/60"
				>
					<DialogHeader className="shrink-0">
						<DialogTitle className="text-base sm:text-lg">Nuevo asegurado</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto min-h-0 py-1">
						<div className="space-y-2">
							<Label>Tipo de persona <span className="text-destructive">*</span></Label>
							<Select
								value={form.tipo_asegurado}
								onValueChange={(value) =>
									setForm((prev) => ({ ...prev, tipo_asegurado: value as 'Persona natural' | 'Persona jurídica' }))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Persona natural">Natural</SelectItem>
									<SelectItem value="Persona jurídica">Jurídico</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Nombre / Razón social <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Juan Pérez o Empresa S.A."
								value={form.full_name}
								onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label>Documento <span className="text-destructive">*</span></Label>
							<div className="flex gap-2">
								<Select
									value={form.document_tipo}
									onValueChange={(value) => setForm((prev) => ({ ...prev, document_tipo: value as 'V' | 'J' }))}
								>
									<SelectTrigger className="w-16 shrink-0">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="V">V</SelectItem>
										<SelectItem value="J">J</SelectItem>
									</SelectContent>
								</Select>
								<Input
									placeholder={form.document_tipo === 'J' ? '12345678-9' : '12345678'}
									value={form.document_numero}
									onChange={(e) => {
										const onlyNumbers = e.target.value.replace(/\D/g, '')
										setForm((prev) => ({ ...prev, document_numero: onlyNumbers }))
									}}
									inputMode="numeric"
									maxLength={form.document_tipo === 'J' ? 9 : 15}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Teléfono <span className="text-destructive">*</span></Label>
							<Input
								placeholder="04141234567"
								value={form.phone}
								onChange={(e) => {
									const onlyNumbers = e.target.value.replace(/\D/g, '')
									setForm((prev) => ({ ...prev, phone: onlyNumbers }))
								}}
								inputMode="numeric"
							/>
						</div>
						<div className="space-y-2">
							<Label>Email <span className="text-destructive">*</span></Label>
							<Input
								type="email"
								autoComplete="email"
								placeholder="nombre@dominio.com"
								value={form.email}
								onChange={(e) => {
									const filtered = [...e.target.value].filter((c) => isValidEmailChar(c)).join('')
									setForm((prev) => ({ ...prev, email: filtered }))
								}}
							/>
						</div>
						<div className="space-y-2">
							<Label>Fecha de nacimiento</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											'w-full justify-start text-left font-normal',
											!form.fecha_nacimiento && 'text-muted-foreground',
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{form.fecha_nacimiento
											? format(parseIsoDate(form.fecha_nacimiento)!, 'dd/MM/yyyy')
											: 'Fecha'}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0">
									<Calendar
										mode="single"
										selected={parseIsoDate(form.fecha_nacimiento)}
										onSelect={(date) => {
											const fechaStr = date ? format(date, 'yyyy-MM-dd') : ''
											setForm((prev) => ({ ...prev, fecha_nacimiento: fechaStr }))
										}}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Dirección <span className="text-destructive">*</span></Label>
							<Input
								placeholder="Av. Principal, edificio X, piso 2"
								value={form.address}
								onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>Notas internas</Label>
							<Input
								placeholder="Contacto preferente, horario de atención"
								value={form.notes}
								onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label className="flex items-center gap-2">
								<Paperclip className="w-4 h-4" />
								Documentos adjuntos (máx. {MAX_ASEGURADO_ATTACHMENTS})
							</Label>
							<p className="text-xs text-muted-foreground">PDF, JPG o PNG. Máximo 10 MB por archivo.</p>
							{attachmentFiles.length < MAX_ASEGURADO_ATTACHMENTS && (
								<label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md border border-dashed border-input bg-muted/30 hover:bg-muted/50 cursor-pointer text-sm">
									<Plus className="w-4 h-4" />
									Seleccionar archivos
									<input
										type="file"
										accept=".pdf,image/jpeg,image/jpg,image/png"
										multiple
										className="sr-only"
										onChange={handleAttachmentChange}
									/>
								</label>
							)}
							{attachmentFiles.length > 0 && (
								<ul className="space-y-1.5 mt-2">
									{attachmentFiles.map((file, i) => (
										<li key={i} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-muted/50">
											<span className="truncate">{file.name}</span>
											<button
												type="button"
												onClick={() => removeAttachment(i)}
												className="p-1 rounded hover:bg-destructive/20 text-destructive shrink-0"
												aria-label="Quitar archivo"
											>
												<X className="w-4 h-4" />
											</button>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
					<DialogFooter className="shrink-0 flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
						<Button variant="outline" onClick={() => setOpenModal(false)} className="w-full sm:w-auto">
							Cancelar
						</Button>
						<Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
							{saving ? 'Guardando...' : 'Guardar'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AseguradoHistoryModal
				isOpen={historyModalOpen}
				onClose={() => setHistoryModalOpen(false)}
				asegurado={selectedAsegurado}
				onAseguradoUpdated={(updated) => {
					setSelectedAsegurado(updated)
					queryClient.invalidateQueries({ queryKey: ['asegurados'] })
				}}
			/>
		</div>
	)
}

export default AseguradosPage
