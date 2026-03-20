import React, { useState, useRef } from 'react'
import { Button } from '@shared/components/ui/button'
import { useToast } from '@shared/hooks/use-toast'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { useAuth } from '@app/providers/AuthContext'
import {
	uploadCasePDF,
	deleteCasePDF,
	validateCasePDF,
} from '@/services/supabase/storage/case-pdf-storage-service'
import { supabase } from '@/services/supabase/config/config'
import {
	Upload,
	X,
	FileText,
	Loader2,
	Trash2,
	Plus,
} from 'lucide-react'
import { PDFButton } from '@shared/components/ui/PDFButton'

const MAX_PDFS = 5
const MAX_FILENAME_DISPLAY = 28

function truncateFileName(name: string): string {
	if (name.length <= MAX_FILENAME_DISPLAY) return name
	return `${name.slice(0, MAX_FILENAME_DISPLAY)}...`
}

interface CasePDFUploadProps {
	caseId: string
	/** Lista de URLs de PDFs actuales (máximo 5). Si se pasa un array vacío o undefined, se trata como sin PDFs. */
	currentPdfUrls: string[]
	onPdfUpdated: () => void | Promise<void>
	onUploadingChange?: (isUploading: boolean) => void
	className?: string
	/** En vista del caso: ver/descargar. En edición: solo eliminar (como imágenes en el modal). */
	isEditing?: boolean
}

/**
 * Componente para subir y eliminar hasta 5 PDFs por caso.
 * Soporta selección múltiple de archivos.
 * SPT: roles laboratorio, coordinador, owner, prueba, imagenologia, call_center.
 * Conspat: todos los roles.
 * Con isEditing=false: ver/descargar adjuntos. Con isEditing=true: solo eliminar (sin previsualizar ni descargar en las tarjetas).
 */
