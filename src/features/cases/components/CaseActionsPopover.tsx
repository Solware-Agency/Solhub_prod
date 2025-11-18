import React from 'react';
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

interface CaseActionsPopoverProps {
  case_: MedicalCaseWithPatient;
  onView: (case_: MedicalCaseWithPatient) => void;
  onGenerate: (case_: MedicalCaseWithPatient) => void;
  onReactions?: (case_: MedicalCaseWithPatient) => void;
  onTriaje?: (case_: MedicalCaseWithPatient) => void;
  canRequest: boolean;
}

const CaseActionsPopover: React.FC<CaseActionsPopoverProps> = ({
  case_,
  onView,
  onGenerate,
  onReactions,
  onTriaje,
  canRequest,
}) => {
  const examType = case_.exam_type?.toLowerCase().trim() || '';
  const isRequestableCase = examType.includes('inmuno');

  return (
    <PopoverRoot>
      <PopoverTrigger className='px-3 py-1 text-xs'>Acciones</PopoverTrigger>
      <PopoverContent className='w-30 h-auto'>
        <PopoverBody className='p-1'>
          <PopoverButton onClick={() => onView(case_)}>
            <Eye className='w-4 h-4' />
            <span>Ver</span>
          </PopoverButton>

          <FeatureGuard feature='hasCaseGenerator'>
            <PopoverButton onClick={() => onGenerate(case_)}>
              <FileText className='w-4 h-4' />
              <span>Generar</span>
            </PopoverButton>
          </FeatureGuard>

          {canRequest && isRequestableCase && onReactions && (
            <PopoverButton onClick={() => onReactions(case_)}>
              <FlaskConical className='w-4 h-4' />
              <span>Reacciones</span>
            </PopoverButton>
          )}

          {onTriaje && (
            <FeatureGuard feature='hasTriaje'>
              <PopoverButton onClick={() => onTriaje(case_)}>
                <ClipboardList className='w-4 h-4' />
                <span>Triaje</span>
              </PopoverButton>
            </FeatureGuard>
          )}
        </PopoverBody>
      </PopoverContent>
    </PopoverRoot>
  );
};

export default CaseActionsPopover;
