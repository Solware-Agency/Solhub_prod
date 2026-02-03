import { useState } from 'react';
import { supabase } from '@/services/supabase/config/config';
import { useToast } from '@shared/hooks/use-toast';
import { getDownloadUrl } from '@/services/utils/download-utils';
import { useLaboratory } from '@app/providers/LaboratoryContext';
import { useAuth } from '@app/providers/AuthContext';
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service';

interface MedicalRecord {
  id?: string;
  nombre?: string; // Campo alternativo de MedicalCaseWithPatient
  code?: string | null;
  informepdf_url?: string | null;
  informe_qr?: string | null;
  token?: string | null;
}

interface PDFBlobResult {
  blob: Blob;
  filename: string;
  caseCode: string;
}

interface UsePDFDownloadReturn {
  isGeneratingPDF: boolean;
  isSaving: boolean;
  handleCheckAndDownloadPDF: (
    caseData: MedicalCaseWithPatient | MedicalRecord,
  ) => Promise<void>;
  handleResetPDFFields: (
    caseData: MedicalCaseWithPatient | MedicalRecord,
  ) => Promise<void>;
  getPDFBlob: (
    caseData: MedicalCaseWithPatient | MedicalRecord,
  ) => Promise<PDFBlobResult | null>;
}

/**
 * Hook personalizado para manejar la descarga y generación de PDFs
 * Puede ser usado en cualquier componente que necesite descargar PDFs de casos médicos
 */
