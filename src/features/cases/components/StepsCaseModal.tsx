import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Tables } from '@shared/types/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@shared/components/ui/button';
import { supabase } from '@/services/supabase/config/config';
import {
  X,
  User,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Heart,
  Shredder,
  FileCheck,
  Download,
  Send,
} from 'lucide-react';
import {
  markCaseAsPending,
  approveCaseDocument,
  rejectCaseDocument,
  positiveCaseDocument,
  negativeCaseDocument,
} from '@/services/supabase/cases/cases';
import { useToast } from '@shared/hooks/use-toast';
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock';
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { getDownloadUrl } from '@/services/utils/download-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';

import type { Database } from '@shared/types/types';
import { useLaboratory } from '@app/providers/LaboratoryContext';

interface MedicalRecord {
  id?: string;
  full_name?: string;
  id_number?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  birth_date?: string | null;
  exam_type?: string | null;
  informacion_clinica?: string | null;
  googledocs_url?: string | null;
  informepdf_url?: string | null;
  informe_qr?: string | null;
  code?: string | null;
  pdf_en_ready?: boolean | null;
  doc_aprobado?: Database['public']['Enums']['doc_aprobado_status'];
  cito_status?: Database['public']['Enums']['cito_status_type'];
  email_sent?: boolean; // Nueva columna para indicar si el email fue enviado
}

interface StepsCaseModalProps {
  case_: MedicalRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isFullscreen?: boolean;
}

