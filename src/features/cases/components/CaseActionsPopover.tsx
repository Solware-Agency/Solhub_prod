import React, { useMemo, useState } from 'react';
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service';
import { Eye, FileText, FlaskConical, ClipboardList, MoreVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover';
import { FeatureGuard } from '@shared/components/FeatureGuard';
import { cn } from '@shared/lib/utils';

interface CaseActionsPopoverProps {
  case_: MedicalCaseWithPatient;
  onView: (case_: MedicalCaseWithPatient) => void;
  onGenerate: (case_: MedicalCaseWithPatient) => void;
  onReactions?: (case_: MedicalCaseWithPatient) => void;
  onTriaje?: (case_: MedicalCaseWithPatient) => void;
  canRequest: boolean;
  userRole?: string;
  isSpt?: boolean;
}

const CaseActionsPopover: React.FC<CaseActionsPopoverProps> = ({
  case_,
  onView,
  onGenerate,
  onReactions,
  onTriaje,
  canRequest,
  userRole,
  isSpt = false,
}) => {
  const [open, setOpen] = useState(false);
  const examType = case_.exam_type?.toLowerCase().trim() || '';
  const isRequestableCase = examType.includes('inmuno');

  // Determinar qué acciones están disponibles basado en el rol y laboratorio
  const canShowGenerate = useMemo(() => {
    if (!isSpt) return true; // Para otros labs, usar FeatureGuard normal
    // Para SPT: medico_tratante, owner y prueba pueden generar
    return userRole === 'medico_tratante' || userRole === 'owner' || userRole === 'prueba';
  }, [isSpt, userRole]);

  const canShowTriaje = useMemo(() => {
    if (!isSpt) return true; // Para otros labs, usar FeatureGuard normal
    // Para SPT: medico_tratante, enfermero, owner y prueba pueden hacer historia clínica
    return userRole === 'medico_tratante' || userRole === 'enfermero' || userRole === 'owner' || userRole === 'prueba';
  }, [isSpt, userRole]);

  // Función helper para cerrar el popover después de ejecutar una acción
  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  // Mostrar siempre el popover con menú de tres puntos
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className='p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
          aria-label="Menú de acciones"
        >
          <MoreVertical className='w-4 h-4 text-gray-600 dark:text-gray-400' />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className='w-[180px] min-w-[180px] h-auto p-1 !z-[9999]' 
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <button
          onClick={() => handleAction(() => onView(case_))}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-blue-900/20 transition-colors'
          )}
        >
          <Eye className='w-4 h-4 flex-shrink-0' />
          <span className='truncate'>Ver</span>
        </button>

        {canShowGenerate && (
          <FeatureGuard feature='hasCaseGenerator'>
            <button
              onClick={() => handleAction(() => onGenerate(case_))}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-blue-900/20 transition-colors'
              )}
            >
              <FileText className='w-4 h-4 flex-shrink-0' />
              <span className='truncate'>Generar</span>
            </button>
          </FeatureGuard>
        )}

        {canRequest && isRequestableCase && onReactions && (
          <button
            onClick={() => handleAction(() => onReactions(case_))}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-blue-900/20 transition-colors'
            )}
          >
            <FlaskConical className='w-4 h-4 flex-shrink-0' />
            <span className='truncate'>Reacciones</span>
          </button>
        )}

        {canShowTriaje && onTriaje && (
          <FeatureGuard feature='hasTriaje'>
            <button
              onClick={() => handleAction(() => onTriaje(case_))}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-blue-900/20 transition-colors'
              )}
            >
              <ClipboardList className='w-4 h-4 flex-shrink-0' />
              <span className='truncate'>Historia Clínica</span>
            </button>
          </FeatureGuard>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CaseActionsPopover;
