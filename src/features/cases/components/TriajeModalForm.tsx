import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Info,
  Activity,
  AlertCircle,
  CheckCircle,
  Heart,
  Thermometer,
  Gauge,
  Wind,
  Droplets,
  Scale,
  Ruler,
  FileText,
  Clock,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { Button } from '@shared/components/ui/button';
import {
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@shared/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useToast } from '@shared/hooks/use-toast';
import {
  getTriageByCase,
  createTriageRecord,
  updateTriageRecord,
  getSmokingRiskCategory,
  type TriageRecord,
  type HabitLevel,
} from '@/services/supabase/triage/triage-service';

interface TriajeFormData {
  frecuenciaCardiaca: string;
  frecuenciaRespiratoria: string;
  saturacionOxigeno: string;
  temperatura: string;
  talla: string;
  peso: string;
  presionArterial: string;
  imc: string;
  antecedentesFamiliares: string;
  antecedentesPersonales: string;
  habitosPsicobiologicos: string;
  tabaco: string; // Dropdown temporal ("Si" / "No")
  cafe: string; // Número de tazas por día
  alcohol: HabitLevel;
  cigarrillosPorDia: string;
  anosFumando: string;
  indiceTabaquico: string; // Calculado automáticamente
  motivoConsulta: string;
  examenFisico: string;
  comentario: string;
}

interface TriajeModalFormProps {
  case_: MedicalCaseWithPatient | null;
  onClose: () => void;
  onSave?: () => void;
  showOnlyVitalSigns?: boolean;
  userRole?: string;
}

