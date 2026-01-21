import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  FileText,
  Calendar,
  Mail,
  Search,
  UserPen,
  Download,
  CheckSquare,
  Square,
  Eye,
  Activity,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@shared/components/ui/tabs';
import WhatsAppIcon from '@shared/components/icons/WhatsAppIcon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/config/config';
import { getCasesByPatientIdWithInfo } from '@/services/supabase/cases/medical-cases-service';
import { BranchBadge } from '@shared/components/ui/branch-badge';
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Checkbox } from '@shared/components/ui/checkbox';
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock';
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen';
import EditPatientInfoModal from '@features/patients/components/EditPatientInfoModal';
import { formatCurrency } from '@shared/utils/number-utils';
import { usePDFDownload } from '@shared/hooks/usePDFDownload';
import { useToast } from '@shared/hooks/use-toast';
import JSZip from 'jszip';
import TriageHistoryTab from '@features/triaje/components/TriageHistoryTab';

import type { Patient } from '@/services/supabase/patients/patients-service';
import { FeatureGuard } from '@shared/components/FeatureGuard';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { useLaboratory } from '@/app/providers/LaboratoryContext';
import SendEmailModal from '@features/cases/components/SendEmailModal';
import { getDependentsByResponsable, getResponsableByDependiente } from '@/services/supabase/patients/responsabilidades-service';
import { ImageButton } from '@shared/components/ui/ImageButton';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

// Helper to calculate age from fecha_nacimiento
function calculateAgeFromFechaNacimiento(fechaNacimiento: string | null | undefined): string | null {
  if (!fechaNacimiento) return null;
  
  try {
    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    
    // Validar que la fecha sea válida
    if (isNaN(fechaNac.getTime())) return null;
    
    // Validar que la fecha no sea en el futuro
    if (fechaNac > hoy) return null;
    
    // Calcular diferencia en años y meses
    let years = hoy.getFullYear() - fechaNac.getFullYear();
    let months = hoy.getMonth() - fechaNac.getMonth();
    
    // Ajustar si el mes actual es menor que el mes de nacimiento
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // Ajustar si el día actual es menor que el día de nacimiento
    if (months === 0 && hoy.getDate() < fechaNac.getDate()) {
      years--;
      months = 11;
    }
    
    // Si tiene más de 1 año, mostrar en años
    if (years >= 1) {
      return `${years} Años`;
    }
    // Si tiene menos de 1 año pero más de 0 meses, mostrar en meses
    else if (months >= 1) {
      return `${months} Meses`;
    }
    // Si tiene menos de 1 mes, mostrar como "0 Meses" (recién nacido)
    else {
      return '0 Meses';
    }
  } catch (error) {
    console.error('Error calculando edad desde fecha_nacimiento:', error);
    return null;
  }
}

