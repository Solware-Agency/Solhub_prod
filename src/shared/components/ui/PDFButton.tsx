import { useState } from 'react';
import { FileText, Eye, X, Download } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@shared/components/ui/dialog';

interface PDFButtonProps {
  pdfUrl?: string | null;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  label?: string; // Opcional: texto personalizado
  isAttached?: boolean; // Si es true, es PDF adjunto; si es false o undefined, es PDF generado
  downloadFileName?: string; // Nombre del archivo al descargar (ej: código del caso)
}

export function PDFButton({ 
  pdfUrl, 
  size = 'sm', 
  variant = 'outline',
  className = '',
  label,
  isAttached = false,
  downloadFileName
}: PDFButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!pdfUrl) return;
    setIsDownloading(true);
    try {
      const res = await fetch(pdfUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('Error al obtener el PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName || (isAttached ? 'documento-adjunto.pdf' : 'informe.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: abrir en nueva pestaña para que el usuario pueda guardar manualmente
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
  };

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
        <Eye className='w-4 h-4' />
      </Button>
      <Button
        size={size}
        variant={variant}
        onClick={handleDownload}
        disabled={isDownloading}
        className={`p-2 ${className}`}
        title={isAttached ? "Descargar PDF adjunto" : "Descargar PDF"}
      >
        <Download className="w-4 h-4" />
      </Button>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => setIsModalOpen(open)}
      >
        <DialogContent className='max-w-5xl w-full h-[90vh] p-0'>
          <DialogHeader className='p-4 border-b relative'>
            <DialogTitle className='flex items-center gap-2'>
              <FileText className='w-5 h-5' />
              {isAttached ? 'Vista previa del PDF adjunto' : 'Vista previa del PDF generado'}
            </DialogTitle>
            <DialogClose className='absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground cursor-pointer'>
              <X className='h-4 w-4' />
              <span className='sr-only'>Close</span>
            </DialogClose>
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
