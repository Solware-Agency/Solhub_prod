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
	CheckCircle,
	AlertCircle,
} from 'lucide-react'

/**
 * Componente para subir y gestionar la firma digital del médico
 * Solo visible para roles médicos (medico_tratante, patologo, residente) en laboratorio SPT
 */
export const DoctorSignatureUpload: React.FC = () => {
	const { user } = useAuth()
	const { profile, refetch: refetchProfile } = useUserProfile()
	const { laboratory } = useLaboratory()
	const { toast } = useToast()
	const fileInputRef = useRef<HTMLInputElement>(null)

	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Roles médicos permitidos
	const medicalRoles: string[] = ['medico_tratante', 'patologo', 'residente']

	// Verificar si el usuario es médico y está en SPT
	const isSPT = laboratory?.slug?.toLowerCase() === 'spt'
	const isMedicalRole = profile?.role && medicalRoles.includes(profile.role)
	const canUploadSignature = isSPT && isMedicalRole

	// Cargar preview de firma existente
	useEffect(() => {
		if (profile?.signature_url) {
			setPreviewUrl(profile.signature_url)
		} else {
			setPreviewUrl(null)
		}
	}, [profile?.signature_url])

	// Si no cumple las condiciones, no mostrar el componente
	if (!canUploadSignature) {
		return null
	}

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
		if (!selectedFile || !user || !profile?.laboratory_id) {
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
				profile.laboratory_id,
			)

			if (uploadError || !signatureUrl) {
				throw uploadError || new Error('No se pudo obtener la URL de la firma')
			}

			// Actualizar perfil con la URL de la firma
			const { error: updateError } = await updateDoctorSignature(user.id, signatureUrl)

			if (updateError) {
				throw updateError
			}

			// Refrescar perfil
			await refetchProfile()

			// Limpiar estado
			setSelectedFile(null)
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}

			toast({
				title: '✅ Firma subida exitosamente',
				description: 'Tu firma digital ha sido guardada correctamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (error) {
			console.error('Error uploading signature:', error)
			const errorMessage =
				error instanceof Error ? error.message : 'Error al subir la firma. Inténtalo de nuevo.'
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
		if (!user || !profile?.signature_url || !profile?.laboratory_id) {
			return
		}

		if (!confirm('¿Estás seguro de que deseas eliminar tu firma digital?')) {
			return
		}

		setIsDeleting(true)
		setError(null)

		try {
			// Eliminar archivo de Supabase Storage
			const { error: deleteError } = await deleteDoctorSignature(
				user.id,
				profile.signature_url!,
				profile.laboratory_id,
			)

			if (deleteError) {
				throw deleteError
			}

			// Actualizar perfil eliminando la URL
			const { error: updateError } = await updateDoctorSignature(user.id, null)

			if (updateError) {
				throw updateError
			}

			// Refrescar perfil
			await refetchProfile()

			// Limpiar preview
			setPreviewUrl(null)
			setSelectedFile(null)
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}

			toast({
				title: '✅ Firma eliminada',
				description: 'Tu firma digital ha sido eliminada correctamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (error) {
			console.error('Error deleting signature:', error)
			const errorMessage =
				error instanceof Error ? error.message : 'Error al eliminar la firma. Inténtalo de nuevo.'
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
		if (profile?.signature_url) {
			setPreviewUrl(profile.signature_url)
		} else {
			setPreviewUrl(null)
		}
	}

	return (
		<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg w-1/2">
			<div className="p-3">
				<h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
					<ImageIcon className="text-primary" />
					Firma Digital
				</h2>

				<div className="space-y-2">
					{/* Información */}
					<div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
						<p className="text-xs text-blue-800 dark:text-blue-300">
							Sube una imagen de tu firma en formato JPG/JPEG (máximo 10MB). Esta firma se
							utilizará en documentos médicos.
						</p>
					</div>

					{/* Preview de firma existente o nueva */}
					{previewUrl && (
						<div className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800/50">
							<div className="flex flex-col items-center justify-center">
								<img
									src={previewUrl}
									alt="Preview de firma"
									className="max-w-full max-h-24 object-contain rounded"
								/>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									{selectedFile ? 'Vista previa de nueva firma' : 'Firma actual'}
								</p>
							</div>
						</div>
					)}

					{/* Input de archivo */}
					<div>
						<Label htmlFor="signature-file">Seleccionar archivo JPG/JPEG</Label>
						<div className="mt-1">
							<input
								ref={fileInputRef}
								id="signature-file"
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
									<Upload className="h-4 w-4" />
									Seleccionar archivo
								</Button>
							)}
						</div>
						{!selectedFile && (
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Formato: JPG/JPEG | Tamaño máximo: 10MB
							</p>
						)}
					</div>

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
						{!selectedFile && profile?.signature_url && (
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

					{/* Mensaje de éxito */}
					{!selectedFile && profile?.signature_url && !error && (
						<div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded flex items-center gap-2">
							<CheckCircle className="h-5 w-5 flex-shrink-0" />
							<span className="text-sm">Firma guardada correctamente</span>
						</div>
					)}
				</div>
			</div>
		</Card>
	)
}
