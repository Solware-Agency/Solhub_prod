import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeftFromLine, Save, User, Paperclip, Plus, X, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Input } from '@shared/components/ui/input'
import { Button } from '@shared/components/ui/button'
import { Label } from '@shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { DateField } from '@shared/components/ui/date-field'
import { useToast } from '@shared/hooks/use-toast'
import type { Asegurado, AseguradoAttachment } from '@services/supabase/aseguradoras/asegurados-service'
import { updateAsegurado } from '@services/supabase/aseguradoras/asegurados-service'
import {
	uploadAseguradoAttachment,
	validateReciboFile,
	MAX_ASEGURADO_ATTACHMENTS,
} from '@services/supabase/storage/pagos-poliza-recibos-service'
import {
	ASEGURADO_DOCUMENT_TIPO_OPTIONS,
	buildDocumentId,
	normalizeDocumentNumeroForTipo,
	parseDocumentId,
	type AseguradoDocumentTipo,
} from '@features/aseguradoras/lib/asegurado-document'

interface EditAseguradoModalProps {
	isOpen: boolean
	onClose: () => void
	asegurado: Asegurado | null
	onSave?: (updated: Asegurado) => void
}

const CardSection = ({
	title,
	icon: Icon,
	children,
}: {
	title: string
	icon: React.ComponentType<{ className?: string }>
	children: React.ReactNode
}) => (
	<div className="bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border border-input rounded-lg p-4 hover:shadow-md transition-shadow">
		<div className="flex items-center gap-2 mb-3">
			<Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
			<h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
		</div>
		{children}
	</div>
)

