import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
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
import { supabase } from '@/services/supabase/config/config';

// Error Boundary para capturar errores en el formulario
class TriajeFormErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error en TriajeModalForm:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
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
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
            Error al cargar el formulario
          </h3>
          <p className='text-gray-600 dark:text-gray-400 mb-4'>
            {this.state.error?.message || 'Hubo un error inesperado al cargar el formulario de historia clínica.'}
          </p>
          <div className='flex gap-2 justify-center'>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
            >
              Recargar página
            </button>
            <button
              onClick={this.props.onClose}
              className='px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600'
            >
              Cerrar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const [error, setError] = useState<string | null>(null);

  // Validar que document.body existe antes de usar hooks
  React.useEffect(() => {
    if (!document.body) {
      setError('Error: document.body no está disponible');
      return;
    }
  }, []);

  useBodyScrollLock(isOpen);
  useGlobalOverlayOpen(isOpen);

  const { profile } = useUserProfile();
  const isEnfermero = profile?.role === 'enfermero';
  const [forceEditMode, setForceEditMode] = useState(false);

  // Validar que el usuario tenga permisos para editar historia clínica
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
      'prueba', // Rol godmode con acceso completo
    ].includes(profile.role);

  // Query para verificar si existe triaje
  const { data: existingTriage, error: queryError } = useQuery({
    queryKey: ['triage-by-case', case_?.id],
    queryFn: async () => {
      if (!case_?.id) return null;
      try {
        return await getTriageByCase(case_.id);
      } catch (err) {
        console.error('Error obteniendo historia clínica:', err);
        setError('Error al cargar la historia clínica. Por favor, intenta de nuevo.');
        return null;
      }
    },
    enabled: !!case_?.id && isOpen,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: 'always',
    retry: 1,
  });

  // Reset forceEditMode when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setForceEditMode(false);
      setError(null);
    }
  }, [isOpen]);

  // Reset forceEditMode when case changes (e.g., opening modal for different patient)
  React.useEffect(() => {
    setForceEditMode(false);
  }, [case_?.id]);

  if (!isOpen || !case_) {
    return null;
  }

  // Si hay un error crítico, mostrar mensaje de error
  if (error || queryError) {
    return ReactDOM.createPortal(
      <div className='fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 dark:bg-black/70'>
        <div className='bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md'>
          <h3 className='text-lg font-semibold text-red-600 dark:text-red-400 mb-2'>
            Error
          </h3>
          <p className='text-gray-600 dark:text-gray-400 mb-4'>
            {error || 'Error al cargar el triaje. Por favor, intenta de nuevo.'}
          </p>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
          >
            Cerrar
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Verificar que document.body existe antes de crear el portal
  if (typeof document === 'undefined' || !document.body) {
    console.error('Error: document.body no está disponible');
    return null;
  }

  const modalContent = (
    <AnimatePresence mode="wait">
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
              className={`bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto ${
                isFullscreen ? 'h-[90vh]' : ''
              }`}
            >
              {/* Header: en responsive solo nombre + cédula; X siempre visible en primera fila */}
              <div className='p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]'>
                {/* Fila 1: título + X (y en desktop también Editar) para que la X se vea siempre */}
                <div className='flex items-center justify-between gap-3 mb-2 sm:mb-0'>
                  <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 shrink-0'>
                    Historia Clínica
                  </h2>
                  <div className='flex items-center gap-2 shrink-0'>
                    {existingTriage && !existingTriage.is_draft && canEditTriaje && !forceEditMode && (
                      <Button
                        onClick={() => setForceEditMode(true)}
                        variant='outline'
                        className='hidden sm:flex items-center gap-2'
                      >
                        <Edit className='w-4 h-4' />
                        Editar Historia Clínica
                      </Button>
                    )}
                    <button
                      onClick={onClose}
                      className='p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-600'
                      aria-label='Cerrar modal'
                    >
                      <X className='w-5 h-5 text-gray-600 dark:text-gray-300' />
                    </button>
                  </div>
                </div>
                {/* Fila 2: responsive = nombre; debajo cédula · edad. Desktop = todo en línea */}
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-6'>
                  <div className='text-sm sm:text-base min-w-0'>
                    <div className='flex flex-col sm:flex-row sm:items-center sm:gap-1.5'>
                      <span className='font-semibold text-gray-900 dark:text-gray-100'>
                        {case_.nombre || 'Sin nombre'}
                      </span>
                      {/* Responsive: cédula y edad en la misma línea con punto medio (·) */}
                      <span className='text-gray-600 dark:text-gray-400 sm:hidden flex items-center gap-1.5 flex-wrap'>
                        {case_.cedula || 'Sin cédula'}
                        {case_.edad && <> · {case_.edad}</>}
                        {(case_.code ?? (case_ as any).owner_display_code) && (
                          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'>
                            {case_.code ?? (case_ as any).owner_display_code}
                          </span>
                        )}
                      </span>
                      {/* Desktop: cédula y edad en línea */}
                      <span className='hidden sm:inline text-gray-600 dark:text-gray-400'>
                        {case_.cedula || 'Sin cédula'}
                      </span>
                      {case_.edad && (
                        <>
                          <span className='hidden sm:inline text-gray-400 dark:text-gray-600'> · </span>
                          <span className='hidden sm:inline text-gray-600 dark:text-gray-400'>
                            {case_.edad}
                          </span>
                        </>
                      )}
                      {(case_.code ?? (case_ as any).owner_display_code) && (
                        <span className='hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'>
                          {case_.code ?? (case_ as any).owner_display_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className='flex-1 overflow-y-auto'>
                <TriajeFormErrorBoundary onClose={onClose}>
                  {canEditTriaje ? (
                    <TriajeModalForm
                      case_={case_}
                      onClose={onClose}
                      onSave={() => {
                        setForceEditMode(false);
                        onSave?.();
                      }}
                      onCancelEdit={() => setForceEditMode(false)}
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
                        No tienes permisos para editar la historia clínica.
                      </p>
                    </div>
                  )}
                </TriajeFormErrorBoundary>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  try {
    return ReactDOM.createPortal(modalContent, document.body);
  } catch (err) {
    console.error('Error creando portal del modal:', err);
    // Fallback: renderizar sin portal si hay error
    return (
      <div className='fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 dark:bg-black/70'>
        <div className='bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md'>
          <h3 className='text-lg font-semibold text-red-600 dark:text-red-400 mb-2'>
            Error
          </h3>
          <p className='text-gray-600 dark:text-gray-400 mb-4'>
            Error al mostrar el modal. Por favor, recarga la página.
          </p>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }
};

export default TriajeModal;
