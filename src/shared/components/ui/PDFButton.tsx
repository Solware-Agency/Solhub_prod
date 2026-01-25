import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';

interface PDFButtonProps {
  pdfUrl?: string | null;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  label?: string; // Opcional: texto personalizado
}

export function PDFButton({ 
  pdfUrl, 
  size = 'sm', 
  variant = 'outline',
  className = '',
  label
}: PDFButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!pdfUrl) {
    return (
      <span className='text-sm text-gray-500 dark:text-gray-400'>
        Sin PDF
      </span>
    );
  }

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={() => setIsModalOpen(true)}
        className={`p-2 ${className}`}
        title={label || "Ver PDF"}
      >
        <FileText className='w-4 h-4 mr-1' />
        {label && <span className='ml-1'>{label}</span>}
      </Button>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => setIsModalOpen(open)}
      >
        <DialogContent className='max-w-5xl w-full h-[90vh] p-0'>
          <DialogHeader className='p-4 border-b'>
            <DialogTitle className='flex items-center gap-2'>
              <FileText className='w-5 h-5' />
              Vista previa del PDF adjunto
            </DialogTitle>
          </DialogHeader>
          <div className='flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900'>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className='w-full h-full border-0'
                title='Vista previa del PDF'
                style={{
                  minHeight: 'calc(90vh - 80px)',
                }}
              />
            ) : (
              <div className='flex items-center justify-center h-full'>
                <div className='text-center'>
                  <FileText className='w-16 h-16 mx-auto text-gray-400 mb-4' />
                  <p className='text-gray-500 dark:text-gray-400'>
                    No hay PDF disponible para previsualizar
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