const StepsCaseModal: React.FC<StepsCaseModalProps> = ({
  case_,
  isOpen,
  onClose,
  onSuccess,
  isFullscreen = false,
}) => {
  const { laboratory } = useLaboratory();
  const GENERATE_DOC =
    laboratory?.config?.webhooks?.generateDoc ||
    import.meta.env.VITE_GENERATE_DOC_WEBHOOK;
  const GENERATE_PDF =
    laboratory?.config?.webhooks?.generatePdf ||
    import.meta.env.VITE_GENERATE_PDF_WEBHOOK;

  const [activeStep, setActiveStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { profile } = useUserProfile();
  useBodyScrollLock(isOpen);
  useGlobalOverlayOpen(isOpen);

  const isOwner = profile?.role === 'owner';
  const isResidente = profile?.role === 'residente';
  const isEmployee = profile?.role === 'employee';
  const isCitotecno = profile?.role === 'citotecno';
  const isPatologo = profile?.role === 'patologo';
  const isMedicowner = profile?.role === 'medicowner';

  const isCitoAdmin =
    profile?.role === 'residente' && case_?.exam_type === 'Citología';

  const isCitology = case_?.exam_type === 'Citología';

  const [docAprobado, setDocAprobado] = useState<
    'faltante' | 'pendiente' | 'aprobado' | 'rechazado'
  >(case_?.doc_aprobado ?? 'faltante');
  const [docUrl, setDocUrl] = useState<string | null>(
    case_?.googledocs_url ?? null,
  );

  const [citoStatus, setCitoStatus] = useState<'positivo' | 'negativo' | null>(
    case_?.cito_status ?? null,
  );

  const isPdfGenerated = case_?.informe_qr && case_.informe_qr.trim() !== '';

  const isProduction = false;

  const isNotRechazado = docAprobado !== 'rechazado';
  const isRechazado = docAprobado === 'rechazado';

  const isApproved = docAprobado === 'aprobado';

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Construir los pasos dinámicamente basado en roles y permisos
  const computedSteps = useMemo(() => {
    const stepsList = [];

    // Paso 1: Datos del paciente - Solo para empleados (no residentes)
    if (!isEmployee && !isMedicowner) {
      stepsList.push({
        id: 'patient',
        title: 'Datos',
        icon: User,
        description: 'Generar Documento',
      });
    }

    // Paso 2: Marcar como completado - Solo para empleados (no residentes)
    if (!isEmployee && !isMedicowner) {
      stepsList.push({
        id: 'complete',
        title: 'Marcar',
        icon: Shredder,
        description: 'Completar Documento',
      });
    }

    if ((isOwner || isCitotecno || isMedicowner) && isCitology) {
      stepsList.push({
        id: 'citology',
        title: 'Citología',
        icon: FileCheck,
        description: 'Evaluar Citología',
      });
    }

    if ((isCitotecno && isCitology) || isOwner || isMedicowner) {
      stepsList.push({
        id: 'approve',
        title: 'Autorizar',
        icon: FileCheck,
        description: 'Aprobar Documento',
      });
    }

    // Paso final: PDF - Siempre disponible para todos
    if (!isMedicowner) {
      stepsList.push({
        id: 'pdf',
        title: 'PDF',
        icon: Download,
        description: 'Exportar Documento',
      });
    }

    return stepsList;
  }, [isResidente, isEmployee, isCitology, isCitoAdmin]);

  // Función para determinar el paso inicial basado en el estado del documento
  const getInitialStep = () => {
    if (!isMedicowner && docAprobado === 'aprobado') {
      return computedSteps.length - 1;
    }

    if (isOwner && docAprobado === 'pendiente' && !isCitology) {
      return computedSteps.findIndex((step) => step.id === 'approve');
    }

    if ((isOwner || isCitotecno) && docAprobado === 'pendiente' && isCitology) {
      return computedSteps.findIndex((step) => step.id === 'citology');
    }

    if (
      isOwner &&
      docAprobado === 'pendiente' &&
      isCitology &&
      citoStatus === 'positivo'
    ) {
      return computedSteps.findIndex((step) => step.id === 'approve');
    }

    if (
      isCitotecno &&
      docAprobado === 'pendiente' &&
      isCitology &&
      citoStatus === 'negativo'
    ) {
      return computedSteps.findIndex((step) => step.id === 'pdf');
    }

    if ((isPatologo || isResidente) && docAprobado === 'pendiente') {
      return computedSteps.findIndex((step) => step.id === 'pdf');
    }

    if ((isPatologo || isResidente) && docAprobado === 'rechazado') {
      return computedSteps.findIndex((step) => step.id === 'patient');
    }

    return 0;
  };

  // Sincronizar estado inicial al abrir el modal
  useEffect(() => {
    if (!isOpen || !case_?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from('medical_records_clean')
        .select('doc_aprobado, googledocs_url')
        .eq('id', case_.id as string)
        .single<Pick<MedicalRecord, 'doc_aprobado' | 'googledocs_url'>>();
      if (!error && data) {
        if (data.doc_aprobado) setDocAprobado(data.doc_aprobado);
        if (typeof data.googledocs_url === 'string')
          setDocUrl(data.googledocs_url);
      }
    })();
  }, [isOpen, case_?.id]);

  // Actualizar el paso activo cuando el modal se abra y el documento esté aprobado
  useEffect(() => {
    if (isOpen) {
      const initialStep = getInitialStep();
      setActiveStep(initialStep);
    }
  }, [isOpen, docAprobado, computedSteps.length]);

  const handleNext = () => {
    if (activeStep < computedSteps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    setIsCompleting(true);

    onSuccess();
    setActiveStep(0);
    setIsCompleting(false);
    onClose();
  };

  // Realtime para sincronizar doc_aprobado y googledocs_url
  useEffect(() => {
    if (!case_?.id) return;
    const channel = supabase
      .channel(`rt-doc-aprobado-${case_.id as string}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'medical_records_clean',
          filter: `id=eq.${case_.id}`,
        },
        (
          payload: RealtimePostgresChangesPayload<
            Tables<'medical_records_clean'>
          >,
        ) => {
          const next =
            (payload?.new as Tables<'medical_records_clean'>) ?? null;
          if (next?.doc_aprobado) setDocAprobado(next.doc_aprobado);
          if (typeof next?.googledocs_url === 'string')
            setDocUrl(next.googledocs_url);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [case_?.id]);

  const handleGenerateCaseAndOpenDoc = async () => {
    if (!case_?.id) {
      toast({
        title: '❌ Error',
        description: 'No se encontró el ID del caso.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      console.log(
        '[1] Verificando si ya existe googledocs_url para el caso',
        case_.id,
      );
      const { data: initialData, error: initialError } = await supabase
        .from('medical_records_clean')
        .select('googledocs_url')
        .eq('id', case_.id)
        .single<MedicalRecord>();

      if (initialError) {
        console.error('Error al obtener URL del Documento:', initialError);
        toast({
          title: '❌ Error',
          description: 'No se pudo obtener el estado del documento.',
          variant: 'destructive',
        });
        return;
      }

      if (initialData?.googledocs_url) {
        console.log(
          '[1] Documento ya existe, abriendo:',
          initialData.googledocs_url,
        );
        setDocUrl(initialData.googledocs_url);
        window.open(initialData.googledocs_url, '_blank');
        // Ejecutar handleNext automáticamente después de abrir el documento
        setTimeout(() => {
          handleNext();
        }, 1000); // Pequeño delay para asegurar que el documento se abra
        return;
      }

      console.log('[2] No existe googledocs_url, enviando POST a n8n...');

      // Obtener el patient_id del caso
      const { data: caseData, error: caseError } = await supabase
        .from('medical_records_clean')
        .select('patient_id')
        .eq('id', case_.id)
        .single();

      if (caseError) {
        console.error('Error al obtener patient_id del caso:', caseError);
        toast({
          title: '❌ Error',
          description: 'No se pudo obtener la información del paciente.',
          variant: 'destructive',
        });
        return;
      }

      if (!caseData?.patient_id) {
        toast({
          title: '❌ Error',
          description: 'No se encontró el ID del paciente para este caso.',
          variant: 'destructive',
        });
        return;
      }

      // Verificar que la URL del webhook esté configurada
      if (!GENERATE_DOC) {
        throw new Error(
          'URL del webhook de generación de documento no configurada. Verifica las variables de entorno.',
        );
      }

      console.log('Generate Doc Webhook URL:', GENERATE_DOC);
      console.log('Patient ID:', caseData.patient_id);

      const webhookRes = await fetch(GENERATE_DOC, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          caseId: case_.id,
          patientId: caseData.patient_id,
        }),
      });

      console.log('[2] Webhook enviado. Status:', webhookRes.status);

      if (!webhookRes.ok) {
        const errorText = await webhookRes.text();
        throw new Error(
          `Error en webhook: ${webhookRes.status} - ${errorText}`,
        );
      }

      // Polling para esperar el link de Google Docs
      console.log('[3] Iniciando polling para esperar el enlace generado...');
      const maxAttempts = 10;
      const delay = 2000;
      let attempts = 0;
      let foundURL = null;

      while (attempts < maxAttempts) {
        console.log(`[3] Intento ${attempts + 1}/${maxAttempts}...`);
        await new Promise((res) => setTimeout(res, delay));

        const { data: retryData, error: retryError } = await supabase
          .from('medical_records_clean')
          .select('googledocs_url')
          .eq('id', case_.id)
          .single<MedicalRecord>();

        if (retryError) {
          console.warn(`[3] Error en intento ${attempts + 1}:`, retryError);
        }

        if (retryData?.googledocs_url) {
          console.log(
            '[3] Documento listo, abriendo:',
            retryData.googledocs_url,
          );
          foundURL = retryData.googledocs_url;
          break;
        }

        attempts++;
      }

      try {
        window.open(foundURL as string, '_blank');
        setDocUrl(foundURL as string);
        // Ejecutar handleNext automáticamente después de abrir el documento
        setTimeout(() => {
          handleNext();
        }, 1000); // Pequeño delay para asegurar que el documento se abra
      } catch (err) {
        console.error('Error al abrir el Documento:', err);
        toast({
          title: '❌ Error',
          description: 'No se pudo acceder al Documento. Intenta nuevamente.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[ERROR] handleGenerateCaseAndOpenDoc:', err);

      let errorMessage = 'Ocurrió un problema al abrir el documento.';

      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        errorMessage =
          'No se pudo conectar con el servidor n8n. Posibles causas:\n• El servidor n8n no está funcionando\n• Firewall bloqueando la conexión\n• URL del webhook incorrecta\n• Puerto 5678 cerrado o inaccesible';
      } else if (err instanceof Error && err.message.includes('SSL')) {
        errorMessage =
          'Error de certificado SSL. El servidor n8n tiene un problema de seguridad.';
      } else if (
        err instanceof Error &&
        err.message.includes('CONNECTION_RESET')
      ) {
        errorMessage =
          'El servidor n8n rechazó la conexión. Verifica que el servicio esté funcionando.';
      } else if (
        err instanceof Error &&
        err.message.includes('URL del webhook')
      ) {
        errorMessage = err.message;
      }

      toast({
        title: '❌ Error inesperado',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!case_?.id) {
      toast({
        title: '❌ Error',
        description: 'No se encontró el ID del caso.',
        variant: 'destructive',
      });
      return;
    }
    if (!docUrl) {
      toast({
        title: '❌ Documento faltante',
        description: 'Primero genera/abre el documento en el paso 1.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsSaving(true);
      const { error } = await markCaseAsPending(case_.id);
      if (error) throw error;
      setDocAprobado('pendiente');
      toast({
        title: '✅ Marcado como completado',
        description: 'Documento listo para revisión.',
      });
    } catch (err) {
      console.error('Error marcando como completado:', err);
      toast({
        title: '❌ Error',
        description: 'No se pudo marcar como completado.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!case_?.id) {
      toast({
        title: '❌ Error',
        description: 'No se encontró el ID del caso.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsSaving(true);
      const { error } = await approveCaseDocument(case_.id);
      if (error) throw error;
      setDocAprobado('aprobado');
      toast({
        title: '✅ Documento aprobado',
        description: 'Ya puedes descargar el PDF.',
      });
    } catch (err) {
      console.error('Error aprobando documento:', err);
      toast({
        title: '❌ Error',
        description: 'No se pudo aprobar el documento.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePositive = async () => {
    if (!case_?.id) {
      toast({
        title: '❌ Error',
        description: 'No se encontró el ID del caso.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsSaving(true);
      const { error } = await positiveCaseDocument(case_.id);
      if (error) throw error;
      setDocAprobado('pendiente');
      setCitoStatus('positivo');
      toast({ title: '✅ Documento positivo' });
    } catch (err) {
      console.error('Error positivando documento:', err);
      toast({
        title: '❌ Error',
        description: 'No se pudo positivar el documento.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!case_?.id) {
      toast({
        title: '❌ Error',
        description: 'No se encontró el ID del caso.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsSaving(true);
      const { error } = await rejectCaseDocument(case_.id);
      if (error) throw error;
      setDocAprobado('rechazado');
      toast({
        title: '✅ Documento rechazado',
        description: 'El documento ha sido rechazado.',
      });
    } catch (err) {
      console.error('Error rechazando documento:', err);
      toast({
        title: '❌ Error',
        description: 'No se pudo rechazar el documento.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNegative = async () => {
    if (!case_?.id) {
      toast({
        title: '❌ Error',
        description: 'No se encontró el ID del caso.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await negativeCaseDocument(case_.id);
      if (error) throw error;

      // Establecer ambos estados después de la operación exitosa
      setDocAprobado('aprobado');
      setCitoStatus('negativo');

      toast({ title: '✅ Documento negativo' });
    } catch (err) {
      console.error('Error negativando documento:', err);
      toast({
        title: '❌ Error',
        description: 'No se pudo negativizar el documento.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPDFFields = async () => {
    if (!case_?.id) {
      toast({
        title: '❌ Error',
        description: 'No se encontró el ID del caso.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      setIsGeneratingPDF(true);

      console.log('[1] Vaciando campos PDF para el caso:', case_.id);

      // Vaciar los tres campos en la base de datos
      const { error: updateError } = await supabase
        .from('medical_records_clean')
        .update({
          token: null,
          informe_qr: null,
          informepdf_url: null,
        })
        .eq('id', case_.id);

      if (updateError) {
        console.error('Error al vaciar campos PDF:', updateError);
        toast({
          title: '❌ Error',
          description: 'No se pudieron vaciar los campos del PDF.',
          variant: 'destructive',
        });
        return;
      }

      console.log('[2] Campos vaciados, enviando POST a n8n...');

      // Obtener el patient_id del caso
      const { data: caseData, error: caseError } = await supabase
        .from('medical_records_clean')
        .select('patient_id')
        .eq('id', case_.id)
        .single();

      if (caseError) {
        console.error('Error al obtener patient_id del caso:', caseError);
        toast({
          title: '❌ Error',
          description: 'No se pudo obtener la información del paciente.',
          variant: 'destructive',
        });
        return;
      }

      if (!caseData?.patient_id) {
        toast({
          title: '❌ Error',
          description: 'No se encontró el ID del paciente para este caso.',
          variant: 'destructive',
        });
        return;
      }

      const requestBody = {
        caseId: case_.id,
        patientId: caseData.patient_id,
      };

      console.log('Request body:', requestBody);

      // Verificar que la URL del webhook esté configurada
      if (!GENERATE_PDF) {
        throw new Error(
          'URL del webhook PDF no configurada. Verifica las variables de entorno.',
        );
      }

      console.log('Webhook URL:', GENERATE_PDF);
      console.log('Patient ID:', caseData.patient_id);

      const response = await fetch(GENERATE_PDF, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = await response.text();
          console.log('Error response body:', errorData);
          errorMessage += ` - ${errorData}`;
        } catch (e) {
          console.log('Could not read error response body', e);
        }

        throw new Error(errorMessage);
      }

      let responseData;
      try {
        responseData = await response.json();
        console.log('Success response:', responseData);
      } catch (e) {
        responseData = await response.text();
        console.log('Success response (text):', responseData, e);
      }

      // Mostrar mensaje de progreso
      toast({
        title: '⏳ Generando PDF...',
        description: 'El documento se está procesando. Por favor espera.',
      });

      // ⏱️ Esperar antes de intentar descargar el PDF
      let attempts = 0;
      const maxAttempts = 15; // Aumentar intentos
      let pdfUrl: string | null = null;

      while (attempts < maxAttempts) {
        const { data, error } = await supabase
          .from('medical_records_clean')
          .select('informepdf_url, token')
          .eq('id', case_.id)
          .single<MedicalRecord & { token?: string }>();

        if (error) {
          console.error('Error obteniendo informepdf_url:', error);
          break;
        }

        if (data?.informepdf_url) {
          // Usar la utilidad para determinar la URL de descarga apropiada
          pdfUrl = getDownloadUrl(
            case_.id,
            data.token || null,
            data.informepdf_url || null,
          );
          break;
        }

        // Esperar 2 segundos antes del próximo intento
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }

      if (!pdfUrl) {
        toast({
          title: '❌ PDF no generado aún',
          description:
            'El PDF no se ha generado aún. Por favor, haz clic en el botón "SI" para regenerar el documento.',
          variant: 'destructive',
        });
        return;
      }

      try {
        // Descargar el archivo usando el endpoint de descarga
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Error al descargar: ${response.status}`);
        }

        const sanitizedName =
          case_.full_name ||
          'Paciente'
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .trim();

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${case_.code}-${sanitizedName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url); // Limpiar memoria

        toast({
          title: '✅ PDF descargado',
          description: 'El documento se ha descargado correctamente.',
        });

        // Ejecutar handleNext automáticamente después de descargar el PDF
        setTimeout(() => {
          handleNext();
        }, 1500); // Aumentar delay para mejor UX
      } catch (err) {
        console.error('Error al abrir el PDF:', err);
        toast({
          title: '❌ Error',
          description: 'No se pudo acceder al PDF. Intenta nuevamente.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error en handleResetPDFFields:', error);

      let errorMessage = 'Hubo un problema al activar el flujo.';

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage =
          'No se pudo conectar con el servidor n8n. Posibles causas:\n• El servidor n8n no está funcionando\n• Firewall bloqueando la conexión\n• URL del webhook incorrecta\n• Puerto 5678 cerrado o inaccesible';
      } else if (error instanceof Error && error.message.includes('SSL')) {
        errorMessage =
          'Error de certificado SSL. El servidor n8n tiene un problema de seguridad. Contacta al administrador.';
      } else if (
        error instanceof Error &&
        error.message.includes('CONNECTION_RESET')
      ) {
        errorMessage =
          'El servidor n8n rechazó la conexión. Verifica que el servicio esté funcionando.';
      } else if (error instanceof Error && error.message.includes('CORS')) {
        errorMessage =
          'Error de configuración del servidor (CORS). Contacta al administrador.';
      } else if (error instanceof Error && error.message.includes('HTTP')) {
        errorMessage = `Error del servidor: ${error.message}`;
      } else if (
        error instanceof Error &&
        error.message.includes('URL del webhook')
      ) {
        errorMessage = error.message;
      }

      toast({
        title: '❌ Error al activar flujo',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setIsGeneratingPDF(false);
    }
  };

  const handleCheckAndDownloadPDF = async () => {
    if (!case_?.id) {
      toast({
        title: '❌ Error',
        description: 'No se encontró el ID del caso.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      setIsGeneratingPDF(true);

      // Verificar si ya existe tanto informepdf_url como informe_qr
      console.log(
        '[1] Verificando si ya existe informepdf_url e informe_qr para el caso',
        case_.id,
      );
      const { data: initialData, error: initialError } = await supabase
        .from('medical_records_clean')
        .select('informepdf_url, informe_qr, token')
        .eq('id', case_.id)
        .single<MedicalRecord & { token?: string }>();

      if (initialError) {
        console.error('Error al obtener URLs del PDF:', initialError);
        toast({
          title: '❌ Error',
          description: 'No se pudo obtener el estado del PDF.',
          variant: 'destructive',
        });
        return;
      }

      if (initialData?.informepdf_url && initialData?.informe_qr) {
        console.log(
          '[1] PDF y QR ya existen, redirigiendo a informe_qr:',
          initialData.informe_qr,
        );
        window.open(initialData.informe_qr, '_blank');
        // Ejecutar handleNext automáticamente después de abrir el QR
        setTimeout(() => {
          handleNext();
        }, 1000);
        return;
      }

      // Si no existen, llamar a handleResetPDFFields para generar el PDF
      console.log(
        '[2] PDF no existe aún, llamando a handleResetPDFFields para generarlo...',
      );

      // Cerrar el modal de confirmación antes de proceder
      setConfirmDialogOpen(false);

      // Llamar a la función que genera el PDF
      await handleResetPDFFields();
    } catch (error) {
      console.error('Error en handleCheckAndDownloadPDF:', error);
      toast({
        title: '❌ Error',
        description: 'Hubo un problema al verificar el PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setIsGeneratingPDF(false);
    }
  };

  const handleSendCase = async () => {
    setIsSending(true);

    try {
      // Verificar que tenemos los datos necesarios
      if (!case_?.email) {
        toast({
          title: '❌ Error',
          description: 'Este caso no tiene un correo electrónico asociado.',
          variant: 'destructive',
        });
        return;
      }

      if (!case_?.informe_qr) {
        toast({
          title: '❌ Error',
          description: 'El PDF del caso aún no está disponible.',
          variant: 'destructive',
        });
        return;
      }

      // Enviar email usando el endpoint (local en desarrollo, Vercel en producción)
      const isDevelopment = import.meta.env.DEV;
      const apiUrl = isDevelopment
        ? 'http://localhost:3001/api/send-email'
        : '/api/send-email';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientEmail: case_.email,
          patientName: case_.full_name,
          caseCode: case_.code || case_.id,
          pdfUrl: case_.informe_qr,
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Error parseando JSON:', jsonError);
        throw new Error(
          `Error del servidor (${response.status}): ${response.statusText}`,
        );
      }

      if (!response.ok) {
        console.error('Error del servidor:', result);
        throw new Error(
          result.error || result.details || 'Error al enviar el email',
        );
      }

      // Actualizar el campo email_sent en la base de datos
      if (case_?.id) {
        const { error: updateError } = await supabase
          .from('medical_records_clean')
          .update({ email_sent: true })
          .eq('id', case_.id);

        if (updateError) {
          console.error('Error actualizando email_sent:', updateError);
          // No mostramos error al usuario ya que el email se envió exitosamente
        }
      }

      toast({
        title: '✅ Correo enviado',
        description: `Se ha enviado el informe al correo ${case_.email}`,
        className: 'bg-green-100 border-green-400 text-green-800',
      });

      // Llamar a onSuccess para refrescar la lista de casos
      onSuccess();
    } catch (error) {
      console.error('Error enviando correo:', error);
      toast({
        title: '❌ Error',
        description: 'No se pudo enviar el correo. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const renderStepContent = () => {
    const currentStepId = computedSteps[activeStep]?.id;
    switch (currentStepId) {
      case 'patient':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className='space-y-4'
          >
            <div className='grid gap-4'>
              {/* Activa el nodo principal de n8n */}
              <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
                <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
                  <Button
                    type='button'
                    className='flex-1 bg-primary hover:bg-primary/80'
                    onClick={handleGenerateCaseAndOpenDoc}
                    disabled={isSaving}
                  >
                    <User className='w-4 h-4 mr-2' />
                    Rellenar los Datos
                  </Button>
                </div>
              </div>
              <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
                {isNotRechazado ? (
                  <p className='text-teal-400 text-sm'>
                    Para completar este paso, haz clic en el botón de arriba
                    para ir a rellenar los datos del documento en Google Docs.
                    Una vez que termines regresa a esta pestaña para continuar
                    con el siguiente paso.
                  </p>
                ) : (
                  <p className='text-teal-400 text-sm'>
                    Tu documento ha sido rechazado anteriormente. Para continuar
                    con el siguiente paso, haz clic en el botón de arriba para
                    ir a rellenar los datos del documento de nuevo.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className='space-y-4'
          >
            <div className='grid gap-4'>
              {/* Activa el nodo principal de n8n */}
              <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
                <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
                  <Button
                    type='button'
                    className='flex-1 bg-primary hover:bg-primary/80'
                    onClick={handleMarkAsCompleted}
                    disabled={
                      isSaving ||
                      (docAprobado != 'faltante' &&
                        docAprobado !== 'rechazado') ||
                      !docUrl
                    }
                  >
                    <Shredder className='w-4 h-4 mr-2' />
                    Marcar como Completado
                  </Button>
                </div>
              </div>
              <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
                <p className='text-teal-400 text-sm'>
                  Para completar este paso, haz clic en el botón de arriba para
                  marcar el documento como completado y espera por la aprobacion
                  para continuar con el siguiente paso.
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 'citology':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className='space-y-4'
          >
            <div className='grid gap-4'>
              {/* Paso exclusivo para OWNER: aprobar documento */}
              <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
                <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
                  <Button
                    type='button'
                    className={`flex-1 ${
                      citoStatus === 'positivo'
                        ? 'border border-green-500 bg-green-500 hover:bg-green-500/80'
                        : 'bg-primary hover:bg-primary/80'
                    }`}
                    onClick={handlePositive}
                    disabled={isSaving || citoStatus === 'positivo' || !docUrl}
                  >
                    <FileCheck className='w-4 h-4 mr-2' />
                    {citoStatus === 'positivo'
                      ? 'Citología positiva'
                      : 'Positivo'}
                  </Button>
                  <Button
                    type='button'
                    className={`flex-1 ${
                      citoStatus === 'negativo'
                        ? 'border border-red-500 bg-red-500 hover:bg-red-500/80'
                        : 'bg-primary hover:bg-primary/80'
                    }`}
                    onClick={handleNegative}
                    disabled={isSaving || citoStatus === 'negativo' || !docUrl}
                  >
                    <Shredder className='w-4 h-4 mr-2' />
                    {citoStatus === 'negativo'
                      ? 'Citología negativa'
                      : 'Negativo'}
                  </Button>
                </div>
              </div>
              <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
                <p className='text-teal-400 text-sm'>
                  {docAprobado === 'faltante'
                    ? 'Esperando que se complete el documento'
                    : 'Para completar este paso, revisa el documento y marca como aprobado para habilitar la descarga del PDF.'}
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 'approve':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className='space-y-4'
          >
            <div className='grid gap-4'>
              {/* Paso exclusivo para OWNER: aprobar documento */}
              <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
                <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
                  {docUrl && (
                    <Button
                      type='button'
                      className='flex-1 bg-primary hover:bg-primary/80'
                      onClick={() => window.open(docUrl, '_blank')}
                      disabled={isSaving || !docUrl}
                    >
                      <User className='w-4 h-4 mr-2' />
                      Revisar documento
                    </Button>
                  )}
                  <Button
                    type='button'
                    className={`flex-1 ${
                      isApproved
                        ? 'border border-green-500 bg-green-500 hover:bg-green-500/80'
                        : 'bg-primary hover:bg-primary/80'
                    }`}
                    onClick={handleApprove}
                    disabled={
                      isSaving ||
                      docAprobado === 'aprobado' ||
                      !docUrl ||
                      (isCitology && citoStatus === 'positivo' && isCitotecno)
                    }
                  >
                    <FileCheck className='w-4 h-4 mr-2' />
                    {isApproved ? 'Documento aprobado' : 'Aprobar'}
                  </Button>
                  <Button
                    type='button'
                    className={`flex-1 ${
                      isRechazado
                        ? 'border border-red-500 bg-red-500 hover:bg-red-500/80'
                        : 'bg-primary hover:bg-primary/80'
                    }`}
                    onClick={handleReject}
                    disabled={
                      isSaving ||
                      docAprobado === 'rechazado' ||
                      !docUrl ||
                      (isCitology && citoStatus === 'positivo' && isCitotecno)
                    }
                  >
                    <Shredder className='w-4 h-4 mr-2' />
                    {isRechazado ? 'Documento rechazado' : 'Rechazar'}
                  </Button>
                </div>
              </div>
              <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
                <p className='text-teal-400 text-sm'>
                  {docAprobado === 'faltante'
                    ? 'Esperando que se complete el documento'
                    : 'Para completar este paso, revisa el documento y marca como aprobado para habilitar la descarga del PDF.'}
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 'pdf':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className='space-y-4'
          >
            <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
              {/* Activa el nodo de transformar a PDF y luego te redirecciona al PDF */}
              <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
                <Button
                  type='button'
                  className='flex-1 bg-primary hover:bg-primary/80'
                  onClick={() => docUrl && window.open(docUrl, '_blank')}
                  disabled={isSaving || !docUrl || !isApproved}
                >
                  <User className='w-4 h-4 mr-2' />
                  Revisar documento
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={
                    // handleTransformToPDF
                    () => setConfirmDialogOpen(true)
                  }
                  className='flex-1'
                  disabled={
                    isGeneratingPDF || !docUrl || docAprobado !== 'aprobado'
                  }
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className='w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mr-2' />
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <Download className='w-4 h-4 mr-2' />
                      Descargar PDF
                    </>
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleSendCase}
                  className={`flex-1 ${isProduction ? 'hidden' : ''}`}
                  disabled={
                    !docUrl || docAprobado !== 'aprobado' || !isPdfGenerated
                  }
                >
                  {isSending ? (
                    <>
                      <div className='w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mr-2' />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className='w-4 h-4 mr-2' />
                      Enviar Caso
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
              <p className='text-teal-400 text-sm'>
                {!docUrl
                  ? 'El PDF aún no está listo para descargar. Completa el primer paso y espera a que el sistema procese el documento.'
                  : docAprobado !== 'aprobado'
                  ? docAprobado === 'pendiente'
                    ? 'Esperando aprobación del owner'
                    : 'Completa los pasos previos para habilitar la descarga'
                  : 'Haz clic en el botón "Descargar PDF" y espera mientras preparamos tu documento. El proceso puede tardar unos segundos dependiendo de la carga del sistema.'}
              </p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    onClose();
  };

  if (!isOpen) return null;

  // Render modal content
  const modalContent = (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key='backdrop'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className={`fixed inset-0 bg-black/50 backdrop-blur-sm modal-overlay ${
                isFullscreen ? 'z-[99999999999999999]' : 'z-[9999999999999999]'
              }`}
            />

            {/* Modal */}
            <motion.div
              key='modal'
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={handleClose}
              className={`fixed inset-0 modal-content flex items-center justify-center p-4 ${
                isFullscreen ? 'z-[99999999999999999]' : 'z-[9999999999999999]'
              }`}
            >
              <div
                className='w-full max-w-3xl bg-white/80 dark:bg-background/50 backdrop-blur-[3px] dark:backdrop-blur-[10px] rounded-2xl shadow-2xl border border-input overflow-hidden'
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className='bg-background px-6 py-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Sparkles className='w-6 h-6 text-black dark:text-white flex-shrink-0' />
                      <div className='min-w-0'>
                        <div>
                          <h2 className='text-lg font-bold text-black dark:text-white'>
                            Generar Caso Médico - {case_?.code}
                          </h2>
                        </div>
                        <p className='text-sm text-black dark:text-indigo-100 truncate'>
                          {case_ ? `Para ${case_.full_name}` : 'Nuevo caso'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleClose}
                      className='p-1 hover:bg-white/20 rounded-lg transition-none flex-shrink-0'
                    >
                      <X className='w-5 h-5 text-black dark:text-white' />
                    </button>
                  </div>
                </div>

                {/* Steps Indicator */}
                <div className='px-6 py-4 bg-card'>
                  <div
                    className={`flex items-center ${
                      isResidente || isEmployee
                        ? 'justify-center'
                        : 'justify-between'
                    }`}
                  >
                    {computedSteps.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = index === activeStep;
                      // Si el documento está aprobado y estamos en el paso del PDF, marcar todos los pasos anteriores como completados
                      const isCompleted =
                        docAprobado === 'aprobado' &&
                        activeStep === computedSteps.length - 1
                          ? index < activeStep
                          : index < activeStep;

                      return (
                        <div
                          key={step.id}
                          className='flex items-center justify-center flex-1 last-of-type:flex-none'
                        >
                          <div className='flex flex-col items-center'>
                            <motion.div
                              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform duration-300 ${
                                isCompleted
                                  ? 'border-green-500 text-gray-800 dark:text-white'
                                  : isActive
                                  ? 'border-labPrimary text-gray-800 dark:text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500'
                              }`}
                              whileHover={{ scale: 1.05 }}
                            >
                              <Icon className='w-4 h-4 text-gray-800 dark:text-white' />
                            </motion.div>
                            <div className='mt-2 text-center'>
                              <p
                                className={`text-xs font-medium ${
                                  isActive
                                    ? 'text-labPrimary'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                {step.title}
                              </p>
                              <p className='text-xs text-gray-500 dark:text-gray-500 hidden sm:block'>
                                {step.description}
                              </p>
                            </div>
                          </div>
                          {index < computedSteps.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-2 transition-none duration-300 ${
                                isCompleted
                                  ? 'bg-green-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className='px-6 py-6 flex flex-col'>
                  <AnimatePresence mode='wait'>
                    <div key={activeStep} className='flex-1'>
                      {renderStepContent()}
                    </div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className='px-6 py-4 bg-card border-t border-gray-200 dark:border-gray-700'>
                  <div className='flex items-center justify-end gap-3'>
                    <div className='flex items-center gap-5'>
                      <motion.button
                        onClick={handleBack}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-6 py-2 bg-transparent border border-labPrimary text-gray-800 dark:text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
                          activeStep === 0 ? 'hidden' : ''
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ArrowLeft className='w-4 h-4' />
                        Anterior
                      </motion.button>

                      <motion.button
                        onClick={handleNext}
                        disabled={isCompleting || isSaving || isGeneratingPDF}
                        className='flex items-center gap-2 px-6 py-2 bg-transparent border border-labPrimary text-gray-800 dark:text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl'
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isCompleting ? (
                          <>
                            <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                            <span className='hidden sm:inline'>
                              Saliendo...
                            </span>
                          </>
                        ) : isSaving || isGeneratingPDF ? (
                          <>
                            <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                            <span className='hidden sm:inline'>
                              Cargando...
                            </span>
                          </>
                        ) : activeStep === computedSteps.length - 1 ? (
                          <>
                            <Heart className='w-4 h-4' />
                            <span className='hidden sm:inline'>
                              Terminar Proceso
                            </span>
                          </>
                        ) : (
                          <>
                            <span className='hidden sm:inline'>Siguiente</span>
                            <ArrowRight className='w-4 h-4' />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar descargar PDF</DialogTitle>
            <DialogDescription>
              Si editó información del documento porfavor seleccione el boton
              que dice "SI" de lo contrario seleccione el boton que dice "NO"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setConfirmDialogOpen(false);
                handleResetPDFFields();
              }}
              disabled={isSaving}
            >
              SI
            </Button>
            <Button onClick={handleCheckAndDownloadPDF} disabled={isSaving}>
              NO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // Use portal when in fullscreen mode to ensure proper rendering
  if (isFullscreen && isOpen) {
    return ReactDOM.createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default StepsCaseModal;
