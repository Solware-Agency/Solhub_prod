import { Eye } from 'lucide-react';
import { Button } from '@shared/components/ui/button';

interface ImageButtonProps {
  imageUrl?: string | null;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function ImageButton({ 
  imageUrl, 
  size = 'sm', 
  variant = 'outline',
  className = '' 
}: ImageButtonProps) {
  if (!imageUrl) {
    return (
      <span className='text-sm text-gray-500 dark:text-gray-400'>
        Sin imagen
      </span>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={() => window.open(imageUrl, '_blank')}
      className={`p-2 ${className}`}
      title="Ver Imagen"
    >
      <Eye className='w-4 h-4' />
    </Button>
  );
}