// Componente para mostrar información del triaje existente
const TriageInfoDisplay: React.FC<{
  record: TriageRecord;
  onEdit?: () => void;
  canEdit?: boolean;
}> = ({ record, onEdit, canEdit = false }) => {
  return (
    <div className='p-4 sm:p-6 space-y-6'>
      {/* Header con fecha */}
      <div className='flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center gap-2'>
          <Clock className='h-5 w-5 text-primary' />
          <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
            Triaje registrado el{' '}
            {format(new Date(record.measurement_date), 'dd/MM/yyyy', {
              locale: es,
            })}
          </span>
          <span className='text-xs text-gray-500 dark:text-gray-400'>
            {format(new Date(record.measurement_date), 'HH:mm', { locale: es })}
          </span>
        </div>
        {canEdit && onEdit && (
          <Button
            onClick={onEdit}
            variant='outline'
            className='flex items-center gap-2'
          >
            <Edit className='h-4 w-4' />
            Editar
          </Button>
        )}
      </div>

      {/* Grid de signos vitales */}
      <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
        <CardHeader className='p-4 sm:p-6'>
          <CardTitle className='text-base sm:text-lg'>Signos Vitales</CardTitle>
        </CardHeader>
        <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0'>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
            {/* Altura */}
            {record.height_cm && (
              <div className='flex items-start gap-2'>
                <Ruler className='h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Altura
                  </p>
                  <p className='text-sm font-medium'>{record.height_cm} cm</p>
                </div>
              </div>
            )}

            {/* Peso */}
            {record.weight_kg && (
              <div className='flex items-start gap-2'>
                <Scale className='h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Peso
                  </p>
                  <p className='text-sm font-medium'>{record.weight_kg} kg</p>
                </div>
              </div>
            )}

            {/* IMC */}
            {record.bmi && (
              <div className='flex items-start gap-2'>
                <Activity className='h-4 w-4 text-green-500 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    IMC
                  </p>
                  <p className='text-sm font-medium'>{record.bmi}</p>
                </div>
              </div>
            )}

            {/* Presión arterial */}
            {record.blood_pressure && (
              <div className='flex items-start gap-2'>
                <Gauge className='h-4 w-4 text-red-500 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Presión
                  </p>
                  <p className='text-sm font-medium'>
                    {record.blood_pressure} mmHg
                  </p>
                </div>
              </div>
            )}

            {/* Frecuencia cardíaca */}
            {record.heart_rate && (
              <div className='flex items-start gap-2'>
                <Heart className='h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>FC</p>
                  <p className='text-sm font-medium'>{record.heart_rate} lpm</p>
                </div>
              </div>
            )}

            {/* Frecuencia respiratoria */}
            {record.respiratory_rate && (
              <div className='flex items-start gap-2'>
                <Wind className='h-4 w-4 text-cyan-500 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>FR</p>
                  <p className='text-sm font-medium'>
                    {record.respiratory_rate} rpm
                  </p>
                </div>
              </div>
            )}

            {/* Saturación de oxígeno */}
            {record.oxygen_saturation !== null &&
              record.oxygen_saturation !== undefined && (
                <div className='flex items-start gap-2'>
                  <Droplets className='h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0' />
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      SpO₂
                    </p>
                    <p className='text-sm font-medium'>
                      {record.oxygen_saturation}%
                    </p>
                  </div>
                </div>
              )}

            {/* Temperatura */}
            {record.temperature_celsius && (
              <div className='flex items-start gap-2'>
                <Thermometer className='h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Temp
                  </p>
                  <p className='text-sm font-medium'>
                    {record.temperature_celsius}°C
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información clínica */}
      {(record.reason ||
        record.personal_background ||
        record.family_history ||
        record.psychobiological_habits ||
        record.tabaco !== null) && (
        <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
          <CardHeader className='p-4 sm:p-6'>
            <CardTitle className='text-base sm:text-lg'>
              Información Clínica
            </CardTitle>
          </CardHeader>
          <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {record.reason && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Motivo de consulta
                </p>
                <p className='text-sm'>{record.reason}</p>
              </div>
            )}
            {record.personal_background && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Antecedentes personales
                </p>
                <p className='text-sm'>{record.personal_background}</p>
              </div>
            )}
            {record.family_history && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Antecedentes familiares
                </p>
                <p className='text-sm'>{record.family_history}</p>
              </div>
            )}
            {record.psychobiological_habits && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Hábitos psicobiológicos
                </p>
                <p className='text-sm'>{record.psychobiological_habits}</p>
              </div>
            )}
            {record.tabaco !== null && record.tabaco !== undefined && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Índice Tabáquico
                </p>
                <p className='text-sm font-medium'>{record.tabaco} paq/año</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                    record.tabaco === 0
                      ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      : record.tabaco < 10
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : record.tabaco <= 20
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      : record.tabaco <= 40
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}
                >
                  {getSmokingRiskCategory(record.tabaco)}
                </span>
              </div>
            )}
            {record.cafe !== null && record.cafe !== undefined && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Café (tazas/día)
                </p>
                <p className='text-sm font-medium'>
                  {record.cafe} {record.cafe === 1 ? 'taza' : 'tazas'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Examen físico y comentarios */}
      {(record.examen_fisico || record.comment) && (
        <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
          <CardContent className='p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {record.examen_fisico && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1'>
                  <FileText className='h-3 w-3' />
                  Examen físico
                </p>
                <p className='text-sm'>{record.examen_fisico}</p>
              </div>
            )}
            {record.comment && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Comentarios
                </p>
                <p className='text-sm'>{record.comment}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const TriajeModalForm: React.FC<TriajeModalFormProps> = ({
  case_,
  onClose,
  onSave,
  showOnlyVitalSigns = false,
  userRole,
}) => {
  const isEnfermero = userRole === 'enfermero';
  const isMedico = userRole === 'medico_tratante' || userRole === 'medicowner';
  const { toast } = useToast();
  const [formData, setFormData] = useState<TriajeFormData>({
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    saturacionOxigeno: '',
    temperatura: '',
    talla: '',
    peso: '',
    presionArterial: '',
    imc: '',
    antecedentesFamiliares: '',
    antecedentesPersonales: '',
    habitosPsicobiologicos: '',
    tabaco: '',
    cafe: '',
    alcohol: '',
    cigarrillosPorDia: '',
    anosFumando: '',
    indiceTabaquico: '',
    motivoConsulta: '',
    examenFisico: '',
    comentario: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Verificar si existe triaje para este caso
  const {
    data: existingTriage,
    isLoading: isLoadingTriage,
    refetch: refetchTriage,
  } = useQuery({
    queryKey: ['triage-by-case', case_?.id],
    queryFn: async () => {
      if (!case_?.id) return null;
      return await getTriageByCase(case_.id);
    },
    enabled: !!case_?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calcular IMC automáticamente cuando cambian peso o talla
  useEffect(() => {
    const peso = parseFloat(formData.peso);
    const talla = parseFloat(formData.talla) / 100; // Convertir cm a metros

    if (peso > 0 && talla > 0) {
      const imcCalculado = (peso / (talla * talla)).toFixed(2);
      setFormData((prev) => ({
        ...prev,
        imc: imcCalculado,
      }));
    } else if (!peso || !talla) {
      setFormData((prev) => ({
        ...prev,
        imc: '',
      }));
    }
  }, [formData.peso, formData.talla]);

  // Calcular índice tabáquico automáticamente
  useEffect(() => {
    const cigarrillos = parseFloat(formData.cigarrillosPorDia);
    const anos = parseFloat(formData.anosFumando);

    if (cigarrillos > 0 && anos > 0) {
      const indice = (cigarrillos * anos) / 20;
      const indiceRedondeado = Math.round(indice * 100) / 100;

      // Determinar categoría de riesgo
      let categoria = '';
      if (indiceRedondeado < 10) {
        categoria = 'Nulo';
      } else if (indiceRedondeado <= 20) {
        categoria = 'Riesgo moderado';
      } else if (indiceRedondeado <= 40) {
        categoria = 'Riesgo intenso';
      } else {
        categoria = 'Riesgo alto';
      }

      const textoIndice = `Índice: ${indiceRedondeado} paq/año (${categoria})`;
      setFormData((prev) => ({
        ...prev,
        indiceTabaquico: textoIndice,
      }));
    } else if (!cigarrillos || !anos) {
      setFormData((prev) => ({
        ...prev,
        indiceTabaquico: '',
      }));
    }
  }, [formData.cigarrillosPorDia, formData.anosFumando]);

  // Cargar datos existentes cuando se entra en modo edición
  useEffect(() => {
    if (existingTriage && isEditing) {
      // Si existe triaje y estamos en modo edición, cargar los datos
      if (isEnfermero) {
        // Enfermero: solo cargar signos vitales
        setFormData((prev) => ({
          ...prev,
          frecuenciaCardiaca: existingTriage.heart_rate?.toString() || '',
          frecuenciaRespiratoria:
            existingTriage.respiratory_rate?.toString() || '',
          saturacionOxigeno: existingTriage.oxygen_saturation?.toString() || '',
          temperatura: existingTriage.temperature_celsius?.toString() || '',
          presionArterial: existingTriage.blood_pressure?.toString() || '',
          talla: existingTriage.height_cm?.toString() || '',
          peso: existingTriage.weight_kg?.toString() || '',
          imc: existingTriage.bmi?.toString() || '',
        }));
      } else if (isMedico) {
        // Médico: cargar todos los datos
        setFormData((prev) => ({
          ...prev,
          frecuenciaCardiaca: existingTriage.heart_rate?.toString() || '',
          frecuenciaRespiratoria:
            existingTriage.respiratory_rate?.toString() || '',
          saturacionOxigeno: existingTriage.oxygen_saturation?.toString() || '',
          temperatura: existingTriage.temperature_celsius?.toString() || '',
          presionArterial: existingTriage.blood_pressure?.toString() || '',
          talla: existingTriage.height_cm?.toString() || '',
          peso: existingTriage.weight_kg?.toString() || '',
          imc: existingTriage.bmi?.toString() || '',
          motivoConsulta: existingTriage.reason || '',
          antecedentesPersonales: existingTriage.personal_background || '',
          antecedentesFamiliares: existingTriage.family_history || '',
          habitosPsicobiologicos: existingTriage.psychobiological_habits || '',
          examenFisico: existingTriage.examen_fisico || '',
          comentario: existingTriage.comment || '',
          cafe: existingTriage.cafe?.toString() || '',
          alcohol: existingTriage.alcohol || '',
          ...(existingTriage.tabaco !== null &&
          existingTriage.tabaco !== undefined
            ? {
                tabaco: existingTriage.tabaco > 0 ? 'Si' : 'No',
                indiceTabaquico:
                  existingTriage.tabaco > 0
                    ? `Índice: ${
                        existingTriage.tabaco
                      } paq/año (${getSmokingRiskCategory(
                        existingTriage.tabaco,
                      )})`
                    : '',
              }
            : {}),
        }));
      }
    }
  }, [existingTriage, isEditing, isMedico, isEnfermero]);

  const handleInputChange = (
    field: keyof TriajeFormData,
    value: string | HabitLevel,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  const handleNumericInput = (field: keyof TriajeFormData, value: string) => {
    // Solo permitir números y punto decimal
    const numericValue = value.replace(/[^0-9.]/g, '');
    handleInputChange(field, numericValue);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!case_) {
      setError('No hay un caso seleccionado.');
      return;
    }

    if (!case_.patient_id) {
      setError('El caso no tiene un paciente asociado.');
      return;
    }

    try {
      setLoading(true);

      // Preparar datos de signos vitales (siempre se incluyen)
      const vitalSignsData = {
        heart_rate: formData.frecuenciaCardiaca
          ? parseInt(formData.frecuenciaCardiaca, 10)
          : null,
        respiratory_rate: formData.frecuenciaRespiratoria
          ? parseInt(formData.frecuenciaRespiratoria, 10)
          : null,
        oxygen_saturation: formData.saturacionOxigeno
          ? parseInt(formData.saturacionOxigeno, 10)
          : null,
        temperature_celsius: formData.temperatura
          ? parseFloat(formData.temperatura)
          : null,
        blood_pressure: formData.presionArterial || null,
        height_cm: formData.talla ? parseFloat(formData.talla) : null,
        weight_kg: formData.peso ? parseFloat(formData.peso) : null,
      };

      // Si es enfermero, solo guardar signos vitales
      if (isEnfermero) {
        if (existingTriage) {
          // Si ya existe triaje, actualizar solo los signos vitales
          await updateTriageRecord(existingTriage.id, vitalSignsData);
          toast({
            title: '✅ Signos vitales actualizados exitosamente',
            description: `Los signos vitales han sido actualizados para el caso ${
              case_.code || case_.id
            }.`,
          });
        } else {
          // Si no existe triaje, crear uno nuevo solo con signos vitales
          await createTriageRecord({
            patient_id: case_.patient_id,
            case_id: case_.id,
            ...vitalSignsData,
          });
          toast({
            title: '✅ Signos vitales registrados exitosamente',
            description: `Los signos vitales han sido guardados para el caso ${
              case_.code || case_.id
            }.`,
          });
        }
        setMessage('Signos vitales guardados exitosamente.');
      } else {
        // Si es médico, guardar/actualizar todo el triaje
        const fullTriageData = {
          patient_id: case_.patient_id,
          case_id: case_.id,
          reason: formData.motivoConsulta || null,
          personal_background: formData.antecedentesPersonales || null,
          family_history: formData.antecedentesFamiliares || null,
          psychobiological_habits: formData.habitosPsicobiologicos || null,
          tabaco: formData.indiceTabaquico
            ? parseFloat(
                formData.indiceTabaquico
                  .split(':')[1]
                  ?.split('paq')[0]
                  ?.trim() || '0',
              ) || null
            : formData.tabaco === 'No'
            ? 0
            : null,
          cafe: formData.cafe ? parseInt(formData.cafe, 10) : null,
          alcohol: formData.alcohol || null,
          examen_fisico: formData.examenFisico || null,
          comment: formData.comentario || null,
          ...vitalSignsData,
        };

        if (existingTriage) {
          // Si ya existe triaje, actualizarlo
          await updateTriageRecord(existingTriage.id, fullTriageData);
          toast({
            title: '✅ Triaje actualizado exitosamente',
            description: `Los datos de triaje han sido actualizados para el caso ${
              case_.code || case_.id
            }.`,
          });
          setMessage('Triaje actualizado exitosamente.');
        } else {
          // Si no existe triaje, crear uno nuevo
          await createTriageRecord(fullTriageData);
          toast({
            title: '✅ Triaje registrado exitosamente',
            description: `Los datos de triaje han sido guardados para el caso ${
              case_.code || case_.id
            }.`,
          });
          setMessage('Triaje registrado exitosamente.');
        }
      }

      // Refrescar el triaje
      await refetchTriage();

      // Verificar si el triaje quedó completo después de guardar
      const updatedTriage = await getTriageByCase(case_.id);
      const isComplete = isTriageComplete(updatedTriage || null);

      // Si el triaje está completo, volver al modo vista
      if (isComplete) {
        setIsEditing(false);
        // Cargar los datos actualizados en el formulario por si acaso
        if (updatedTriage && isMedico && !isEnfermero) {
          setFormData((prev) => ({
            ...prev,
            frecuenciaCardiaca: updatedTriage.heart_rate?.toString() || '',
            frecuenciaRespiratoria:
              updatedTriage.respiratory_rate?.toString() || '',
            saturacionOxigeno:
              updatedTriage.oxygen_saturation?.toString() || '',
            temperatura: updatedTriage.temperature_celsius?.toString() || '',
            presionArterial: updatedTriage.blood_pressure?.toString() || '',
            talla: updatedTriage.height_cm?.toString() || '',
            peso: updatedTriage.weight_kg?.toString() || '',
            imc: updatedTriage.bmi?.toString() || '',
            motivoConsulta: updatedTriage.reason || '',
            antecedentesPersonales: updatedTriage.personal_background || '',
            antecedentesFamiliares: updatedTriage.family_history || '',
            habitosPsicobiologicos: updatedTriage.psychobiological_habits || '',
            examenFisico: updatedTriage.examen_fisico || '',
            comentario: updatedTriage.comment || '',
            cafe: updatedTriage.cafe?.toString() || '',
            alcohol: updatedTriage.alcohol || '',
            ...(updatedTriage.tabaco !== null &&
            updatedTriage.tabaco !== undefined
              ? {
                  tabaco: updatedTriage.tabaco > 0 ? 'Si' : 'No',
                  indiceTabaquico:
                    updatedTriage.tabaco > 0
                      ? `Índice: ${
                          updatedTriage.tabaco
                        } paq/año (${getSmokingRiskCategory(
                          updatedTriage.tabaco,
                        )})`
                      : '',
                }
              : {}),
          }));
        }
      }

      // Limpiar formulario solo si no hay triaje completo
      if (!isComplete) {
        setTimeout(() => {
          setFormData({
            frecuenciaCardiaca: '',
            frecuenciaRespiratoria: '',
            saturacionOxigeno: '',
            temperatura: '',
            talla: '',
            peso: '',
            presionArterial: '',
            imc: '',
            antecedentesFamiliares: '',
            antecedentesPersonales: '',
            habitosPsicobiologicos: '',
            tabaco: '',
            cafe: '',
            alcohol: '',
            cigarrillosPorDia: '',
            anosFumando: '',
            indiceTabaquico: '',
            motivoConsulta: '',
            examenFisico: '',
            comentario: '',
          });
          setMessage('');
          if (onSave) {
            onSave();
          }
        }, 1000);
      } else {
        setTimeout(() => {
          setMessage('');
          if (onSave) {
            onSave();
          }
        }, 1000);
      }
    } catch (err: unknown) {
      console.error('Error al registrar triaje:', err);
      const msg = err instanceof Error ? err.message : '';
      setError('Error al registrar el triaje. Inténtalo de nuevo.');
      toast({
        title: '❌ Error al registrar triaje',
        description: msg || 'Hubo un problema al guardar los datos de triaje.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    'transition-transform duration-300 focus:border-primary focus:ring-primary';

  if (!case_) {
    return null;
  }

  // Mostrar loading mientras se verifica si existe triaje
  if (isLoadingTriage) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='flex items-center gap-3'>
          <Loader2 className='h-6 w-6 animate-spin text-primary' />
          <span className='text-lg text-gray-700 dark:text-gray-300'>
            Cargando información de triaje...
          </span>
        </div>
      </div>
    );
  }

  // Función para determinar si el triaje está completo
  const isTriageComplete = (triage: TriageRecord | null): boolean => {
    if (!triage) return false;

    // Para enfermero: solo necesita signos vitales
    if (isEnfermero) {
      return !!(
        triage.heart_rate ||
        triage.respiratory_rate ||
        triage.oxygen_saturation ||
        triage.temperature_celsius ||
        triage.blood_pressure ||
        triage.height_cm ||
        triage.weight_kg
      );
    }

    // Para médico: necesita signos vitales + datos clínicos
    if (isMedico) {
      const hasVitalSigns = !!(
        triage.heart_rate ||
        triage.respiratory_rate ||
        triage.oxygen_saturation ||
        triage.temperature_celsius ||
        triage.blood_pressure ||
        triage.height_cm ||
        triage.weight_kg
      );

      const hasClinicalData = !!(
        triage.reason ||
        triage.personal_background ||
        triage.family_history ||
        triage.examen_fisico ||
        triage.psychobiological_habits ||
        triage.tabaco !== null ||
        triage.cafe !== null ||
        triage.alcohol
      );

      return hasVitalSigns && hasClinicalData;
    }

    // Para otros usuarios: necesita datos clínicos
    return !!(
      triage.reason ||
      triage.personal_background ||
      triage.family_history ||
      triage.examen_fisico
    );
  };

  // Si el triaje está completo y no estamos editando, mostrar vista
  const triageComplete = isTriageComplete(existingTriage ?? null);
  const canEditTriage = isEnfermero || isMedico;

  if (existingTriage && triageComplete && !isEditing) {
    return (
      <div className='p-4'>
        <TriageInfoDisplay
          record={existingTriage}
          onEdit={canEditTriage ? () => setIsEditing(true) : undefined}
          canEdit={canEditTriage}
        />
      </div>
    );
  }

  // Mostrar formulario (ya sea porque no existe triaje, o porque estamos editando)
  return (
    <TooltipProvider delayDuration={0}>
      <div className='p-4 sm:p-6'>
        <form onSubmit={handleSubmit} className='space-y-3 sm:space-y-4'>
          {/* Sección: Motivo de Consulta y Hábitos en la misma fila */}
          {!showOnlyVitalSigns && (
            <div className='grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3 sm:gap-4'>
              {/* Motivo de consulta - Izquierda */}
              <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
                <CardHeader className='p-4 sm:p-6'>
                  <CardTitle className='text-base sm:text-lg'>
                    Motivo de consulta
                  </CardTitle>
                </CardHeader>
                <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0'>
                  <Textarea
                    placeholder='Ingrese el motivo de consulta...'
                    value={formData.motivoConsulta}
                    onChange={(e) =>
                      handleInputChange('motivoConsulta', e.target.value)
                    }
                    disabled={loading}
                    rows={4}
                    className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                  />
                </CardContent>
              </Card>

              {/* Hábitos - Derecha */}
              <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
                <CardHeader className='p-4 sm:p-6'>
                  <CardTitle className='text-base sm:text-lg'>
                    Hábitos
                  </CardTitle>
                </CardHeader>
                <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0'>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4'>
                    <div>
                      <label className='text-sm font-medium mb-2 block'>
                        ¿Fuma?
                      </label>
                      <select
                        value={formData.tabaco}
                        onChange={(e) =>
                          handleInputChange('tabaco', e.target.value)
                        }
                        disabled={loading}
                        className={`w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inputStyles}`}
                      >
                        <option value=''>Seleccione...</option>
                        <option value='No'>No</option>
                        <option value='Si'>Sí</option>
                      </select>
                    </div>
                    <div>
                      <label className='text-sm font-medium mb-2 block'>
                        Café (tazas/día)
                      </label>
                      <Input
                        type='number'
                        min='0'
                        step='1'
                        placeholder='Ej: 3'
                        value={formData.cafe}
                        onChange={(e) =>
                          handleInputChange('cafe', e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === 'e' ||
                            e.key === 'E' ||
                            e.key === '-' ||
                            e.key === '+'
                          ) {
                            e.preventDefault();
                          }
                        }}
                        disabled={loading}
                        className={inputStyles}
                      />
                    </div>
                    <div>
                      <label className='text-sm font-medium mb-2 block'>
                        Alcohol
                      </label>
                      <select
                        value={formData.alcohol}
                        onChange={(e) =>
                          handleInputChange(
                            'alcohol',
                            e.target.value as HabitLevel,
                          )
                        }
                        disabled={loading}
                        className={`w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inputStyles}`}
                      >
                        <option value=''>Seleccione...</option>
                        <option value='No'>No</option>
                        <option value='muy alta'>Muy alta</option>
                        <option value='alta'>Alta</option>
                        <option value='media'>Media</option>
                        <option value='baja'>Baja</option>
                        <option value='muy baja'>Muy baja</option>
                      </select>
                    </div>
                  </div>

                  {/* Sección de Índice Tabáquico */}
                  {formData.tabaco === 'Si' && (
                    <div className='border-t border-gray-200 dark:border-gray-700 pt-4'>
                      <h4 className='text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300'>
                        Índice Tabáquico
                      </h4>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <div>
                          <label className='text-sm font-medium mb-2 block'>
                            Cigarrillos por día
                          </label>
                          <Input
                            type='number'
                            min='0'
                            step='1'
                            placeholder='Ej: 20'
                            value={formData.cigarrillosPorDia}
                            onChange={(e) =>
                              handleInputChange(
                                'cigarrillosPorDia',
                                e.target.value,
                              )
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === 'e' ||
                                e.key === 'E' ||
                                e.key === '-' ||
                                e.key === '+'
                              ) {
                                e.preventDefault();
                              }
                            }}
                            disabled={loading}
                            className={inputStyles}
                          />
                        </div>
                        <div>
                          <label className='text-sm font-medium mb-2 block'>
                            Años fumando
                          </label>
                          <Input
                            type='number'
                            min='0'
                            step='1'
                            placeholder='Ej: 15'
                            value={formData.anosFumando}
                            onChange={(e) =>
                              handleInputChange('anosFumando', e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === 'e' ||
                                e.key === 'E' ||
                                e.key === '-' ||
                                e.key === '+'
                              ) {
                                e.preventDefault();
                              }
                            }}
                            disabled={loading}
                            className={inputStyles}
                          />
                        </div>
                      </div>

                      {/* Mostrar índice calculado */}
                      {formData.indiceTabaquico && (
                        <div className='mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg'>
                          <p className='text-sm font-semibold text-blue-900 dark:text-blue-100'>
                            {formData.indiceTabaquico}
                          </p>
                          <p className='text-xs text-blue-700 dark:text-blue-300 mt-1'>
                            Fórmula: (Cigarrillos/día × Años) / 20
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sección: Antecedentes - Ocupa todo el ancho */}
          {!showOnlyVitalSigns && (
            <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
              <CardHeader className='p-4 sm:p-6'>
                <CardTitle className='text-base sm:text-lg'>
                  Antecedentes
                </CardTitle>
              </CardHeader>
              <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3'>
                <div>
                  <label className='text-base font-medium mb-2 block'>
                    Antecedentes personales
                  </label>
                  <Textarea
                    placeholder='Ingrese los antecedentes personales...'
                    value={formData.antecedentesPersonales}
                    onChange={(e) =>
                      handleInputChange(
                        'antecedentesPersonales',
                        e.target.value,
                      )
                    }
                    disabled={loading}
                    rows={4}
                    className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                  />
                </div>
                <div>
                  <label className='text-base font-medium mb-2 block'>
                    Antecedentes familiares
                  </label>
                  <Textarea
                    placeholder='Ingrese los antecedentes familiares...'
                    value={formData.antecedentesFamiliares}
                    onChange={(e) =>
                      handleInputChange(
                        'antecedentesFamiliares',
                        e.target.value,
                      )
                    }
                    disabled={loading}
                    rows={4}
                    className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                  />
                </div>
                <div>
                  <label className='text-base font-medium mb-2 block'>
                    Hábitos psicobiológicos
                  </label>
                  <Textarea
                    placeholder='Ingrese los hábitos psicobiológicos...'
                    value={formData.habitosPsicobiologicos}
                    onChange={(e) =>
                      handleInputChange(
                        'habitosPsicobiologicos',
                        e.target.value,
                      )
                    }
                    disabled={loading}
                    rows={4}
                    className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sección: Signos Vitales */}
          <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
            <CardHeader className='p-4 sm:p-6'>
              <CardTitle className='text-base sm:text-lg'>
                Signos Vitales
              </CardTitle>
            </CardHeader>
            <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 sm:gap-3'>
              <div>
                <label className='text-base font-medium mb-2 flex items-center gap-1'>
                  FC
                  <TooltipPrimitive.Root delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                    </TooltipTrigger>
                    <TooltipContent
                      side='top'
                      sideOffset={5}
                      className='!z-[9999999]'
                    >
                      <p>Frecuencia cardíaca</p>
                    </TooltipContent>
                  </TooltipPrimitive.Root>
                </label>
                <Input
                  type='text'
                  placeholder='Latidos/min'
                  value={formData.frecuenciaCardiaca}
                  onChange={(e) =>
                    handleNumericInput('frecuenciaCardiaca', e.target.value)
                  }
                  disabled={loading}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className='text-base font-medium mb-2 flex items-center gap-1'>
                  FR
                  <TooltipPrimitive.Root delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                    </TooltipTrigger>
                    <TooltipContent
                      side='top'
                      sideOffset={5}
                      className='!z-[9999999]'
                    >
                      <p>Frecuencia respiratoria</p>
                    </TooltipContent>
                  </TooltipPrimitive.Root>
                </label>
                <Input
                  type='text'
                  placeholder='Respiraciones/min'
                  value={formData.frecuenciaRespiratoria}
                  onChange={(e) =>
                    handleNumericInput('frecuenciaRespiratoria', e.target.value)
                  }
                  disabled={loading}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className='text-base font-medium mb-2 flex items-center gap-1'>
                  SpO₂
                  <TooltipPrimitive.Root delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                    </TooltipTrigger>
                    <TooltipContent
                      side='top'
                      sideOffset={5}
                      className='!z-[9999999]'
                    >
                      <p>Saturación de oxígeno</p>
                    </TooltipContent>
                  </TooltipPrimitive.Root>
                </label>
                <Input
                  type='text'
                  placeholder='%'
                  value={formData.saturacionOxigeno}
                  onChange={(e) =>
                    handleNumericInput('saturacionOxigeno', e.target.value)
                  }
                  disabled={loading}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className='text-base font-medium mb-2 block'>
                  Temperatura
                </label>
                <Input
                  type='text'
                  placeholder='°C'
                  value={formData.temperatura}
                  onChange={(e) =>
                    handleNumericInput('temperatura', e.target.value)
                  }
                  disabled={loading}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className='text-base font-medium mb-2 block'>
                  Presión arterial
                </label>
                <Input
                  type='text'
                  placeholder='Ej: 120/80 mmHg'
                  value={formData.presionArterial}
                  onChange={(e) =>
                    handleInputChange('presionArterial', e.target.value)
                  }
                  disabled={loading}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className='text-base font-medium mb-2 block'>
                  Talla
                </label>
                <Input
                  type='text'
                  placeholder='Cm'
                  value={formData.talla}
                  onChange={(e) => handleNumericInput('talla', e.target.value)}
                  disabled={loading}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className='text-base font-medium mb-2 block'>Peso</label>
                <Input
                  type='text'
                  placeholder='Kg'
                  value={formData.peso}
                  onChange={(e) => handleNumericInput('peso', e.target.value)}
                  disabled={loading}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className='text-base font-medium mb-2 flex items-center gap-1'>
                  IMC
                  <TooltipPrimitive.Root delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                    </TooltipTrigger>
                    <TooltipContent
                      side='top'
                      sideOffset={5}
                      className='!z-[9999999]'
                    >
                      <p>Índice de masa corporal</p>
                    </TooltipContent>
                  </TooltipPrimitive.Root>
                </label>
                <Input
                  type='text'
                  placeholder='Kg/m²'
                  value={formData.imc}
                  readOnly
                  disabled={loading}
                  className={`${inputStyles} bg-muted cursor-not-allowed`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sección: Examen Físico y Observaciones */}
          {!showOnlyVitalSigns && (
            <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
              <CardContent className='p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'>
                <div>
                  <label className='text-base font-medium mb-2 block'>
                    Examen físico
                  </label>
                  <Textarea
                    placeholder='Ingrese el examen físico...'
                    value={formData.examenFisico}
                    onChange={(e) =>
                      handleInputChange('examenFisico', e.target.value)
                    }
                    disabled={loading}
                    rows={4}
                    className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                  />
                </div>
                <div>
                  <label className='text-base font-medium mb-2 block'>
                    Observaciones
                  </label>
                  <Textarea
                    placeholder='Ingrese observaciones adicionales...'
                    value={formData.comentario}
                    onChange={(e) =>
                      handleInputChange('comentario', e.target.value)
                    }
                    disabled={loading}
                    rows={4}
                    className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mensajes de error y éxito */}
          {error && (
            <div className='border px-4 py-3 rounded mb-4 flex items-start gap-2 bg-red-900/80 border-red-700 text-red-200'>
              <AlertCircle className='w-5 h-5 mt-0.5 flex-shrink-0' />
              <div className='flex-1'>
                <p className='font-medium'>{error}</p>
              </div>
            </div>
          )}

          {message && (
            <div className='bg-green-900/80 border border-green-700 text-green-200 px-4 py-3 rounded mb-4 flex items-center gap-2'>
              <CheckCircle className='size-5 flex-shrink-0' />
              <span>{message}</span>
            </div>
          )}

          {/* Botones */}
          <div className='flex gap-4 pt-4'>
            <Button
              type='submit'
              disabled={loading}
              className='flex-1 font-bold text-sm sm:text-base py-1.5 sm:py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-transform duration-300 transform hover:-translate-y-1'
            >
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  {isEnfermero ? 'Guardando signos vitales...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <Activity className='mr-2 h-4 w-4' />
                  {isEnfermero
                    ? 'Enviar signos vitales'
                    : isMedico
                    ? 'Completar triaje'
                    : 'Registrar Triaje'}
                </>
              )}
            </Button>
            <Button
              type='button'
              onClick={() => {
                if (isEditing && triageComplete) {
                  // Si estamos editando y el triaje está completo, cancelar edición y volver a vista
                  setIsEditing(false);
                  // Recargar datos originales
                  if (existingTriage && isMedico && !isEnfermero) {
                    setFormData((prev) => ({
                      ...prev,
                      frecuenciaCardiaca:
                        existingTriage.heart_rate?.toString() || '',
                      frecuenciaRespiratoria:
                        existingTriage.respiratory_rate?.toString() || '',
                      saturacionOxigeno:
                        existingTriage.oxygen_saturation?.toString() || '',
                      temperatura:
                        existingTriage.temperature_celsius?.toString() || '',
                      presionArterial:
                        existingTriage.blood_pressure?.toString() || '',
                      talla: existingTriage.height_cm?.toString() || '',
                      peso: existingTriage.weight_kg?.toString() || '',
                      imc: existingTriage.bmi?.toString() || '',
                      motivoConsulta: existingTriage.reason || '',
                      antecedentesPersonales:
                        existingTriage.personal_background || '',
                      antecedentesFamiliares:
                        existingTriage.family_history || '',
                      habitosPsicobiologicos:
                        existingTriage.psychobiological_habits || '',
                      examenFisico: existingTriage.examen_fisico || '',
                      comentario: existingTriage.comment || '',
                      cafe: existingTriage.cafe?.toString() || '',
                      alcohol: existingTriage.alcohol || '',
                      ...(existingTriage.tabaco !== null &&
                      existingTriage.tabaco !== undefined
                        ? {
                            tabaco: existingTriage.tabaco > 0 ? 'Si' : 'No',
                            indiceTabaquico:
                              existingTriage.tabaco > 0
                                ? `Índice: ${
                                    existingTriage.tabaco
                                  } paq/año (${getSmokingRiskCategory(
                                    existingTriage.tabaco,
                                  )})`
                                : '',
                          }
                        : {}),
                    }));
                  }
                } else {
                  // Si no estamos editando o el triaje no está completo, cerrar modal
                  onClose();
                }
              }}
              disabled={loading}
              variant='outline'
              className='px-6'
            >
              {isEditing && triageComplete ? 'Cancelar edición' : 'Cancelar'}
            </Button>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
};

export default TriajeModalForm;
