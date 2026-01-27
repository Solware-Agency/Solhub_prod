import { useState } from 'react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { X, Plus, Image as ImageIcon, ExternalLink, Eye } from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface MultipleImageUrlsProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  isEditing?: boolean;
  className?: string;
}

/**
 * Componente para manejar múltiples URLs de imágenes
 * Permite agregar, eliminar y visualizar hasta 10 imágenes
 */
export const MultipleImageUrls: React.FC<MultipleImageUrlsProps> = ({
  images,
  onChange,
  maxImages = 10,
  isEditing = false,
  className,
}) => {
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (images.length >= maxImages) {
      alert(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }

    // Validar formato URL básico
    try {
      new URL(newImageUrl);
      onChange([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    } catch {
      alert('Por favor ingresa una URL válida');
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleUpdateImage = (index: number, newUrl: string) => {
    const newImages = [...images];
    newImages[index] = newUrl;
    onChange(newImages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddImage();
    }
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const openImageInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Lista de imágenes existentes */}
      {images.length > 0 && (
        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
            <ImageIcon className='w-4 h-4' />
            <span className='font-medium'>
              {images.length} {images.length === 1 ? 'imagen' : 'imágenes'}
            </span>
          </div>
          
          {isEditing ? (
            // Modo edición: Lista con inputs
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              {images.map((imageUrl, index) => (
                <div
                  key={index}
                  className='group relative bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2 hover:border-primary/50 transition-colors'
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0'>
                      #{index + 1}
                    </span>
                    <div className='flex-1 flex items-center gap-2'>
                      <Input
                        type='url'
                        value={imageUrl}
                        onChange={(e) => handleUpdateImage(index, e.target.value)}
                        placeholder='https://...'
                        className='h-8 text-xs'
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRemoveImage(index)}
                        className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                      >
                        <X className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Modo lectura: Grid de miniaturas clickeables
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
              {images.map((imageUrl, index) => (
                <div
                  key={index}
                  className='group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all duration-200 cursor-pointer bg-gray-100 dark:bg-gray-800'
                  onClick={() => openImageInNewTab(imageUrl)}
                  title={`Click para ver imagen ${index + 1}`}
                >
                  {/* Número de imagen */}
                  <div className='absolute top-1 left-1 z-10 bg-black/60 text-white text-xs font-semibold px-1.5 py-0.5 rounded'>
                    #{index + 1}
                  </div>
                  
                  {/* Botón de ver en overlay al hacer hover */}
                  <div className='absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10'>
                    <div className='flex gap-2'>
                      <div className='bg-white dark:bg-gray-800 rounded-full p-2'>
                        <Eye className='w-4 h-4 text-gray-900 dark:text-white' />
                      </div>
                      <div className='bg-white dark:bg-gray-800 rounded-full p-2'>
                        <ExternalLink className='w-4 h-4 text-gray-900 dark:text-white' />
                      </div>
                    </div>
                  </div>

                  {/* Imagen o fallback */}
                  {!imageErrors.has(index) ? (
                    <img
                      src={imageUrl}
                      alt={`Imagen ${index + 1}`}
                      className='w-full h-full object-cover'
                      onError={() => handleImageError(index)}
                      loading='lazy'
                    />
                  ) : (
                    <div className='w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-2'>
                      <ImageIcon className='w-8 h-8 mb-1' />
                      <span className='text-xs text-center break-all line-clamp-3'>
                        {imageUrl.substring(0, 30)}...
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campo para agregar nueva imagen (solo en modo edición) */}
      {isEditing && images.length < maxImages && (
        <div className='flex gap-2'>
          <Input
            type='url'
            placeholder={`Agregar imagen (${images.length}/${maxImages})`}
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className='flex-1'
          />
          <Button
            type='button'
            onClick={handleAddImage}
            disabled={!newImageUrl.trim()}
            className='flex-shrink-0'
          >
            <Plus className='w-4 h-4 mr-1' />
            Agregar
          </Button>
        </div>
      )}

      {/* Mensaje si no hay imágenes */}
      {images.length === 0 && !isEditing && (
        <div className='text-sm text-gray-500 dark:text-gray-400 italic'>
          Sin imágenes
        </div>
      )}
    </div>
  );
};
