import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit, Activity } from 'lucide-react';
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service';
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock';
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { useQuery } from '@tanstack/react-query';
import { getTriageByCase } from '@/services/supabase/triage/triage-service';
import { Button } from '@shared/components/ui/button';
import TriajeModalForm from './TriajeModalForm';

interface TriajeModalProps {
  case_: MedicalCaseWithPatient | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  isFullscreen?: boolean;
}

const TriajeModal: React.FC<TriajeModalProps> = ({
  case_,
  isOpen,
  onClose,
  onSave,
  isFullscreen = false,
}) => {
  useBodyScrollLock(isOpen);
  useGlobalOverlayOpen(isOpen);

  const { profile } = useUserProfile();
  const isEnfermero = profile?.role === 'enfermero';
  const [forceEditMode, setForceEditMode] = useState(false);

  // Validar que el usuario tenga permisos para editar triaje
  const canEditTriaje =
    profile?.role &&
    [
      'owner',
      'residente',
      'citotecno',
      'patologo',
      'medicowner',
      'medico_tratante',
      'enfermero',
    ].includes(profile.role);

  // Query para verificar si existe triaje
  const { data: existingTriage } = useQuery({
    queryKey: ['triage-by-case', case_?.id],
    queryFn: async () => {
      if (!case_?.id) return null;
      return await getTriageByCase(case_.id);
    },
    enabled: !!case_?.id && isOpen,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Reset forceEditMode when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setForceEditMode(false);
    }
  }, [isOpen]);

  if (!isOpen || !case_) {
    return null;
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 bg-black/50 dark:bg-black/70 z-[999998] backdrop-blur-sm'
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 pointer-events-none'
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`bg-white dark:bg-background rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto ${
                isFullscreen ? 'h-[90vh]' : ''
              }`}
            >
              {/* Header */}
              <div className='flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]'>
                <div className='flex-1'>
                  <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    Triaje
                  </h2>
                  <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                    {existingTriage && !forceEditMode
                      ? 'Triaje registrado para el caso seleccionado'
                      : 'Complete los datos de triaje para el caso seleccionado'}
                  </p>
                </div>
                <div className='flex items-center gap-4 flex-shrink-0'>
                  <div className='text-right'>
                    <p className='text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100'>
                      {case_.nombre}
                    </p>
                    <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                      {case_.cedula}
                    </p>
                  </div>
                  {existingTriage && canEditTriaje && !forceEditMode && (
                    <Button
                      onClick={() => setForceEditMode(true)}
                      variant='outline'
                      className='flex items-center gap-2'
                    >
                      <Edit className='w-4 h-4' />
                      Editar Triaje
                    </Button>
                  )}
                  <button
                    onClick={onClose}
                    className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                    aria-label='Cerrar modal'
                  >
                    <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className='flex-1 overflow-y-auto'>
                {canEditTriaje ? (
                  <TriajeModalForm
                    case_={case_}
                    onClose={onClose}
                    onSave={() => {
                      setForceEditMode(false);
                      onSave?.();
                    }}
                    showOnlyVitalSigns={isEnfermero}
                    userRole={profile?.role}
                    forceEditMode={forceEditMode}
                  />
                ) : (
                  <div className='p-6 text-center'>
                    <div className='text-red-500 mb-4'>
                      <svg
                        className='w-16 h-16 mx-auto'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                        />
                      </svg>
                    </div>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                      Sin permisos
                    </h3>
                    <p className='text-gray-600 dark:text-gray-400'>
                      No tienes permisos para editar el triaje.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default TriajeModal;
