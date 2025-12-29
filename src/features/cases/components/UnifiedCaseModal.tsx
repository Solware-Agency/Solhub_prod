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
} from 'lucide-react';
import type {
  MedicalCaseWithPatient,
  MedicalCaseUpdate,
} from '@/services/supabase/cases/medical-cases-service';
import type { PatientUpdate } from '@/services/supabase/patients/patients-service';
import {
  updateMedicalCase,
  deleteMedicalCase,
  findCaseByCode,
} from '@/services/supabase/cases/medical-cases-service';
import { updatePatient } from '@/services/supabase/patients/patients-service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/config/config';
import { useToast } from '@shared/hooks/use-toast';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
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
  }) => {
    const isEditableField = Boolean(isEditing && editable && field && onChange);
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
    
    // Image URL state for imagenologia role
    const [imageUrl, setImageUrl] = useState('');

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
      if (currentCase && isEditing) {
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
          // Financial data
          total_amount: currentCase.total_amount,
          exchange_rate: currentCase.exchange_rate,
        });
        
        // Initialize image URL for imagenologia role
        setImageUrl((currentCase as any).image_url || '');

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
    }, [currentCase, isEditing]);

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
        onClose();

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
        // Separar cambios en datos del paciente vs datos del caso
        const patientFields = ['nombre', 'telefono', 'patient_email', 'edad'];
        const caseFields = [
          'exam_type',
          'treating_doctor',
          'origin',
          'branch',
          'comments',
        ];
        const financialFields = ['total_amount', 'exchange_rate'];

        // Detectar cambios en datos del paciente
        const patientChanges: Partial<PatientUpdate> = {};
        const patientChangeLogs = [];

        for (const field of patientFields) {
          const newValue = editedCase[field as keyof MedicalCaseWithPatient];
          const oldValue = currentCase[field as keyof MedicalCaseWithPatient];

          if (newValue !== oldValue) {
            // Map patient_email to email for the patient update
            if (field === 'patient_email') {
              patientChanges.email = newValue as string | null;
            } else if (field === 'nombre') {
              patientChanges.nombre = newValue as string;
            } else if (field === 'telefono') {
              patientChanges.telefono = newValue as string | null;
            } else if (field === 'edad') {
              patientChanges.edad = newValue as string | null;
            }
            patientChangeLogs.push({
              field,
              fieldLabel: getFieldLabel(field),
              oldValue,
              newValue,
            });
          }
        }

        // Detectar cambios en datos del caso
        const caseChanges: Partial<MedicalCaseUpdate> = {};
        const caseChangeLogs = [];

        for (const field of caseFields) {
          const newValue = editedCase[field as keyof MedicalCaseWithPatient];
          const oldValue = currentCase[field as keyof MedicalCaseWithPatient];

          if (newValue !== oldValue) {
            if (field === 'exam_type') {
              caseChanges.exam_type = newValue as string;
            } else if (field === 'treating_doctor') {
              caseChanges.treating_doctor = newValue as string;
            } else if (field === 'origin') {
              caseChanges.origin = newValue as string;
            } else if (field === 'branch') {
              caseChanges.branch = newValue as string;
            } else if (field === 'comments') {
              caseChanges.comments = newValue as string | null;
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

        if (
          Object.keys(patientChanges).length === 0 &&
          Object.keys(caseChanges).length === 0 &&
          Object.keys(financialChanges).length === 0
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

        // Actualizar datos del paciente si hay cambios
        if (Object.keys(patientChanges).length > 0) {
          if (!currentCase.patient_id) {
            throw new Error(
              'No se puede actualizar el paciente: patient_id no está disponible',
            );
          }
          await updatePatient(currentCase.patient_id, patientChanges, user.id);

          // Registrar cambios en logs para el paciente
          for (const change of patientChangeLogs) {
            const changeLog = {
              patient_id: currentCase.patient_id,
              user_id: user.id,
              user_email: user.email || 'unknown@email.com',
              user_display_name: user.user_metadata?.display_name || null,
              field_name: change.field,
              field_label: change.fieldLabel,
              old_value: change.oldValue?.toString() || null,
              new_value: change.newValue?.toString() || null,
              changed_at: new Date().toISOString(),
              entity_type: 'patient',
            };

            const { error: logError } = await supabase
              .from('change_logs')
              .insert(changeLog);
            if (logError)
              console.error('Error logging patient change:', logError);
          }

          toast({
            title: '✅ Datos del paciente actualizados',
            description:
              'Los cambios del paciente se han guardado exitosamente.',
            className: 'bg-green-100 border-green-400 text-green-800',
          });
        }

        // Actualizar datos del caso si hay cambios
        if (Object.keys(caseChanges).length > 0) {
          await updateMedicalCase(currentCase.id, caseChanges, user.id);

          // Registrar cambios en logs para el caso
          for (const change of caseChangeLogs) {
            const changeLog = {
              medical_record_id: currentCase.id,
              user_id: user.id,
              user_email: user.email || 'unknown@email.com',
              user_display_name: user.user_metadata?.display_name || null,
              field_name: change.field,
              field_label: change.fieldLabel,
              old_value: change.oldValue?.toString() || null,
              new_value: change.newValue?.toString() || null,
              changed_at: new Date().toISOString(),
              entity_type: 'medical_case',
            };

            const { error: logError } = await supabase
              .from('change_logs')
              .insert(changeLog);
            if (logError) console.error('Error logging case change:', logError);
          }

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
          await updateMedicalCase(currentCase.id, financialChanges, user.id);

          // Registrar cambios en logs para el caso
          for (const change of financialChangeLogs) {
            const changeLog = {
              medical_record_id: currentCase.id,
              user_id: user.id,
              user_email: user.email || 'unknown@email.com',
              user_display_name: user.user_metadata?.display_name || null,
              field_name: change.field,
              field_label: change.fieldLabel,
              old_value: change.oldValue?.toString() || null,
              new_value: change.newValue?.toString() || null,
              changed_at: new Date().toISOString(),
              entity_type: 'medical_case',
            };

            const { error: logError } = await supabase
              .from('change_logs')
              .insert(changeLog);
            if (logError)
              console.error('Error logging financial change:', logError);
          }

          toast({
            title: '✅ Información financiera actualizada',
            description:
              'Los cambios financieros se han guardado exitosamente.',
            className: 'bg-green-100 border-green-400 text-green-800',
          });
        }

        // Save image URL for imagenologia role
        if (profile?.role === 'imagenologia' && imageUrl) {
          const { error: imageUrlError } = await supabase
            .from('medical_records_clean')
            .update({ image_url: imageUrl })
            .eq('id', currentCase.id);
            
          if (imageUrlError) {
            console.error('Error saving image URL:', imageUrlError);
            toast({
              title: '❌ Error al guardar URL',
              description: 'No se pudo guardar la URL de la imagen.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: '✅ URL de imagen guardada',
              description: 'La URL de la imagen se ha guardado correctamente.',
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
        setImageUrl(''); // Clear image URL

        // Call onSave callback if provided
        if (onSave) {
          onSave();
        }
      } catch (error) {
        console.error('Error updating case:', error);
        toast({
          title: '❌ Error al guardar',
          description:
            'Hubo un problema al guardar los cambios. Inténtalo de nuevo.',
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
      if (!case_?.patient_email) {
        toast({
          title: '❌ Error',
          description: 'Este caso no tiene un correo electrónico asociado.',
          variant: 'destructive',
        });
        return;
      }

      // Verificar que exista el PDF (informe_qr es el campo actual, attachment_url es legacy)
      const pdfUrl = (case_ as any)?.informe_qr || case_?.attachment_url;
      if (!pdfUrl) {
        toast({
          title: '❌ Error',
          description: 'El PDF del caso aún no está disponible.',
          variant: 'destructive',
        });
        return;
      }

      setIsSaving(true);

      try {
        // Crear el mensaje personalizado con el nombre del laboratorio
        const laboratoryName = laboratory?.name || 'nuestro laboratorio';
        // Asunto: anteponer el nombre del laboratorio
        const emailSubject = `${laboratoryName} - Caso ${case_.code || case_.id} - ${case_.nombre}`;
        const emailBody = `Hola ${case_.nombre},\n\nLe escribimos desde el laboratorio ${laboratoryName} por su caso ${case_.code || 'N/A'}.\n\nSaludos cordiales.`;
        
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
            patientEmail: case_.patient_email,
            patientName: case_.nombre,
            caseCode: case_.code || case_.id,
            pdfUrl: pdfUrl, // Usar la URL determinada anteriormente (informe_qr o attachment_url)
            laboratory_id: case_.laboratory_id || laboratory?.id,
            subject: emailSubject,
            message: emailBody,
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
          description: `Se ha enviado el informe al correo ${case_.patient_email}`,
          className: 'bg-green-100 border-green-400 text-green-800',
        });

        // Refrescar el caso para mostrar el estado actualizado
        if (onSave) {
          onSave();
        }
      } catch (error) {
        console.error('Error enviando correo:', error);
        toast({
          title: '❌ Error',
          description: 'No se pudo enviar el correo. Inténtalo de nuevo.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    };

    const handleSendWhatsApp = () => {
      if (!case_?.telefono) {
        toast({
          title: '❌ Error',
          description: 'Este caso no tiene un número de teléfono asociado.',
          variant: 'destructive',
        });
        return;
      }

      // Create WhatsApp message with case information
      const message = `Hola ${
        case_.nombre
      }, le escribimos desde el laboratorio conspat por su caso ${
        case_.code || 'N/A'
      }.`;

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
    // const isEmployee = profile?.role === 'employee'
    // const isOwner = profile?.role === 'owner'
    // const isCitotecno = profile?.role === 'citotecno'

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
                onClick={isEditing ? undefined : onClose}
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
                } overflow-y-auto rounded-lg border-l border-input`}
              >
                <div className='sticky top-0 bg-white/50 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-3 sm:p-6 z-10'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div>
                        <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                          {modalTitle}
                        </h2>
                      </div>
                      <div className='flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2'>
                        {currentCase.code && (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className='inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'>
                                {currentCase.code}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {getCodeLegend(currentCase.code, laboratory)}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!notShow && !(isSpt && currentCase.payment_status === 'Incompleto') && (
                          <span
                            className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${getStatusColor(
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
                        <div className='flex gap-2 mt-4'>
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleSaveChanges}
                                disabled={isSaving}
                                className='inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 cursor-pointer'
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
                                className='inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-md bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 cursor-pointer'
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
                                className='inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 hover:scale-105 transition-all duration-200'
                              >
                                <Edit className='w-4 h-4' />
                                Editar
                              </button>
                              <button
                                onClick={toggleChangelog}
                                className='inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-md bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/40 hover:scale-105 transition-all duration-200'
                              >
                                <History className='w-4 h-4' />
                                {isChangelogOpen ? 'Ocultar' : 'Historial'}
                              </button>
                              <button
                                onClick={handleSendEmail}
                                disabled={isSaving}
                                className='inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className='w-4 h-4 animate-spin' />
                                    Enviando...
                                  </>
                                ) : (
                                  <>
                                    <Send className='w-4 h-4' />
                                    Correo
                                  </>
                                )}
                              </button>
                              <button
                                onClick={handleSendWhatsApp}
                                className='inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 hover:scale-105 transition-all duration-200'
                              >
                                <WhatsAppIcon className='w-4 h-4' />
                                WhatsApp
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={onClose}
                        className='p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none'
                      >
                        <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className='p-4 sm:p-6 space-y-6'>
                  <div className='bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800'>
                    <p className='text-teal-400 text-sm'>
                      Este caso fue creado por{' '}
                      <span className='font-semibold'>
                        {creatorData?.displayName || 'Usuario del sistema'}
                      </span>{' '}
                      el{' '}
                      {currentCase.created_at
                        ? format(
                            new Date(currentCase.created_at),
                            'dd/MM/yyyy',
                            { locale: es },
                          )
                        : 'Fecha no disponible'}
                    </p>
                  </div>

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
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-80 overflow-y-auto'>
                          {changelogsData.data.map((log) => {
                            const actionInfo = getActionTypeInfo(log);
                            return (
                              <div
                                key={log.id}
                                className='border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors'
                              >
                                <div className='flex justify-between items-start mb-2'>
                                  <div
                                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${actionInfo.bgColor} ${actionInfo.textColor}`}
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
                                    <span>{actionInfo.text}</span>
                                  </div>
                                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                                    {format(
                                      new Date(log.changed_at),
                                      'dd/MM/yyyy HH:mm',
                                      { locale: es },
                                    )}
                                  </div>
                                </div>
                                <div className='flex items-center gap-2 mb-2'>
                                  <span className='text-sm'>
                                    {log.user_email}
                                  </span>
                                </div>
                                {log.field_name === 'created_record' ? (
                                  <p className='text-sm'>
                                    Creación de nuevo registro médico
                                  </p>
                                ) : log.field_name === 'deleted_record' ? (
                                  <p className='text-sm'>
                                    Eliminación del registro: {log.old_value}
                                  </p>
                                ) : (
                                  <div>
                                    <p className='text-sm font-medium'>
                                      {log.field_label}
                                    </p>
                                    <div className='flex items-center gap-2 mt-1 text-sm'>
                                      <span className='line-through text-gray-500 dark:text-gray-400'>
                                        {log.old_value || '(vacío)'}
                                      </span>
                                      <span className='text-xs'>→</span>
                                      <span className='text-green-600 dark:text-green-400'>
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
                        isEditing={isEditing}
                        editedValue={editedCase.nombre ?? null}
                        onChange={handleInputChange}
                      />
                      <InfoRow
                        label='Cédula'
                        value={currentCase.cedula}
                        editable={false}
                      />
                      {/* Edad: input numérico + dropdown (AÑOS/MESES) */}
                      <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                        <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                          Edad:
                        </span>
                        {isEditing ? (
                          <div className='sm:w-1/2 grid grid-cols-2 gap-2'>
                            {(() => {
                              const parsed = parseEdad(
                                String(
                                  editedCase.edad ?? currentCase.edad ?? '',
                                ),
                              );
                              const ageValue = parsed.value;
                              const ageUnit = parsed.unit;
                              return (
                                <>
                                  <Input
                                    id='edad-input'
                                    name='edad'
                                    type='number'
                                    placeholder='0'
                                    value={ageValue === '' ? '' : ageValue}
                                    min={0}
                                    max={150}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      const numeric =
                                        newValue === '' ? '' : Number(newValue);
                                      const unitToUse = ageUnit || 'Años';
                                      const newEdad =
                                        newValue === ''
                                          ? null
                                          : `${numeric} ${unitToUse}`;
                                      handleInputChange('edad', newEdad);
                                    }}
                                    className='text-sm border-dashed focus:border-primary focus:ring-primary bg-gray-50 dark:bg-gray-800/50'
                                  />
                                  <CustomDropdown
                                    id='edad-unit-dropdown'
                                    options={createDropdownOptions([
                                      'Meses',
                                      'Años',
                                    ])}
                                    value={ageUnit || 'Años'}
                                    onChange={(newUnit) => {
                                      const parsedNow = parseEdad(
                                        String(
                                          editedCase.edad ??
                                            currentCase.edad ??
                                            '',
                                        ),
                                      );
                                      const valueNow = parsedNow.value;
                                      const valueToUse =
                                        valueNow === '' ? '' : valueNow;
                                      const newEdad =
                                        valueToUse === ''
                                          ? null
                                          : `${valueToUse} ${newUnit}`;
                                      handleInputChange('edad', newEdad);
                                    }}
                                    placeholder='Unidad'
                                    className='text-sm'
                                    direction='auto'
                                  />
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className='text-sm text-gray-900 dark:text-gray-100 sm:text-right font-medium'>
                            {currentCase.edad || 'Sin edad'}
                          </span>
                        )}
                      </div>
                      <InfoRow
                        label='Teléfono'
                        value={currentCase.telefono || ''}
                        field='telefono'
                        isEditing={isEditing}
                        editedValue={editedCase.telefono ?? null}
                        onChange={handleInputChange}
                      />
                      <InfoRow
                        label='Email'
                        value={currentCase.patient_email || 'N/A'}
                        field='patient_email'
                        type='email'
                        isEditing={isEditing}
                        editedValue={editedCase.patient_email ?? null}
                        onChange={handleInputChange}
                      />
                      
                      {/* Image URL field - Only visible for imagenologia role */}
                      {profile?.role === 'imagenologia' && (
                        <div className='flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-transform duration-150 rounded px-2 -mx-2'>
                          <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                            URL de Imagen:
                          </span>
                          <div className='sm:w-1/2 space-y-2'>
                            <Input
                              id='image-url-input'
                              name='image_url'
                              type='url'
                              placeholder='https://ejemplo.com/imagen.jpg'
                              value={imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              className='text-sm focus:border-primary focus:ring-primary bg-white dark:bg-gray-800'
                            />
                            <div className='flex gap-2'>
                              <Button
                                size='sm'
                                onClick={async () => {
                                  if (!imageUrl) {
                                    toast({
                                      title: '⚠️ Campo vacío',
                                      description: 'Por favor ingresa una URL válida',
                                      variant: 'default',
                                    });
                                    return;
                                  }
                                  // TODO: Implementar guardado cuando se defina la columna
                                  toast({
                                    title: '⏳ Pendiente',
                                    description: 'La funcionalidad de guardado se implementará cuando se defina la columna en la BD',
                                    variant: 'default',
                                  });
                                }}
                              >
                                <Save className='w-3 h-3 mr-1' />
                                Guardar URL
                              </Button>
                              {imageUrl && (
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => window.open(imageUrl, '_blank')}
                                >
                                  <Eye className='w-3 h-3 mr-1' />
                                  Ver
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
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
                                  editedCase.treating_doctor ||
                                  currentCase.treating_doctor ||
                                  ''
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
                              <AutocompleteInput
                                id='consulta-input'
                                name='consulta'
                                fieldName='consulta'
                                placeholder='Ej: Cardiología, Medicina General'
                                value={
                                  editedCase.consulta ||
                                  currentCase.consulta ||
                                  ''
                                }
                                onChange={(e) => {
                                  const { value } = e.target;
                                  if (
                                    /^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]*$/.test(value)
                                  ) {
                                    handleInputChange('consulta', value);
                                  }
                                }}
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
                  <InfoSection title='Información Adicional' icon={FileText}>
                    <div className='space-y-1'>
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
                      <div className='py-2'>
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