export function usePDFDownload(options?: {
  onDownloadSuccess?: () => void;
}): UsePDFDownloadReturn {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { laboratory } = useLaboratory();
  const { user } = useAuth();

  const GENERATE_PDF =
    laboratory?.config?.webhooks?.generatePdf ||
    import.meta.env.VITE_GENERATE_PDF_WEBHOOK;

  const downloadPdfFromUrl = async (
    pdfUrl: string,
    caseData: MedicalCaseWithPatient | MedicalRecord,
  ) => {
    try {
      if (pdfUrl.includes('drive.google.com')) {
        window.open(pdfUrl, '_blank');

        if (options?.onDownloadSuccess) {
          setTimeout(() => {
            options.onDownloadSuccess?.();
          }, 1000);
        }

        return true;
      }

      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status}`);
      }

      const sanitizedName =
        caseData.nombre ||
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
      link.download = `${caseData.code || caseData.id}-${sanitizedName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: '✅ PDF descargado',
        description: 'El documento se ha descargado correctamente.',
      });

      if (options?.onDownloadSuccess) {
        setTimeout(() => {
          options.onDownloadSuccess?.();
        }, 1500);
      }

      return true;
    } catch (err) {
      console.error('Error al abrir el PDF:', err);
      toast({
        title: '❌ Error',
        description: 'No se pudo acceder al PDF. Intenta nuevamente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleResetPDFFields = async (
    caseData: MedicalCaseWithPatient | MedicalRecord,
  ) => {
    if (!caseData?.id) {
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

      console.log('[1] Vaciando campos PDF para el caso:', caseData.id);

      // Vaciar los tres campos en la base de datos
      const { error: updateError } = await supabase
        .from('medical_records_clean')
        .update({
          token: null,
          informe_qr: null,
          informepdf_url: null,
        })
        .eq('id', caseData.id);

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
      const { data: caseQueryData, error: caseError } = await supabase
        .from('medical_records_clean')
        .select('patient_id')
        .eq('id', caseData.id)
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

      if (!caseQueryData?.patient_id) {
        toast({
          title: '❌ Error',
          description: 'No se encontró el ID del paciente para este caso.',
          variant: 'destructive',
        });
        return;
      }

      const requestBody = {
        caseId: caseData.id,
        patientId: caseQueryData.patient_id,
        userId: user?.id || null, // User ID de quien genera el PDF
      };

      console.log('Request body:', requestBody);

      // Verificar que la URL del webhook esté configurada
      if (!GENERATE_PDF) {
        throw new Error(
          'URL del webhook PDF no configurada. Verifica las variables de entorno.',
        );
      }

      console.log('Webhook URL:', GENERATE_PDF);
      console.log('Patient ID:', caseQueryData.patient_id);

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
          .eq('id', caseData.id)
          .single<MedicalRecord & { token?: string }>();

        if (error) {
          console.error('Error obteniendo informepdf_url:', error);
          break;
        }

        if (data?.informepdf_url) {
          // Usar la utilidad para determinar la URL de descarga apropiada
          pdfUrl = getDownloadUrl(
            caseData.id,
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

      await downloadPdfFromUrl(pdfUrl, caseData);
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

  const handleCheckAndDownloadPDF = async (
    caseData: MedicalCaseWithPatient | MedicalRecord,
  ) => {
    if (!caseData?.id) {
      toast({
        title: '❌ Error',
        description: 'No se encontró el ID del caso.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      // Verificar si ya existe tanto informepdf_url como informe_qr
      console.log(
        '[1] Verificando si ya existe informepdf_url e informe_qr para el caso',
        caseData.id,
      );
      const { data: initialData, error: initialError } = await supabase
        .from('medical_records_clean')
        .select('informepdf_url, informe_qr, token')
        .eq('id', caseData.id)
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

      if (initialData?.informepdf_url) {
        const pdfUrl =
          getDownloadUrl(
            caseData.id,
            initialData.token || null,
            initialData.informepdf_url || null,
          ) || initialData.informepdf_url;

        await downloadPdfFromUrl(pdfUrl, caseData);
        return;
      }

      if (initialData?.informe_qr) {
        console.log(
          '[1] PDF ya existe, redirigiendo a informe_qr:',
          initialData.informe_qr,
        );
        window.open(initialData.informe_qr, '_blank');

        if (options?.onDownloadSuccess) {
          setTimeout(() => {
            options.onDownloadSuccess?.();
          }, 1000);
        }
        return;
      }

      // Si no existen, llamar a handleResetPDFFields para generar el PDF
      console.log(
        '[2] PDF no existe aún, llamando a handleResetPDFFields para generarlo...',
      );

      // Llamar a la función que genera el PDF
      setIsGeneratingPDF(true);
      await handleResetPDFFields(caseData);
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

  // Función para obtener el blob del PDF sin descargarlo (útil para ZIP)
  const getPDFBlob = async (
    caseData: MedicalCaseWithPatient | MedicalRecord,
  ): Promise<PDFBlobResult | null> => {
    if (!caseData?.id) {
      return null;
    }

    try {
      // Verificar si ya existe el PDF
      const { data: initialData, error: initialError } = await supabase
        .from('medical_records_clean')
        .select('informepdf_url, informe_qr, token')
        .eq('id', caseData.id)
        .single<MedicalRecord & { token?: string }>();

      if (initialError || !initialData?.informepdf_url) {
        // Si no existe, intentar generarlo
        console.log(`Generando PDF para caso ${caseData.id}...`);
        
        // Vaciar campos PDF
        await supabase
          .from('medical_records_clean')
          .update({
            token: null,
            informe_qr: null,
            informepdf_url: null,
          })
          .eq('id', caseData.id);

        // Obtener patient_id
        const { data: caseQueryData } = await supabase
          .from('medical_records_clean')
          .select('patient_id')
          .eq('id', caseData.id)
          .single();

        if (!caseQueryData?.patient_id || !GENERATE_PDF) {
          return null;
        }

        // Llamar al webhook para generar PDF
        await fetch(GENERATE_PDF, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            caseId: caseData.id,
            patientId: caseQueryData.patient_id,
          }),
        });

        // Esperar a que se genere el PDF
        let attempts = 0;
        const maxAttempts = 15;
        let pdfUrl: string | null = null;

        while (attempts < maxAttempts) {
          const { data } = await supabase
            .from('medical_records_clean')
            .select('informepdf_url, token')
            .eq('id', caseData.id)
            .single<MedicalRecord & { token?: string }>();

          if (data?.informepdf_url) {
            pdfUrl = getDownloadUrl(
              caseData.id,
              data.token || null,
              data.informepdf_url || null,
            );
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
          attempts++;
        }

        if (!pdfUrl) {
          return null;
        }

        // Descargar el blob
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          return null;
        }

        const blob = await response.blob();
        const sanitizedName =
          caseData.nombre ||
          'Paciente'
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .trim();

        return {
          blob,
          filename: `${caseData.code || caseData.id}-${sanitizedName}.pdf`,
          caseCode: caseData.code || caseData.id || '',
        };
      } else {
        // PDF ya existe, obtenerlo directamente
        const pdfUrl = getDownloadUrl(
          caseData.id,
          initialData.token || null,
          initialData.informepdf_url || null,
        );

        const response = await fetch(pdfUrl);
        if (!response.ok) {
          return null;
        }

        const blob = await response.blob();
        const sanitizedName =
          caseData.nombre ||
          'Paciente'
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .trim();

        return {
          blob,
          filename: `${caseData.code || caseData.id}-${sanitizedName}.pdf`,
          caseCode: caseData.code || caseData.id || '',
        };
      }
    } catch (error) {
      console.error('Error obteniendo blob del PDF:', error);
      return null;
    }
  };

  return {
    isGeneratingPDF,
    isSaving,
    handleCheckAndDownloadPDF,
    handleResetPDFFields,
    getPDFBlob,
  };
}

