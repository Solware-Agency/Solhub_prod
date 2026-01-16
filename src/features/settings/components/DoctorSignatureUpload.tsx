import React, { useState, useRef, useEffect } from 'react'
import { Card } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import { Label } from '@shared/components/ui/label'
import { useToast } from '@shared/hooks/use-toast'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { useAuth } from '@app/providers/AuthContext'
import {
	uploadDoctorSignature,
	deleteDoctorSignature,
	validateSignatureFile,
} from '@/services/supabase/storage/signature-storage-service'
import { updateDoctorSignature } from '@/services/supabase/auth/user-management'
import {
	Upload,
	X,
	Image as ImageIcon,
	Loader2,
	AlertCircle,
} from 'lucide-react'

interface SignatureSectionProps {
	signatureNumber: 1 | 2 | 3
	title: string
	isRequired: boolean
	currentSignatureUrl: string | null | undefined
	profile: any
	user: any
	laboratoryId: string
	onSignatureUpdated: () => void | Promise<void>
}

/**
 * Componente para una sección individual de firma (sin Card, solo contenido)
 */
const SignatureSection: React.FC<SignatureSectionProps> = ({
	signatureNumber,
	title,
	isRequired,
	currentSignatureUrl,
	profile,
	user,
	laboratoryId,
	onSignatureUpdated,
}) => {
	const { toast } = useToast()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Cargar preview de firma existente
	useEffect(() => {
		if (currentSignatureUrl) {
			setPreviewUrl(currentSignatureUrl)
		} else {
			setPreviewUrl(null)
		}
	}, [currentSignatureUrl])

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		// Validar archivo
		const validation = validateSignatureFile(file)
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

		// Crear preview
		const reader = new FileReader()
		reader.onloadend = () => {
			setPreviewUrl(reader.result as string)
		}
		reader.readAsDataURL(file)
	}

	const handleUpload = async () => {
		if (!selectedFile || !user || !laboratoryId) {
			setError('Faltan datos necesarios para subir la firma')
			return
		}

		setIsUploading(true)
		setError(null)

		try {
			// Subir archivo a Supabase Storage
			const { data: signatureUrl, error: uploadError } = await uploadDoctorSignature(
				user.id,
				selectedFile,
				laboratoryId,
				signatureNumber,
			)

			if (uploadError || !signatureUrl) {
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
					throw new Error(message || 'No se pudo obtener la URL de la firma')
				} else {
					throw new Error('No se pudo obtener la URL de la firma')
				}
			}

			// Actualizar perfil con la URL de la firma
			const { error: updateError } = await updateDoctorSignature(
				user.id,
				signatureUrl,
				signatureNumber,
			)

			if (updateError) {
				// Convertir error a Error si no lo es
				if (updateError instanceof Error) {
					throw updateError
				} else if (updateError && typeof updateError === 'object') {
					// Extraer mensaje de objeto de error
					const message = 
						('message' in updateError && typeof updateError.message === 'string' ? updateError.message : null) ||
						('error' in updateError && typeof updateError.error === 'string' ? updateError.error : null) ||
						('details' in updateError && typeof updateError.details === 'string' ? updateError.details : null) ||
						JSON.stringify(updateError)
					throw new Error(message || 'Error al actualizar la firma en el perfil')
				} else {
					throw new Error('Error al actualizar la firma en el perfil')
				}
			}

			// Notificar al componente padre para refrescar
			await onSignatureUpdated()

			// Limpiar estado
			setSelectedFile(null)
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}

			toast({
				title: '✅ Firma subida exitosamente',
				description: `${title} ha sido guardada correctamente.`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (error) {
			console.error('Error uploading signature:', error)
			console.error('Error details:', {
				error,
				type: typeof error,
				isError: error instanceof Error,
				keys: error && typeof error === 'object' ? Object.keys(error) : [],
			})

			// Extraer mensaje de error de diferentes formatos
			let errorMessage = 'Error al subir la firma. Inténtalo de nuevo.'
			
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
				title: '❌ Error al subir firma',
				description: errorMessage,
				variant: 'destructive',
			})
		} finally {
			setIsUploading(false)
		}
	}

	const handleDelete = async () => {
		if (!user || !currentSignatureUrl || !laboratoryId) {
			return
		}

		if (!confirm(`¿Estás seguro de que deseas eliminar ${title.toLowerCase()}?`)) {
			return
		}

		setIsDeleting(true)
		setError(null)

		try {
			// Eliminar archivo de Supabase Storage
			const { error: deleteError } = await deleteDoctorSignature(
				user.id,
				currentSignatureUrl,
				laboratoryId,
				signatureNumber,
			)

			if (deleteError) {
				throw deleteError
			}

			// Actualizar perfil eliminando la URL
			const { error: updateError } = await updateDoctorSignature(
				user.id,
				null,
				signatureNumber,
			)

			if (updateError) {
				throw updateError
			}

			// Notificar al componente padre para refrescar
			await onSignatureUpdated()

			// Limpiar preview
			setPreviewUrl(null)
			setSelectedFile(null)
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}

			toast({
				title: '✅ Firma eliminada',
				description: `${title} ha sido eliminada correctamente.`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (error) {
			console.error('Error deleting signature:', error)
			console.error('Error details:', {
				error,
				type: typeof error,
				isError: error instanceof Error,
				keys: error && typeof error === 'object' ? Object.keys(error) : [],
			})

			// Extraer mensaje de error de diferentes formatos
			let errorMessage = 'Error al eliminar la firma. Inténtalo de nuevo.'
			
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
				title: '❌ Error al eliminar firma',
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
		// Restaurar preview de firma existente
		if (currentSignatureUrl) {
			setPreviewUrl(currentSignatureUrl)
		} else {
			setPreviewUrl(null)
		}
	}

	const renderImagePreview = () => {
		if (!previewUrl) return null

		return (
			<div className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800/50">
				<div className="flex flex-col items-center justify-center min-h-[100px]">
					<img
						src={previewUrl}
						alt={`Preview de ${title.toLowerCase()}`}
						className="max-w-full max-h-24 object-contain rounded"
						crossOrigin="anonymous"
						onError={async (e) => {
							const img = e.currentTarget
							const originalSrc = img.src.split('?')[0]

							// Intentar verificar el archivo directamente
							try {
								const response = await fetch(originalSrc, { method: 'HEAD' })
								console.error('Error loading signature image - Response details:', {
									url: previewUrl,
									imgSrc: img.src,
									originalSrc,
									status: response.status,
									statusText: response.statusText,
									contentType: response.headers.get('content-type'),
								})

								// Si el archivo existe pero no se puede cargar como imagen, probablemente está corrupto
								if (response.ok) {
									const contentType = response.headers.get('content-type')
									if (contentType && !contentType.startsWith('image/')) {
										console.error('File exists but has wrong content type:', contentType)
									}
								}
							} catch (fetchError) {
								console.error('Error fetching file metadata:', fetchError)
							}

							// Intentar recargar con cache buster solo una vez
							if (!img.src.includes('?t=')) {
								setTimeout(() => {
									img.src = `${originalSrc}?t=${Date.now()}`
								}, 100)
							} else {
								// Ya intentamos con cache buster, el archivo probablemente está corrupto
								img.style.display = 'none'
								const container = img.parentElement
								if (container && !container.querySelector('.error-message')) {
									const errorMsg = document.createElement('div')
									errorMsg.className =
										'error-message text-xs text-red-500 dark:text-red-400 text-center p-2'
									errorMsg.innerHTML =
										'⚠️ No se pudo cargar la imagen. El archivo podría estar corrupto.<br/>Por favor, elimina y vuelve a subir la firma.'
									container.appendChild(errorMsg)
								}
							}
						}}
					onLoad={() => {
						console.log('Signature image loaded successfully:', previewUrl)
						setError(null)
					}}
				/>
			</div>
		</div>
	)
}

	return (
		<div className="space-y-2">
			{/* Título de la sección */}
			<div className="flex items-center gap-2">
				<h4 className="text-sm font-semibold">
					{title}
					{isRequired && (
						<span className="text-red-500 text-xs font-normal ml-1">(Obligatoria)</span>
					)}
					{!isRequired && (
						<span className="text-gray-500 text-xs font-normal ml-1">(Opcional)</span>
					)}
				</h4>
			</div>

			{/* Preview de firma */}
			{renderImagePreview()}

			{/* Input de archivo - Solo mostrar si no hay firma existente */}
			{!currentSignatureUrl && (
				<div>
					<Label htmlFor={`signature-file-${signatureNumber}`}>
						Seleccionar archivo JPG/JPEG
					</Label>
					<div className="mt-1">
						<input
							ref={fileInputRef}
							id={`signature-file-${signatureNumber}`}
							type="file"
							accept=".jpg,.jpeg,image/jpeg"
							onChange={handleFileSelect}
							className="hidden"
							disabled={isUploading || isDeleting}
						/>
						{selectedFile ? (
							<div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg p-2 bg-blue-50 dark:bg-blue-900/20">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 flex-1 min-w-0">
										<ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
												{selectedFile.name}
											</p>
											<p className="text-xs text-blue-700 dark:text-blue-300">
												{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
											</p>
										</div>
									</div>
									<Button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										disabled={isUploading || isDeleting}
										variant="outline"
										size="sm"
										className="ml-2 flex-shrink-0"
									>
										Cambiar
									</Button>
								</div>
							</div>
						) : (
							<Button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={isUploading || isDeleting}
								className="w-full bg-blue-600 hover:bg-blue-700 text-white"
							>
								<Upload className="h-4 w-4 mr-2" />
								Seleccionar archivo
							</Button>
						)}
					</div>
					{/* Solo mostrar el mensaje de formato para la firma Principal */}
					{!selectedFile && isRequired && (
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Formato: JPG/JPEG | Tamaño máximo: 10MB
						</p>
					)}
				</div>
			)}

			{/* Mensaje de error */}
			{error && (
				<div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded flex items-center gap-2">
					<AlertCircle className="h-5 w-5 flex-shrink-0" />
					<span className="text-sm">{error}</span>
				</div>
			)}

			{/* Botones de acción */}
			<div className="flex gap-2">
				{selectedFile && (
					<>
						<Button
							type="button"
							onClick={handleUpload}
							disabled={isUploading || isDeleting}
							className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
						>
							{isUploading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Subiendo...
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									Subir Firma
								</>
							)}
						</Button>
						<Button
							type="button"
							onClick={handleCancel}
							disabled={isUploading || isDeleting}
							variant="outline"
						>
							<X className="mr-2 h-4 w-4" />
							Cancelar
						</Button>
					</>
				)}
				{!selectedFile && currentSignatureUrl && (
					<Button
						type="button"
						onClick={handleDelete}
						disabled={isUploading || isDeleting}
						variant="destructive"
						className="flex-1"
					>
						{isDeleting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Eliminando...
							</>
						) : (
							<>
								<X className="mr-2 h-4 w-4" />
								Eliminar Firma
							</>
						)}
					</Button>
				)}
			</div>
		</div>
	)
}

/**
 * Componente principal para subir y gestionar las firmas digitales del médico
 * Solo visible para roles médicos (medico_tratante, patologo, residente) en laboratorio SPT
 */
export const DoctorSignatureUpload: React.FC = () => {
	const { user } = useAuth()
	const { profile, refetch: refetchProfile } = useUserProfile()
	const { laboratory } = useLaboratory()

	// Roles médicos permitidos
	const medicalRoles: string[] = ['medico_tratante', 'patologo', 'residente']

	// Verificar si el usuario es médico y está en SPT
	const isSPT = laboratory?.slug?.toLowerCase() === 'spt'
	const isMedicalRole = profile?.role && medicalRoles.includes(profile.role)
	const canUploadSignature = isSPT && isMedicalRole

	// Si no cumple las condiciones, no mostrar el componente
	if (!canUploadSignature || !user || !profile?.laboratory_id) {
		return null
	}

	const handleSignatureUpdated = async () => {
		await refetchProfile()
	}

	return (
		<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg">
			<div className="p-6">
				<h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<ImageIcon className="text-primary" />
						Firmas Digitales
					</div>
					<span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
						JPG/JPEG (máx. 10MB)
					</span>
				</h2>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Principal (Obligatoria) */}
					<SignatureSection
						signatureNumber={1}
						title="Principal"
						isRequired={true}
						currentSignatureUrl={profile?.signature_url}
						profile={profile}
						user={user}
						laboratoryId={profile.laboratory_id}
						onSignatureUpdated={handleSignatureUpdated}
					/>

					{/* Adicional 1 (Opcional) */}
					<SignatureSection
						signatureNumber={2}
						title="Adicional 1"
						isRequired={false}
						currentSignatureUrl={profile?.signature_url_2}
						profile={profile}
						user={user}
						laboratoryId={profile.laboratory_id}
						onSignatureUpdated={handleSignatureUpdated}
					/>

					{/* Adicional 2 (Opcional) */}
					<SignatureSection
						signatureNumber={3}
						title="Adicional 2"
						isRequired={false}
						currentSignatureUrl={profile?.signature_url_3}
						profile={profile}
						user={user}
						laboratoryId={profile.laboratory_id}
						onSignatureUpdated={handleSignatureUpdated}
					/>
				</div>
			</div>
		</Card>
	)
}
