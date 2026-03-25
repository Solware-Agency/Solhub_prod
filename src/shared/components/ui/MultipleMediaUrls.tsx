import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@shared/components/ui/dialog';
import {
	X,
	Plus,
	Image as ImageIcon,
	Camera,
	Loader2,
	Images,
	Video,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
import { cn } from '@shared/lib/utils';

export type MediaItem = {
	type: 'image' | 'video';
	url: string;
};

type PreviewSlide = { item: MediaItem; sourceIndex: number };

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
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [previewImageFailed, setPreviewImageFailed] = useState(false);
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const galleryInputRef = useRef<HTMLInputElement>(null);

	const previewSlides: PreviewSlide[] = useMemo(() => {
		const withIndex = media.map((item, sourceIndex) => ({ item, sourceIndex }));
		return [
			...withIndex.filter(({ item }) => item.type === 'image'),
			...withIndex.filter(({ item }) => item.type === 'video'),
		];
	}, [media]);

	const openPreviewAtSourceIndex = useCallback(
		(sourceIndex: number) => {
			const pos = previewSlides.findIndex((s) => s.sourceIndex === sourceIndex);
			if (pos < 0) return;
			setPreviewIndex(pos);
			setPreviewOpen(true);
		},
		[previewSlides],
	);

	const goPreviewPrev = useCallback(() => {
		setPreviewIndex((i) => Math.max(0, i - 1));
	}, []);

	const goPreviewNext = useCallback(() => {
		setPreviewIndex((i) => Math.min(previewSlides.length - 1, i + 1));
	}, [previewSlides.length]);

	useEffect(() => {
		setPreviewImageFailed(false);
	}, [previewIndex, previewOpen]);

	useEffect(() => {
		if (!previewOpen || previewSlides.length === 0) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				goPreviewPrev();
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				goPreviewNext();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [previewOpen, previewSlides.length, goPreviewPrev, goPreviewNext]);

	useEffect(() => {
		if (!previewOpen) return;
		if (previewSlides.length === 0) {
			setPreviewOpen(false);
			return;
		}
		if (previewIndex >= previewSlides.length) {
			setPreviewIndex(previewSlides.length - 1);
		}
	}, [previewOpen, previewSlides.length, previewIndex]);

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

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddMedia();
		}
	};

	const handleMediaError = (index: number) => {
		setMediaErrors(prev => new Set(prev).add(index));
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0 || !onUploadFile) return;
		
		console.log(`� Adjuntos seleccionados: ${files.length}`, files);
		
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
			className='group flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2 transition-colors hover:border-primary/50 dark:border-gray-700 dark:bg-gray-800/50'
		>
			<button
				type='button'
				className='relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 border-gray-200 bg-gray-100 transition-colors hover:border-primary dark:border-gray-600 dark:bg-gray-800'
				onClick={() => openPreviewAtSourceIndex(index)}
				title={`Ver adjunto #${index + 1}`}
			>
				<div className='absolute left-0.5 top-0.5 z-10 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[10px] font-semibold text-white'>
					{item.type === 'video' ? <Video className='h-2.5 w-2.5' /> : <ImageIcon className='h-2.5 w-2.5' />}
					{index + 1}
				</div>
				{item.type === 'video' ? (
					<div className='flex h-full w-full flex-col items-center justify-center p-1 text-gray-400 dark:text-gray-500'>
						<Video className='h-6 w-6' />
					</div>
				) : !mediaErrors.has(index) ? (
					<img
						src={item.url}
						alt=''
						className='h-full w-full object-cover'
						onError={() => handleMediaError(index)}
						loading='lazy'
					/>
				) : (
					<div className='flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500'>
						<ImageIcon className='h-6 w-6' />
					</div>
				)}
			</button>
			<div className='min-w-0 flex-1'>
				<p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
					Adjunto #{index + 1}
				</p>
			</div>
			<Button
				type='button'
				variant='ghost'
				size='sm'
				onClick={() => handleRemoveMedia(index)}
				className='h-8 w-8 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20'
				title='Quitar'
			>
				<X className='h-4 w-4' />
			</Button>
		</div>
	)

	const mediaThumbGridClass =
		'grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))] sm:gap-2.5 md:grid-cols-[repeat(5,minmax(0,1fr))] md:gap-3 justify-items-start'

	const renderThumbnail = (item: MediaItem, index: number) => (
		<div
			key={index}
			role='button'
			tabIndex={0}
			className='group relative aspect-square w-16 min-w-0 max-w-full shrink sm:w-20 md:w-24 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 transition-all duration-200 hover:border-primary cursor-pointer bg-gray-100 dark:bg-gray-800'
			onClick={() => openPreviewAtSourceIndex(index)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					openPreviewAtSourceIndex(index);
				}
			}}
			title={`Ver adjunto #${index + 1}`}
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
					alt={`Adjunto #${index + 1}`}
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

	const currentPreview = previewSlides[previewIndex];
	const canPreviewPrev = previewIndex > 0;
	const canPreviewNext = previewIndex < previewSlides.length - 1;

	return (
		<div className={cn('space-y-3', className)}>
			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogContent
					className={cn(
						'z-[99999999999999999] flex max-h-[90vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0',
						'border border-input bg-white/85 dark:bg-background/55 shadow-2xl sm:rounded-xl',
						'backdrop-blur-[2px] dark:backdrop-blur-[10px]',
					)}
					overlayClassName='bg-black/45 dark:bg-black/55 backdrop-blur-sm'
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					{currentPreview && (
						<>
							<DialogHeader className='shrink-0 border-b border-gray-200 bg-white/50 px-4 py-3 pr-12 text-left backdrop-blur-[2px] dark:border-gray-700 dark:bg-background/50 dark:backdrop-blur-[10px]'>
								<DialogTitle className='flex flex-wrap items-center gap-2 text-base text-gray-900 dark:text-gray-100'>
									{currentPreview.item.type === 'video' ? (
										<Video className='h-5 w-5 shrink-0' />
									) : (
										<ImageIcon className='h-5 w-5 shrink-0' />
									)}
									<span>
										{currentPreview.item.type === 'video' ? 'Video' : 'Imagen'}{' '}
										<span className='text-muted-foreground font-normal'>
											({previewIndex + 1} / {previewSlides.length})
										</span>
									</span>
								</DialogTitle>
							</DialogHeader>
							<div className='relative flex min-h-[min(70vh,560px)] flex-1 items-center justify-center overflow-hidden bg-gray-50/90 px-12 py-4 backdrop-blur-[1px] dark:bg-gray-950/45 dark:backdrop-blur-md'>
								{previewSlides.length > 1 && (
									<>
										<Button
											type='button'
											variant='secondary'
											size='icon'
											className='absolute left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-input bg-white/80 shadow-md backdrop-blur-sm hover:bg-white/95 disabled:opacity-30 dark:bg-background/70 dark:hover:bg-background/85'
											disabled={!canPreviewPrev}
											onClick={(e) => {
												e.stopPropagation();
												goPreviewPrev();
											}}
											aria-label='Anterior'
										>
											<ChevronLeft className='h-6 w-6' />
										</Button>
										<Button
											type='button'
											variant='secondary'
											size='icon'
											className='absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border border-input bg-white/80 shadow-md backdrop-blur-sm hover:bg-white/95 disabled:opacity-30 dark:bg-background/70 dark:hover:bg-background/85'
											disabled={!canPreviewNext}
											onClick={(e) => {
												e.stopPropagation();
												goPreviewNext();
											}}
											aria-label='Siguiente'
										>
											<ChevronRight className='h-6 w-6' />
										</Button>
									</>
								)}
								<div className='flex max-h-[min(70vh,560px)] w-full max-w-full items-center justify-center overflow-auto'>
									{currentPreview.item.type === 'video' ? (
										<video
											key={currentPreview.item.url}
											src={currentPreview.item.url}
											className='max-h-[min(70vh,560px)] w-full max-w-full rounded-md bg-black object-contain'
											controls
											playsInline
											preload='metadata'
										/>
									) : previewImageFailed ? (
										<div className='flex flex-col items-center gap-2 p-8 text-muted-foreground'>
											<ImageIcon className='h-16 w-16' />
											<p className='text-sm'>No se pudo cargar la imagen</p>
										</div>
									) : (
										<img
											key={currentPreview.item.url}
											src={currentPreview.item.url}
											alt={`Adjunto #${currentPreview.sourceIndex + 1}`}
											className='max-h-[min(70vh,560px)] w-auto max-w-full object-contain'
											onError={() => {
												setPreviewImageFailed(true);
												handleMediaError(currentPreview.sourceIndex);
											}}
										/>
									)}
								</div>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

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
								<div className={mediaThumbGridClass}>
									{imageEntries.map(({ item, index }) => renderThumbnail(item, index))}
								</div>
							)}
							{showImageVideoDivider && <div className={dividerClass} role='separator' />}
							{videoEntries.length > 0 && (
								<div className={mediaThumbGridClass}>
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
