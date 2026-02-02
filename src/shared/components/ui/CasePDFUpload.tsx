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
	Eye,
} from 'lucide-react'
import { PDFButton } from '@shared/components/ui/PDFButton'

interface CasePDFUploadProps {
	caseId: string
	currentPdfUrl: string | null | undefined
	onPdfUpdated: () => void | Promise<void>
	onUploadingChange?: (isUploading: boolean) => void
	className?: string
}

/**
 * Componente para subir y eliminar PDFs de casos
 * Solo para roles: laboratorio, owner, prueba (godmode), call_center en SPT
 */
export const CasePDFUpload: React.FC<CasePDFUploadProps> = ({
	caseId,
	currentPdfUrl,
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
	const [isDeleting, setIsDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const isSpt = laboratory?.slug === 'spt'
	const canUpload = isSpt && 
		user && 
		profile?.laboratory_id &&
		(profile?.role === 'laboratorio' || profile?.role === 'owner' || profile?.role === 'prueba' || profile?.role === 'imagenologia' || profile?.role === 'call_center')

	if (!canUpload) {
		return null
	}

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		// Validar archivo
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

	const handleUpload = async () => {
		if (!selectedFile || !user || !profile?.laboratory_id) {
			setError('Faltan datos necesarios para subir el PDF')
			return
		}

		setIsUploading(true)
		onUploadingChange?.(true)
		setError(null)

		let pdfUrl: string | null = null

		try {
			// Subir archivo a Supabase Storage
			const { data, error: uploadError } = await uploadCasePDF(
				caseId,
				selectedFile,
				profile.laboratory_id,
			)

			pdfUrl = data

			if (uploadError || !pdfUrl) {
				// Convertir error a Error si no lo es
				if (uploadError instanceof Error) {
					throw uploadError
				} else if (uploadError && typeof uploadError === 'object') {
					// Extraer mensaje de objeto de error
					const message = 
						('message' in uploadError && typeof uploadError.message === 'string' ? uploadError.message : null) ||
						('error' in uploadError && typeof uploadError.error === 'string' ? uploadError.error : null) ||
						('details' in uploadError && typeof uploadError.details === 'string' ? uploadError.details : null) ||
						JSON.stringify(uploadError)
					throw new Error(message || 'No se pudo obtener la URL del PDF')
				} else {
					throw new Error('No se pudo obtener la URL del PDF')
				}
			}

			// Actualizar el campo uploaded_pdf_url en la base de datos
			console.log('Updating medical_records_clean with:', { caseId, pdfUrl })
			const { data: updateData, error: updateError } = await supabase
				.from('medical_records_clean')
				.update({ uploaded_pdf_url: pdfUrl })
				.eq('id', caseId)
				.select()

			if (updateError) {
				console.error('Error updating medical_records_clean:', {
					error: updateError,
					caseId,
					pdfUrl,
					errorCode: updateError.code,
					errorMessage: updateError.message,
					errorDetails: updateError.details,
					errorHint: updateError.hint,
				})
				throw updateError
			}

			if (!updateData || updateData.length === 0) {
				console.warn('No rows updated for caseId:', caseId)
				throw new Error('No se pudo actualizar el registro. El caso no existe o no tienes permisos.')
			}

			console.log('Successfully updated medical_records_clean:', updateData)

			// Notificar al componente padre para refreschar
			await onPdfUpdated()

			// Limpiar estado
			setSelectedFile(null)
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}

			toast({
				title: '✅ PDF subido',
				description: 'El PDF se ha subido correctamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (error) {
			console.error('Error uploading case PDF:', error)
			console.error('Error details:', {
				error,
				type: typeof error,
				isError: error instanceof Error,
				keys: error && typeof error === 'object' ? Object.keys(error) : [],
				caseId,
				hasPdfUrl: !!pdfUrl,
			})

			// Extraer mensaje de error de diferentes formatos
			let errorMessage = 'Error al subir el PDF. Inténtalo de nuevo.'
			
			if (error instanceof Error) {
				errorMessage = error.message
			} else if (error && typeof error === 'object') {
				// Manejar PostgrestError u otros objetos de error
				if ('message' in error && typeof error.message === 'string') {
					errorMessage = error.message
				} else if ('error' in error && typeof error.error === 'string') {
					errorMessage = error.error
				} else if ('details' in error && typeof error.details === 'string') {
					errorMessage = error.details
				} else if ('hint' in error && typeof error.hint === 'string') {
					errorMessage = error.hint
				} else if ('code' in error) {
					// Error de Supabase con código
					const code = (error as any).code
					const message = (error as any).message || 'Error desconocido'
					errorMessage = `Error ${code}: ${message}`
				} else {
					// Intentar convertir a string
					try {
						errorMessage = JSON.stringify(error, null, 2)
					} catch {
						errorMessage = String(error)
					}
				}
			} else if (typeof error === 'string') {
				errorMessage = error
			}

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

	const handleDelete = async () => {
		if (!user || !currentPdfUrl || !profile?.laboratory_id) {
			return
		}

		if (!confirm('¿Estás seguro de que deseas eliminar el PDF subido?')) {
			return
		}

		setIsDeleting(true)
		setError(null)

		try {
			// Eliminar archivo de Supabase Storage
			const { error: deleteError } = await deleteCasePDF(
				caseId,
				currentPdfUrl,
				profile.laboratory_id,
			)

			if (deleteError) {
				throw deleteError
			}

			// Actualizar el campo uploaded_pdf_url en la base de datos
			const { error: updateError } = await supabase
				.from('medical_records_clean')
				.update({ uploaded_pdf_url: null })
				.eq('id', caseId)

			if (updateError) {
				throw updateError
			}

			// Notificar al componente padre para refrescar
			await onPdfUpdated()

			toast({
				title: '✅ PDF eliminado',
				description: 'El PDF ha sido eliminado correctamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (error) {
			console.error('Error deleting case PDF:', error)

			// Extraer mensaje de error de diferentes formatos
			let errorMessage = 'Error al eliminar el PDF. Inténtalo de nuevo.'
			
			if (error instanceof Error) {
				errorMessage = error.message
			} else if (error && typeof error === 'object') {
				// Manejar PostgrestError u otros objetos de error
				if ('message' in error && typeof error.message === 'string') {
					errorMessage = error.message
				} else if ('error' in error && typeof error.error === 'string') {
					errorMessage = error.error
				} else if ('details' in error && typeof error.details === 'string') {
					errorMessage = error.details
				} else if ('hint' in error && typeof error.hint === 'string') {
					errorMessage = error.hint
				} else {
					// Intentar convertir a string
					try {
						errorMessage = JSON.stringify(error)
					} catch {
						errorMessage = String(error)
					}
				}
			} else if (typeof error === 'string') {
				errorMessage = error
			}

			setError(errorMessage)
			toast({
				title: '❌ Error al eliminar PDF',
				description: errorMessage,
				variant: 'destructive',
			})
		} finally {
			setIsDeleting(false)
		}
	}

	const handleCancel = () => {
		setSelectedFile(null)
		setError(null)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	return (
		<div className={`space-y-2 ${className}`}>
			{error && (
				<div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
					{error}
				</div>
			)}

			{currentPdfUrl && !selectedFile && (
				<div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
					<FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
					<span className="text-sm text-green-800 dark:text-green-200 flex-1">
						PDF subido
					</span>
					<div className="flex items-center gap-1">
						<PDFButton
							pdfUrl={currentPdfUrl}
							size="sm"
							variant="ghost"
							className="h-6 px-2"
							isAttached={true}
						/>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDelete}
							disabled={isDeleting}
							className="h-6 px-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
							title="Eliminar PDF"
						>
							{isDeleting ? (
								<Loader2 className="h-3 w-3 animate-spin" />
							) : (
								<Trash2 className="h-3 w-3" />
							)}
						</Button>
					</div>
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

			{/* Solo mostrar botón de subir si NO hay PDF subido o si hay un archivo seleccionado */}
			{(!currentPdfUrl || selectedFile) && (
				<div className="flex items-center gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept=".pdf"
						onChange={handleFileSelect}
						disabled={isUploading || isDeleting}
						className="hidden"
						id={`case-pdf-upload-${caseId}`}
					/>
					<label
						htmlFor={`case-pdf-upload-${caseId}`}
						className="flex-1"
					>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={isUploading || isDeleting}
							className="w-full cursor-pointer"
							asChild
						>
							<span>
								<Upload className="h-4 w-4 mr-2" />
								{selectedFile ? 'Cambiar PDF' : 'Subir PDF'}
							</span>
						</Button>
					</label>

					{selectedFile && (
						<Button
							type="button"
							variant="default"
							size="sm"
							onClick={handleUpload}
							disabled={isUploading || isDeleting}
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