export const CasePDFUpload: React.FC<CasePDFUploadProps> = ({
	caseId,
	currentPdfUrls,
	onPdfUpdated,
	onUploadingChange,
	className = '',
	isEditing = false,
}) => {
	const { toast } = useToast()
	const { profile } = useUserProfile()
	const { laboratory } = useLaboratory()
	const { user } = useAuth()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const addMoreInputRef = useRef<HTMLInputElement>(null)
	const [selectedFiles, setSelectedFiles] = useState<File[]>([])
	const [isUploading, setIsUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
	const [isDeletingIndex, setIsDeletingIndex] = useState<number | null>(null)
	const [error, setError] = useState<string | null>(null)

	const urls = Array.isArray(currentPdfUrls) ? currentPdfUrls.filter(Boolean) : []
	const canAddMore = urls.length < MAX_PDFS

	const isSpt = laboratory?.slug === 'spt'
	const isConspat = laboratory?.slug === 'conspat'
	const canUpload =
		user &&
		profile?.laboratory_id &&
		((isSpt &&
			(profile?.role === 'laboratorio' ||
				profile?.role === 'coordinador' ||
				profile?.role === 'owner' ||
				profile?.role === 'prueba' ||
				profile?.role === 'imagenologia' ||
				profile?.role === 'call_center')) ||
			isConspat)

	if (!canUpload) {
		return null
	}

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, mode: 'replace' | 'add' = 'replace') => {
		const files = event.target.files
		if (!files || files.length === 0) return

		console.log(`📎 Archivos seleccionados: ${files.length} (modo: ${mode})`, files)

		const validFiles: File[] = []
		const errors: string[] = []

		// Verificar límite total (considerar archivos ya seleccionados en modo add)
		const currentlySelected = mode === 'add' ? selectedFiles.length : 0
		const availableSlots = MAX_PDFS - urls.length - currentlySelected
		const filesToProcess = Math.min(files.length, availableSlots)

		if (files.length > availableSlots) {
			errors.push(`Solo puedes agregar ${availableSlots} PDF(s) más. Se procesarán los primeros ${filesToProcess}.`)
		}

		// Validar cada archivo
		for (let i = 0; i < filesToProcess; i++) {
			const file = files[i]
			const validation = validateCasePDF(file)
			if (validation.valid) {
				validFiles.push(file)
			} else {
				errors.push(`${file.name}: ${validation.error}`)
			}
		}

		if (errors.length > 0) {
			setError(errors.join(' | '))
			toast({
				title: '⚠️ Algunos archivos no son válidos',
				description: `${validFiles.length} de ${filesToProcess} archivo(s) válido(s)`,
				variant: validFiles.length > 0 ? 'default' : 'destructive',
			})
		}

		if (validFiles.length > 0) {
			setError(null)
			if (mode === 'add') {
				setSelectedFiles([...selectedFiles, ...validFiles])
			} else {
				setSelectedFiles(validFiles)
			}
		} else {
			setError('No se seleccionó ningún archivo válido')
		}
	}

	const persistPdfUrls = async (newUrls: string[]) => {
		const { error: updateError } = await supabase
			.from('medical_records_clean')
			.update({
				uploaded_pdf_urls: newUrls.length ? newUrls : null,
				uploaded_pdf_url: newUrls[0] ?? null,
			})
			.eq('id', caseId)

		if (updateError) throw updateError
		await onPdfUpdated()
	}

	const handleUpload = async () => {
		if (selectedFiles.length === 0 || !user || !profile?.laboratory_id) {
			setError('Faltan datos necesarios para subir el PDF')
			return
		}

		if (urls.length >= MAX_PDFS) {
			toast({
				title: 'Límite alcanzado',
				description: `Solo puedes subir hasta ${MAX_PDFS} PDFs por caso.`,
				variant: 'destructive',
			})
			return
		}

		setIsUploading(true)
		onUploadingChange?.(true)
		setError(null)
		setUploadProgress({ current: 0, total: selectedFiles.length })

		const uploadedUrls: string[] = []
		const errors: string[] = []

		try {
			// Subir cada archivo secuencialmente
			for (let i = 0; i < selectedFiles.length; i++) {
				const file = selectedFiles[i]
				setUploadProgress({ current: i + 1, total: selectedFiles.length })

				try {
					const nextIndex = urls.length + uploadedUrls.length
					const { data, error: uploadError } = await uploadCasePDF(
						caseId,
						file,
						profile.laboratory_id,
						nextIndex,
					)

					const pdfUrl = data

					if (uploadError || !pdfUrl) {
						if (uploadError instanceof Error) throw uploadError
						if (uploadError && typeof uploadError === 'object') {
							const message =
								('message' in uploadError && typeof uploadError.message === 'string' ? uploadError.message : null) ||
								('error' in uploadError && typeof uploadError.error === 'string' ? uploadError.error : null) ||
								('details' in uploadError && typeof uploadError.details === 'string' ? uploadError.details : null) ||
								JSON.stringify(uploadError)
							throw new Error(message || 'No se pudo obtener la URL del PDF')
						}
						throw new Error('No se pudo obtener la URL del PDF')
					}

					uploadedUrls.push(pdfUrl)
				} catch (err) {
					console.error(`Error uploading file ${file.name}:`, err)
					const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
					errors.push(`${file.name}: ${errorMsg}`)
				}
			}

			// Persistir todas las URLs subidas exitosamente
			if (uploadedUrls.length > 0) {
				const newUrls = [...urls, ...uploadedUrls]
				await persistPdfUrls(newUrls)
			}

			setSelectedFiles([])
			if (fileInputRef.current) fileInputRef.current.value = ''
			if (addMoreInputRef.current) addMoreInputRef.current.value = ''

			// Mostrar resultado
			if (errors.length === 0) {
				toast({
					title: '✅ PDFs subidos',
					description: `${uploadedUrls.length} PDF(s) subido(s) correctamente.`,
					className: 'bg-green-100 border-green-400 text-green-800',
				})
			} else if (uploadedUrls.length > 0) {
				toast({
					title: '⚠️ Subida parcial',
					description: `${uploadedUrls.length} exitoso(s), ${errors.length} fallido(s).`,
					variant: 'default',
				})
				setError(errors.join(' | '))
			} else {
				throw new Error(errors.join(' | '))
			}
		} catch (err) {
			console.error('Error uploading case PDFs:', err)
			let errorMessage = 'Error al subir los PDFs. Inténtalo de nuevo.'
			if (err instanceof Error) errorMessage = err.message
			else if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string')
				errorMessage = (err as any).message
			setError(errorMessage)
			toast({
				title: '❌ Error al subir PDFs',
				description: errorMessage,
				variant: 'destructive',
			})
		} finally {
			setIsUploading(false)
			onUploadingChange?.(false)
			setUploadProgress(null)
		}
	}

	const handleDelete = async (index: number) => {
		const url = urls[index]
		if (!url || !user || !profile?.laboratory_id) return
		if (!confirm('¿Estás seguro de que deseas eliminar este PDF?')) return

		setIsDeletingIndex(index)
		setError(null)

		try {
			const { error: deleteError } = await deleteCasePDF(
				caseId,
				url,
				profile.laboratory_id,
			)
			if (deleteError) throw deleteError

			const newUrls = urls.filter((_, i) => i !== index)
			await persistPdfUrls(newUrls)

			toast({
				title: '✅ PDF eliminado',
				description: 'El PDF ha sido eliminado correctamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (err) {
			console.error('Error deleting case PDF:', err)
			let errorMessage = 'Error al eliminar el PDF. Inténtalo de nuevo.'
			if (err instanceof Error) errorMessage = err.message
			setError(errorMessage)
			toast({
				title: '❌ Error al eliminar PDF',
				description: errorMessage,
				variant: 'destructive',
			})
		} finally {
			setIsDeletingIndex(null)
		}
	}

	const handleCancel = () => {
		setSelectedFiles([])
		setError(null)
		if (fileInputRef.current) fileInputRef.current.value = ''
		if (addMoreInputRef.current) addMoreInputRef.current.value = ''
	}

	return (
		<div className={`space-y-2 ${className}`}>
			{error && (
				<div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
					{error}
				</div>
			)}

			{urls.length > 0 && (
				<div className="grid w-full min-w-0 grid-cols-2 gap-2 md:grid-cols-5">
					{urls.map((url, index) => (
						<div
							key={url}
							className="flex min-w-0 max-w-full flex-col items-center gap-1 overflow-hidden rounded-lg border border-green-200 bg-green-50 p-1.5 dark:border-green-800 dark:bg-green-900/20 sm:p-2"
						>
							<span className="w-full truncate text-center text-xs font-medium leading-tight text-green-800 dark:text-green-200">
								PDF {index + 1}
							</span>
							<div className="flex w-full min-w-0 flex-col items-center gap-0.5">
								{!isEditing && (
									<PDFButton
										pdfUrl={url}
										size="sm"
										variant="ghost"
										isAttached={true}
										compact
									/>
								)}
								{isEditing && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDelete(index)}
										disabled={isDeletingIndex !== null}
										className="h-7 w-7 shrink-0 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
										title="Eliminar PDF"
									>
										{isDeletingIndex === index ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<Trash2 className="h-3.5 w-3.5" />
										)}
									</Button>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{selectedFiles.length > 0 && (
				<div className="space-y-1.5">
					{selectedFiles.map((file, idx) => (
						<div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg min-w-0">
							<FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
							<span className="text-sm text-blue-800 dark:text-blue-200 flex-1" title={file.name}>
								{truncateFileName(file.name)}
							</span>
							{!isUploading && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										const newFiles = selectedFiles.filter((_, i) => i !== idx)
										setSelectedFiles(newFiles)
									}}
									className="h-6 px-2"
								>
									<X className="h-3 w-3" />
								</Button>
							)}
						</div>
					))}
					{uploadProgress && (
						<div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
							Subiendo {uploadProgress.current} de {uploadProgress.total}...
						</div>
					)}
				</div>
			)}

			{canAddMore && (
				<div className="space-y-1.5">
					<div className="flex items-center gap-2 min-w-0">
						{/* Input para reemplazar selección */}
						<input
							ref={fileInputRef}
							type="file"
							accept=".pdf"
							multiple
							onChange={(e) => handleFileSelect(e, 'replace')}
							disabled={isUploading || isDeletingIndex !== null}
							className="hidden"
							id={`case-pdf-upload-${caseId}`}
						/>
						{/* Input para agregar más archivos */}
						<input
							ref={addMoreInputRef}
							type="file"
							accept=".pdf"
							multiple
							onChange={(e) => handleFileSelect(e, 'add')}
							disabled={isUploading || isDeletingIndex !== null}
							className="hidden"
							id={`case-pdf-upload-add-${caseId}`}
						/>

						{/* Botón principal: Seleccionar/Cambiar */}
						<label htmlFor={`case-pdf-upload-${caseId}`} className="flex-1 min-w-0">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={isUploading || isDeletingIndex !== null}
								className="w-full cursor-pointer"
								asChild
							>
								<span>
									<Upload className="h-4 w-4 mr-2" />
									{selectedFiles.length > 0 
										? `Cambiar archivos (${selectedFiles.length})` 
										: `Seleccionar PDF${urls.length > 0 ? ` (${urls.length}/${MAX_PDFS})` : 's'} ${urls.length < MAX_PDFS ? '(múltiple)' : ''}`
									}
								</span>
							</Button>
						</label>

						{/* Botón para agregar más (solo visible si ya hay archivos seleccionados) */}
						{selectedFiles.length > 0 && (
							<label htmlFor={`case-pdf-upload-add-${caseId}`}>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={isUploading || isDeletingIndex !== null}
									className="cursor-pointer"
									asChild
								>
									<span>
										<Plus className="h-4 w-4 mr-1" />
										Agregar más
									</span>
								</Button>
							</label>
						)}

						{/* Botón de subir */}
						{selectedFiles.length > 0 && (
						<Button
							type="button"
							variant="default"
							size="sm"
							onClick={handleUpload}
							disabled={isUploading || isDeletingIndex !== null}
							className="shrink-0"
						>
							{isUploading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									{uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : 'Subiendo...'}
								</>
							) : (
								<>
									<Upload className="h-4 w-4 mr-2" />
									Subir
								</>
							)}
						</Button>
					)}
					</div>
					{urls.length < MAX_PDFS && (
						<p className="text-xs text-gray-500 dark:text-gray-400 italic">
							💡 Tip: {selectedFiles.length > 0 
								? 'Puedes cambiar toda la selección o agregar más archivos' 
								: 'Mantén Ctrl (Windows) o Cmd (Mac) para seleccionar múltiples PDFs'
							}
						</p>
					)}
				</div>
			)}
		</div>
	)
}