export const EditAseguradoModal = ({ isOpen, onClose, asegurado, onSave }: EditAseguradoModalProps) => {
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(false)
	const [form, setForm] = useState({
		full_name: '',
		document_tipo: 'V' as AseguradoDocumentTipo,
		document_numero: '',
		phone: '',
		email: '',
		fecha_nacimiento: '' as string,
		address: '',
		notes: '',
		tipo_asegurado: 'Persona natural' as 'Persona natural' | 'Persona jurídica',
	})
	const [existingAttachments, setExistingAttachments] = useState<AseguradoAttachment[]>([])
	const [removedAttachmentIndices, setRemovedAttachmentIndices] = useState<Set<number>>(new Set())
	const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([])

	useEffect(() => {
		if (asegurado) {
			const { tipo, numero } = parseDocumentId(asegurado.document_id)
			setForm({
				full_name: asegurado.full_name,
				document_tipo: tipo,
				document_numero: numero,
				phone: (asegurado.phone ?? '').replace(/\D/g, ''),
				email: asegurado.email ?? '',
				fecha_nacimiento: asegurado.fecha_nacimiento ?? '',
				address: asegurado.address ?? '',
				notes: asegurado.notes ?? '',
				tipo_asegurado: asegurado.tipo_asegurado,
			})
			setExistingAttachments(asegurado.attachments ?? [])
			setRemovedAttachmentIndices(new Set())
			setNewAttachmentFiles([])
		}
	}, [asegurado, isOpen])

	const keptExistingCount = existingAttachments.length - removedAttachmentIndices.size
	const totalAttachmentsCount = keptExistingCount + newAttachmentFiles.length
	const canAddMore = totalAttachmentsCount < MAX_ASEGURADO_ATTACHMENTS

	const handleNewAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? [])
		const valid: File[] = []
		for (const file of files) {
			if (totalAttachmentsCount + valid.length >= MAX_ASEGURADO_ATTACHMENTS) break
			const v = validateReciboFile(file)
			if (v.valid) valid.push(file)
			else toast({ title: v.error, variant: 'destructive' })
		}
		setNewAttachmentFiles((prev) => [...prev, ...valid].slice(0, MAX_ASEGURADO_ATTACHMENTS - keptExistingCount))
		e.target.value = ''
	}

	const removeExistingAttachment = (index: number) => {
		setRemovedAttachmentIndices((prev) => new Set([...prev, index]))
	}

	const removeNewAttachment = (index: number) => {
		setNewAttachmentFiles((prev) => prev.filter((_, i) => i !== index))
	}

	const isValidEmailChar = (char: string) => /[a-zA-Z0-9@._+-]/.test(char)
	const isValidEmail = (value: string): boolean => {
		const t = (value ?? '').trim()
		if (!t) return true
		if (!t.includes('@')) return false
		return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!asegurado) return
		const email = (form.email ?? '').trim()
		if (email && !form.email?.includes('@')) {
			toast({ title: 'Email debe contener @', variant: 'destructive' })
			return
		}
		if (email && !isValidEmail(form.email ?? '')) {
			toast({ title: 'Email con formato inválido', variant: 'destructive' })
			return
		}
		if (!buildDocumentId(form.document_tipo, form.document_numero)) {
			toast({ title: 'Completa o corrige el documento', variant: 'destructive' })
			return
		}
		setIsLoading(true)
		try {
			const document_id = buildDocumentId(form.document_tipo, form.document_numero)
			const keptExisting = existingAttachments.filter((_, i) => !removedAttachmentIndices.has(i))
			const attachments: AseguradoAttachment[] = [...keptExisting]
			for (const file of newAttachmentFiles) {
				const { data, error } = await uploadAseguradoAttachment(file, asegurado.id)
				if (error) {
					toast({ title: `Error al subir ${file.name}`, description: error.message, variant: 'destructive' })
				} else if (data) {
					attachments.push({ url: data.url, name: data.name })
				}
			}
			const finalAttachments = attachments.slice(0, MAX_ASEGURADO_ATTACHMENTS)
			const updated = await updateAsegurado(asegurado.id, {
				full_name: form.full_name,
				document_id,
				phone: form.phone,
				email: form.email || null,
				fecha_nacimiento: form.fecha_nacimiento?.trim() || null,
				address: form.address || null,
				notes: form.notes || null,
				tipo_asegurado: form.tipo_asegurado,
				attachments: finalAttachments,
			})
			toast({ title: 'Asegurado actualizado' })
			onSave?.(updated)
			onClose()
		} catch (err) {
			console.error(err)
			toast({ title: 'Error al guardar asegurado', variant: 'destructive' })
		} finally {
			setIsLoading(false)
		}
	}

	if (!asegurado) return null
	if (!isOpen) return null

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[10000000000000001] flex items-center justify-center p-4">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50"
					/>
					<motion.div
						initial={{ scale: 0.95 }}
						animate={{ scale: 1 }}
						exit={{ scale: 0.95 }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col"
					>
						<div
							className="bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border border-input"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-4 sm:p-6 z-10">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
											Editando Asegurado: {asegurado.full_name}
										</h2>
										<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Documento: {asegurado.document_id}</p>
									</div>
									<button
										type="button"
										onClick={onClose}
										className="p-1.5 sm:p-2 rounded-lg transition-none flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
									>
										<ArrowLeftFromLine className="size-4" />
										Volver
									</button>
								</div>
							</div>

							<form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
								<div className="flex-1 overflow-y-auto p-4">
									<CardSection title="Datos del asegurado" icon={User}>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Tipo de persona</Label>
												<Select
													value={form.tipo_asegurado}
													onValueChange={(value) =>
														setForm((prev) => ({
															...prev,
															tipo_asegurado: value as 'Persona natural' | 'Persona jurídica',
														}))
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
												<Label>Nombre / Razón social</Label>
												<Input
													value={form.full_name}
													onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label>Documento</Label>
												<div className="flex gap-2">
													<Select
														value={form.document_tipo}
														onValueChange={(value) =>
															setForm((prev) => {
																const t = value as AseguradoDocumentTipo
																return {
																	...prev,
																	document_tipo: t,
																	document_numero: normalizeDocumentNumeroForTipo(t, prev.document_numero),
																}
															})
														}
													>
														<SelectTrigger className="w-16 shrink-0">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{ASEGURADO_DOCUMENT_TIPO_OPTIONS.map((o) => (
																<SelectItem key={o.value} value={o.value}>
																	{o.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<Input
														placeholder={
															form.document_tipo === 'J'
																? '12345678-9'
																: form.document_tipo === 'P'
																	? 'Ej. AB1234567'
																	: form.document_tipo === 'S/C'
																		? 'No aplica'
																		: '12345678'
														}
														value={form.document_numero}
														disabled={form.document_tipo === 'S/C'}
														onChange={(e) => {
															if (form.document_tipo === 'P') {
																const alnum = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
																setForm((prev) => ({ ...prev, document_numero: alnum }))
															} else {
																const onlyNumbers = e.target.value.replace(/\D/g, '')
																setForm((prev) => ({ ...prev, document_numero: onlyNumbers }))
															}
														}}
														inputMode={form.document_tipo === 'P' ? 'text' : 'numeric'}
														maxLength={
															form.document_tipo === 'J' ? 9 : form.document_tipo === 'P' ? 20 : 15
														}
														className="flex-1"
														required={form.document_tipo !== 'S/C'}
													/>
												</div>
											</div>
											<div className="space-y-2">
												<Label>Email</Label>
												<Input
													type="email"
													value={form.email ?? ''}
													onChange={(e) => {
														const filtered = [...e.target.value].filter((c) => isValidEmailChar(c)).join('')
														setForm((prev) => ({ ...prev, email: filtered || null }))
													}}
												/>
											</div>
											<div className="space-y-2">
												<Label>Teléfono</Label>
												<Input
													value={form.phone}
													onChange={(e) => {
														const onlyNumbers = e.target.value.replace(/\D/g, '')
														setForm((prev) => ({ ...prev, phone: onlyNumbers }))
													}}
													inputMode="numeric"
												/>
											</div>
											<div className="space-y-2">
												<Label>Fecha de nacimiento</Label>
												<DateField
													value={form.fecha_nacimiento}
													onChange={(v) => setForm((prev) => ({ ...prev, fecha_nacimiento: v }))}
													disallowFuture
													placeholder="DD/MM/AAAA"
												/>
											</div>
											<div className="space-y-4">
												<div className="space-y-2">
													<Label>Dirección</Label>
													<Input
														value={form.address ?? ''}
														onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value || null }))}
													/>
												</div>
												<div className="space-y-2">
													<Label>Notas internas</Label>
													<Input
														value={form.notes ?? ''}
														onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value || null }))}
													/>
												</div>
											</div>
											<div>
												<Label className="flex items-center gap-1.5 mb-2">
													<Paperclip className="w-4 h-4" />
													Documentos adjuntos (máx. {MAX_ASEGURADO_ATTACHMENTS})
												</Label>
												<p className="text-xs text-muted-foreground mb-2">PDF, JPG o PNG. Máximo 10 MB por archivo.</p>
												{existingAttachments.some((_, i) => !removedAttachmentIndices.has(i)) && (
													<ul className="space-y-1.5 mb-2">
														{existingAttachments.map((att, i) =>
															removedAttachmentIndices.has(i) ? null : (
																<li key={i} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-muted/50">
																	<a
																		href={att.url}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="inline-flex items-center gap-2 truncate text-blue-600 dark:text-blue-400 hover:underline"
																	>
																		<ExternalLink className="w-4 h-4 shrink-0" />
																		<span className="truncate">{att.name || `Documento ${i + 1}`}</span>
																	</a>
																	<button
																		type="button"
																		onClick={() => removeExistingAttachment(i)}
																		className="p-1 rounded hover:bg-destructive/20 text-destructive shrink-0"
																		aria-label="Quitar adjunto"
																	>
																		<X className="w-4 h-4" />
																	</button>
																</li>
															),
														)}
													</ul>
												)}
												{canAddMore && (
													<label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md border border-dashed border-input bg-muted/30 hover:bg-muted/50 cursor-pointer text-sm">
														<Plus className="w-4 h-4" />
														Agregar archivo
														<input
															type="file"
															accept=".pdf,image/jpeg,image/jpg,image/png"
															className="sr-only"
															onChange={handleNewAttachmentChange}
														/>
													</label>
												)}
												{newAttachmentFiles.length > 0 && (
													<ul className="space-y-1.5 mt-2">
														{newAttachmentFiles.map((file, i) => (
															<li key={`new-${i}`} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-muted/50">
																<span className="truncate">{file.name}</span>
																<button
																	type="button"
																	onClick={() => removeNewAttachment(i)}
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
									</CardSection>
								</div>

								<div className="sticky bottom-0 bg-white/80 dark:bg-background/80 backdrop-blur-[10px] border-t border-input p-4 flex justify-end gap-2">
									<Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
										Cancelar
									</Button>
									<Button type="submit" disabled={isLoading}>
										{isLoading ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
												Guardando...
											</>
										) : (
											<>
												<Save className="w-4 h-4 mr-2" />
												Guardar Cambios
											</>
										)}
									</Button>
								</div>
							</form>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	)
}
