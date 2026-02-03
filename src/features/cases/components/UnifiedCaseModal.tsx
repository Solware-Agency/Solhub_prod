import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Stethoscope,
  CreditCard,
  FileText,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Save,
  XCircle,
  History,
  Eye,
  Send,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
  Phone,
} from 'lucide-react';
import type {
  MedicalCaseWithPatient,
  MedicalCaseUpdate,
} from '@/services/supabase/cases/medical-cases-service';
import {
  updateMedicalCase,
  deleteMedicalCase,
  findCaseByCode,
} from '@/services/supabase/cases/medical-cases-service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/config/config';
import { useToast } from '@shared/hooks/use-toast';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { logEmailSend } from '@/services/supabase/email-logs/email-logs-service';
import {
  createDropdownOptions,
  FormDropdown,
} from '@shared/components/ui/form-dropdown';
import { CustomDropdown } from '@shared/components/ui/custom-dropdown';
import { AutocompleteInput } from '@shared/components/ui/autocomplete-input';
import { useAuth } from '@app/providers/AuthContext';
import { WhatsAppIcon } from '@shared/components/icons/WhatsAppIcon';
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock';
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@shared/components/ui/tooltip';
import { createCalculatorInputHandlerWithCurrency } from '@shared/utils/number-utils';
import {
  calculateTotalPaidUSD,
  calculatePaymentDetails,
} from '@features/form/lib/payment/payment-utils';
import { createCalculatorInputHandler } from '@shared/utils/number-utils';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { FeatureGuard } from '@shared/components/FeatureGuard';
import { useLaboratory } from '@/app/providers/LaboratoryContext';
import { getCodeLegend } from '@/shared/utils/code-legend-utils';
import { useModuleConfig } from '@shared/hooks/useModuleConfig';
import SendEmailModal from './SendEmailModal';
import { getResponsableByDependiente } from '@services/supabase/patients/responsabilidades-service';
import { MultipleImageUrls } from '@shared/components/ui/MultipleImageUrls';
import { PDFButton } from '@shared/components/ui/PDFButton';
import { CasePDFUpload } from '@shared/components/ui/CasePDFUpload';
import PatientHistoryModal from '@features/patients/components/PatientHistoryModal';
// import EditPatientInfoModal from '@features/patients/components/EditPatientInfoModal';

interface ChangeLogEntry {
  id: string;
  medical_record_id: string | null;
  patient_id: string | null;
  entity_type: string | null;
  user_id: string;
  user_email: string;
  field_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  deleted_record_info: string | null;
}

interface DeletionLogEntry {
  id: string;
  deleted_medical_record_id: string;
  deleted_patient_id: string | null;
  user_id: string;
  user_email: string;
  user_display_name: string | null;
  deleted_record_info: string;
  deleted_at: string;
  entity_type: string | null;
}

interface PaymentMethod {
  method: string;
  amount: number;
  reference: string;
}

// Extend MedicalCaseUpdate to include payment method fields
interface ExtendedMedicalCaseUpdate extends MedicalCaseUpdate {
  [key: string]: unknown;
}

interface CaseDetailPanelProps {
  case_: MedicalCaseWithPatient | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onCaseSelect: (case_: MedicalCaseWithPatient) => void;
  isFullscreen?: boolean;
  modalTitle?: string;
}

