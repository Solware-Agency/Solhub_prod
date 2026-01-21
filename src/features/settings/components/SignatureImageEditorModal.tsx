import React, { useState, useRef, useEffect } from 'react'
import { Cropper } from 'react-cropper'
import type { ReactCropperElement } from 'react-cropper'
import './cropper-styles.css'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@shared/components/ui/dialog'
import { Button } from '@shared/components/ui/button'
import { RotateCw, RotateCcw, Check, X } from 'lucide-react'

interface SignatureImageEditorModalProps {
	isOpen: boolean
	onClose: () => void
	imageFile: File | null
	onSave: (editedFile: File) => void
}

export const SignatureImageEditorModal: React.FC<SignatureImageEditorModalProps> = ({
	isOpen,
	onClose,
	imageFile,
	onSave,
}) => {
	const cropperRef = useRef<ReactCropperElement>(null)
	const [imageSrc, setImageSrc] = useState<string | null>(null)
	const [rotation, setRotation] = useState(0)

	// Cargar imagen cuando se abre el modal
	useEffect(() => {
		if (isOpen && imageFile) {
			const reader = new FileReader()
			reader.onloadend = () => {
				setImageSrc(reader.result as string)
			}
			reader.readAsDataURL(imageFile)
			setRotation(0) // Resetear rotación al abrir
		} else if (!isOpen) {
			setImageSrc(null)
			setRotation(0)
		}
	}, [isOpen, imageFile])

	const handleRotate = (direction: 'left' | 'right') => {
		if (!cropperRef.current?.cropper) return

		const angle = direction === 'right' ? 90 : -90
		cropperRef.current.cropper.rotate(angle)
		setRotation((prev) => prev + angle)
	}

	const handleSave = () => {
		if (!cropperRef.current?.cropper || !imageFile) return

		const cropper = cropperRef.current.cropper
		
		// Obtener canvas del recorte
		const canvas = cropper.getCroppedCanvas({
			imageSmoothingEnabled: true,
			imageSmoothingQuality: 'high',
		})

		if (!canvas) {
			console.error('No se pudo obtener el canvas del recorte')
			return
		}

		// Convertir canvas a blob y luego a File
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					console.error('No se pudo convertir el canvas a blob')
					return
				}

				// Crear un nuevo File con el mismo nombre pero extensión .jpg
				const fileName = imageFile.name.replace(/\.[^/.]+$/, '') + '.jpg'
				const editedFile = new File([blob], fileName, {
					type: 'image/jpeg',
					lastModified: Date.now(),
				})

				onSave(editedFile)
				onClose()
			},
			'image/jpeg',
			0.95 // Calidad JPEG (95%)
		)
	}

	const handleCancel = () => {
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0 left-[1rem] right-[1rem] sm:left-[50%] sm:right-auto translate-x-0 sm:translate-x-[-50%]">
				{/* Título arriba */}
				<DialogHeader className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
					<DialogTitle className="text-base sm:text-lg">Editar firma</DialogTitle>
				</DialogHeader>

				{/* Contenido principal: imagen a la izquierda, instrucciones a la derecha */}
				<div className="flex-1 flex gap-3 sm:gap-6 px-3 sm:px-6 py-3 sm:py-4 overflow-hidden min-h-0">
					{/* Editor de imagen */}
					<div className="flex-1 flex flex-col min-w-0 min-h-0">
						<div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 min-h-0" style={{ minHeight: '300px' }}>
							{imageSrc && (
								<Cropper
									ref={cropperRef}
									src={imageSrc}
									style={{ height: '100%', width: '100%' }}
									aspectRatio={undefined}
									guides={true}
									background={false}
									responsive={true}
									restore={false}
									cropBoxMovable={true}
									cropBoxResizable={true}
									dragMode="move"
									viewMode={1}
									minCropBoxWidth={50}
									minCropBoxHeight={50}
									zoomable={true}
									scalable={true}
									autoCropArea={0.8}
									ready={() => {
										if (cropperRef.current?.cropper) {
											cropperRef.current.cropper.setAspectRatio(NaN)
										}
									}}
								/>
							)}
						</div>
					</div>

					{/* Instrucciones a la derecha - Ocultas en móviles */}
					<div className="hidden md:block w-64 flex-shrink-0">
						<div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg h-full">
							<p className="font-semibold mb-3">Instrucciones:</p>
							<ul className="list-disc list-inside space-y-2 text-xs">
								<li>Arrastra los bordes del recuadro para ajustar el área de recorte</li>
								<li>Mueve el recuadro arrastrándolo desde el centro</li>
								<li>Usa los botones de rotación para girar la imagen</li>
								<li>Haz clic en "Guardar Cambios" cuando estés satisfecho</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Footer con botones de rotación y acción */}
				<DialogFooter className="px-3 sm:px-6 py-3 sm:py-4 border-t gap-2 flex-col sm:flex-row sm:justify-between">
					{/* Botones de rotación */}
					<div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleRotate('left')}
							className="flex items-center gap-2 flex-1 sm:flex-initial"
						>
							<RotateCcw className="h-4 w-4" />
							<span className="hidden sm:inline">Rotar Izquierda</span>
							<span className="sm:hidden">Izquierda</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleRotate('right')}
							className="flex items-center gap-2 flex-1 sm:flex-initial"
						>
							<RotateCw className="h-4 w-4" />
							<span className="hidden sm:inline">Rotar Derecha</span>
							<span className="sm:hidden">Derecha</span>
						</Button>
					</div>
					{/* Botones de acción */}
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<Button 
							type="button" 
							variant="outline" 
							onClick={handleCancel}
							className="flex-1 sm:flex-initial"
						>
							<X className="h-4 w-4 mr-2" />
							Cancelar
						</Button>
						<Button 
							type="button" 
							onClick={handleSave} 
							className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-initial"
						>
							<Check className="h-4 w-4 mr-2" />
							Guardar Cambios
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