const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({
  isOpen,
  onClose,
  patient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [isDownloadingMultiple, setIsDownloadingMultiple] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    current: 0,
    total: 0,
  });
  const [emailProgress, setEmailProgress] = useState({
    current: 0,
    total: 0,
  });
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [pendingEmailCases, setPendingEmailCases] = useState<MedicalCaseWithPatient[]>([]);
  const [activeTab, setActiveTab] = useState('cases');
  const [searchTermRepresentados, setSearchTermRepresentados] = useState('');
  useBodyScrollLock(isOpen);
  useGlobalOverlayOpen(isOpen);

  // Hook para descargar PDFs
  const { isGeneratingPDF, isSaving, handleCheckAndDownloadPDF, getPDFBlob } =
    usePDFDownload();
  const { toast } = useToast();
  const { profile } = useUserProfile();
  const { laboratory } = useLaboratory();
  const isImagenologia = profile?.role === 'imagenologia';
  const isSpt = laboratory?.slug === 'spt';

  const editPatient = () => {
    setIsEditing(true);
  };

  const closeEdit = () => {
    setIsEditing(false);
  };

  const clearSelection = () => {
    setSelectedCases(new Set());
  };

  const [previewingCaseId, setPreviewingCaseId] = useState<string | null>(null);

  // Verificar si el paciente es un representado (menor o animal)
  const isRepresentado = patient ? ((patient as any).tipo_paciente === 'menor' || (patient as any).tipo_paciente === 'animal') : false;

  // Obtener información del responsable si es representado
  const { data: responsableData } = useQuery({
    queryKey: ['patient-responsable-modal', patient?.id],
    queryFn: async () => {
      if (!patient?.id || !isRepresentado) return null;
      try {
        const responsable = await getResponsableByDependiente(patient.id);
        return responsable;
      } catch (error) {
        console.error('Error obteniendo responsable:', error);
        return null;
      }
    },
    enabled: isOpen && !!patient?.id && isRepresentado,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch patient's medical records - usando nueva estructura
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['patient-history', patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];

      // eslint-disable-next-line no-useless-catch
      try {
        // Obtener casos directamente del servidor filtrados por patient_id
        const cases = await getCasesByPatientIdWithInfo(patient.id);
        return cases;
      } catch (error) {
        throw error;
      }
    },
    enabled: isOpen && !!patient?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch casos de representados (dependientes)
  const { data: dependentsCases, isLoading: isLoadingDependentsCases, refetch: refetchDependentsCases } = useQuery({
    queryKey: ['dependents-cases', patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      
      try {
        // Obtener todos los dependientes del paciente responsable
        const dependents = await getDependentsByResponsable(patient.id);
        
        if (!dependents || dependents.length === 0) {
          return [];
        }

        // Obtener casos de todos los dependientes
        const allCases: (MedicalCaseWithPatient & { dependienteNombre: string; dependienteId: string })[] = [];
        
        for (const dep of dependents) {
          if (dep.dependiente?.id) {
            const cases = await getCasesByPatientIdWithInfo(dep.dependiente.id);
            // Agregar información del dependiente a cada caso
            const casesWithDependent = cases.map(case_ => ({
              ...case_,
              dependienteNombre: dep.dependiente?.nombre || 'Desconocido',
              dependienteId: dep.dependiente.id,
            }));
            allCases.push(...casesWithDependent);
          }
        }

        // Ordenar por fecha más reciente
        return allCases.sort((a, b) => {
          const dateA = new Date(a.created_at || a.date).getTime();
          const dateB = new Date(b.created_at || b.date).getTime();
          return dateB - dateA;
        });
      } catch (error) {
        console.error('Error obteniendo casos de dependientes:', error);
        return [];
      }
    },
    enabled: isOpen && !!patient?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Realtime: actualizar automáticamente el historial del paciente - usando nueva estructura
  useEffect(() => {
    if (!isOpen || !patient?.id) return;

    const channel = supabase
      .channel(`realtime-patient-history-${patient.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medical_records_clean',
          filter: `patient_id=eq.${patient.id}`,
        },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, patient?.id, refetch]);

  // Filter cases based on search term - usando nueva estructura
  const filteredCases = React.useMemo(() => {
    if (!data) return [];

    if (!searchTerm) return data;

    const searchLower = searchTerm.toLowerCase();
    return data.filter(
      (caseItem: MedicalCaseWithPatient) =>
        (caseItem.code?.toLowerCase() || '').includes(searchLower) ||
        (caseItem.exam_type?.toLowerCase() || '').includes(searchLower) ||
        (caseItem.treating_doctor?.toLowerCase() || '').includes(searchLower) ||
        (caseItem.branch?.toLowerCase() || '').includes(searchLower) ||
        (caseItem.payment_status?.toLowerCase() || '').includes(searchLower),
    );
  }, [data, searchTerm]);

  // Filter casos de representados based on search term
  const filteredDependentsCases = React.useMemo(() => {
    if (!dependentsCases) return [];

    if (!searchTermRepresentados) return dependentsCases;

    const searchLower = searchTermRepresentados.toLowerCase();
    return dependentsCases.filter(
      (caseItem: MedicalCaseWithPatient & { dependienteNombre: string }) =>
        (caseItem.code?.toLowerCase() || '').includes(searchLower) ||
        (caseItem.exam_type?.toLowerCase() || '').includes(searchLower) ||
        (caseItem.treating_doctor?.toLowerCase() || '').includes(searchLower) ||
        (caseItem.branch?.toLowerCase() || '').includes(searchLower) ||
        (caseItem.payment_status?.toLowerCase() || '').includes(searchLower) ||
        (caseItem.dependienteNombre?.toLowerCase() || '').includes(searchLower),
    );
  }, [dependentsCases, searchTermRepresentados]);

  // Funciones para manejar selección de casos (después de filteredCases)
  const toggleCaseSelection = (caseId: string) => {
    setSelectedCases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredCases) return;

    const approvedCases = filteredCases.filter(
      (caseItem) => caseItem.doc_aprobado === 'aprobado',
    );

    if (selectedCases.size === approvedCases.length) {
      // Deseleccionar todos
      setSelectedCases(new Set());
    } else {
      // Seleccionar todos los aprobados
      const allApprovedIds = new Set(
        approvedCases.map((caseItem) => caseItem.id),
      );
      setSelectedCases(allApprovedIds);
    }
  };

  // Función para descargar múltiples PDFs en un ZIP
  const handleDownloadMultiplePDFs = async () => {
    if (selectedCases.size === 0) {
      toast({
        title: '⚠️ No hay casos seleccionados',
        description: 'Por favor selecciona al menos un caso para descargar.',
        variant: 'destructive',
      });
      return;
    }

    // Filtrar solo casos aprobados y que están en la selección
    const casesToDownload =
      filteredCases?.filter(
        (caseItem) =>
          selectedCases.has(caseItem.id) &&
          caseItem.doc_aprobado === 'aprobado',
      ) || [];

    if (casesToDownload.length === 0) {
      toast({
        title: '⚠️ No hay casos válidos',
        description:
          'Los casos seleccionados deben estar aprobados para poder descargar sus PDFs.',
        variant: 'destructive',
      });
      return;
    }

    setIsDownloadingMultiple(true);
    setDownloadProgress({ current: 0, total: casesToDownload.length });

    const zip = new JSZip();
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      toast({
        title: '📦 Preparando ZIP...',
        description: `Obteniendo ${casesToDownload.length} PDF${
          casesToDownload.length > 1 ? 's' : ''
        } para el archivo ZIP.`,
      });

      // Obtener todos los PDFs en paralelo
      const pdfPromises = casesToDownload.map(async (caseItem, index) => {
        try {
          setDownloadProgress({
            current: index + 1,
            total: casesToDownload.length,
          });

          const pdfResult = await getPDFBlob(caseItem);

          if (pdfResult) {
            // Agregar al ZIP con nombre de archivo único
            zip.file(pdfResult.filename, pdfResult.blob);
            successCount++;
            return { success: true, code: pdfResult.caseCode };
          } else {
            errorCount++;
            const errorMsg = `No se pudo obtener PDF para caso ${
              caseItem.code || caseItem.id
            }`;
            errors.push(errorMsg);
            return {
              success: false,
              code: caseItem.code || caseItem.id || '',
              error: errorMsg,
            };
          }
        } catch (error) {
          errorCount++;
          const errorMsg = `Error obteniendo PDF para caso ${
            caseItem.code || caseItem.id
          }: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          errors.push(errorMsg);
          console.error(errorMsg, error);
          return {
            success: false,
            code: caseItem.code || caseItem.id || '',
            error: errorMsg,
          };
        }
      });

      // Esperar a que todos los PDFs se obtengan
      await Promise.all(pdfPromises);

      if (successCount === 0) {
        toast({
          title: '❌ Error en la descarga',
          description:
            'No se pudo obtener ningún PDF. Por favor intenta de nuevo.',
          variant: 'destructive',
        });
        return;
      }

      // Generar el ZIP
      toast({
        title: '📦 Generando archivo ZIP...',
        description: `Comprimiendo ${successCount} PDF${
          successCount > 1 ? 's' : ''
        }...`,
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Crear nombre del archivo ZIP con fecha
      const patientName = patient?.nombre
        ?.normalize('NFD')
        ?.replace(/[\u0300-\u036f]/g, '')
        ?.replace(/[^a-zA-Z0-9\s]/g, '')
        ?.replace(/\s+/g, '_')
        ?.trim();

      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const zipFilename = `Casos_${patientName}_${dateStr}.zip`;

      // Descargar el ZIP
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Mostrar resultado final
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: '✅ ZIP descargado correctamente',
          description: `Se descargaron ${successCount} PDF${
            successCount > 1 ? 's' : ''
          } en el archivo ZIP.`,
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: '⚠️ ZIP descargado parcialmente',
          description: `Se descargaron ${successCount} PDF${
            successCount > 1 ? 's' : ''
          } correctamente, pero ${errorCount} fallaron. Revisa la consola para más detalles.`,
          variant: 'destructive',
        });
        console.warn('Errores en descarga múltiple:', errors);
      }
    } catch (error) {
      console.error('Error creando ZIP:', error);
      toast({
        title: '❌ Error',
        description:
          'Hubo un problema al crear el archivo ZIP. Por favor intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingMultiple(false);
      setDownloadProgress({ current: 0, total: 0 });
      clearSelection();
    }
  };

  // Función para enviar emails a múltiples casos
  const handleSendMultipleEmails = async () => {
    if (selectedCases.size === 0) {
      toast({
        title: '⚠️ No hay casos seleccionados',
        description: 'Por favor selecciona al menos un caso para enviar.',
        variant: 'destructive',
      });
      return;
    }

    if (!patient?.email) {
      toast({
        title: '⚠️ Sin email',
        description: 'El paciente no tiene un email registrado.',
        variant: 'destructive',
      });
      return;
    }

    // Filtrar solo casos aprobados y que están en la selección
    const casesToEmail =
      filteredCases?.filter(
        (caseItem) =>
          selectedCases.has(caseItem.id) &&
          caseItem.doc_aprobado === 'aprobado',
      ) || [];

    if (casesToEmail.length === 0) {
      toast({
        title: '⚠️ No hay casos válidos',
        description:
          'Los casos seleccionados deben estar aprobados para poder enviar sus PDFs por email.',
        variant: 'destructive',
      });
      return;
    }

    // Guardar los casos pendientes y abrir modal
    setPendingEmailCases(casesToEmail);
    setIsSendEmailModalOpen(true);
  };

  const handleConfirmSendMultipleEmails = async (emails: {
    to: string;
    cc: string[];
    bcc: string[];
  }) => {
    const casesToEmail = pendingEmailCases;

    setIsSendingEmails(true);
    setEmailProgress({ current: 0, total: casesToEmail.length });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      toast({
        title: '📧 Enviando emails...',
        description: `Enviando ${casesToEmail.length} informe${
          casesToEmail.length > 1 ? 's' : ''
        } por correo electrónico.`,
      });

      // Enviar todos los emails en secuencia
      for (let i = 0; i < casesToEmail.length; i++) {
        const caseItem = casesToEmail[i];
        
        try {
          setEmailProgress({
            current: i + 1,
            total: casesToEmail.length,
          });

          // Verificar que el PDF esté generado
          if (!caseItem.informepdf_url) {
            throw new Error('PDF no disponible');
          }

          // Enviar email usando send-email.js
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              patientEmail: emails.to,
              patientName: patient?.nombre,
              caseCode: caseItem.code || 'N/A',
              pdfUrl: caseItem.informepdf_url,
              laboratory_id: caseItem.laboratory_id || laboratory?.id,
              cc: emails.cc,
              bcc: emails.bcc,
            }),
          });

          if (!response.ok) {
            throw new Error('Error al enviar email');
          }

          // Marcar como enviado en la base de datos
          await supabase
            .from('medical_records_clean')
            .update({ email_sent: true })
            .eq('id', caseItem.id);

          successCount++;
        } catch (error) {
          console.error(`Error enviando email para caso ${caseItem.code}:`, error);
          errorCount++;
          errors.push(`Caso ${caseItem.code || 'N/A'}`);
        }
      }

      // Mostrar resultado final
      const recipientCount = 1 + emails.cc.length + emails.bcc.length;
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: '✅ Emails enviados correctamente',
          description: `Se enviaron ${successCount} informe${
            successCount > 1 ? 's' : ''
          } a ${recipientCount} destinatario${recipientCount > 1 ? 's' : ''}.`,
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: '⚠️ Emails enviados parcialmente',
          description: `Se enviaron ${successCount} informe${
            successCount > 1 ? 's' : ''
          } correctamente, pero ${errorCount} fallaron.`,
          variant: 'destructive',
        });
        console.warn('Errores en envío múltiple:', errors);
      } else {
        toast({
          title: '❌ Error',
          description: 'No se pudo enviar ningún email. Por favor intenta de nuevo.',
          variant: 'destructive',
        });
      }

      // Cerrar modal
      setIsSendEmailModalOpen(false);
      setPendingEmailCases([]);

      // Refrescar los datos
      refetch();
    } catch (error) {
      console.error('Error enviando emails:', error);
      toast({
        title: '❌ Error',
        description:
          'Hubo un problema al enviar los emails. Por favor intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmails(false);
      setEmailProgress({ current: 0, total: 0 });
      clearSelection();
    }
  };

  const handleSendAllEmails = () => {
    // Obtener casos aprobados del paciente
    const approvedCases = filteredCases?.filter(
      (c) => c.doc_aprobado === 'aprobado' && c.informepdf_url
    ) || [];

    if (approvedCases.length === 0) {
      toast({
        title: '⚠️ Sin casos disponibles',
        description: 'No hay casos aprobados con PDF disponible para enviar.',
        variant: 'destructive',
      });
      return;
    }

    if (!patient?.email) {
      toast({
        title: '⚠️ Sin email',
        description: 'El paciente no tiene un email registrado.',
        variant: 'destructive',
      });
      return;
    }

    // Guardar los casos pendientes y abrir modal
    setPendingEmailCases(approvedCases);
    setIsSendEmailModalOpen(true);
  };

  // Limpiar selección cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedCases(new Set());
    }
  }, [isOpen]);

  // Get status color
  const getStatusColor = (status: string) => {
    const normalized = (status || '').toString().trim().toLowerCase();
    switch (normalized) {
      case 'pagado':
      case 'completado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'incompleto':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    }
  };

  if (!patient) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {!isEditing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className='fixed inset-0 bg-black/50 z-[99999998]'
            />
          )}

          {/* Modal */}
          {!isEditing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className='fixed inset-0 z-[99999999] flex items-center justify-center p-4'
              onClick={onClose}
            >
              <div
                className='bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-input'
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className='sticky top-0 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-4 sm:p-6 z-10 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div>
                        <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                          Historial Médico
                        </h2>
                      </div>
                      <p className='hidden sm:block text-sm text-gray-600 dark:text-gray-400 mt-1'>
                        Todos los casos registrados para este paciente
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className='p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none'
                    >
                      <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className='flex-1 overflow-hidden flex flex-col'>
                  {/* Patient Info */}
                  <div className='p-4 sm:p-6 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] flex-shrink-0'>
                    <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
                      <div className='flex items-center gap-3'>
                        <div className='p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full'>
                          <User className='h-6 w-6 text-blue-600 dark:text-blue-400' />
                        </div>
                        <div>
                          <h3 className='flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-gray-100'>
                            {patient.nombre}{' '}
                            <button
                              onClick={editPatient}
                              className='text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 cursor-pointer'
                            >
                              <UserPen className='size-5 cursor-pointer' />
                            </button>
                          </h3>
                          <p className='text-sm text-gray-600 dark:text-gray-400'>
                            {isRepresentado && responsableData?.responsable ? (
                              <>
                                🐾 Representado por: {responsableData.responsable.nombre} - {responsableData.responsable.cedula || 'Sin cédula'}
                                {patient.gender && (
                                  <span className='ml-3'>
                                    • {patient.gender}
                                  </span>
                                )}
                                {(() => {
                                  // Si hay edad, mostrarla
                                  if (patient.edad) {
                                    return (
                                      <span className='ml-3'>
                                        • {patient.edad}
                                      </span>
                                    );
                                  }
                                  // Si no hay edad pero hay fecha_nacimiento, calcularla
                                  const calculatedAge = calculateAgeFromFechaNacimiento(
                                    patient.fecha_nacimiento
                                  );
                                  if (calculatedAge) {
                                    return (
                                      <span className='ml-3'>
                                        • {calculatedAge}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </>
                            ) : (
                              <>
                                {patient.cedula || 'No disponible'}
                                {patient.gender && (
                                  <span className='ml-3'>
                                    • {patient.gender}
                                  </span>
                                )}
                                {(() => {
                                  // Si hay edad, mostrarla
                                  if (patient.edad) {
                                    return (
                                      <span className='ml-3'>
                                        • {patient.edad}
                                      </span>
                                    );
                                  }
                                  // Si no hay edad pero hay fecha_nacimiento, calcularla
                                  const calculatedAge = calculateAgeFromFechaNacimiento(
                                    patient.fecha_nacimiento
                                  );
                                  if (calculatedAge) {
                                    return (
                                      <span className='ml-3'>
                                        • {calculatedAge}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 sm:ml-auto w-full sm:w-auto'>
                        <div className='flex items-center gap-1 text-sm w-full sm:w-auto'>
                          {patient.telefono && (
                            <button
                              onClick={() => {
                                const phoneNumber =
                                  patient.telefono?.replace(/\D/g, '') || '';
                                const message = encodeURIComponent(
                                  'Hola, me comunico desde el sistema médico. ¿Cómo está usted?',
                                );
                                const whatsappUrl = `https://api.whatsapp.com/send/?phone=${phoneNumber}&text=${message}&type=phone_number&app_absent=0`;
                                window.open(whatsappUrl, '_blank');
                              }}
                              className='flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 transition-all duration-200 cursor-pointer group w-full sm:w-auto justify-start'
                              title='Enviar mensaje por WhatsApp'
                            >
                              <WhatsAppIcon className='h-4 w-4 text-gray-500 group-hover:text-green-600 transition-colors duration-200' />
                              <span className='text-sm font-medium'>
                                {patient.telefono}
                              </span>
                            </button>
                          )}
                        </div>

                        {patient.email && (
                          <button
                            onClick={handleSendAllEmails}
                            disabled={isSendingEmails}
                            className='flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all duration-200 cursor-pointer group w-full sm:w-auto justify-start disabled:opacity-50 disabled:cursor-not-allowed'
                            title='Enviar todos los informes por correo'
                          >
                            {isSendingEmails ? (
                              <>
                                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 group-hover:border-blue-600' />
                                <span className='text-sm font-medium'>
                                  Enviando ({emailProgress.current}/{emailProgress.total})...
                                </span>
                              </>
                            ) : (
                              <>
                                <Mail className='h-4 w-4 text-gray-500 group-hover:text-blue-600 transition-colors duration-200' />
                                <span className='text-sm font-medium'>
                                  {patient.email}
                                </span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {isImagenologia && (
                        <div className='flex items-center gap-2 ml-2'>
                          <Button
                            variant='outline'
                            onClick={editPatient}
                            title='Editar URL de imagen'
                          >
                            <Eye className='w-4 h-4 mr-2' />
                            Editar URL de Imagen
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className='flex-1 overflow-hidden flex flex-col min-h-0 h-full'>
                    <Tabs
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className='w-full h-full flex flex-col overflow-hidden'
                    >
                      <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0'>
                        <TabsList className={`grid w-full gap-5 ${laboratory?.features?.hasTriaje ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          <TabsTrigger
                            value='cases'
                            className='flex items-center gap-2'
                          >
                            <FileText className='h-4 w-4' />
                            <span className='hidden md:inline'>Historial de Casos</span>
                            <span className='md:hidden'>Casos</span>
                          </TabsTrigger>
                          <TabsTrigger
                            value='representados'
                            className='flex items-center gap-2'
                          >
                            <Users className='h-4 w-4' />
                            <span className='hidden md:inline'>Casos de Representados</span>
                            <span className='md:hidden'>Representados</span>
                          </TabsTrigger>
                          {laboratory?.features?.hasTriaje && (
                            <TabsTrigger
                              value='triage'
                              className='flex items-center gap-2'
                            >
                              <Activity className='h-4 w-4' />
                              <span className='hidden md:inline'>Historia Clínica</span>
                              <span className='md:hidden'>Historias</span>
                            </TabsTrigger>
                          )}
                        </TabsList>
                      </div>

                      {/* Tab: Historial de Casos */}
                      <TabsContent
                        value='cases'
                        className='mt-0 flex-1 overflow-hidden flex flex-col min-h-0'
                      >
                        {/* Search and Filters */}
                        <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0'>
                          <div className='flex flex-col sm:flex-row gap-3'>
                            <div className='relative flex-1'>
                              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                              <Input
                                type='text'
                                placeholder='Buscar por código, tipo, médico...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className='pl-10'
                              />
                            </div>
                            {filteredCases && filteredCases.length > 0 && (
                              <div className='flex gap-2'>
                                <Button
                                  variant='outline'
                                  onClick={toggleSelectAll}
                                  disabled={
                                    isDownloadingMultiple ||
                                    isGeneratingPDF ||
                                    isSaving
                                  }
                                >
                                  {selectedCases.size ===
                                  filteredCases.filter(
                                    (c) => c.doc_aprobado === 'aprobado',
                                  ).length ? (
                                    <>
                                      <Square className='h-4 w-4 mr-2' />
                                      Deseleccionar todos
                                    </>
                                  ) : (
                                    <>
                                      <CheckSquare className='h-4 w-4 mr-2' />
                                      Seleccionar todos
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant='default'
                                  onClick={handleDownloadMultiplePDFs}
                                  disabled={
                                    selectedCases.size === 0 ||
                                    isDownloadingMultiple ||
                                    isSendingEmails ||
                                    isGeneratingPDF ||
                                    isSaving
                                  }
                                >
                                  {isDownloadingMultiple ? (
                                    <>
                                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white sm:mr-2'></div>
                                      <span className='hidden sm:inline'>
                                        Descargando ({downloadProgress.current}/
                                        {downloadProgress.total})...
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className='h-4 w-4 sm:mr-2' />
                                      <span className='hidden sm:inline'>
                                        {selectedCases.size > 0 ? (
                                          <>Descargar ({selectedCases.size})</>
                                        ) : (
                                          <>Descargar</>
                                        )}
                                      </span>
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant='default'
                                  onClick={handleSendMultipleEmails}
                                  disabled={
                                    selectedCases.size === 0 ||
                                    isDownloadingMultiple ||
                                    isSendingEmails ||
                                    isGeneratingPDF ||
                                    isSaving ||
                                    !patient?.email
                                  }
                                  className='bg-blue-600 hover:bg-blue-700'
                                >
                                  {isSendingEmails ? (
                                    <>
                                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white sm:mr-2'></div>
                                      <span className='hidden sm:inline'>
                                        Enviando ({emailProgress.current}/
                                        {emailProgress.total})...
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Mail className='h-4 w-4 sm:mr-2' />
                                      <span className='hidden sm:inline'>
                                        {selectedCases.size > 0 ? (
                                          <>Enviar Email ({selectedCases.size})</>
                                        ) : (
                                          <>Enviar Email</>
                                        )}
                                      </span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cases List */}
                        <div className='flex-1 overflow-y-auto p-4 min-h-0 h-full'>
                          {isLoading ? (
                            <div className='flex items-center justify-center py-12'>
                              <div className='flex items-center gap-3'>
                                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                                <span className='text-lg text-gray-700 dark:text-gray-300'>
                                  Cargando casos...
                                </span>
                              </div>
                            </div>
                          ) : error ? (
                            <div className='text-center py-12'>
                              <div className='text-red-500 dark:text-red-400'>
                                <p className='text-lg font-medium'>
                                  Error al cargar los casos
                                </p>
                                <p className='text-sm mt-2'>
                                  Verifica tu conexión a internet o contacta al
                                  administrador
                                </p>
                              </div>
                              {searchTerm && (
                                <Button
                                  onClick={() => setSearchTerm('')}
                                  variant='outline'
                                  className='mt-4'
                                >
                                  Limpiar búsqueda
                                </Button>
                              )}
                            </div>
                          ) : filteredCases.length === 0 ? (
                            <div className='text-center py-12'>
                              <div className='text-gray-500 dark:text-gray-400'>
                                <FileText className='h-12 w-12 mx-auto mb-4 opacity-50' />
                                <p className='text-lg font-medium'>
                                  No se encontraron casos
                                </p>
                                <p className='text-sm mt-2'>
                                  {searchTerm
                                    ? 'No hay casos que coincidan con tu búsqueda'
                                    : 'Este paciente no tiene casos registrados'}
                                </p>
                              </div>
                              {searchTerm && (
                                <Button
                                  onClick={() => setSearchTerm('')}
                                  variant='outline'
                                  className='mt-4'
                                >
                                  Limpiar búsqueda
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className='space-y-4'>
                              {filteredCases.map(
                                (caseItem: MedicalCaseWithPatient) => (
                                  <div
                                    key={caseItem.id}
                                    className={`bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-primary/10 dark:hover:shadow-primary/20 hover:border-primary/50 hover:bg-white/80 dark:hover:bg-background/50 hover:scale-[1.01] ${
                                      selectedCases.has(caseItem.id)
                                        ? 'border-primary border-2'
                                        : 'border-input'
                                    }`}
                                  >
                                      <div className='flex flex-col sm:flex-row sm:items-center gap-3 mb-3'>
                                        <div className='flex items-center gap-2'>
                                          {caseItem.doc_aprobado ===
                                            'aprobado' && (
                                            <Checkbox
                                              checked={selectedCases.has(
                                                caseItem.id,
                                              )}
                                              onCheckedChange={() =>
                                                toggleCaseSelection(caseItem.id)
                                              }
                                              disabled={
                                                isDownloadingMultiple ||
                                                isGeneratingPDF ||
                                                isSaving
                                              }
                                              className='mr-1'
                                            />
                                          )}
                                          {caseItem.code && (
                                            <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'>
                                              {caseItem.code}
                                            </span>
                                          )}
                                          {!isSpt && (
                                            <span
                                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                                caseItem.payment_status,
                                              )}`}
                                            >
                                              {caseItem.payment_status}
                                            </span>
                                          )}
                                        </div>

                                        <div className='sm:ml-auto text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1'>
                                          <Calendar className='h-4 w-4' />
                                          {format(
                                            new Date(
                                              caseItem.created_at ||
                                                caseItem.date,
                                            ),
                                            'dd/MM/yyyy',
                                            { locale: es },
                                          )}
                                        </div>
                                      </div>

                                      {/* Primera fila: Tipo de Examen, Médico Tratante, Sede, Imagen, Acciones */}
                                      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-3'>
                                        <div>
                                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                                            Tipo de Examen
                                          </p>
                                          <p className='text-sm font-medium'>
                                            {caseItem.exam_type}
                                          </p>
                                        </div>

                                        <div>
                                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                                            Médico Tratante
                                          </p>
                                          <p className='text-sm font-medium'>
                                            {caseItem.treating_doctor}
                                          </p>
                                        </div>

                                        <div>
                                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                                            Sede
                                          </p>
                                          <div className='mt-1'>
                                            <BranchBadge
                                              branch={caseItem.branch}
                                            />
                                          </div>
                                        </div>

                                        {/* Imagen del caso */}
                                        <div>
                                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                                            Imagen
                                          </p>
                                          <div className='mt-1'>
                                            <ImageButton imageUrl={(caseItem as any).image_url} />
                                          </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className='flex gap-2 items-center justify-center sm:justify-start md:justify-center'>
                                          <Button
                                            onClick={() =>
                                              handleCheckAndDownloadPDF(
                                                caseItem,
                                              )
                                            }
                                            disabled={
                                              isGeneratingPDF ||
                                              isSaving ||
                                              caseItem.doc_aprobado !==
                                                'aprobado' ||
                                              selectedCases.size > 0 ||
                                              isDownloadingMultiple
                                            }
                                          >
                                            {isGeneratingPDF || isSaving ? (
                                              <>
                                                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                                                Generando...
                                              </>
                                            ) : (
                                              <>
                                                <Download className='h-4 w-4 mr-2' />
                                                PDF
                                              </>
                                            )}
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              setPreviewingCaseId(caseItem.id)
                                            }
                                            disabled={
                                              isSaving ||
                                              !caseItem.informepdf_url ||
                                              caseItem.doc_aprobado !==
                                                'aprobado'
                                            }
                                          >
                                            <Eye className='w-4 h-4' />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Resto de campos */}
                                      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 auto-rows-min'>
                                        {/* Ocultar Monto Total para SPT */}
                                        {!isSpt && (
                                          <div>
                                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                                              Monto Total
                                            </p>
                                            <p className='text-sm font-medium'>
                                              {formatCurrency(
                                                caseItem.total_amount,
                                              )}
                                            </p>
                                          </div>
                                        )}

                                        {/* Ocultar Tipo de Muestra para SPT */}
                                        {!isSpt && (
                                          <div>
                                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                                              Tipo de Muestra
                                            </p>
                                            <p className='text-sm font-medium'>
                                              {caseItem.sample_type}
                                            </p>
                                          </div>
                                        )}

                                        {/* Ocultar Procedencia para SPT */}
                                        {!isSpt && (
                                          <div>
                                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                                              Procedencia
                                            </p>
                                            <p className='text-sm font-medium'>
                                              {caseItem.origin}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {caseItem.diagnostico && (
                                        <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700'>
                                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                                            Diagnóstico
                                          </p>
                                          <p className='text-sm mt-1'>
                                            {caseItem.diagnostico}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Tab: Casos de Representados */}
                      <TabsContent
                        value='representados'
                        className='mt-0 flex-1 overflow-hidden flex flex-col min-h-0'
                      >
                        {/* Search */}
                        <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0'>
                          <div className='relative flex-1'>
                            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                            <Input
                              type='text'
                              placeholder='Buscar por código, tipo, médico, representado...'
                              value={searchTermRepresentados}
                              onChange={(e) => setSearchTermRepresentados(e.target.value)}
                              className='pl-10'
                            />
                          </div>
                        </div>

                        {/* Cases List */}
                        <div className='flex-1 overflow-y-auto p-4 min-h-0 h-full'>
                          {isLoadingDependentsCases ? (
                            <div className='flex items-center justify-center py-12'>
                              <div className='flex items-center gap-3'>
                                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                                <span className='text-lg text-gray-700 dark:text-gray-300'>
                                  Cargando casos de representados...
                                </span>
                              </div>
                            </div>
                          ) : error ? (
                            <div className='text-center py-12'>
                              <p className='text-red-500 dark:text-red-400'>
                                Error al cargar casos de representados
                              </p>
                            </div>
                          ) : !filteredDependentsCases || filteredDependentsCases.length === 0 ? (
                            <div className='text-center py-12'>
                              <Users className='w-16 h-16 mx-auto text-gray-400 mb-4' />
                              <p className='text-gray-500 dark:text-gray-400'>
                                {dependentsCases && dependentsCases.length === 0
                                  ? 'Este paciente no tiene representados o no hay casos registrados para sus representados.'
                                  : 'No se encontraron casos que coincidan con la búsqueda.'}
                              </p>
                            </div>
                          ) : (
                            <div className='space-y-4'>
                              {filteredDependentsCases.map((caseItem: MedicalCaseWithPatient & { dependienteNombre: string; dependienteId: string }) => (
                                <div
                                  key={caseItem.id}
                                  className='bg-white dark:bg-background border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow'
                                >
                                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                                    {/* Representado */}
                                    <div className='md:col-span-1'>
                                      <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                        Representado
                                      </p>
                                      <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                                        {caseItem.dependienteNombre}
                                      </p>
                                    </div>

                                    {/* Código y Tipo */}
                                    <div>
                                      <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                        Código
                                      </p>
                                      <p className='text-sm font-medium'>
                                        {caseItem.code || 'Sin código'}
                                      </p>
                                    </div>

                                    <div>
                                      <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                        Tipo de Examen
                                      </p>
                                      <p className='text-sm font-medium'>
                                        {caseItem.exam_type}
                                      </p>
                                    </div>

                                    <div>
                                      <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                        Fecha
                                      </p>
                                      <p className='text-sm font-medium'>
                                        {format(new Date(caseItem.date), 'dd/MM/yyyy', { locale: es })}
                                      </p>
                                    </div>

                                    {/* Médico y Sede */}
                                    <div>
                                      <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                        Médico Tratante
                                      </p>
                                      <p className='text-sm font-medium truncate'>
                                        {caseItem.treating_doctor}
                                      </p>
                                    </div>

                                    <div>
                                      <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                        Sede
                                      </p>
                                      <BranchBadge branch={caseItem.branch} className='text-xs' />
                                    </div>

                                    {/* Estado de Pago */}
                                    {!isSpt && (
                                      <div>
                                        <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                          Estado de Pago
                                        </p>
                                        <span
                                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            caseItem.payment_status === 'Pagado'
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                          }`}
                                        >
                                          {caseItem.payment_status}
                                        </span>
                                      </div>
                                    )}

                                    {/* Monto (si no es SPT) */}
                                    {!isSpt && (
                                      <div>
                                        <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                          Monto Total
                                        </p>
                                        <p className='text-sm font-medium'>
                                          {formatCurrency(caseItem.total_amount)}
                                        </p>
                                      </div>
                                    )}

                                    {/* Acciones */}
                                    <div className='md:col-start-4 md:row-start-1 md:row-span-2 sm:col-span-2 col-span-1 flex gap-2 items-center justify-center'>
                                      <Button
                                        onClick={() =>
                                          handleCheckAndDownloadPDF(caseItem)
                                        }
                                        disabled={
                                          isGeneratingPDF ||
                                          isSaving ||
                                          caseItem.doc_aprobado !== 'aprobado' ||
                                          selectedCases.size > 0 ||
                                          isDownloadingMultiple
                                        }
                                      >
                                        {isGeneratingPDF || isSaving ? (
                                          <>
                                            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                                            Generando...
                                          </>
                                        ) : (
                                          <>
                                            <Download className='h-4 w-4 mr-2' />
                                            PDF
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        onClick={() =>
                                          setPreviewingCaseId(caseItem.id)
                                        }
                                        disabled={
                                          isSaving ||
                                          !caseItem.informepdf_url ||
                                          caseItem.doc_aprobado !== 'aprobado'
                                        }
                                      >
                                        <Eye className='w-4 h-4' />
                                      </Button>
                                    </div>
                                  </div>

                                  {caseItem.diagnostico && (
                                    <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700'>
                                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                                        Diagnóstico
                                      </p>
                                      <p className='text-sm mt-1'>
                                        {caseItem.diagnostico}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Tab: Datos de Historia Clínica */}
                      <TabsContent
                        value='triage'
                        className='mt-0 flex-1 overflow-hidden flex flex-col min-h-0'
                      >
                        <div className='flex-1 overflow-y-auto p-4 min-h-0 h-full'>
                          <TriageHistoryTab
                            patientId={patient?.id || ''}
                            isOpen={isOpen}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Render EditPatientInfoModal outside the history modal to prevent z-index issues */}
          {isEditing && (
            <EditPatientInfoModal
              isOpen={isEditing}
              onClose={closeEdit}
              patient={patient}
            />
          )}

          {/* Modal de Preview del PDF - Fuera del map para que sea único */}
          <Dialog
            open={previewingCaseId !== null}
            onOpenChange={(open) => {
              if (!open) setPreviewingCaseId(null);
            }}
          >
            <DialogContent className='max-w-5xl w-full h-[90vh] p-0'>
              <DialogHeader className='p-4 border-b'>
                <DialogTitle className='flex items-center gap-2'>
                  <FileText className='w-5 h-5' />
                  Vista previa del documento -{' '}
                  {(() => {
                    const case_ = filteredCases?.find((c) => c.id === previewingCaseId) ||
                                  filteredDependentsCases?.find((c) => c.id === previewingCaseId);
                    return case_?.code || 'Sin código';
                  })()}
                </DialogTitle>
              </DialogHeader>
              <div className='flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900'>
                {(() => {
                  const case_ = filteredCases?.find((c) => c.id === previewingCaseId) ||
                                filteredDependentsCases?.find((c) => c.id === previewingCaseId);
                  return case_?.informepdf_url ? (
                    <iframe
                      src={case_.informepdf_url}
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
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Send Email Modal */}
      {patient && (
        <SendEmailModal
          isOpen={isSendEmailModalOpen}
          onClose={() => {
            setIsSendEmailModalOpen(false);
            setPendingEmailCases([]);
          }}
          onSend={handleConfirmSendMultipleEmails}
          primaryEmail={patient.email || ''}
          patientName={patient.nombre || ''}
          caseCode={pendingEmailCases.length > 1 
            ? `${pendingEmailCases.length} casos` 
            : pendingEmailCases[0]?.code || ''}
          isSending={isSendingEmails}
        />
      )}
    </AnimatePresence>
  );
};

export default PatientHistoryModal;
