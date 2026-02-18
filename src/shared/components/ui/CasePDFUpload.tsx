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
} from 'lucide-react'
import { PDFButton } from '@shared/components/ui/PDFButton'

const MAX_PDFS = 5

interface CasePDFUploadProps {
	caseId: string
	/** Lista de URLs de PDFs actuales (máximo 5). Si se pasa un array vacío o undefined, se trata como sin PDFs. */
	currentPdfUrls: string[]
	onPdfUpdated: () => void | Promise<void>
	onUploadingChange?: (isUploading: boolean) => void
	className?: string
}

/**
 * Componente para subir y eliminar hasta 5 PDFs por caso
 * Solo para roles: laboratorio, coordinador, owner, prueba, imagenologia, call_center en SPT
 */
export const CasePDFUpload: React.FC<CasePDFUploadProps> = ({
	caseId,
	currentPdfUrls,
	onPdfUpdated,
	onUploadingChange,
	className = '',
}) => {
	const { toast } = useToast()
	const { profile } = useUserProfile()
	const { laboratory } = useLaboratory()
	const { user } = useAuth()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const [isDeletingIndex, setIsDeletingIndex] = useState<number | null>(null)
	const [error, setError] = useState<string | null>(null)

	const urls = Array.isArray(currentPdfUrls) ? currentPdfUrls.filter(Boolean) : []
	const canAddMore = urls.length < MAX_PDFS

	const isSpt = laboratory?.slug === 'spt'
	const canUpload =
		isSpt &&
		user &&
		profile?.laboratory_id &&
		(profile?.role === 'laboratorio' ||
			profile?.role === 'coordinador' ||
			profile?.role === 'owner' ||
			profile?.role === 'prueba' ||
			profile?.role === 'imagenologia' ||
			profile?.role === 'call_center')

	if (!canUpload) {
		return null
	}

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		const validation = validateCasePDF(file)
		if (!validation.valid) {
			setError(validation.error || 'Archivo inválido')
			toast({
				title: '❌ Error de validación',
				description: validation.error || 'El archivo no es válido',
				variant: 'destructive',
			})
			return
		}

		setError(null)
		setSelectedFile(file)
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
		if (!selectedFile || !user || !profile?.laboratory_id) {
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

		let pdfUrl: string | null = null

		try {
			const nextIndex = urls.length
			const { data, error: uploadError } = await uploadCasePDF(
				caseId,
				selectedFile,
				profile.laboratory_id,
				nextIndex,
			)

			pdfUrl = data

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

			const newUrls = [...urls, pdfUrl]
			await persistPdfUrls(newUrls)

			setSelectedFile(null)
			if (fileInputRef.current) fileInputRef.current.value = ''

			toast({
				title: '✅ PDF subido',
				description: 'El PDF se ha subido correctamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (err) {
			console.error('Error uploading case PDF:', err)
			let errorMessage = 'Error al subir el PDF. Inténtalo de nuevo.'
			if (err instanceof Error) errorMessage = err.message
			else if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string')
				errorMessage = (err as any).message
			setError(errorMessage)
			toast({
				title: '❌ Error al subir PDF',
				description: errorMessage,
				variant: 'destructive',
			})
		} finally {
			setIsUploading(false)
			onUploadingChange?.(false)
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
		setSelectedFile(null)
		setError(null)
		if (fileInputRef.current) fileInputRef.current.value = ''
	}

	return (
		<div className={`space-y-2 ${className}`}>
			{error && (
				<div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
					{error}
				</div>
			)}

			{urls.length > 0 && (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
					{urls.map((url, index) => (
						<div
							key={url}
							className="flex flex-col items-center gap-1.5 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg min-w-0"
						>
							<FileText className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
							<span className="text-xs text-green-800 dark:text-green-200 truncate w-full text-center">
								PDF {index + 1}
							</span>
							<div className="flex items-center gap-1">
								<PDFButton
									pdfUrl={url}
									size="sm"
									variant="ghost"
									className="h-6 px-2"
									isAttached={true}
								/>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleDelete(index)}
									disabled={isDeletingIndex !== null}
									className="h-6 px-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
									title="Eliminar PDF"
								>
									{isDeletingIndex === index ? (
										<Loader2 className="h-3 w-3 animate-spin" />
									) : (
										<Trash2 className="h-3 w-3" />
									)}
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{selectedFile && (
				<div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
					<FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					<span className="text-sm text-blue-800 dark:text-blue-200 flex-1 truncate">
						{selectedFile.name}
					</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCancel}
						disabled={isUploading}
						className="h-6 px-2"
					>
						<X className="h-3 w-3" />
					</Button>
				</div>
			)}

			{canAddMore && (
				<div className="flex items-center gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept=".pdf"
						onChange={handleFileSelect}
						disabled={isUploading || isDeletingIndex !== null}
						className="hidden"
						id={`case-pdf-upload-${caseId}`}
					/>
					<label htmlFor={`case-pdf-upload-${caseId}`} className="flex-1">
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
								{selectedFile ? 'Cambiar archivo' : `Subir PDF${urls.length > 0 ? ` (${urls.length}/${MAX_PDFS})` : ''}`}
							</span>
						</Button>
					</label>

					{selectedFile && (
						<Button
							type="button"
							variant="default"
							size="sm"
							onClick={handleUpload}
							disabled={isUploading || isDeletingIndex !== null}
							className="flex-shrink-0"
						>
							{isUploading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Subiendo...
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
			)}
		</div>
	)
}
