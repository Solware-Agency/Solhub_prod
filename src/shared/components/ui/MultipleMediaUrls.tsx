import { useState, useRef } from 'react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover';
import { X, Plus, Image as ImageIcon, Camera, Loader2, Images, Video } from 'lucide-react';
import { cn } from '@shared/lib/utils';

export type MediaItem = {
	type: 'image' | 'video';
	url: string;
};

interface MultipleMediaUrlsProps {
	media: MediaItem[];
	onChange: (media: MediaItem[]) => void;
	maxItems?: number;
	isEditing?: boolean;
	/** Si true, permite Cámara/Galería aunque isEditing sea false (como PDF adjuntos en el modal de caso) */
	allowUploadWhenReadonly?: boolean;
	className?: string;
	/** Handler para subir archivo. Debe devolver { type: 'image'|'video', url: string } o null */
	onUploadFile?: (file: File) => Promise<{ type: 'image' | 'video'; url: string } | null>;
	/** Mientras sube un archivo para deshabilitar el botón de subida */
	isUploading?: boolean;
}

/**
 * Componente para manejar múltiples URLs de imágenes y videos
 * Permite agregar, eliminar y visualizar hasta maxItems archivos (imágenes + videos)
 */
export const MultipleMediaUrls: React.FC<MultipleMediaUrlsProps> = ({
	media,
	onChange,
	maxItems = 10,
	isEditing = false,
	allowUploadWhenReadonly = false,
	className,
	onUploadFile,
	isUploading = false,
}) => {
	const showFileUpload =
		Boolean(onUploadFile) && media.length < maxItems && (isEditing || allowUploadWhenReadonly);
	const [newMediaUrl, setNewMediaUrl] = useState('');
	const [mediaErrors, setMediaErrors] = useState<Set<number>>(new Set());
	const [uploadPopoverOpen, setUploadPopoverOpen] = useState(false);
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const galleryInputRef = useRef<HTMLInputElement>(null);

	const handleAddMedia = () => {
		if (!newMediaUrl.trim()) return;
		if (media.length >= maxItems) {
			alert(`Máximo ${maxItems} archivos permitidos`);
			return;
		}

		// Validar formato URL básico
		try {
			new URL(newMediaUrl);
			// Detectar tipo por URL: si contiene 'case-videos' o termina en .mp4 es video
			const isVideo = newMediaUrl.includes('case-videos') || newMediaUrl.toLowerCase().endsWith('.mp4');
			onChange([...media, { type: isVideo ? 'video' : 'image', url: newMediaUrl.trim() }]);
			setNewMediaUrl('');
		} catch {
			alert('Por favor ingresa una URL válida');
		}
	};

	const handleRemoveMedia = (index: number) => {
		const newMedia = media.filter((_, i) => i !== index);
		onChange(newMedia);
	};

	const handleUpdateMedia = (index: number, newUrl: string) => {
		const newMedia = [...media];
		const isVideo = newUrl.includes('case-videos') || newUrl.toLowerCase().endsWith('.mp4');
		newMedia[index] = { type: isVideo ? 'video' : 'image', url: newUrl };
		onChange(newMedia);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddMedia();
		}
	};

	const handleMediaError = (index: number) => {
		setMediaErrors(prev => new Set(prev).add(index));
	};

	const openMediaInNewTab = (item: MediaItem) => {
		window.open(item.url, '_blank', 'noopener,noreferrer');
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0 || !onUploadFile) return;
		
		console.log(`🖼️ Imágenes/Videos seleccionados: ${files.length}`, files);
		
		const availableSlots = maxItems - media.length;
		if (availableSlots <= 0) {
			alert(`Máximo ${maxItems} archivos permitidos`);
			return;
		}

		const filesToUpload = Math.min(files.length, availableSlots);
		const uploadedMedia: MediaItem[] = [];

		// Subir archivos secuencialmente
		for (let i = 0; i < filesToUpload; i++) {
			const file = files[i];
			try {
				const result = await onUploadFile(file);
				if (result) {
					uploadedMedia.push(result);
				}
			} catch (error) {
				console.error(`Error uploading ${file.name}:`, error);
			}
		}

		if (uploadedMedia.length > 0) {
			onChange([...media, ...uploadedMedia]);
		}

		e.target.value = '';
	};

	const imageEntries = media
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => item.type === 'image')
	const videoEntries = media
		.map((item, index) => ({ item, index }))
		.filter(({ item }) => item.type === 'video')
	const showImageVideoDivider = imageEntries.length > 0 && videoEntries.length > 0

	const dividerClass =
		'border-t border-gray-200 dark:border-gray-700 pt-3 mt-2'

	const renderEditRow = (item: MediaItem, index: number) => (
		<div
			key={index}
			className='group relative bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 hover:border-primary/50 transition-colors'
		>
			<div className='flex items-center gap-2'>
				<span className='text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0 flex items-center gap-1'>
					{item.type === 'video' ? <Video className='w-3 h-3' /> : <ImageIcon className='w-3 h-3' />}
					#{index + 1}
				</span>
				<div className='flex-1 flex items-center gap-2'>
					<Input
						type='url'
						value={item.url}
						onChange={(e) => handleUpdateMedia(index, e.target.value)}
						placeholder='https://...'
						className='h-8 text-xs'
					/>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						onClick={() => handleRemoveMedia(index)}
						className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
					>
						<X className='w-4 h-4' />
					</Button>
				</div>
			</div>
		</div>
	)

	const renderThumbnail = (item: MediaItem, index: number) => (
		<div
			key={index}
			className='group relative aspect-square w-16 sm:w-20 md:w-24 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all duration-200 cursor-pointer bg-gray-100 dark:bg-gray-800'
			onClick={() => openMediaInNewTab(item)}
			title={`Click para ver ${item.type === 'video' ? 'video' : 'imagen'} ${index + 1}`}
		>
			<div className='absolute top-1 left-1 z-10 bg-black/60 text-white text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-1'>
				{item.type === 'video' ? <Video className='w-3 h-3' /> : <ImageIcon className='w-3 h-3' />}
				#{index + 1}
			</div>
			{item.type === 'video' ? (
				<div className='w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-2'>
					<Video className='w-8 h-8 mb-1' />
					<span className='text-xs'>MP4</span>
				</div>
			) : !mediaErrors.has(index) ? (
				<img
					src={item.url}
					alt={`Imagen ${index + 1}`}
					className='w-full h-full object-cover'
					onError={() => handleMediaError(index)}
					loading='lazy'
				/>
			) : (
				<div className='w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-2'>
					<ImageIcon className='w-8 h-8 mb-1' />
				</div>
			)}
		</div>
	)

	return (
		<div className={cn('space-y-3', className)}>
			{/* Lista de medios existentes */}
			{media.length > 0 && (
				<div className='space-y-2'>
					{isEditing ? (
						<div className='space-y-2'>
							{imageEntries.length > 0 && (
								<div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
									{imageEntries.map(({ item, index }) => renderEditRow(item, index))}
								</div>
							)}
							{showImageVideoDivider && <div className={dividerClass} role='separator' />}
							{videoEntries.length > 0 && (
								<div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
									{videoEntries.map(({ item, index }) => renderEditRow(item, index))}
								</div>
							)}
						</div>
					) : (
						<div className='space-y-2'>
							{imageEntries.length > 0 && (
								<div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 justify-items-start'>
									{imageEntries.map(({ item, index }) => renderThumbnail(item, index))}
								</div>
							)}
							{showImageVideoDivider && <div className={dividerClass} role='separator' />}
							{videoEntries.length > 0 && (
								<div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 justify-items-start'>
									{videoEntries.map(({ item, index }) => renderThumbnail(item, index))}
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Subida por archivo: también en vista lectura si allowUploadWhenReadonly (como PDF) */}
			{showFileUpload && (
				<div className='space-y-2'>
					<input
						ref={cameraInputRef}
						type='file'
						accept='image/jpeg,image/png,.jpg,.jpeg,.png,video/mp4,.mp4'
						capture='environment'
						multiple
						className='hidden'
						onChange={handleFileSelect}
						aria-label='Capturar foto o video con cámara'
					/>
					<input
						ref={galleryInputRef}
						type='file'
						accept='image/jpeg,image/png,.jpg,.jpeg,.png,video/mp4,.mp4'
						multiple
						className='hidden'
						onChange={handleFileSelect}
						aria-label='Elegir imagen o video de galería'
					/>
					<Popover open={uploadPopoverOpen} onOpenChange={setUploadPopoverOpen}>
						<PopoverTrigger asChild>
							<Button
								type='button'
								variant='outline'
								size='sm'
								disabled={isUploading}
								className='flex items-center gap-2'
							>
								{isUploading ? (
									<Loader2 className='w-4 h-4 animate-spin' />
								) : (
									<Camera className='w-4 h-4' />
								)}
								{isUploading ? 'Subiendo...' : 'Cámara / Galería'}
							</Button>
						</PopoverTrigger>
						<PopoverContent className='w-56 p-2' align='start'>
							<div className='flex flex-col gap-1'>
								<button
									type='button'
									onClick={() => {
										cameraInputRef.current?.click();
										setUploadPopoverOpen(false);
									}}
									className='flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left'
								>
									<Camera className='w-4 h-4 shrink-0' />
									Tomar foto/video
								</button>
								<button
									type='button'
									onClick={() => {
										galleryInputRef.current?.click();
										setUploadPopoverOpen(false);
									}}
									className='flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left'
								>
									<Images className='w-4 h-4 shrink-0' />
									Elegir de galería
								</button>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			)}

			{/* Pegar URL manualmente: solo en modo edición */}
			{isEditing && media.length < maxItems && (
				<div className='flex gap-2'>
					<Input
						type='url'
						placeholder={`O pegar URL (${media.length}/${maxItems})`}
						value={newMediaUrl}
						onChange={(e) => setNewMediaUrl(e.target.value)}
						onKeyDown={handleKeyDown}
						className='flex-1'
					/>
					<Button
						type='button'
						onClick={handleAddMedia}
						disabled={!newMediaUrl.trim()}
						className='shrink-0'
					>
						<Plus className='w-4 h-4 mr-1' />
						Agregar
					</Button>
				</div>
			)}

			{/* Mensaje si no hay medios */}
			{media.length === 0 && !isEditing && !allowUploadWhenReadonly && (
				<div className='text-sm text-gray-500 dark:text-gray-400 italic'>
					Sin imágenes ni videos
				</div>
			)}
		</div>
	);
};
