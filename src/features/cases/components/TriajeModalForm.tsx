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
  tabaco: HabitLevel;
  cafe: HabitLevel;
  alcohol: HabitLevel;
  motivoConsulta: string;
  examenFisico: string;
  comentario: string;
}

interface TriajeModalFormProps {
  case_: MedicalCaseWithPatient | null;
  onClose: () => void;
  onSave?: () => void;
  showOnlyVitalSigns?: boolean;
}

// Componente para mostrar información del triaje existente
const TriageInfoDisplay: React.FC<{ record: TriageRecord }> = ({ record }) => {
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
        record.psychobiological_habits) && (
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
}) => {
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
    motivoConsulta: '',
    examenFisico: '',
    comentario: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

      // Convertir datos del formulario al formato del servicio
      const triageData = {
        patient_id: case_.patient_id,
        case_id: case_.id,
        reason: formData.motivoConsulta || null,
        personal_background: formData.antecedentesPersonales || null,
        family_history: formData.antecedentesFamiliares || null,
        psychobiological_habits: formData.habitosPsicobiologicos || null,
        tabaco: formData.tabaco || null,
        cafe: formData.cafe || null,
        alcohol: formData.alcohol || null,
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
        examen_fisico: formData.examenFisico || null,
        comment: formData.comentario || null,
      };

      await createTriageRecord(triageData);

      toast({
        title: '✅ Triaje registrado exitosamente',
        description: `Los datos de triaje han sido guardados para el caso ${
          case_.code || case_.id
        }.`,
      });

      setMessage('Triaje registrado exitosamente.');

      // Refrescar el triaje
      await refetchTriage();

      // Limpiar formulario después de 1 segundo
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
          motivoConsulta: '',
          examenFisico: '',
          comentario: '',
        });
        setMessage('');
        if (onSave) {
          onSave();
        }
      }, 1000);
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

  // Si existe triaje, mostrar información
  if (existingTriage) {
    return (
      <div className='p-4'>
        <TriageInfoDisplay record={existingTriage} />
      </div>
    );
  }

  // Si NO existe triaje, mostrar formulario
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
                <CardTitle className='text-base sm:text-lg'>Hábitos</CardTitle>
              </CardHeader>
              <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0'>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3'>
                  <div>
                    <label className='text-sm font-medium mb-2 block'>
                      Tabaco
                    </label>
                    <select
                      value={formData.tabaco}
                      onChange={(e) =>
                        handleInputChange('tabaco', e.target.value as HabitLevel)
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
                  <div>
                    <label className='text-sm font-medium mb-2 block'>
                      Café
                    </label>
                    <select
                      value={formData.cafe}
                      onChange={(e) =>
                        handleInputChange('cafe', e.target.value as HabitLevel)
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
                  <div>
                    <label className='text-sm font-medium mb-2 block'>
                      Alcohol
                    </label>
                    <select
                      value={formData.alcohol}
                      onChange={(e) =>
                        handleInputChange('alcohol', e.target.value as HabitLevel)
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
                    handleInputChange('antecedentesPersonales', e.target.value)
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
                    handleInputChange('antecedentesFamiliares', e.target.value)
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
                    handleInputChange('habitosPsicobiologicos', e.target.value)
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
                  Guardando...
                </>
              ) : (
                <>
                  <Activity className='mr-2 h-4 w-4' />
                  Registrar Triaje
                </>
              )}
            </Button>
            <Button
              type='button'
              onClick={onClose}
              disabled={loading}
              variant='outline'
              className='px-6'
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
};

export default TriajeModalForm;
