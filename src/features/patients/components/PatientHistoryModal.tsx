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
  Trash2,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@shared/components/ui/tabs';
import WhatsAppIcon from '@shared/components/icons/WhatsAppIcon';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { logEmailSend } from '@/services/supabase/email-logs/email-logs-service';

import type { Patient } from '@/services/supabase/patients/patients-service';
import { FeatureGuard } from '@shared/components/FeatureGuard';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { useLaboratory } from '@/app/providers/LaboratoryContext';
import SendEmailModal from '@features/cases/components/SendEmailModal';
import { getDependentsByResponsable, getResponsableByDependiente, deleteResponsibility } from '@/services/supabase/patients/responsabilidades-service';
import UnifiedCaseModal from '@features/cases/components/UnifiedCaseModal';
import { PDFButton } from '@shared/components/ui/PDFButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/components/ui/alert-dialog';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  /** Cuando true, el modal usa z-index mayor que Detalles del caso (p. ej. abierto desde página de casos) */
  elevatedZIndex?: boolean;
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
  elevatedZIndex = false,
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
  const [selectedRepresentadoId, setSelectedRepresentadoId] = useState<string | null>(null);
  const [representadoToDelete, setRepresentadoToDelete] = useState<{ responsabilidadId: string; nombre: string; dependienteId: string } | null>(null);
  const [isDeletingRepresentado, setIsDeletingRepresentado] = useState(false);

  const queryClient = useQueryClient();

  // Reset selected representado when tab changes or modal closes
  useEffect(() => {
    if (activeTab !== 'representados' || !isOpen) {
      setSelectedRepresentadoId(null);
    }
  }, [activeTab, isOpen]);
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
  const isMarihorgen = laboratory?.slug === 'marihorgen' || laboratory?.slug === 'lm';
  const getDisplayCode = (caseItem: MedicalCaseWithPatient) =>
    isMarihorgen && caseItem.exam_type === 'Inmunohistoquímica'
      ? (caseItem.owner_display_code ?? '')
      : (caseItem.code ?? '');
  const showCodeBadge = (caseItem: MedicalCaseWithPatient) =>
    isMarihorgen && caseItem.exam_type === 'Inmunohistoquímica' ? true : !!caseItem.code;

  const editPatient = () => {
    setIsEditing(true);
  };

  const closeEdit = () => {
    setIsEditing(false);
  };

  const clearSelection = () => {
    setSelectedCases(new Set());
  };

  const [selectedCaseForModal, setSelectedCaseForModal] = useState<MedicalCaseWithPatient | null>(null);

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

  // Fetch lista de representados (dependientes)
  const { data: representadosList, isLoading: isLoadingRepresentados } = useQuery({
    queryKey: ['representados-list', patient?.id],
    queryFn: async () => {
      if (!patient?.id) return [];
      
      try {
        // Obtener todos los dependientes del paciente responsable
        const dependents = await getDependentsByResponsable(patient.id);
        
        if (!dependents || dependents.length === 0) {
          return [];
        }

        // Retornar solo la lista de dependientes únicos (incluir responsabilidadId para eliminar)
        return dependents
          .filter(dep => dep.dependiente?.id)
          .map(dep => ({
            id: dep.dependiente!.id,
            responsabilidadId: dep.id,
            nombre: dep.dependiente!.nombre || 'Desconocido',
            cedula: dep.dependiente!.cedula || '',
            tipo: dep.tipo,
          }));
      } catch (error) {
        console.error('Error obteniendo lista de representados:', error);
        return [];
      }
    },
    enabled: isOpen && !!patient?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Auto-seleccionar el primer representado cuando se cargan los datos
  useEffect(() => {
    if (representadosList && representadosList.length > 0 && !selectedRepresentadoId) {
      setSelectedRepresentadoId(representadosList[0].id);
    }
  }, [representadosList, selectedRepresentadoId]);

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

  // Filter casos de representados based on selected representado
  const filteredDependentsCases = React.useMemo(() => {
    if (!dependentsCases) return [];

    if (!selectedRepresentadoId) return [];

    // Filtrar casos del representado seleccionado
    return dependentsCases.filter(
      (caseItem: MedicalCaseWithPatient & { dependienteNombre: string; dependienteId: string }) =>
        caseItem.dependienteId === selectedRepresentadoId,
    );
  }, [dependentsCases, selectedRepresentadoId]);

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

    // Filtrar solo casos aprobados que estén en la selección y tengan al menos PDF, PDF adjunto o imágenes
    const casesToEmail =
      filteredCases?.filter((caseItem) => {
        if (!selectedCases.has(caseItem.id) || caseItem.doc_aprobado !== 'aprobado') {
          return false;
        }
        
        const hasPdf = !!caseItem.informepdf_url;
        const hasUploadedPdf = !!(caseItem as any)?.uploaded_pdf_url;
        const hasImages = ((caseItem as any)?.images_urls && Array.isArray((caseItem as any).images_urls) && (caseItem as any).images_urls.length > 0) || !!(caseItem as any)?.image_url;
        
        return hasPdf || hasUploadedPdf || hasImages;
      }) || [];

    if (casesToEmail.length === 0) {
      toast({
        title: '⚠️ No hay casos válidos',
        description:
          'Los casos seleccionados deben estar aprobados y tener al menos PDF, PDF adjunto o imágenes para enviar por email.',
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

          // Obtener imágenes del caso (priorizar images_urls array)
          const caseImages = (caseItem as any).images_urls && Array.isArray((caseItem as any).images_urls) && (caseItem as any).images_urls.length > 0
            ? (caseItem as any).images_urls
            : ((caseItem as any).image_url ? [(caseItem as any).image_url] : []);

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
              uploadedPdfUrl: (caseItem as any).uploaded_pdf_url || null,
              imageUrls: caseImages,
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

          // Registrar el envío en email_send_logs
          await logEmailSend({
            case_id: caseItem.id,
            recipient_email: emails.to,
            cc_emails: emails.cc,
            bcc_emails: emails.bcc,
            laboratory_id: caseItem.laboratory_id || laboratory?.id || '',
            status: 'success',
          });

          successCount++;
        } catch (error) {
          console.error(`Error enviando email para caso ${caseItem.code}:`, error);
          
          // Registrar el error en email_send_logs
          await logEmailSend({
            case_id: caseItem.id,
            recipient_email: emails.to,
            cc_emails: emails.cc,
            bcc_emails: emails.bcc,
            laboratory_id: caseItem.laboratory_id || laboratory?.id || '',
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Error desconocido',
          });
          
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
    // Obtener casos aprobados del paciente que tengan al menos PDF, PDF adjunto o imágenes
    const approvedCases = filteredCases?.filter((c) => {
      if (c.doc_aprobado !== 'aprobado') return false;
      
      const hasPdf = !!c.informepdf_url;
      const hasUploadedPdf = !!(c as any)?.uploaded_pdf_url;
      const hasImages = ((c as any)?.images_urls && Array.isArray((c as any).images_urls) && (c as any).images_urls.length > 0) || !!(c as any)?.image_url;
      
      return hasPdf || hasUploadedPdf || hasImages;
    }) || [];

    if (approvedCases.length === 0) {
      toast({
        title: '⚠️ Sin casos disponibles',
        description: 'No hay casos aprobados con PDF, PDF adjunto o imágenes disponibles para enviar.',
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
              className={`fixed inset-0 bg-black/50 ${elevatedZIndex ? 'z-[100000000000000000]' : 'z-[99999998]'}`}
            />
          )}

          {/* Modal */}
          {!isEditing && (
            <div className={`fixed inset-0 flex items-center justify-center p-4 ${elevatedZIndex ? 'z-[100000000000000001]' : 'z-[99999999]'}`}>
              {/* Overlay de fondo con opacidad desde el inicio */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className='fixed inset-0 bg-black/50'
                onClick={onClose}
              />
              {/* Contenido del modal con animación */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className='bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-input relative z-10'
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
                                  // Calcular edad desde fecha_nacimiento si existe
                                  const calculatedAge = patient.fecha_nacimiento
                                    ? calculateAgeFromFechaNacimiento(patient.fecha_nacimiento)
                                    : null;
                                  
                                  // Si hay fecha_nacimiento, mostrar edad calculada + fecha
                                  if (patient.fecha_nacimiento && calculatedAge) {
                                    try {
                                      const fechaNac = new Date(patient.fecha_nacimiento);
                                      if (!isNaN(fechaNac.getTime())) {
                                        const fechaFormateada = format(fechaNac, 'dd/MM/yyyy', { locale: es });
                                        return (
                                          <span className='ml-3'>
                                            • {calculatedAge} ({fechaFormateada})
                                          </span>
                                        );
                                      }
                                    } catch (error) {
                                      // Si hay error formateando, mostrar solo la edad
                                      return (
                                        <span className='ml-3'>
                                          • {calculatedAge}
                                        </span>
                                      );
                                    }
                                  }
                                  
                                  // Si no hay fecha_nacimiento pero hay edad directa, mostrarla
                                  if (patient.edad) {
                                    return (
                                      <span className='ml-3'>
                                        • {patient.edad}
                                      </span>
                                    );
                                  }
                                  
                                  // Si hay fecha_nacimiento pero no se pudo calcular edad, intentar mostrar solo la fecha
                                  if (patient.fecha_nacimiento) {
                                    try {
                                      const fechaNac = new Date(patient.fecha_nacimiento);
                                      if (!isNaN(fechaNac.getTime())) {
                                        const fechaFormateada = format(fechaNac, 'dd/MM/yyyy', { locale: es });
                                        return (
                                          <span className='ml-3'>
                                            • ({fechaFormateada})
                                          </span>
                                        );
                                      }
                                    } catch (error) {
                                      // Ignorar error
                                    }
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
                                  // Calcular edad desde fecha_nacimiento si existe
                                  const calculatedAge = patient.fecha_nacimiento
                                    ? calculateAgeFromFechaNacimiento(patient.fecha_nacimiento)
                                    : null;
                                  
                                  // Si hay fecha_nacimiento, mostrar edad calculada + fecha
                                  if (patient.fecha_nacimiento && calculatedAge) {
                                    try {
                                      const fechaNac = new Date(patient.fecha_nacimiento);
                                      if (!isNaN(fechaNac.getTime())) {
                                        const fechaFormateada = format(fechaNac, 'dd/MM/yyyy', { locale: es });
                                        return (
                                          <span className='ml-3'>
                                            • {calculatedAge} ({fechaFormateada})
                                          </span>
                                        );
                                      }
                                    } catch (error) {
                                      // Si hay error formateando, mostrar solo la edad
                                      return (
                                        <span className='ml-3'>
                                          • {calculatedAge}
                                        </span>
                                      );
                                    }
                                  }
                                  
                                  // Si no hay fecha_nacimiento pero hay edad directa, mostrarla
                                  if (patient.edad) {
                                    return (
                                      <span className='ml-3'>
                                        • {patient.edad}
                                      </span>
                                    );
                                  }
                                  
                                  // Si hay fecha_nacimiento pero no se pudo calcular edad, intentar mostrar solo la fecha
                                  if (patient.fecha_nacimiento) {
                                    try {
                                      const fechaNac = new Date(patient.fecha_nacimiento);
                                      if (!isNaN(fechaNac.getTime())) {
                                        const fechaFormateada = format(fechaNac, 'dd/MM/yyyy', { locale: es });
                                        return (
                                          <span className='ml-3'>
                                            • ({fechaFormateada})
                                          </span>
                                        );
                                      }
                                    } catch (error) {
                                      // Ignorar error
                                    }
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
                                  `Hola, me comunico desde ${laboratory?.name ?? 'el laboratorio'}.`,
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
                            <span>Representados</span>
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
                                    onClick={(e) => {
                                      // Prevenir que el click se propague a los botones internos
                                      if ((e.target as HTMLElement).closest('button, input, [role="checkbox"]')) {
                                        return;
                                      }
                                      setSelectedCaseForModal(caseItem);
                                    }}
                                    className={`bg-white/60 dark:bg-background/30 backdrop-blur-[5px] border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-primary/10 dark:hover:shadow-primary/20 hover:border-primary/50 hover:bg-white/80 dark:hover:bg-background/50 hover:scale-[1.01] ${
                                      selectedCases.has(caseItem.id)
                                        ? 'border-primary border-2'
                                        : 'border-input'
                                    }`}
                                  >
                                      <div className='space-y-3 mb-3'>
                                        {/* Checkbox y Estado de Pago */}
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
                                        </div>

                                        {/* Código, Fecha y Sede en la misma línea */}
                                        <div className='grid grid-cols-3 gap-4'>
                                          <div>
                                            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                              Código
                                            </p>
                                            {showCodeBadge(caseItem) ? (
                                              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'>
                                                {getDisplayCode(caseItem) || '—'}
                                              </span>
                                            ) : (
                                              <p className='text-sm font-medium text-gray-400'>
                                                Sin código
                                              </p>
                                            )}
                                          </div>
                                          <div>
                                            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                              Fecha
                                            </p>
                                            <p className='text-sm font-medium flex items-center gap-1'>
                                              <Calendar className='h-4 w-4' />
                                              {format(
                                                new Date(
                                                  caseItem.created_at ||
                                                    caseItem.date,
                                                ),
                                                'dd/MM/yyyy',
                                                { locale: es },
                                              )}
                                            </p>
                                          </div>
                                          <div>
                                            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                              Sede
                                            </p>
                                            <div className='mt-1'>
                                              <BranchBadge branch={caseItem.branch} />
                                            </div>
                                          </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className='flex gap-2 items-center justify-start pt-2'>
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
                                          <div onClick={(e) => e.stopPropagation()}>
                                            <PDFButton
                                              pdfUrl={(caseItem as any).informepdf_url || (caseItem as any).informe_qr || null}
                                              size='sm'
                                              variant='default'
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Tab: Representados */}
                      <TabsContent
                        value='representados'
                        className='mt-0 flex-1 overflow-hidden flex flex-col min-h-0'
                      >
                        {/* Two Panel Layout */}
                        <div className='flex-1 flex overflow-hidden min-h-0'>
                          {/* Left Panel: Lista de Representados */}
                          <div className='w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden'>
                            <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0'>
                              <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                                Representados
                              </h3>
                            </div>
                            <div className='flex-1 overflow-y-auto p-2'>
                              {isLoadingRepresentados ? (
                                <div className='flex items-center justify-center py-12'>
                                  <div className='flex items-center gap-3'>
                                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                                      Cargando representados...
                                    </span>
                                  </div>
                                </div>
                              ) : !representadosList || representadosList.length === 0 ? (
                                <div className='text-center py-12'>
                                  <Users className='w-12 h-12 mx-auto text-gray-400 mb-4' />
                                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                                    Este paciente no tiene representados registrados.
                                  </p>
                                </div>
                              ) : (
                                <div className='space-y-2'>
                                  {representadosList.map((representado) => (
                                    <div
                                      key={representado.id}
                                      onClick={() => setSelectedRepresentadoId(representado.id)}
                                      className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                        selectedRepresentadoId === representado.id
                                          ? 'bg-primary text-primary-foreground shadow-md'
                                          : 'bg-white dark:bg-background border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                      }`}
                                    >
                                      <div className='min-w-0 flex-1'>
                                        <p className={`font-medium text-sm ${
                                          selectedRepresentadoId === representado.id
                                            ? 'text-primary-foreground'
                                            : 'text-gray-900 dark:text-gray-100'
                                        }`}>
                                          {representado.nombre}
                                        </p>
                                        {representado.cedula && (
                                          <p className={`text-xs mt-1 ${
                                            selectedRepresentadoId === representado.id
                                              ? 'text-primary-foreground/80'
                                              : 'text-gray-500 dark:text-gray-400'
                                          }`}>
                                            {representado.cedula}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        type='button'
                                        size='icon'
                                        variant='ghost'
                                        className={`shrink-0 h-8 w-8 ${
                                          selectedRepresentadoId === representado.id
                                            ? 'text-primary-foreground hover:bg-primary-foreground/20'
                                            : 'text-gray-500 hover:text-destructive hover:bg-destructive/10'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRepresentadoToDelete({
                                            responsabilidadId: representado.responsabilidadId,
                                            nombre: representado.nombre,
                                            dependienteId: representado.id,
                                          });
                                        }}
                                        aria-label={`Eliminar ${representado.nombre}`}
                                      >
                                        <Trash2 className='w-4 h-4' />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Panel: Casos del Representado Seleccionado (sin título) */}
                          <div className='flex-1 flex flex-col overflow-hidden'>
                            <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0' />
                            <div className='flex-1 overflow-y-auto p-4'>
                              {!selectedRepresentadoId ? (
                                <div className='text-center py-12'>
                                  <FileText className='w-16 h-16 mx-auto text-gray-400 mb-4' />
                                  <p className='text-gray-500 dark:text-gray-400'>
                                    Selecciona un representado para ver sus casos
                                  </p>
                                </div>
                              ) : isLoadingDependentsCases ? (
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
                                  <p className='text-red-500 dark:text-red-400'>
                                    Error al cargar casos
                                  </p>
                                </div>
                              ) : !filteredDependentsCases || filteredDependentsCases.length === 0 ? (
                                <div className='text-center py-12'>
                                  <FileText className='w-16 h-16 mx-auto text-gray-400 mb-4' />
                                  <p className='text-gray-500 dark:text-gray-400'>
                                    No hay casos registrados para este representado.
                                  </p>
                                </div>
                              ) : (
                                <div className='space-y-4'>
                                  {filteredDependentsCases.map((caseItem: MedicalCaseWithPatient & { dependienteNombre: string; dependienteId: string }) => (
                                    <div
                                      key={caseItem.id}
                                      onClick={(e) => {
                                        // Prevenir que el click se propague a los botones internos
                                        if ((e.target as HTMLElement).closest('button, input, [role="checkbox"]')) {
                                          return;
                                        }
                                        setSelectedCaseForModal(caseItem);
                                      }}
                                      className='bg-white dark:bg-background border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer'
                                    >
                                      <div className='space-y-3'>
                                        {/* Primera línea: Código y Fecha */}
                                        <div className='grid grid-cols-2 gap-4'>
                                          <div>
                                            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                              Código
                                            </p>
                                            {showCodeBadge(caseItem) ? (
                                              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'>
                                                {getDisplayCode(caseItem) || '—'}
                                              </span>
                                            ) : (
                                              <p className='text-sm font-medium text-gray-400'>
                                                Sin código
                                              </p>
                                            )}
                                          </div>
                                          <div>
                                            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                              Fecha
                                            </p>
                                            <p className='text-sm font-medium'>
                                              {format(new Date(caseItem.date), 'dd/MM/yyyy', { locale: es })}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Segunda línea: Sede y Botones */}
                                        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-gray-200 dark:border-gray-700'>
                                          <div className='flex-shrink-0'>
                                            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                              Sede
                                            </p>
                                            <BranchBadge branch={caseItem.branch} className='text-xs' />
                                          </div>
                                          <div className='flex gap-2 items-center'>
                                            <Button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCheckAndDownloadPDF(caseItem);
                                              }}
                                              disabled={
                                                isGeneratingPDF ||
                                                isSaving ||
                                                caseItem.doc_aprobado !== 'aprobado' ||
                                                selectedCases.size > 0 ||
                                                isDownloadingMultiple
                                              }
                                              size='sm'
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
                                            <div onClick={(e) => e.stopPropagation()}>
                                              <PDFButton
                                                pdfUrl={(caseItem as any).informepdf_url || (caseItem as any).informe_qr || null}
                                                size='sm'
                                                variant='default'
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
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
              </motion.div>
            </div>
          )}

          {/* Render EditPatientInfoModal outside the history modal to prevent z-index issues */}
          {isEditing && (
            <EditPatientInfoModal
              isOpen={isEditing}
              onClose={closeEdit}
              patient={patient}
            />
          )}

          {/* UnifiedCaseModal para ver detalles del caso */}
          <UnifiedCaseModal
            case_={selectedCaseForModal}
            isOpen={selectedCaseForModal !== null}
            onClose={() => setSelectedCaseForModal(null)}
            onSave={() => {
              refetch();
              if (refetchDependentsCases) {
                refetchDependentsCases();
              }
            }}
            onCaseSelect={() => {}} // No necesario en este contexto
          />
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

      {/* Diálogo confirmar eliminar representado */}
      <AlertDialog open={!!representadoToDelete} onOpenChange={(open) => !open && setRepresentadoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar representado?</AlertDialogTitle>
            <AlertDialogDescription>
              Se dejará de mostrar a <strong>{representadoToDelete?.nombre}</strong> como representado de este paciente.
              Los casos del representado no se eliminan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRepresentado}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!representadoToDelete) return;
                setIsDeletingRepresentado(true);
                try {
                  await deleteResponsibility(representadoToDelete.responsabilidadId);
                  if (selectedRepresentadoId === representadoToDelete.dependienteId) {
                    const remaining = representadosList?.filter((r) => r.id !== representadoToDelete.dependienteId) ?? [];
                    setSelectedRepresentadoId(remaining[0]?.id ?? null);
                  }
                  queryClient.invalidateQueries({ queryKey: ['representados-list', patient?.id] });
                  queryClient.invalidateQueries({ queryKey: ['dependents-cases', patient?.id] });
                  toast({
                    title: 'Representado eliminado',
                    description: `${representadoToDelete.nombre} ya no aparece como representado.`,
                  });
                  setRepresentadoToDelete(null);
                } catch (err) {
                  console.error('Error eliminando representado:', err);
                  toast({
                    title: 'Error',
                    description: 'No se pudo eliminar el representado. Inténtalo de nuevo.',
                    variant: 'destructive',
                  });
                } finally {
                  setIsDeletingRepresentado(false);
                }
              }}
              disabled={isDeletingRepresentado}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeletingRepresentado ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatePresence>
  );
};

export default PatientHistoryModal;
