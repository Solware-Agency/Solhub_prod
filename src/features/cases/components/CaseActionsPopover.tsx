import React, { useMemo } from 'react';
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service';
import { Eye, FileText, FlaskConical, ClipboardList } from 'lucide-react';
import {
  PopoverBody,
  PopoverButton,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '@shared/components/ui/PopoverInput';
import { FeatureGuard } from '@shared/components/FeatureGuard';
import { Button } from '@shared/components/ui/button';

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
  const examType = case_.exam_type?.toLowerCase().trim() || '';
  const isRequestableCase = examType.includes('inmuno');

  // Determinar qué acciones están disponibles basado en el rol y laboratorio
  const canShowGenerate = useMemo(() => {
    if (!isSpt) return true; // Para otros labs, usar FeatureGuard normal
    return userRole === 'medico_tratante'; // Para SPT, solo medico_tratante
  }, [isSpt, userRole]);

  const canShowTriaje = useMemo(() => {
    if (!isSpt) return true; // Para otros labs, usar FeatureGuard normal
    return userRole === 'medico_tratante' || userRole === 'enfermero'; // Para SPT, medico_tratante y enfermero
  }, [isSpt, userRole]);

  // Contar cuántas acciones están disponibles
  const availableActions = useMemo(() => {
    const actions = [];
    // Ver siempre está disponible
    actions.push({ name: 'ver', icon: Eye, label: 'Ver', onClick: () => onView(case_) });
    
    // Generar
    if (canShowGenerate) {
      actions.push({ name: 'generar', icon: FileText, label: 'Generar', onClick: () => onGenerate(case_) });
    }
    
    // Reacciones
    if (canRequest && isRequestableCase && onReactions) {
      actions.push({ name: 'reacciones', icon: FlaskConical, label: 'Reacciones', onClick: () => onReactions(case_) });
    }
    
    // Triaje
    if (canShowTriaje && onTriaje) {
      actions.push({ name: 'triaje', icon: ClipboardList, label: 'Triaje', onClick: () => onTriaje(case_) });
    }
    
    return actions;
  }, [case_, onView, onGenerate, onReactions, onTriaje, canShowGenerate, canShowTriaje, canRequest, isRequestableCase]);

  // Si solo hay una acción, mostrar botón directo
  if (availableActions.length === 1) {
    const action = availableActions[0];
    const Icon = action.icon;
    return (
      <Button
        variant='outline'
        className='flex items-center gap-2 cursor-pointer'
        onClick={action.onClick}
      >
        <Icon className="w-4 h-4" />
        {action.label}
      </Button>
    );
  }

  // Si hay múltiples acciones, mostrar el popover
  return (
    <PopoverRoot>
      <PopoverTrigger className='px-3 py-1 text-xs'>Acciones</PopoverTrigger>
      <PopoverContent className='w-[180px] min-w-[180px] h-auto'>
        <PopoverBody className='p-1'>
          <PopoverButton onClick={() => onView(case_)}>
            <Eye className='w-4 h-4 flex-shrink-0' />
            <span className='truncate'>Ver</span>
          </PopoverButton>

          {canShowGenerate && (
            <FeatureGuard feature='hasCaseGenerator'>
              <PopoverButton onClick={() => onGenerate(case_)}>
                <FileText className='w-4 h-4 flex-shrink-0' />
                <span className='truncate'>Generar</span>
              </PopoverButton>
            </FeatureGuard>
          )}

          {canRequest && isRequestableCase && onReactions && (
            <PopoverButton onClick={() => onReactions(case_)}>
              <FlaskConical className='w-4 h-4 flex-shrink-0' />
              <span className='truncate'>Reacciones</span>
            </PopoverButton>
          )}

          {canShowTriaje && onTriaje && (
            <FeatureGuard feature='hasTriaje'>
              <PopoverButton onClick={() => onTriaje(case_)}>
                <ClipboardList className='w-4 h-4 flex-shrink-0' />
                <span className='truncate'>Triaje</span>
              </PopoverButton>
            </FeatureGuard>
          )}
        </PopoverBody>
      </PopoverContent>
    </PopoverRoot>
  );
};

export default CaseActionsPopover;