// Helper to parse edad string like "10 AÑOS" or "5 MESES"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function parseEdad(edad: string | null | undefined): {
  value: number | '';
  unit: 'Años' | 'Meses' | '';
} {
  if (!edad) return { value: '', unit: '' };
  const match = String(edad)
    .trim()
    .match(/^(\d+)\s*(AÑOS|MESES)$/i);
  if (!match) return { value: '', unit: '' };
  const value = Number(match[1]);
  const unit = match[2].toUpperCase() === 'AÑOS' ? 'Años' : 'Meses';
  return { value: Number.isNaN(value) ? '' : value, unit };
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

// Stable InfoRow component to avoid remounts on each keystroke
interface InfoRowProps {
  label: string;
  value: string | number | undefined;
  field?: string;
  editable?: boolean;
  type?: 'text' | 'number' | 'email';
  isEditing?: boolean;
  editedValue?: string | number | null;
  onChange?: (field: string, value: unknown) => void;
  disabled?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = React.memo(
  ({
    label,
    value,
    field,
    editable = true,
    type = 'text',
    isEditing = false,
    editedValue,
    onChange,
    disabled = false,
  }) => {
    const isEditableField = Boolean(isEditing && editable && field && onChange && !disabled);
    const displayValue = field ? editedValue ?? value : value;

    return (
      <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
        <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
          {label}:
        </span>
        {isEditableField ? (
          <div className='sm:w-1/2'>
            <Input
              id={`${field}-input`}
              name={field}
              type={type}
              value={String(displayValue ?? '')}
              onChange={(e) => onChange?.(field!, e.target.value)}
              className='text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50'
              disabled={disabled}
            />
          </div>
        ) : (
          <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
            {displayValue || 'N/A'}
          </span>
        )}
      </div>
    );
  },
);

const UnifiedCaseModal: React.FC<CaseDetailPanelProps> = React.memo(
  ({
    case_,
    isOpen,
    onClose,
    onSave,
    onDelete,
    isFullscreen = false,
    modalTitle = 'Detalles Del Caso',
  }) => {
    useBodyScrollLock(isOpen);
    useGlobalOverlayOpen(isOpen);
    const { profile } = useUserProfile();
    const { toast } = useToast();
    const { user } = useAuth();
    const { laboratory } = useLaboratory();
    const isSpt = laboratory?.slug === 'spt';
    const isMarihorgen = laboratory?.slug === 'marihorgen' || laboratory?.slug === 'lm';
    const isOwner = profile?.role === 'owner';
    const moduleConfig = useModuleConfig('registrationForm');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedCase, setEditedCase] = useState<
      Partial<MedicalCaseWithPatient>
    >({});
    // Payment modal states removed - not needed in new structure
    // const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false)
    // const [newPayment, setNewPayment] = useState({...})
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
    const [showFullPatientInfo, setShowFullPatientInfo] = useState(false);
    const [showResponsableHistoryModal, setShowResponsableHistoryModal] = useState(false);
    const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
    
    // Estados para rastrear subida de archivos
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    
    // Image URLs state for imagenologia role (hasta 10 imágenes)
    const [imageUrls, setImageUrls] = useState<string[]>([]);

    // Payment editing states
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>({
      method: '',
      amount: 0,
      reference: '',
    });
    const [isAddingNewPayment, setIsAddingNewPayment] = useState(false);

    // Converter states
    const [converterUsdValue, setConverterUsdValue] = useState('');

    // Obtener opciones de dropdowns desde la configuración del laboratorio
    const examTypesOptions = useMemo(() => {
      const examTypes = laboratory?.config?.examTypes || [];
      // Si hay tipos configurados, usarlos; si no, usar valores por defecto
      if (examTypes.length > 0) {
        // Ordenar alfabéticamente antes de crear las opciones
        const sortedExamTypes = [...examTypes].sort((a, b) =>
          a.localeCompare(b, 'es', { sensitivity: 'base' }),
        );
        return createDropdownOptions(
          sortedExamTypes.map((type) => ({ value: type, label: type })),
        );
      }
      // Fallback a valores por defecto si no hay configuración (también ordenados)
      return createDropdownOptions([
        { value: 'Biopsia', label: 'Biopsia' },
        { value: 'Citología', label: 'Citología' },
        { value: 'Inmunohistoquímica', label: 'Inmunohistoquímica' },
      ]);
    }, [laboratory?.config?.examTypes]);

    const branchOptions = useMemo(() => {
      const branches = laboratory?.config?.branches || [];
      // Si hay branches configurados, usarlos; si no, usar valores por defecto
      if (branches.length > 0) {
        return createDropdownOptions(
          branches.map((branch) => ({ value: branch, label: branch })),
        );
      }
      // Fallback a valores por defecto si no hay configuración
      return createDropdownOptions([
        { value: 'PMG', label: 'PMG' },
        { value: 'CPC', label: 'CPC' },
        { value: 'CNX', label: 'CNX' },
        { value: 'STX', label: 'STX' },
        { value: 'MCY', label: 'MCY' },
      ]);
    }, [laboratory?.config?.branches]);

    const paymentMethodsOptions = useMemo(() => {
      const paymentMethods = laboratory?.config?.paymentMethods || [];
      // Si hay métodos configurados, usarlos; si no, usar valores por defecto
      if (paymentMethods.length > 0) {
        return createDropdownOptions(
          paymentMethods.map((method) => ({ value: method, label: method })),
        );
      }
      // Fallback a valores por defecto si no hay configuración
      return createDropdownOptions([
        { value: 'Punto de venta', label: 'Punto de venta' },
        { value: 'Dólares en efectivo', label: 'Dólares en efectivo' },
        { value: 'Zelle', label: 'Zelle' },
        { value: 'Pago móvil', label: 'Pago móvil' },
        { value: 'Bs en efectivo', label: 'Bs en efectivo' },
      ]);
    }, [laboratory?.config?.paymentMethods]);

    // Query to get the user who created the record
    const { data: creatorData } = useQuery({
      queryKey: ['record-creator', case_?.id],
      queryFn: async () => {
        if (!case_) return null;

        // First try to get creator info from the record itself (for new records)
        // Priorizar los nuevos campos created_by y created_by_display_name
        if (case_.created_by && case_.created_by_display_name) {
          return {
            id: case_.created_by,
            email: '', // We don't have the email in the record
            displayName: case_.created_by_display_name,
          };
        }

        // Fallback: try to get from change logs
        if (!case_.id) return null;

        const { data, error } = await supabase
          .from('change_logs')
          .select('user_id, user_email, user_display_name')
          .eq('medical_record_id', case_.id)
          .order('changed_at', { ascending: true })
          .limit(1);

        if (error) {
          console.error('Error fetching record creator:', error);
          return null;
        }

        if (data && data.length > 0) {
          // Get the user profile to get the display name
          const displayName = data[0].user_display_name;
          if (displayName) {
            return {
              id: data[0].user_id,
              email: data[0].user_email,
              displayName,
            };
          }
          // fallback: fetch from profiles if not present
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', data[0].user_id)
            .single();
          return {
            id: data[0].user_id,
            email: data[0].user_email,
            displayName: profileData?.display_name || null,
          };
        }

        return null;
      },
      enabled: !!case_?.id && isOpen,
    });

    // Query to get the updated case data after saving
    const { data: updatedCaseData, refetch: refetchCaseData } = useQuery({
      queryKey: ['case-data', case_?.id],
      queryFn: async () => {
        if (!case_?.id) return null;

        // Usar la función findCaseByCode en lugar de la vista eliminada
        try {
          const caseData = await findCaseByCode(case_.code || '');
          return caseData;
        } catch (error) {
          console.error('Error fetching updated case data:', error);
          return null;
        }
      },
      enabled: !!case_?.id && isOpen,
    });

    // Use updated case data if available, otherwise fall back to original case
    const currentCase = updatedCaseData || case_;
    
    // Query to get responsable if patient is a minor/animal
    const { data: responsableData } = useQuery({
      queryKey: ['patient-responsable', currentCase?.patient_id],
      queryFn: async () => {
        if (!currentCase?.patient_id) return null;
        
        try {
          // Verificar si el paciente es menor o animal
          const { data: patient } = await supabase
            .from('patients')
            .select('tipo_paciente')
            .eq('id', currentCase.patient_id)
            .single();
          
          if (patient && ((patient as any).tipo_paciente === 'menor' || (patient as any).tipo_paciente === 'animal')) {
            const responsable = await getResponsableByDependiente(currentCase.patient_id);
            return responsable;
          }
          
          return null;
        } catch (error) {
          console.error('Error obteniendo responsable:', error);
          return null;
        }
      },
      enabled: !!currentCase?.patient_id && isOpen,
    });
    
    // Load patient data for EditPatientInfoModal - COMMENTED OUT (not needed, using inline image_url field)
    /*
    const { data: patientData, refetch: refetchPatient } = useQuery({
      queryKey: ['patient', currentCase?.patient_id],
      queryFn: async () => {
        if (!currentCase?.patient_id) return null
        const { data, error } = await supabase.from('patients').select('*').eq('id', currentCase.patient_id).single()
        if (error) return null
        return data
      },
      enabled: !!currentCase?.patient_id && isOpen,
    })
    */

    // Query to get change logs for this record
    const {
      data: changelogsData,
      isLoading: isLoadingChangelogs,
      refetch: refetchChangelogs,
    } = useQuery({
      queryKey: ['record-changelogs', case_?.id],
      queryFn: async () => {
        if (!case_?.id) return { data: [] };

        // Obtener logs del caso médico desde change_logs
        const { data: changeLogs, error: changeLogsError } = await supabase
          .from('change_logs')
          .select('*')
          .eq('medical_record_id', case_.id)
          .order('changed_at', { ascending: false });

        if (changeLogsError) {
          console.error('Error fetching change logs:', changeLogsError);
        }

        // Obtener logs de eliminación desde deletion_logs
        const { data: deletionLogs, error: deletionLogsError } = (await supabase
          .from('deletion_logs')
          .select('*')
          .eq('deleted_medical_record_id', case_.id)
          .order('deleted_at', { ascending: false })) as {
          data: DeletionLogEntry[] | null;
          error: unknown;
        };

        if (deletionLogsError) {
          console.error('Error fetching deletion logs:', deletionLogsError);
        }

        // Combinar y formatear los logs
        const allLogs = [];

        // Agregar logs de cambios
        if (changeLogs) {
          allLogs.push(
            ...changeLogs.map((log) => ({
              ...log,
              changed_at: log.changed_at,
              source: 'change_logs',
            })),
          );
        }

        // Agregar logs de eliminación
        if (deletionLogs) {
          allLogs.push(
            ...deletionLogs.map((log) => ({
              id: log.id,
              medical_record_id: log.deleted_medical_record_id,
              patient_id: log.deleted_patient_id,
              user_id: log.user_id,
              user_email: log.user_email,
              user_display_name: log.user_display_name,
              field_name: 'deleted_record',
              field_label: 'Registro Eliminado',
              old_value: log.deleted_record_info,
              new_value: null,
              changed_at: log.deleted_at,
              deleted_record_info: log.deleted_record_info,
              entity_type: log.entity_type,
              source: 'deletion_logs',
            })),
          );
        }

        // Ordenar por fecha de cambio (más reciente primero)
        allLogs.sort(
          (a, b) =>
            new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
        );

        return { data: allLogs };
      },
      enabled: !!case_?.id && isOpen && isChangelogOpen,
    });

    // Initialize edited case when currentCase changes or when entering edit mode
    useEffect(() => {
      if (currentCase) {
        // Initialize image URLs for imagenologia role (siempre, no solo en edición)
        // Priorizar images_urls (nuevo), fallback a image_url (legacy)
        const caseImages = (currentCase as any).images_urls || 
                          ((currentCase as any).image_url ? [(currentCase as any).image_url] : []);
        setImageUrls(caseImages);

        if (isEditing) {
          // Initialize with current case data - separating patient and case data
          setEditedCase({
            // Patient data
            nombre: currentCase.nombre,
            cedula: currentCase.cedula,
            telefono: currentCase.telefono,
            patient_email: currentCase.patient_email,
            edad: currentCase.edad,
            // Case data
            exam_type: currentCase.exam_type,
            treating_doctor: currentCase.treating_doctor,
            origin: currentCase.origin,
            branch: currentCase.branch,
            comments: currentCase.comments,
            owner_display_code: (currentCase as any).owner_display_code ?? '',
            // Financial data
            total_amount: currentCase.total_amount,
            exchange_rate: currentCase.exchange_rate,
          });

          // Initialize payment methods from current case
          const methods: PaymentMethod[] = [];
          for (let i = 1; i <= 4; i++) {
            const method = currentCase[
              `payment_method_${i}` as keyof MedicalCaseWithPatient
            ] as string;
            const amount = currentCase[
              `payment_amount_${i}` as keyof MedicalCaseWithPatient
            ] as number;
            const reference = currentCase[
              `payment_reference_${i}` as keyof MedicalCaseWithPatient
            ] as string;

            if (method && amount) {
              methods.push({ method, amount, reference: reference || '' });
            }
          }
          setPaymentMethods(methods);
        } else {
          setEditedCase({});
          setPaymentMethods([]);
        }
      }
    }, [currentCase, isEditing]);

    // Resetear estado de edición cuando el modal se cierra
    useEffect(() => {
      if (!isOpen) {
        setIsEditing(false);
        setEditedCase({});
        setPaymentMethods([]);
        setNewPaymentMethod({ method: '', amount: 0, reference: '' });
        setIsAddingNewPayment(false);
      }
    }, [isOpen]);

    const handleEditClick = () => {
      if (!currentCase) return;
      setIsEditing(true);
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditedCase({});
      setPaymentMethods([]);
      setNewPaymentMethod({ method: '', amount: 0, reference: '' });
      setIsAddingNewPayment(false);
    };

    // Función wrapper para onClose que resetea el estado de edición
    const handleClose = () => {
      setIsEditing(false);
      setEditedCase({});
      setPaymentMethods([]);
      setNewPaymentMethod({ method: '', amount: 0, reference: '' });
      setIsAddingNewPayment(false);
      onClose();
    };

    const handleDeleteClick = () => {
      if (!currentCase) return;
      setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
      if (!currentCase || !user) return;

      setIsDeleting(true);
      try {
        const result = await deleteMedicalCase(currentCase.id);

        if (!result.success) {
          throw new Error(result.error || 'Error al eliminar el caso');
        }

        toast({
          title: '✅ Caso eliminado exitosamente',
          description: `El caso ${
            currentCase.code || currentCase.id
          } ha sido eliminado.`,
          className: 'bg-green-100 border-green-400 text-green-800',
        });

        // Close modals and panel
        setIsDeleteModalOpen(false);
        handleClose();

        // Call onDelete callback if provided
        if (onDelete) {
          onDelete();
        }
      } catch (error) {
        console.error('Error deleting case:', error);
        toast({
          title: '❌ Error al eliminar',
          description:
            'Hubo un problema al eliminar el caso. Inténtalo de nuevo.',
          variant: 'destructive',
        });
      } finally {
        setIsDeleting(false);
      }
    };

    const handleInputChange = useCallback((field: string, value: unknown) => {
      setEditedCase((prev: Partial<MedicalCaseWithPatient>) => ({
        ...prev,
        [field]: value,
      }));
    }, []);

    // Payment method handlers
    const handlePaymentMethodChange = (
      index: number,
      field: keyof PaymentMethod,
      value: string | number,
    ) => {
      const updatedMethods = [...paymentMethods];
      updatedMethods[index] = { ...updatedMethods[index], [field]: value };
      setPaymentMethods(updatedMethods);
    };

    const handleAddPaymentMethod = () => {
      if (!newPaymentMethod.method || !newPaymentMethod.amount) {
        toast({
          title: '❌ Error',
          description: 'Debe completar el método de pago y el monto.',
          variant: 'destructive',
        });
        return;
      }

      if (paymentMethods.length >= 4) {
        toast({
          title: '❌ Error',
          description: 'No se pueden agregar más de 4 métodos de pago.',
          variant: 'destructive',
        });
        return;
      }

      setPaymentMethods([...paymentMethods, { ...newPaymentMethod }]);
      setNewPaymentMethod({ method: '', amount: 0, reference: '' });
      setIsAddingNewPayment(false);
    };

    const handleRemovePaymentMethod = (index: number) => {
      const updatedMethods = paymentMethods.filter((_, i) => i !== index);
      setPaymentMethods(updatedMethods);
    };

    const handleCancelEditPayment = () => {
      setIsAddingNewPayment(false);
      setNewPaymentMethod({ method: '', amount: 0, reference: '' });
    };

    const handleStartAddingPayment = () => {
      // Si ya hay un método de pago nuevo con datos, agregarlo primero
      if (newPaymentMethod.method && newPaymentMethod.amount > 0) {
        handleAddPaymentMethod();
        // Luego iniciar el proceso de agregar uno nuevo
        setIsAddingNewPayment(true);
        setNewPaymentMethod({ method: '', amount: 0, reference: '' });
      } else if (isAddingNewPayment) {
        // Si ya está en modo agregar pero no hay datos completos, mostrar mensaje
        toast({
          title: '⚠️ Complete el método de pago',
          description:
            'Por favor complete el método de pago y el monto antes de agregar otro.',
          variant: 'default',
        });
      } else {
        // Iniciar el proceso de agregar uno nuevo
        setIsAddingNewPayment(true);
        setNewPaymentMethod({ method: '', amount: 0, reference: '' });
      }
    };

    const handleSaveChanges = async () => {
      if (!currentCase || !user) return;

      setIsSaving(true);
      try {
        // Solo permitir editar campos del caso (Información Médica + Información Adicional)
        const caseFields = [
          'exam_type',
          'treating_doctor',
          'origin',
          'branch',
          'comments',
          'consulta',
          'image_url',
          ...(isMarihorgen && currentCase.exam_type === 'Inmunohistoquímica' && isOwner ? ['owner_display_code' as const] : []),
        ];
        const financialFields = ['total_amount', 'exchange_rate'];

        // Detectar cambios en datos del caso
        const caseChanges: Partial<MedicalCaseUpdate> = {};
        const caseChangeLogs = [];

        for (const field of caseFields) {
          const newValue = editedCase[field as keyof MedicalCaseWithPatient];
          const oldValue = currentCase[field as keyof MedicalCaseWithPatient];

          const hasChange = field === 'owner_display_code'
            ? (() => {
                const oldNorm = String((currentCase as any).owner_display_code ?? '').replace(/\D/g, '').slice(0, 5);
                const newNorm = String(editedCase.owner_display_code ?? '').replace(/\D/g, '').slice(0, 5);
                return oldNorm !== newNorm;
              })()
            : newValue !== oldValue;

          if (hasChange) {
            if (field === 'exam_type') {
              caseChanges.exam_type = newValue as string;
            } else if (field === 'treating_doctor') {
              // Si está vacío, guardar como 'No especificado' (igual que en el registro)
              caseChanges.treating_doctor = (newValue as string) || 'No especificado';
            } else if (field === 'origin') {
              caseChanges.origin = newValue as string;
            } else if (field === 'branch') {
              caseChanges.branch = newValue as string;
            } else if (field === 'comments') {
              caseChanges.comments = newValue as string | null;
            } else if (field === 'consulta') {
              caseChanges.consulta = newValue as string | null;
            } else if (field === 'image_url') {
              caseChanges.image_url = newValue as string | null;
            } else if (field === 'owner_display_code') {
              const raw = newValue as string | null | undefined;
              const trimmed = typeof raw === 'string' ? raw.trim().replace(/\D/g, '').slice(0, 5) : '';
              caseChanges.owner_display_code = trimmed === '' ? null : trimmed;
            }
            caseChangeLogs.push({
              field,
              fieldLabel: getFieldLabel(field),
              oldValue,
              newValue,
            });
          }
        }

        // Detectar cambios en datos financieros
        const financialChanges: Partial<ExtendedMedicalCaseUpdate> = {};
        const financialChangeLogs = [];

        for (const field of financialFields) {
          const newValue = editedCase[field as keyof MedicalCaseWithPatient];
          const oldValue = currentCase[field as keyof MedicalCaseWithPatient];

          if (newValue !== oldValue) {
            if (field === 'total_amount') {
              financialChanges.total_amount = newValue as number;
            } else if (field === 'exchange_rate') {
              financialChanges.exchange_rate = newValue as number;
            }
            financialChangeLogs.push({
              field,
              fieldLabel: getFieldLabel(field),
              oldValue,
              newValue,
            });
          }
        }

        // Actualizar métodos de pago si hay cambios
        const currentPaymentMethods: PaymentMethod[] = [];
        for (let i = 1; i <= 4; i++) {
          const method = currentCase[
            `payment_method_${i}` as keyof MedicalCaseWithPatient
          ] as string;
          const amount = currentCase[
            `payment_amount_${i}` as keyof MedicalCaseWithPatient
          ] as number;
          const reference = currentCase[
            `payment_reference_${i}` as keyof MedicalCaseWithPatient
          ] as string;

          if (method && amount) {
            currentPaymentMethods.push({
              method,
              amount,
              reference: reference || '',
            });
          }
        }

        // Si hay un método de pago nuevo en el formulario, agregarlo automáticamente
        const finalPaymentMethods = [...paymentMethods];
        if (
          isAddingNewPayment &&
          newPaymentMethod.method &&
          newPaymentMethod.amount > 0
        ) {
          finalPaymentMethods.push({ ...newPaymentMethod });
        }

        // Verificar si hay cambios en los métodos de pago
        const paymentMethodsChanged =
          finalPaymentMethods.length !== currentPaymentMethods.length ||
          finalPaymentMethods.some((pm, index) => {
            const current = currentPaymentMethods[index];
            return (
              !current ||
              pm.method !== current.method ||
              pm.amount !== current.amount ||
              pm.reference !== current.reference
            );
          });

        if (paymentMethodsChanged) {
          // Limpiar todos los campos de pago existentes
          for (let i = 1; i <= 4; i++) {
            financialChanges[`payment_method_${i}`] = null;
            financialChanges[`payment_amount_${i}`] = null;
            financialChanges[`payment_reference_${i}`] = null;
          }

          // Agregar los nuevos métodos de pago
          finalPaymentMethods.forEach((pm, index) => {
            const i = index + 1;
            financialChanges[`payment_method_${i}`] = pm.method;
            financialChanges[`payment_amount_${i}`] = pm.amount;
            financialChanges[`payment_reference_${i}`] = pm.reference || null;
          });

          // Calcular monto restante usando la lógica correcta de conversión
          const totalAmount =
            editedCase.total_amount || currentCase.total_amount || 0;
          const { missingAmount, isPaymentComplete } = calculatePaymentDetails(
            finalPaymentMethods,
            totalAmount,
            exchangeRate,
          );
          financialChanges.remaining = Math.max(0, missingAmount || 0);

          // Actualizar estado de pago usando la misma lógica que el registro
          financialChanges.payment_status = isPaymentComplete
            ? 'Pagado'
            : 'Incompleto';

          // Función helper para formatear métodos de pago con el símbolo correcto
          const formatPaymentMethod = (method: string, amount: number) => {
            const isBolivares = [
              'Punto de venta',
              'Pago móvil',
              'Bs en efectivo',
            ].includes(method);
            const symbol = isBolivares ? 'Bs' : '$';
            return `${method}: ${symbol}${amount}`;
          };

          financialChangeLogs.push({
            field: 'payment_methods',
            fieldLabel: 'Métodos de Pago',
            oldValue: currentPaymentMethods
              .map((pm) => formatPaymentMethod(pm.method, pm.amount))
              .join(', '),
            newValue: finalPaymentMethods
              .map((payment) =>
                formatPaymentMethod(payment.method, payment.amount),
              )
              .join(', '),
          });
        }

        // Detectar cambios en URLs de imágenes (se guardan aparte en images_urls)
        const currentImages: string[] =
          (currentCase as any).images_urls ||
          ((currentCase as any).image_url ? [(currentCase as any).image_url] : []);
        const imagesChanged =
          JSON.stringify(imageUrls) !== JSON.stringify(currentImages);

        if (
          Object.keys(caseChanges).length === 0 &&
          Object.keys(financialChanges).length === 0 &&
          !imagesChanged
        ) {
          toast({
            title: 'Sin cambios',
            description: 'No se detectaron cambios para guardar.',
            variant: 'default',
          });
          setIsEditing(false);
          setIsSaving(false);
          return;
        }

        // Actualizar datos del caso si hay cambios
        if (Object.keys(caseChanges).length > 0) {
          // updateMedicalCase ya registra cambios automáticamente en change_logs
          // (con agrupación por session_id y normalización)
          await updateMedicalCase(currentCase.id, caseChanges, user.id);

          toast({
            title: '✅ Caso actualizado exitosamente',
            description: `Se han guardado los cambios al caso ${
              currentCase.code || currentCase.id
            }.`,
            className: 'bg-green-100 border-green-400 text-green-800',
          });
        }

        // Actualizar datos financieros si hay cambios
        if (Object.keys(financialChanges).length > 0) {
          // updateMedicalCase ya registra cambios automáticamente en change_logs
          // (con agrupación por session_id y normalización)
          await updateMedicalCase(currentCase.id, financialChanges, user.id);

          toast({
            title: '✅ Información financiera actualizada',
            description:
              'Los cambios financieros se han guardado exitosamente.',
            className: 'bg-green-100 border-green-400 text-green-800',
          });
        }

        // Guardar URLs de imágenes (images_urls) - editable por roles específicos
        if (
          imagesChanged &&
          (profile?.role === 'imagenologia' ||
            profile?.role === 'owner' ||
            profile?.role === 'prueba' ||
            profile?.role === 'call_center')
        ) {
          const { error: imageUrlsError } = await supabase
            .from('medical_records_clean')
            .update({ images_urls: imageUrls.length > 0 ? imageUrls : null })
            .eq('id', currentCase.id);
            
          if (imageUrlsError) {
            console.error('Error saving image URLs:', imageUrlsError);
            toast({
              title: '❌ Error al guardar URLs',
              description: 'No se pudieron guardar las URLs de las imágenes.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: '✅ URLs de imágenes guardadas',
              description: `Se ${imageUrls.length === 1 ? 'ha' : 'han'} guardado ${imageUrls.length} ${imageUrls.length === 1 ? 'imagen' : 'imágenes'} correctamente.`,
              className: 'bg-green-100 border-green-400 text-green-800',
            });
          }
        }

        // Refetch the case data to get the updated information
        refetchCaseData();

        // Exit edit mode
        setIsEditing(false);

        // Clear edited case state
        setEditedCase({});
        setPaymentMethods([]);
        setIsAddingNewPayment(false);
        setNewPaymentMethod({ method: '', amount: 0, reference: '' });
        setImageUrls([]); // Clear image URLs

        // Call onSave callback if provided
        if (onSave) {
          onSave();
        }
      } catch (error) {
        console.error('Error updating case:', error);
        
        let errorMessage = 'No se pudieron guardar los cambios. Por favor, intenta de nuevo.';
        
        if (error instanceof Error) {
          if (error.message.includes('no autenticado')) {
            errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
          } else if (error.message.includes('laboratorio')) {
            errorMessage = 'No tienes permisos para editar este caso.';
          } else if (error.message.includes('not found')) {
            errorMessage = 'El caso que intentas editar no existe.';
          } else if (error.message.includes('constraint') || error.message.includes('required')) {
            errorMessage = 'Por favor, completa todos los campos obligatorios del caso.';
          } else if (error.message.includes('payment')) {
            errorMessage = 'Hubo un problema al guardar los pagos. Verifica los montos ingresados.';
          }
        }
        
        toast({
          title: '❌ Error al guardar cambios',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    };

    // Payment functions removed in new structure - payments handled separately
    // const handleAddPayment = () => { ... }

    // const handleRemovePayment = (index: number) => { ... }

    const toggleChangelog = () => {
      setIsChangelogOpen(!isChangelogOpen);
      if (!isChangelogOpen && case_?.id) {
        refetchChangelogs();
      }
    };

    const handleSendEmail = async () => {
      // Verificar si se están subiendo archivos
      if (isUploadingPdf || isUploadingImages) {
        toast({
          title: '⏳ Subiendo archivos...',
          description: 'Por favor espera a que terminen de subirse los archivos antes de enviar el correo.',
          variant: 'default',
        });
        return;
      }

      if (!case_?.patient_email) {
        toast({
          title: '❌ Error',
          description: 'Este caso no tiene un correo electrónico asociado.',
          variant: 'destructive',
        });
        return;
      }

      // Verificar que exista al menos uno de: PDF caso, PDF adjunto, o imágenes
      const pdfUrl = (case_ as any)?.informe_qr || case_?.attachment_url;
      const uploadedPdf = (case_ as any)?.uploaded_pdf_url;
      const images = (case_ as any)?.images_urls && Array.isArray((case_ as any).images_urls) 
        ? (case_ as any).images_urls 
        : (case_ as any)?.image_url ? [(case_ as any).image_url] : [];

      if (!pdfUrl && !uploadedPdf && images.length === 0) {
        toast({
          title: '❌ Error',
          description: 'El caso debe tener al menos un PDF generado, PDF adjunto o imágenes para enviar por correo.',
          variant: 'destructive',
        });
        return;
      }

      // Abrir modal de envío de email
      setIsSendEmailModalOpen(true);
    };

    const handleConfirmSendEmail = async (emails: {
      to: string;
      cc: string[];
      bcc: string[];
    }) => {
      const pdfUrl = (case_ as any)?.informe_qr || case_?.attachment_url;

      setIsSaving(true);

      try {
        // Crear el mensaje personalizado con el nombre del laboratorio
        const laboratoryName = laboratory?.name || 'nuestro laboratorio';
        // Asunto: el backend agregará el nombre del laboratorio automáticamente
        const emailSubject = `Caso ${case_?.code || case_?.id} - ${case_?.nombre}`;
        const emailBody = `Hola ${case_?.nombre},\n\nLe escribimos desde el laboratorio ${laboratoryName} por su caso ${case_?.code || 'N/A'}.\n\nSaludos cordiales.`;
        
        // Obtener imágenes del caso (priorizar images_urls array)
        const caseImages = (currentCase as any)?.images_urls && Array.isArray((currentCase as any).images_urls) && (currentCase as any).images_urls.length > 0
          ? (currentCase as any).images_urls
          : ((currentCase as any)?.image_url ? [(currentCase as any).image_url] : []);

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
            patientEmail: emails.to,
            patientName: case_?.nombre,
            caseCode: case_?.code || case_?.id,
            pdfUrl: pdfUrl,
            uploadedPdfUrl: (currentCase as any)?.uploaded_pdf_url || null,
            imageUrls: caseImages,
            laboratory_id: case_?.laboratory_id || laboratory?.id,
            subject: emailSubject,
            message: emailBody,
            cc: emails.cc,
            bcc: emails.bcc,
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
          
          // Crear mensaje de error detallado
          let errorMessage = result.error || result.details || 'Error al enviar el email';
          
          // Agregar información de debug si está disponible
          if (result.debug && Array.isArray(result.debug)) {
            const debugSteps = result.debug.join(' → ');
            errorMessage = `${errorMessage}\n\nPasos: ${debugSteps}`;
            
            if (result.fullError) {
              errorMessage += `\n\nDetalle técnico: ${result.fullError}`;
            }
          }
          
          throw new Error(errorMessage);
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

          // Registrar el envío en email_send_logs
          await logEmailSend({
            case_id: case_.id,
            recipient_email: emails.to,
            cc_emails: emails.cc,
            bcc_emails: emails.bcc,
            laboratory_id: case_.laboratory_id || laboratory?.id || '',
            status: 'success',
          });
        }

        const recipientCount = 1 + emails.cc.length + emails.bcc.length;
        toast({
          title: '✅ Correo enviado',
          description: `Se ha enviado el informe a ${recipientCount} destinatario${recipientCount > 1 ? 's' : ''}`,
          className: 'bg-green-100 border-green-400 text-green-800',
        });

        // Cerrar modal
        setIsSendEmailModalOpen(false);

        // Refrescar el caso para mostrar el estado actualizado
        if (onSave) {
          onSave();
        }
      } catch (error) {
        console.error('Error enviando correo:', error);
        
        // Extraer mensaje detallado del error
        let errorMessage = 'No se pudo enviar el correo. Inténtalo de nuevo.';
        let debugInfo = '';
        
        if (error instanceof Error) {
          try {
            // Si el error tiene respuesta JSON, extraerla
            const errorText = error.message;
            if (errorText.includes('{')) {
              const jsonStart = errorText.indexOf('{');
              const jsonStr = errorText.substring(jsonStart);
              const errorData = JSON.parse(jsonStr);
              
              if (errorData.debug && Array.isArray(errorData.debug)) {
                debugInfo = errorData.debug.join(' → ');
                errorMessage = `${errorData.error || 'Error'}: ${debugInfo}`;
              } else if (errorData.error) {
                errorMessage = errorData.error;
              }
            }
          } catch (parseError) {
            // Si no es JSON, usar el mensaje original
            errorMessage = error.message;
          }
        }
        
        // Registrar el error en email_send_logs
        if (case_?.id) {
          await logEmailSend({
            case_id: case_.id,
            recipient_email: emails.to,
            cc_emails: emails.cc,
            bcc_emails: emails.bcc,
            laboratory_id: case_.laboratory_id || laboratory?.id || '',
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Error desconocido',
          });
        }

        toast({
          title: '❌ Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    };

    const handleSendWhatsApp = async () => {
      if (!case_?.telefono) {
        toast({
          title: '❌ Error',
          description: 'Este caso no tiene un número de teléfono asociado.',
          variant: 'destructive',
        });
        return;
      }

      // Create WhatsApp message with case information
      // Para SPT, usar formato específico y adjuntar enlaces por orden si existen
      const pdfUrl = (case_ as any)?.informe_qr || case_?.attachment_url;
      const uploadedPdfUrl = (currentCase as any)?.uploaded_pdf_url || null;
      const caseImages =
        (currentCase as any)?.images_urls &&
        Array.isArray((currentCase as any).images_urls) &&
        (currentCase as any).images_urls.length > 0
          ? (currentCase as any).images_urls
          : (currentCase as any)?.image_url
            ? [(currentCase as any).image_url]
            : [];

      const SIGNED_URL_TTL_SECONDS = 60 * 30;
      const createSignedUrlIfSupabase = async (url: string | null): Promise<string | null> => {
        if (!url) return null;
        try {
          const parsedUrl = new URL(url);
          const match = parsedUrl.pathname.match(
            /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/,
          );

          if (!match) {
            return url;
          }

          const bucket = match[1];
          const filePath = decodeURIComponent(match[2]);
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

          if (error || !data?.signedUrl) {
            console.warn('No se pudo generar URL firmada, usando URL original:', error);
            return url;
          }

          return data.signedUrl;
        } catch (error) {
          console.warn('Error al generar URL firmada, usando URL original:', error);
          return url;
        }
      };

      const [signedPdfUrl, signedUploadedPdfUrl, signedImageUrls] = isSpt
        ? await Promise.all([
            createSignedUrlIfSupabase(pdfUrl),
            createSignedUrlIfSupabase(uploadedPdfUrl),
            Promise.all(caseImages.map((url: string) => createSignedUrlIfSupabase(url))),
          ])
        : [pdfUrl, uploadedPdfUrl, caseImages];

      const safeImageUrls = (signedImageUrls || []).filter(Boolean) as string[];

      const sptMessageLines = [
        `Hola ${case_.nombre}, te escribimos desde Salud Para Todos.`,
      ];

      if (signedPdfUrl) {
        sptMessageLines.push('', 'Reporte (PDF):', signedPdfUrl);
      }

      if (signedUploadedPdfUrl) {
        sptMessageLines.push('', 'PDF adjunto:', signedUploadedPdfUrl);
      }

      if (safeImageUrls.length > 0) {
        sptMessageLines.push('', 'Imágenes:', ...safeImageUrls.map((url: string) => `- ${url}`));
      }

      // Para SPT, no incluir código de caso
      const message = isSpt
        ? sptMessageLines.join('\n')
        : `Hola ${case_.nombre}, le escribimos desde el laboratorio ${laboratory?.name || 'nuestro laboratorio'} por su caso ${case_.code || 'N/A'}.`;

      // Format phone number (remove spaces, dashes, etc.)
      const cleanPhone = case_.telefono?.replace(/[\s-()]/g, '') || '';
      const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        message,
      )}`;

      window.open(whatsappLink, '_blank');

      toast({
        title: '📱 WhatsApp abierto',
        description: 'Se ha abierto WhatsApp con los detalles del caso.',
      });
    };

    const handleCall = () => {
      if (!case_?.telefono) {
        toast({
          title: '❌ Error',
          description: 'Este caso no tiene un número de teléfono asociado.',
          variant: 'destructive',
        });
        return;
      }

      // Format phone number (remove spaces, dashes, etc.)
      const cleanPhone = case_.telefono?.replace(/[\s-()]/g, '') || '';
      const phoneLink = `tel:${cleanPhone}`;

      window.location.href = phoneLink;

      toast({
        title: '📞 Llamando',
        description: `Iniciando llamada a ${case_.telefono}.`,
      });
    };

    const handleDownloadCase = async () => {
      if (!currentCase) {
        toast({
          title: '❌ Error',
          description: 'No se encontró información del caso.',
          variant: 'destructive',
        });
        return;
      }

      const pdfUrl = (currentCase as any)?.informepdf_url || (currentCase as any)?.informe_qr;
      
      if (!pdfUrl) {
        toast({
          title: '❌ Error',
          description: 'No hay PDF disponible para descargar.',
          variant: 'destructive',
        });
        return;
      }

      try {
        setIsSaving(true);
        
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Error al descargar: ${response.status}`);
        }

        const sanitizedName =
          currentCase.nombre ||
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
        link.download = `${currentCase.code || currentCase.id}-${sanitizedName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: '✅ PDF descargado',
          description: 'El documento se ha descargado correctamente.',
        });
      } catch (error) {
        console.error('Error al descargar el PDF:', error);
        toast({
          title: '❌ Error',
          description: 'No se pudo descargar el PDF. Intenta nuevamente.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    };

    const getFieldLabel = (field: string): string => {
      const labels: Record<string, string> = {
        // Patient fields (new structure)
        nombre: 'Nombre Completo',
        cedula: 'Cédula',
        telefono: 'Teléfono',
        patient_email: 'Correo Electrónico',
        edad: 'Edad',
        // Case fields (new structure)
        exam_type: 'Tipo de Examen',
        origin: 'Origen',
        treating_doctor: 'Médico Tratante',
        branch: 'Sede',
        total_amount: 'Monto Total',
        exchange_rate: 'Tasa de Cambio',
        payment_status: 'Estado de Pago',
        status: 'Estado',
        comments: 'Comentarios',
        consulta: 'Tipo de Consulta',
        owner_display_code: 'Código (visible)',
        // Legacy fields (for backward compatibility)
        full_name: 'Nombre Completo',
        id_number: 'Cédula',
        phone: 'Teléfono',
        email: 'Correo Electrónico',
      };
      return labels[field] || field;
    };

    // Payment symbol function removed - not needed in new structure
    // const getPaymentSymbol = useCallback((method?: string | null) => { ... }, [])

    // Payment input creation function removed - not needed in new structure
    // const createPaymentAmountInput = useCallback((...) => { ... }, [...])

    // Payment calculation functions removed - not needed in new structure since
    // payments are handled by a separate payment system
    // const getPaymentInUSD = useCallback(...)
    // const sumPaymentsUSD = useCallback(...)
    // const paidUSD = ...
    // const totalUSD = ...
    // const remainingUSD = ...
    // const remainingVES = ...

    // Get action type display text and icon for changelog
    const getActionTypeInfo = useCallback((log: ChangeLogEntry) => {
      if (log.field_name === 'created_record') {
        return {
          text: 'Creación',
          icon: (
            <FileText className='w-4 h-4 text-green-600 dark:text-green-400' />
          ),
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-800 dark:text-green-300',
        };
      } else if (log.field_name === 'deleted_record') {
        return {
          text: 'Eliminación',
          icon: <Trash2 className='w-4 h-4 text-red-600 dark:text-red-400' />,
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-800 dark:text-red-300',
        };
      } else {
        return {
          text: 'Edición',
          icon: <Eye className='w-4 h-4 text-blue-600 dark:text-blue-400' />,
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-800 dark:text-blue-300',
        };
      }
    }, []);

    // Memoize the InfoSection component
    const InfoSection = useCallback(
      ({
        title,
        icon: Icon,
        children,
      }: {
        title: string;
        icon: React.ComponentType<{ className?: string }>;
        children: React.ReactNode;
      }) => (
        <div className='bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-4 border border-input shadow-sm hover:shadow-md transition-shadow duration-200'>
          <div className='flex items-center gap-2 mb-3'>
            <Icon className='w-5 h-5 text-blue-600 dark:text-blue-400' />
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              {title}
            </h3>
          </div>
          {children}
        </div>
      ),
      [],
    );

    const getStatusColor = (status: string) => {
      const normalized = (status || '').toString().trim().toLowerCase();
      switch (normalized) {
        case 'pagado':
        case 'completado':
          return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'en proceso':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        case 'incompleto':
        case 'parcial': // Tratar "Parcial" como "Incompleto"
          return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'cancelado':
          return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        default:
          return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      }
    };

    if (!currentCase) return null;

    // PDF functionality temporarily disabled in new structure
    // const handleRedirectToPDF = async (caseId: string) => { ... }

    // Calculate financial information
    const totalAmount = currentCase?.total_amount || 0;
    const exchangeRate = currentCase?.exchange_rate || 0;

    // Validar si falta la tasa de cambio para casos antiguos
    const hasValidExchangeRate = exchangeRate > 0;

    // Calculate VES value for converter
    const converterVesValue =
      converterUsdValue && hasValidExchangeRate
        ? (parseFloat(converterUsdValue) * exchangeRate).toFixed(2)
        : '';

    // Get payment methods from current case data
    const currentPaymentMethods: PaymentMethod[] = [];
    for (let i = 1; i <= 4; i++) {
      const method = currentCase[
        `payment_method_${i}` as keyof MedicalCaseWithPatient
      ] as string;
      const amount = currentCase[
        `payment_amount_${i}` as keyof MedicalCaseWithPatient
      ] as number;
      const reference = currentCase[
        `payment_reference_${i}` as keyof MedicalCaseWithPatient
      ] as string;

      if (method && amount) {
        currentPaymentMethods.push({
          method,
          amount,
          reference: reference || '',
        });
      }
    }

    // Use current payment methods if not editing, otherwise use edited ones
    const effectivePaymentMethods = isEditing
      ? paymentMethods
      : currentPaymentMethods;
    const totalPaidUSD = calculateTotalPaidUSD(
      effectivePaymentMethods,
      exchangeRate,
    );
    const remainingUSD = Math.max(0, totalAmount - totalPaidUSD);
    // Si el monto faltante en USD es 0 (redondeado), también mostrar 0 en bolívares
    const remainingVES =
      remainingUSD < 0.01
        ? 0
        : hasValidExchangeRate
        ? remainingUSD * exchangeRate
        : 0;
    // Un pago está completo solo si: hay monto total > 0 Y el pago cubre el total
    const isPaymentComplete = totalAmount > 0 && totalPaidUSD >= totalAmount;

    const notShow =
      profile?.role === 'residente' || profile?.role === 'citotecno';
    // const isResidente = profile?.role === 'residente'
    const isEmployee = profile?.role === 'employee';
    // const isOwner = profile?.role === 'owner'
    // const isCitotecno = profile?.role === 'citotecno'
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isEmployeeSpt = isEmployee && isSpt;

    // Render modal content
    const modalContent = (
      <>
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                viewport={{ margin: '0px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={isEditing ? undefined : handleClose}
                className={`fixed inset-0 bg-black/50 ${
                  isFullscreen
                    ? 'z-[99999999999999999]'
                    : 'z-[9999999999999999]'
                }`}
              />

              {/* Panel */}
              <motion.div
                viewport={{ margin: '0px' }}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`fixed right-0 top-0 h-full w-full sm:w-2/3 lg:w-1/2 xl:w-2/5 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] shadow-2xl ${
                  isFullscreen
                    ? 'z-[99999999999999999]'
                    : 'z-[9999999999999999]'
                } overflow-y-auto overflow-x-hidden rounded-lg border-l border-input`}
              >
                <div className={`sticky top-0 bg-white/50 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-3 sm:p-6 ${
                  isFullscreen
                    ? 'z-[99999999999999999]'
                    : 'z-[9999999999999999]'
                } overflow-x-hidden max-w-full`}>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2 sm:gap-3 flex-1 min-w-0'>
                      <div className='flex-1 min-w-0'>
                        <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                          {modalTitle}
                        </h2>
                      </div>
                    </div>
                    {/* Botón X (derecha) */}
                    <div className='flex items-center gap-2 flex-shrink-0'>
                      <button
                        onClick={handleClose}
                        className='p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none'
                        aria-label='Cerrar'
                      >
                        <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                      </button>
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2 max-w-full overflow-x-hidden'>
                    {isMarihorgen && currentCase.exam_type === 'Inmunohistoquímica' ? (
                      isEditing && isOwner ? (
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={5}
                          placeholder="Código"
                          value={String(editedCase.owner_display_code ?? (currentCase as any).owner_display_code ?? '').slice(0, 5)}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                            handleInputChange('owner_display_code', v);
                          }}
                          className='inline-flex h-7 w-20 px-1.5 sm:px-2 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700 flex-shrink-0'
                        />
                      ) : (
                        <span className='inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 min-w-[2rem] text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 flex-shrink-0'>
                          {(currentCase as any).owner_display_code ?? ''}
                        </span>
                      )
                    ) : currentCase.code ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className='inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 cursor-help flex-shrink-0'>
                            {currentCase.code}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent 
                          style={{ zIndex: 2147483647 }}
                        >
                          {getCodeLegend(currentCase.code, laboratory)}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {!notShow && !isSpt && (
                      <span
                        className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full flex-shrink-0 ${getStatusColor(
                          currentCase.payment_status,
                        )}`}
                      >
                        {currentCase.payment_status}
                      </span>
                    )}
                    {/* PDF download temporarily disabled in new structure */}
                  </div>
                  {/* Action Buttons */}
                  {!notShow && (
                    <div className='flex flex-wrap gap-2 mt-4 max-w-full overflow-x-hidden'>
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            title='Guarda todos los cambios realizados en el caso'
                            className='inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 cursor-pointer flex-shrink-0'
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className='w-4 h-4 animate-spin' />
                                Guardando...
                              </>
                            ) : (
                              <>
                                <Save className='w-4 h-4' />
                                Guardar Cambios
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            title='Cancela la edición y descarta todos los cambios'
                            className='inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-md bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 cursor-pointer flex-shrink-0'
                            disabled={isSaving}
                          >
                            <XCircle className='w-4 h-4' />
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleEditClick}
                            title='Editar información del caso'
                            className='inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors duration-200 flex-shrink-0'
                            aria-label='Editar caso'
                          >
                            <Edit className='w-4 h-4' />
                          </button>
                          <button
                            onClick={toggleChangelog}
                            title={isChangelogOpen ? 'Ocultar historial de cambios' : 'Ver historial de cambios del caso'}
                            className='inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-md bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/40 transition-colors duration-200 flex-shrink-0'
                            aria-label={isChangelogOpen ? 'Ocultar historial' : 'Ver historial'}
                          >
                            <History className='w-4 h-4' />
                          </button>
                          <button
                            onClick={handleSendEmail}
                            disabled={isSaving || isUploadingPdf || isUploadingImages}
                            title={
                              isUploadingPdf || isUploadingImages
                                ? 'Espera a que terminen de subirse los archivos...'
                                : 'Enviar informe por correo electrónico'
                            }
                            className='inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0'
                            aria-label='Enviar correo'
                          >
                            {isSaving || isUploadingPdf || isUploadingImages ? (
                              <Loader2 className='w-4 h-4 animate-spin' />
                            ) : (
                              <Send className='w-4 h-4' />
                            )}
                          </button>
                          <button
                            onClick={handleCall}
                            title='Llamar al paciente por teléfono'
                            className='inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors duration-200 flex-shrink-0'
                            aria-label='Llamar'
                          >
                            <Phone className='w-4 h-4' />
                          </button>
                          <button
                            onClick={handleDownloadCase}
                            disabled={isSaving}
                            title='Descargar el PDF del informe del caso'
                            className='inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0'
                            aria-label='Descargar caso'
                          >
                            {isSaving ? (
                              <Loader2 className='w-4 h-4 animate-spin' />
                            ) : (
                              <Download className='w-4 h-4' />
                            )}
                          </button>
                          <button
                            onClick={handleSendWhatsApp}
                            title='Enviar mensaje por WhatsApp al paciente'
                            className='inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors duration-200 flex-shrink-0'
                            aria-label='Enviar WhatsApp'
                          >
                            <WhatsAppIcon className='w-4 h-4' />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className='p-4 sm:p-6 space-y-6'>
                  {/* Changelog Section */}
                  {isChangelogOpen && !isEditing && (
                    <InfoSection title='Historial de Cambios' icon={History}>
                      {isLoadingChangelogs ? (
                        <div className='flex items-center justify-center p-4'>
                          <Loader2 className='w-6 h-6 animate-spin text-primary mr-2' />
                          <span>Cargando historial...</span>
                        </div>
                      ) : !changelogsData?.data ||
                        changelogsData.data.length === 0 ? (
                        <div className='text-center p-4'>
                          <p className='text-gray-500 dark:text-gray-400'>
                            No hay registros de cambios para este caso.
                          </p>
                        </div>
                      ) : (
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-80 overflow-y-auto overflow-x-hidden'>
                          {changelogsData.data.map((log) => {
                            const actionInfo = getActionTypeInfo(log);
                            return (
                              <div
                                key={log.id}
                                className='border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors overflow-hidden min-w-0'
                              >
                                <div className='flex justify-between items-start mb-2 gap-2 min-w-0'>
                                  <div
                                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${actionInfo.bgColor} ${actionInfo.textColor}`}
                                  >
                                    {actionInfo.icon}
                    {/* Render EditPatientInfoModal outside the panel to avoid z-index issues - COMMENTED OUT (not needed) */}
                    {/*
                    <EditPatientInfoModal
                      isOpen={isEditPatientModalOpen}
                      onClose={() => setIsEditPatientModalOpen(false)}
                      patient={patientData as any}
                      onSave={() => {
                        setIsEditPatientModalOpen(false)
                        refetchPatient()
                        refetchCaseData()
                      }}
                    />
                    */}
                                    <span className='whitespace-nowrap'>{actionInfo.text}</span>
                                  </div>
                                  <div className='text-xs text-gray-500 dark:text-gray-400 flex-shrink-0'>
                                    {format(
                                      new Date(log.changed_at),
                                      'dd/MM/yyyy HH:mm',
                                      { locale: es },
                                    )}
                                  </div>
                                </div>
                                <div className='flex items-center gap-2 mb-2 min-w-0'>
                                  <span className='text-sm break-words overflow-wrap-anywhere'>
                                    {log.user_email}
                                  </span>
                                </div>
                                {log.field_name === 'created_record' ? (
                                  <p className='text-sm break-words overflow-wrap-anywhere'>
                                    Creación de nuevo registro médico
                                  </p>
                                ) : log.field_name === 'deleted_record' ? (
                                  <p className='text-sm break-words overflow-wrap-anywhere'>
                                    Eliminación del registro: {log.old_value}
                                  </p>
                                ) : (
                                  <div className='min-w-0'>
                                    <p className='text-sm font-medium break-words overflow-wrap-anywhere'>
                                      {log.field_label}
                                    </p>
                                    <div className='flex flex-wrap items-center gap-2 mt-1 text-sm min-w-0'>
                                      <span className='line-through text-gray-500 dark:text-gray-400 break-words overflow-wrap-anywhere max-w-full'>
                                        {log.old_value || '(vacío)'}
                                      </span>
                                      <span className='text-xs flex-shrink-0'>→</span>
                                      <span className='text-green-600 dark:text-green-400 break-words overflow-wrap-anywhere max-w-full'>
                                        {log.new_value || '(vacío)'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </InfoSection>
                  )}

                  {/* Patient Information */}
                  <InfoSection title='Información del Paciente' icon={User}>
                    <div className='space-y-1'>
                      <InfoRow
                        label='Nombre completo'
                        value={currentCase.nombre}
                        field='nombre'
                        isEditing={false}
                        editedValue={editedCase.nombre ?? null}
                        onChange={handleInputChange}
                      />
                      
                      {/* Representado por - Solo visible si es representado, siempre visible */}
                      {responsableData?.responsable && (
                        <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                            Representado por:
                          </span>
                          <div className='sm:w-1/2 sm:text-right'>
                            <button
                              type='button'
                              onClick={() => setShowResponsableHistoryModal(true)}
                              className='text-sm text-primary dark:text-primary font-medium hover:underline cursor-pointer text-right'
                            >
                              {responsableData.responsable.nombre} • {responsableData.responsable.cedula}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Botón Ver más/Ver menos */}
                      <div className='flex justify-center pt-2'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => setShowFullPatientInfo(!showFullPatientInfo)}
                          className='text-sm text-primary hover:text-primary/80'
                        >
                          {showFullPatientInfo ? (
                            <>
                              Ver menos
                              <ChevronUp className='ml-1 h-4 w-4' />
                            </>
                          ) : (
                            <>
                              Ver más
                              <ChevronDown className='ml-1 h-4 w-4' />
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Información adicional - Solo visible cuando showFullPatientInfo es true */}
                      {showFullPatientInfo && (
                        <>
                          {/* Cédula - Solo mostrar si NO es representado */}
                          {!responsableData?.responsable && (
                            <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                              <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                                Cédula:
                              </span>
                              <div className='sm:w-1/2 sm:text-right'>
                                <span className='text-sm text-gray-900 dark:text-gray-100 font-medium'>
                                  {currentCase.cedula || 'Sin cédula'}
                                </span>
                              </div>
                            </div>
                          )}
                          {/* Edad: input numérico + dropdown (AÑOS/MESES) */}
                          <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                            <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                              Edad:
                            </span>
                            <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                              {(() => {
                                // Si hay edad, mostrarla
                                if (currentCase.edad) {
                                  return currentCase.edad;
                                }
                                // Si no hay edad pero hay fecha_nacimiento, calcularla
                                const calculatedAge = calculateAgeFromFechaNacimiento(
                                  (currentCase as any).fecha_nacimiento
                                );
                                if (calculatedAge) {
                                  return calculatedAge;
                                }
                                // Si no hay ni edad ni fecha_nacimiento, mostrar "Sin edad"
                                return 'Sin edad';
                              })()}
                            </span>
                          </div>
                          <InfoRow
                            label={responsableData ? 'Teléfono (del responsable)' : 'Teléfono'}
                            value={currentCase.telefono || ''}
                            field='telefono'
                            isEditing={false}
                            editedValue={editedCase.telefono ?? null}
                            onChange={handleInputChange}
                            disabled={!!responsableData}
                          />
                          <InfoRow
                            label='Email'
                            value={currentCase.patient_email || 'N/A'}
                            field='patient_email'
                            type='email'
                            isEditing={false}
                            editedValue={editedCase.patient_email ?? null}
                            onChange={handleInputChange}
                          />
                        </>
                      )}
                      
                      {/* Note: relationship field not in new structure, could be added if needed */}
                    </div>
                  </InfoSection>

                  {/* Medical Information */}
                  <InfoSection title='Información Médica' icon={Stethoscope}>
                    <div className='space-y-1'>
                      {/* Estudio - Dropdown - Solo si está habilitado */}
                      {moduleConfig?.fields?.examType?.enabled && (
                        <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                            Estudio:
                          </span>
                          {isEditing ? (
                            <div className='sm:w-1/2'>
                              <CustomDropdown
                                options={examTypesOptions}
                                value={
                                  editedCase.exam_type ||
                                  currentCase.exam_type ||
                                  ''
                                }
                                onChange={(value) =>
                                  handleInputChange('exam_type', value)
                                }
                                placeholder='Seleccione una opción'
                                className='text-sm'
                                direction='auto'
                              />
                            </div>
                          ) : (
                            <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                              {currentCase.exam_type || 'N/A'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Médico Tratante - Autocompletado - Solo si está habilitado */}
                      {moduleConfig?.fields?.medicoTratante?.enabled && (
                        <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                            Médico tratante:
                          </span>
                          {isEditing ? (
                            <div className='sm:w-1/2'>
                              <AutocompleteInput
                                id='treating-doctor-input'
                                name='treating_doctor'
                                fieldName='treatingDoctor'
                                placeholder='Nombre del Médico'
                                value={
                                  editedCase.treating_doctor !== undefined
                                    ? editedCase.treating_doctor
                                    : currentCase.treating_doctor || ''
                                }
                                onChange={(e) => {
                                  const { value } = e.target;
                                  if (/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]*$/.test(value)) {
                                    handleInputChange('treating_doctor', value);
                                  }
                                }}
                                className='text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50'
                              />
                            </div>
                          ) : (
                            <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                              {currentCase.treating_doctor || 'N/A'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tipo de Consulta - Solo para SPT */}
                      {moduleConfig?.fields?.consulta?.enabled && (
                        <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                            Tipo de consulta:
                          </span>
                          {isEditing ? (
                            <div className='sm:w-1/2'>
                              <FormDropdown
                                id='consulta-input'
                                options={createDropdownOptions([
                                  { value: 'Cardiología', label: 'Cardiología' },
                                  { value: 'Cirujano Cardiovascular', label: 'Cirujano Cardiovascular' },
                                  { value: 'Dermatología', label: 'Dermatología' },
                                  { value: 'Endocrinología', label: 'Endocrinología' },
                                  { value: 'Fisioterapia', label: 'Fisioterapia' },
                                  { value: 'Gastroenterología', label: 'Gastroenterología' },
                                  { value: 'Ginecología', label: 'Ginecología' },
                                  { value: 'Medicina del Dolor', label: 'Medicina del Dolor' },
                                  { value: 'Medicina General', label: 'Medicina General' },
                                  { value: 'Medicina Interna', label: 'Medicina Interna' },
                                  { value: 'Nefrología', label: 'Nefrología' },
                                  { value: 'Neumonología', label: 'Neumonología' },
                                  { value: 'Neurocirugía', label: 'Neurocirugía' },
                                  { value: 'Neurología', label: 'Neurología' },
                                  { value: 'Odontología', label: 'Odontología' },
                                  { value: 'Oftalmología', label: 'Oftalmología' },
                                  { value: 'Optometría', label: 'Optometría' },
                                  { value: 'Otorrinolaringología', label: 'Otorrinolaringología' },
                                  { value: 'Pediatría', label: 'Pediatría' },
                                  { value: 'Psicología', label: 'Psicología' },
                                  { value: 'Psiquiatría', label: 'Psiquiatría' },
                                  { value: 'Radiólogos', label: 'Radiólogos (Radiología)' },
                                  { value: 'Reumatología', label: 'Reumatología' },
                                  { value: 'Traumatología', label: 'Traumatología' },
                                  { value: 'Urología', label: 'Urología' },
                                ].sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })))}
                                value={editedCase.consulta || currentCase.consulta || ''}
                                onChange={(value) => handleInputChange('consulta', value)}
                                placeholder='Seleccione una especialidad'
                                className='text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50'
                              />
                            </div>
                          ) : (
                            <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                              {currentCase.consulta || 'N/A'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Procedencia - Autocompletado - Solo si está habilitado */}
                      {moduleConfig?.fields?.procedencia?.enabled && (
                        <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                            Procedencia:
                          </span>
                          {isEditing ? (
                            <div className='sm:w-1/2'>
                              <AutocompleteInput
                                id='origin-input'
                                name='origin'
                                fieldName='origin'
                                placeholder='Hospital o Clínica'
                                value={
                                  editedCase.origin || currentCase.origin || ''
                                }
                                onChange={(e) => {
                                  const { value } = e.target;
                                  if (
                                    /^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s0-9]*$/.test(value)
                                  ) {
                                    handleInputChange('origin', value);
                                  }
                                }}
                                className='text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50'
                              />
                            </div>
                          ) : (
                            <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                              {currentCase.origin || 'N/A'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Sede - Dropdown - Solo si está habilitado */}
                      {moduleConfig?.fields?.branch?.enabled && (
                        <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                            Sede:
                          </span>
                          {isEditing ? (
                            <div className='sm:w-1/2'>
                              <CustomDropdown
                                options={branchOptions}
                                value={
                                  editedCase.branch || currentCase.branch || ''
                                }
                                onChange={(value) =>
                                  handleInputChange('branch', value)
                                }
                                placeholder='Seleccione una sede'
                                className='text-sm'
                                direction='auto'
                              />
                            </div>
                          ) : (
                            <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                              {currentCase.branch || 'N/A'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Muestra - Autocompletado - Solo si está habilitado */}
                      {moduleConfig?.fields?.sampleType?.enabled && (
                        <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                            Muestra:
                          </span>
                          {isEditing ? (
                            <div className='sm:w-1/2'>
                              <AutocompleteInput
                                id='sample-type-input'
                                name='sample_type'
                                fieldName='sampleType'
                                placeholder='Ej: Biopsia de Piel'
                                value={
                                  editedCase.sample_type ||
                                  currentCase.sample_type ||
                                  ''
                                }
                                onChange={(e) => {
                                  const { value } = e.target;
                                  handleInputChange('sample_type', value);
                                }}
                                className='text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50'
                              />
                            </div>
                          ) : (
                            <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                              {currentCase.sample_type || 'N/A'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Cantidad de muestras - Numérico - Solo si está habilitado */}
                      {moduleConfig?.fields?.numberOfSamples?.enabled && (
                        <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                            Cantidad de muestras:
                          </span>
                          {isEditing ? (
                            <div className='sm:w-1/2'>
                              {/* Note: number_of_samples not in current new structure, can be added if needed */}
                              <Input
                                id='number-of-samples-input'
                                name='number_of_samples'
                                type='number'
                                placeholder='1'
                                value='1'
                                disabled
                                className='text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50'
                              />
                            </div>
                          ) : (
                            <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                              1
                            </span>
                          )}
                        </div>
                      )}

                      {/* PDF Subido - Solo para SPT, roles: laboratorio, employee, owner, prueba (godmode), call_center */}
                      {/* Visible en la sección de Información Médica */}
                      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                        <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                          PDF Adjunto:
                        </span>
                        <div className='sm:flex sm:justify-end sm:flex-1'>
                          {isSpt && (profile?.role === 'laboratorio' || profile?.role === 'employee' || profile?.role === 'owner' || profile?.role === 'prueba' || profile?.role === 'imagenologia' || profile?.role === 'call_center') ? (
                            <CasePDFUpload
                              caseId={currentCase.id}
                              currentPdfUrl={(currentCase as any).uploaded_pdf_url}
                              onUploadingChange={setIsUploadingPdf}
                              onPdfUpdated={async () => {
                                // Refrescar el caso después de subir/eliminar PDF
                                if (refetchCaseData) {
                                  await refetchCaseData();
                                }
                                if (onSave) {
                                  onSave();
                                }
                              }}
                            />
                          ) : (currentCase as any).uploaded_pdf_url ? (
                            <PDFButton 
                              pdfUrl={(currentCase as any).uploaded_pdf_url} 
                              size='sm'
                              variant='outline'
                              isAttached={true}
                            />
                          ) : (
                            <span className='text-sm text-gray-500 dark:text-gray-400'>
                              Sin PDF adjunto
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Image URLs field - Visible for all roles if images exist, editable only for imagenologia/owner/prueba/call_center */}
                      {/* Visible en la sección de Información Médica, después de PDF Adjunto */}
                      <div className='flex flex-col py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                        <span className='text-sm font-medium text-gray-600 dark:text-gray-400 mb-2'>
                          Imágenes (Imagenología):
                        </span>
                        <div className='w-full'>
                          <MultipleImageUrls
                            images={imageUrls}
                            onChange={setImageUrls}
                            maxImages={10}
                            isEditing={(profile?.role === 'imagenologia' || profile?.role === 'owner' || profile?.role === 'prueba' || profile?.role === 'call_center') && isEditing}
                          />
                        </div>
                      </div>

                      {/* Comentarios */}
                      <div className='py-2 border-t border-gray-200 dark:border-gray-700 pt-3'>
                        <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                          Comentarios:
                        </span>
                        {isEditing ? (
                          <Textarea
                            id='comments-textarea'
                            name='comments'
                            value={editedCase.comments || ''}
                            onChange={(e) =>
                              handleInputChange('comments', e.target.value)
                            }
                            className='mt-1 w-full min-h-[100px] text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50'
                            placeholder='Agregar comentarios adicionales...'
                          />
                        ) : (
                          <p className='text-sm text-gray-900 dark:text-gray-100 mt-1 p-3 bg-white dark:bg-background rounded border'>
                            {currentCase.comments || 'Sin comentarios'}
                          </p>
                        )}
                      </div>
                    </div>
                  </InfoSection>

                  {/* Financial Information */}
                  <FeatureGuard feature='hasPayment'>
                    {!notShow && (
                      <InfoSection
                        title='Información Financiera'
                        icon={CreditCard}
                      >
                        {!hasValidExchangeRate && (
                          <div className='mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg'>
                            <div className='flex items-start gap-2'>
                              <svg
                                className='w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                />
                              </svg>
                              <div className='flex-1'>
                                <p className='text-sm font-medium text-yellow-800 dark:text-yellow-300'>
                                  Tasa de cambio no disponible
                                </p>
                                <p className='text-xs text-yellow-700 dark:text-yellow-400 mt-1'>
                                  Este caso fue creado sin tasa de cambio. Los
                                  pagos en Bs no pueden ser convertidos. Edita
                                  el caso para actualizar la información
                                  financiera.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className='space-y-4'>
                          <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                            <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                              Monto total:
                            </span>
                            {isEditing ? (
                              <div className='sm:w-1/2'>
                                {(() => {
                                  const currentValue =
                                    editedCase.total_amount !== undefined
                                      ? editedCase.total_amount
                                      : currentCase?.total_amount || 0;
                                  const calculatorHandler =
                                    createCalculatorInputHandlerWithCurrency(
                                      currentValue,
                                      (value) =>
                                        handleInputChange(
                                          'total_amount',
                                          value,
                                        ),
                                      'USD',
                                      exchangeRate,
                                    );

                                  return (
                                    <div className='flex flex-col gap-1 w-full'>
                                      <div className='w-full'>
                                        <Input
                                          id='total-amount-input'
                                          name='total_amount'
                                          type='text'
                                          inputMode='decimal'
                                          placeholder={
                                            calculatorHandler.placeholder
                                          }
                                          value={calculatorHandler.displayValue}
                                          onKeyDown={
                                            calculatorHandler.handleKeyDown
                                          }
                                          onPaste={
                                            calculatorHandler.handlePaste
                                          }
                                          onFocus={
                                            calculatorHandler.handleFocus
                                          }
                                          onChange={
                                            calculatorHandler.handleChange
                                          }
                                          className='text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50 text-right font-mono'
                                          autoComplete='off'
                                        />
                                      </div>
                                      {calculatorHandler.conversionText && (
                                        <p className='text-xs text-green-600 dark:text-green-400 text-right'>
                                          {calculatorHandler.conversionText}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                                ${totalAmount.toFixed(2)}
                              </span>
                            )}
                          </div>

                          <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                            <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                              Tasa de cambio (USD/VES):
                            </span>
                            <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                              {exchangeRate.toFixed(2)}
                            </span>
                          </div>

                            {isEditing && (
                            <div className='py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                              <div className='w-full space-y-2'>
                                <label className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                                  Convertidor USD a VES
                                </label>
                                {(() => {
                                  const calculatorHandler =
                                    createCalculatorInputHandler(
                                      parseFloat(converterUsdValue) || 0,
                                      (value: number) =>
                                        setConverterUsdValue(value.toString()),
                                    );

                                  return (
                                    <>
                                      <Input
                                        id='converter-usd-input'
                                        name='converter_usd'
                                        type='text'
                                        inputMode='decimal'
                                        placeholder='0,00'
                                        value={calculatorHandler.displayValue}
                                        onKeyDown={
                                          calculatorHandler.handleKeyDown
                                        }
                                        onPaste={calculatorHandler.handlePaste}
                                        onFocus={calculatorHandler.handleFocus}
                                        onChange={
                                          calculatorHandler.handleChange
                                        }
                                        className='text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50 text-right font-mono'
                                        autoComplete='off'
                                      />
                                      {converterVesValue && (
                                        <div className='flex items-center gap-2'>
                                          <p className='text-xs sm:text-sm font-bold text-green-600 dark:text-green-400'>
                                            {converterVesValue} VES
                                          </p>
                                          <Button
                                            variant='ghost'
                                            size='icon'
                                            type='button'
                                            className='h-6 w-6 flex-shrink-0'
                                            onClick={async () => {
                                              try {
                                                await navigator.clipboard.writeText(
                                                  converterVesValue,
                                                );
                                                toast({
                                                  title: '📋 Copiado',
                                                  description: `VES copiado al portapapeles`,
                                                  className:
                                                    'bg-green-100 border-green-400 text-green-800',
                                                });
                                              } catch {
                                                toast({
                                                  title: '❌ No se pudo copiar',
                                                  description:
                                                    'Intenta nuevamente.',
                                                  variant: 'destructive',
                                                });
                                              }
                                            }}
                                            aria-label='Copiar VES'
                                          >
                                            <Copy className='size-4' />
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {isPaymentComplete ? (
                            <div className='bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800'>
                              <div className='flex items-center gap-2 mb-2'>
                                <span className='text-green-600 dark:text-green-400'>
                                  ✅
                                </span>
                                <p className='text-sm font-medium text-green-800 dark:text-green-300'>
                                  Pago completo:
                                </p>
                              </div>
                              <div className='grid grid-cols-2 gap-4 text-sm'>
                                <div>
                                  <span className='text-green-700 dark:text-green-400'>
                                    En USD:
                                  </span>
                                  <p className='font-medium text-green-800 dark:text-green-300'>
                                    ${totalAmount.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <span className='text-green-700 dark:text-green-400'>
                                    En Bs:
                                  </span>
                                  <p className='font-medium text-green-800 dark:text-green-300'>
                                    Bs.{' '}
                                    {(totalAmount * exchangeRate).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : remainingUSD > 0 ? (
                            <div className='bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800'>
                              <div className='flex items-center gap-2 mb-2'>
                                <AlertTriangle className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                                <p className='text-sm font-medium text-orange-800 dark:text-orange-300'>
                                  Monto faltante:
                                </p>
                              </div>
                              <div className='grid grid-cols-2 gap-4 text-sm'>
                                <div>
                                  <span className='text-orange-700 dark:text-orange-400'>
                                    En USD:
                                  </span>
                                  <p className='font-medium text-orange-800 dark:text-orange-300'>
                                    ${remainingUSD.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <span className='text-orange-700 dark:text-orange-400'>
                                    En Bs:
                                  </span>
                                  <p className='font-medium text-orange-800 dark:text-orange-300'>
                                    Bs. {remainingVES.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          <div className='mt-4'>
                            <div className='flex items-center justify-between mb-3'>
                              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                Métodos de Pago:
                              </h4>
                              {isEditing &&
                                effectivePaymentMethods.length < 4 && (
                                  <Button
                                    onClick={handleStartAddingPayment}
                                    size='sm'
                                    className='bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                                  >
                                    <CreditCard className='w-4 h-4 mr-1' />
                                    Agregar
                                  </Button>
                                )}
                            </div>
                            <div className='flex flex-col gap-2'>
                              {effectivePaymentMethods.length > 0 ? (
                                <div className='space-y-3'>
                                  {effectivePaymentMethods.map(
                                    (payment, index) => (
                                      <div
                                        key={index}
                                        className='bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800'
                                      >
                                        <div className='flex items-center justify-between mb-2'>
                                          <span className='text-xs font-medium text-black dark:text-white'>
                                            Método de Pago #{index + 1}
                                          </span>
                                          {isEditing && (
                                            <Button
                                              onClick={() =>
                                                handleRemovePaymentMethod(index)
                                              }
                                              size='sm'
                                              variant='destructive'
                                              className='h-6 w-6 p-0 cursor-pointer'
                                            >
                                              <X className='w-3 h-3' />
                                            </Button>
                                          )}
                                        </div>

                                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                                          {isEditing ? (
                                            <>
                                              <FormDropdown
                                                options={paymentMethodsOptions}
                                                value={payment.method}
                                                onChange={(value) =>
                                                  handlePaymentMethodChange(
                                                    index,
                                                    'method',
                                                    value,
                                                  )
                                                }
                                                placeholder='Método'
                                                className='text-xs border-dashed focus:border-primary focus:ring-primary'
                                                id={`case-payment-method-${index}`}
                                              />
                                              {(() => {
                                                const calculatorHandler =
                                                  createCalculatorInputHandlerWithCurrency(
                                                    payment.amount || 0,
                                                    (value) =>
                                                      handlePaymentMethodChange(
                                                        index,
                                                        'amount',
                                                        value,
                                                      ),
                                                    payment.method,
                                                    exchangeRate,
                                                  );

                                                return (
                                                  <div className='flex flex-col gap-1 w-full'>
                                                    <div className='w-full'>
                                                      <Input
                                                        id={`case-payment-amount-${index}`}
                                                        name={`payment_amount_${
                                                          index + 1
                                                        }`}
                                                        type='text'
                                                        inputMode='decimal'
                                                        placeholder={
                                                          calculatorHandler.placeholder
                                                        }
                                                        value={
                                                          calculatorHandler.displayValue
                                                        }
                                                        onKeyDown={
                                                          calculatorHandler.handleKeyDown
                                                        }
                                                        onPaste={
                                                          calculatorHandler.handlePaste
                                                        }
                                                        onFocus={
                                                          calculatorHandler.handleFocus
                                                        }
                                                        onChange={
                                                          calculatorHandler.handleChange
                                                        }
                                                        className='text-xs border-dashed focus:border-primary focus:ring-primary text-right font-mono'
                                                        autoComplete='off'
                                                      />
                                                    </div>
                                                    {calculatorHandler.conversionText && (
                                                      <p className='text-xs text-green-600 dark:text-green-400 text-right'>
                                                        {
                                                          calculatorHandler.conversionText
                                                        }
                                                      </p>
                                                    )}
                                                  </div>
                                                );
                                              })()}
                                              <Input
                                                id={`case-payment-reference-${index}`}
                                                name={`payment_reference_${
                                                  index + 1
                                                }`}
                                                placeholder='Referencia'
                                                value={payment.reference}
                                                onChange={(e) =>
                                                  handlePaymentMethodChange(
                                                    index,
                                                    'reference',
                                                    e.target.value,
                                                  )
                                                }
                                                className='text-xs border-dashed focus:border-primary focus:ring-primary'
                                              />
                                            </>
                                          ) : (
                                            <>
                                              <div className='flex flex-col'>
                                                <span className='text-xs text-blue-700 dark:text-blue-400 font-medium mb-1'>
                                                  Forma de Pago
                                                </span>
                                                <span className='text-xs text-blue-800 dark:text-blue-300 font-medium'>
                                                  {payment.method}
                                                </span>
                                              </div>
                                              <div className='flex flex-col'>
                                                <span className='text-xs text-blue-700 dark:text-blue-400 font-medium mb-1'>
                                                  Monto
                                                </span>
                                                <span className='text-xs text-blue-800 dark:text-blue-300 font-medium'>
                                                  ${payment.amount.toFixed(2)}
                                                </span>
                                              </div>
                                              <div className='flex flex-col'>
                                                <span className='text-xs text-blue-700 dark:text-blue-400 font-medium mb-1'>
                                                  Referencia
                                                </span>
                                                <span className='text-xs text-blue-800 dark:text-blue-300'>
                                                  {payment.reference ||
                                                    'Sin referencia'}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <div className='text-center p-4 text-gray-500 dark:text-gray-400 text-sm'>
                                  {effectivePaymentMethods.length === 0
                                    ? 'No hay métodos de pago registrados'
                                    : 'Cargando métodos de pago...'}
                                </div>
                              )}

                              {isEditing && isAddingNewPayment && (
                                <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                                  <div className='flex items-center justify-between mb-2'>
                                    <h5 className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                                      Agregar Nuevo Método de Pago:
                                    </h5>
                                    <Button
                                      onClick={handleCancelEditPayment}
                                      size='sm'
                                      variant='outline'
                                      className='h-6 px-2 text-xs cursor-pointer'
                                    >
                                      <X className='w-3 h-3 mr-1' />
                                      Cancelar
                                    </Button>
                                  </div>
                                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                                    <FormDropdown
                                      options={paymentMethodsOptions}
                                      value={newPaymentMethod.method}
                                      onChange={(value) =>
                                        setNewPaymentMethod({
                                          ...newPaymentMethod,
                                          method: value,
                                        })
                                      }
                                      placeholder='Método'
                                      className='text-xs border-dashed focus:border-primary focus:ring-primary'
                                      id='new-payment-method'
                                    />
                                    {(() => {
                                      const calculatorHandler =
                                        createCalculatorInputHandlerWithCurrency(
                                          newPaymentMethod.amount || 0,
                                          (value) =>
                                            setNewPaymentMethod({
                                              ...newPaymentMethod,
                                              amount: value,
                                            }),
                                          newPaymentMethod.method,
                                          exchangeRate,
                                        );

                                      return (
                                        <div className='flex flex-col gap-1 w-full'>
                                          <div className='w-full'>
                                            <Input
                                              id='new-payment-amount'
                                              name='new_payment_amount'
                                              type='text'
                                              inputMode='decimal'
                                              placeholder={
                                                calculatorHandler.placeholder
                                              }
                                              value={
                                                calculatorHandler.displayValue
                                              }
                                              onKeyDown={
                                                calculatorHandler.handleKeyDown
                                              }
                                              onPaste={
                                                calculatorHandler.handlePaste
                                              }
                                              onFocus={
                                                calculatorHandler.handleFocus
                                              }
                                              onChange={
                                                calculatorHandler.handleChange
                                              }
                                              className='text-xs border-dashed focus:border-primary focus:ring-primary text-right font-mono'
                                              autoComplete='off'
                                            />
                                          </div>
                                          {calculatorHandler.conversionText && (
                                            <p className='text-xs text-green-600 dark:text-green-400 text-right'>
                                              {calculatorHandler.conversionText}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    <Input
                                      id='new-payment-reference'
                                      name='new_payment_reference'
                                      placeholder='Referencia'
                                      value={newPaymentMethod.reference}
                                      onChange={(e) =>
                                        setNewPaymentMethod({
                                          ...newPaymentMethod,
                                          reference: e.target.value,
                                        })
                                      }
                                      className='text-xs border-dashed focus:border-primary focus:ring-primary'
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </InfoSection>
                    )}
                  </FeatureGuard>

                  {/* Additional Information */}
                  <div className='bg-white/60 dark:bg-background/30 backdrop-blur-[5px] rounded-lg p-4 border border-input shadow-sm hover:shadow-md transition-shadow duration-200'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-2'>
                        <FileText className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                        <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                          Información Adicional
                        </h3>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
                        className='text-sm text-primary hover:text-primary/80'
                      >
                        {showAdditionalInfo ? (
                          <>
                            Ver menos
                            <ChevronUp className='ml-1 h-4 w-4' />
                          </>
                        ) : (
                          <>
                            Ver más
                            <ChevronDown className='ml-1 h-4 w-4' />
                          </>
                        )}
                      </Button>
                    </div>
                    {showAdditionalInfo && (
                      <div className='space-y-1'>
                        <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-teal-200 dark:border-teal-800 mb-3'>
                          <p className='text-teal-400 text-sm'>
                            Este caso fue creado por{' '}
                            <span className='font-semibold'>
                              {creatorData?.displayName || 'Usuario del sistema'}
                            </span>
                          </p>
                        </div>
                        <InfoRow
                          label='Fecha de creación'
                          value={new Date(
                            currentCase.created_at || '',
                          ).toLocaleDateString('es-ES')}
                          editable={false}
                        />
                        <InfoRow
                          label='Última actualización'
                          value={new Date(
                            currentCase.updated_at || '',
                          ).toLocaleDateString('es-ES')}
                          editable={false}
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Buttons */}
                  {!notShow && (
                    <div className='flex items-center justify-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700'>
                      <button
                        onClick={handleDeleteClick}
                        className='flex items-center justify-center gap-1 px-3 py-2 text-lg font-semibold rounded-md bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 w-full text-center hover:bg-red-200 dark:hover:bg-red-800/40 hover:scale-105 transition-all duration-200'
                      >
                        <Trash2 className='size-5' />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div
            className={`fixed inset-0 ${
              isFullscreen ? 'z-[99999999999999999]' : 'z-[9999999999999999]'
            } flex items-center justify-center bg-black/50`}
          >
            <div className='bg-white/90 dark:bg-background/70 backdrop-blur-[10px] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-input'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='p-2 bg-red-100 dark:bg-red-900/30 rounded-full'>
                  <AlertCircle className='w-6 h-6 text-red-600 dark:text-red-400' />
                </div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  Confirmar eliminación
                </h3>
              </div>

              <p className='text-gray-700 dark:text-gray-300 mb-6'>
                ¿Estás seguro de que quieres eliminar este caso? Esta acción no
                se puede deshacer.
              </p>

              <div className='flex flex-col sm:flex-row gap-3 sm:justify-end'>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className='px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-none'
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-none flex items-center justify-center gap-2'
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className='w-4 h-4' />
                      <span>Confirmar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Modal removed - not needed in new structure */}

        {/* Send Email Modal */}
        {case_ && (
          <SendEmailModal
            isOpen={isSendEmailModalOpen}
            onClose={() => setIsSendEmailModalOpen(false)}
            onSend={handleConfirmSendEmail}
            primaryEmail={case_.patient_email || ''}
            patientName={case_.nombre || ''}
            caseCode={case_.code || case_.id || ''}
            caseId={case_.id}
            isSending={isSaving}
            pdfUrl={(case_ as any)?.informe_qr || case_?.attachment_url}
            uploadedPdfUrl={(currentCase as any)?.uploaded_pdf_url}
            imageUrls={(currentCase as any)?.images_urls || ((currentCase as any)?.image_url ? [(currentCase as any).image_url] : [])}
            laboratoryName={laboratory?.name}
            laboratoryLogo={laboratory?.branding?.logo || undefined}
            laboratorySlug={laboratory?.slug}
          />
        )}

        {/* Historial médico del representante (al hacer clic en "Representado por") - por delante del modal de caso */}
        <PatientHistoryModal
          isOpen={showResponsableHistoryModal}
          onClose={() => setShowResponsableHistoryModal(false)}
          patient={responsableData?.responsable ?? null}
          elevatedZIndex
        />
      </>
    );

    // Use portal when in fullscreen mode to ensure proper rendering
    if (isFullscreen && isOpen) {
      return ReactDOM.createPortal(modalContent, document.body);
    }

    return modalContent;
  },
);

export default UnifiedCaseModal;
