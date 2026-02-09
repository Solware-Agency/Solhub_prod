import React, { useState, useEffect, useCallback } from 'react';
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
  Coffee,
  Cigarette,
  Wine,
  User,
  Users,
  Brain,
  Stethoscope,
  MessageSquare,
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
  glicemia: string;
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
  enfermedadActual: string;
  antecedentesQuirurgicos: string;
  antecedentesSexuales: string;
  diagnostico: string;
  planDeAccion: string;
  lugarNacimiento: string;
  telefonoEmergencia: string;
}

interface TriajeModalFormProps {
  case_: MedicalCaseWithPatient | null;
  onClose: () => void;
  onSave?: () => void;
  showOnlyVitalSigns?: boolean;
  userRole?: string;
  forceEditMode?: boolean;
}

// Componente para mostrar información de la historia clínica existente
const TriageInfoDisplay: React.FC<{
  record: TriageRecord;
}> = ({ record }) => {
  // Validar que el record existe
  if (!record) {
    return (
      <div className='p-4 sm:p-6'>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          No hay información de historia clínica disponible.
        </p>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 space-y-6'>
      {/* Header con fecha */}
      <div className='flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center gap-2'>
          <Clock className='h-5 w-5 text-primary' />
          {(() => {
            if (!record.measurement_date) {
              return (
                <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                  Historia clínica registrada
                </span>
              );
            }
            try {
              const date = new Date(record.measurement_date);
              if (isNaN(date.getTime())) {
                return (
                  <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                    Historia clínica registrada
                  </span>
                );
              }
              return (
                <>
                  <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                    Historia clínica registrada el{' '}
                    {format(date, 'dd/MM/yyyy', {
                      locale: es,
                    })}
                  </span>
                  <span className='text-xs text-gray-500 dark:text-gray-400'>
                    {format(date, 'HH:mm', { locale: es })}
                  </span>
                </>
              );
            } catch (error) {
              console.error('Error formateando fecha de triaje:', error);
              return (
                <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                  Historia clínica registrada
                </span>
              );
            }
          })()}
        </div>
      </div>

      {/* Grid de signos vitales */}
      <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'>
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
                    {typeof record.blood_pressure === 'string' 
                      ? record.blood_pressure 
                      : record.blood_pressure} mmHg
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

            {/* Glicemia */}
            {record.blood_glucose && (
              <div className='flex items-start gap-2'>
                <Droplets className='h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0' />
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Glicemia
                  </p>
                  <p className='text-sm font-medium'>
                    {record.blood_glucose} mg/dL
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Motivo de consulta y Enfermedad actual - misma línea */}
      {(record.reason || record.enfermedad_actual) && (
        <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'>
          <CardHeader className='p-4 sm:p-6'>
            <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-green-700 dark:text-green-300'>
              <MessageSquare className='h-5 w-5 text-green-600 dark:text-green-400' />
              Motivo de consulta
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
            {record.enfermedad_actual && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Enfermedad actual
                </p>
                <p className='text-sm'>{record.enfermedad_actual}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hábitos */}
      {(record.psychobiological_habits ||
        record.tabaco !== null ||
        record.cafe !== null ||
        record.alcohol) && (
        <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'>
          <CardHeader className='p-4 sm:p-6'>
            <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-amber-700 dark:text-amber-300'>
              <Brain className='h-5 w-5 text-amber-600 dark:text-amber-400' />
              Hábitos
            </CardTitle>
          </CardHeader>
          <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 flex flex-wrap items-end gap-x-4 gap-y-3'>
            {record.psychobiological_habits && (
              <div className='flex-1 min-w-[150px]'>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Hábitos psicobiológicos
                </p>
                <p className='text-sm'>{record.psychobiological_habits}</p>
              </div>
            )}
            {record.tabaco !== null && record.tabaco !== undefined && (
              <div className='flex-1 min-w-[150px]'>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Índice Tabáquico
                </p>
                <div className='flex items-center gap-2'>
                  <p className='text-sm font-medium'>{record.tabaco} paq/año</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block ${
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
              </div>
            )}
            {record.cafe !== null && record.cafe !== undefined && (
              <div className='flex-1 min-w-[150px]'>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Café (tazas/día)
                </p>
                <p className='text-sm font-medium'>
                  {record.cafe} {record.cafe === 1 ? 'taza' : 'tazas'}
                </p>
              </div>
            )}
            {record.alcohol && (
              <div className='flex-1 min-w-[150px]'>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Alcohol
                </p>
                <p className='text-sm font-medium capitalize'>
                  {record.alcohol === 'No' ? 'No' : record.alcohol}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Antecedentes */}
      {(record.personal_background ||
        record.family_history ||
        record.antecedentes_quirurgicos ||
        (record as { antecedentes_sexuales?: string | null }).antecedentes_sexuales) && (
        <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20'>
          <CardHeader className='p-4 sm:p-6'>
            <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-teal-700 dark:text-teal-300'>
              <FileText className='h-5 w-5 text-teal-600 dark:text-teal-400' />
              Antecedentes
            </CardTitle>
          </CardHeader>
          <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
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
            {record.antecedentes_quirurgicos && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Antecedentes quirúrgicos
                </p>
                <p className='text-sm'>{record.antecedentes_quirurgicos}</p>
              </div>
            )}
            {(record as { antecedentes_sexuales?: string | null }).antecedentes_sexuales && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Antecedentes sexuales
                </p>
                <p className='text-sm'>{(record as { antecedentes_sexuales: string }).antecedentes_sexuales}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Examen físico, Diagnóstico, Plan de acción y comentarios */}
      {(record.examen_fisico ||
        record.comment ||
        record.diagnostico ||
        record.plan_de_accion) && (
        <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20'>
          <CardHeader className='p-4 sm:p-6'>
            <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-violet-700 dark:text-violet-300'>
              <Stethoscope className='h-5 w-5 text-violet-600 dark:text-violet-400' />
              Examen Físico y Observaciones
            </CardTitle>
          </CardHeader>
          <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
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
            {record.diagnostico && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Diagnóstico
                </p>
                <p className='text-sm'>{record.diagnostico}</p>
              </div>
            )}
            {record.plan_de_accion && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Plan de acción
                </p>
                <p className='text-sm'>{record.plan_de_accion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Datos adicionales - al final */}
      {(record.lugar_de_nacimiento || record.telefono_emergencia) && (
        <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20'>
          <CardHeader className='p-4 sm:p-6'>
            <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-slate-700 dark:text-slate-300'>
              <User className='h-5 w-5 text-slate-600 dark:text-slate-400' />
              Datos adicionales
            </CardTitle>
          </CardHeader>
          <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {record.lugar_de_nacimiento && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Lugar de nacimiento
                </p>
                <p className='text-sm'>{record.lugar_de_nacimiento}</p>
              </div>
            )}
            {record.telefono_emergencia && (
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                  Número de teléfono de emergencia
                </p>
                <p className='text-sm'>{record.telefono_emergencia}</p>
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
  forceEditMode = false,
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
    glicemia: '',
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
    enfermedadActual: '',
    antecedentesQuirurgicos: '',
    antecedentesSexuales: '',
    diagnostico: '',
    planDeAccion: '',
    lugarNacimiento: '',
    telefonoEmergencia: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Verificar si existe historia clínica para este caso
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
    refetchOnMount: 'always',
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

  // Función para obtener las clases CSS según el valor del índice tabáquico
  const getSmokingIndexColorClasses = (indice: number) => {
    if (indice === 0) {
      return {
        bg: 'bg-gray-50 dark:bg-gray-900',
        border: 'border-gray-200 dark:border-gray-800',
        text: 'text-gray-700 dark:text-gray-300',
      };
    } else if (indice < 10) {
      return {
        bg: 'bg-green-50 dark:bg-green-950',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-900 dark:text-green-100',
      };
    } else if (indice <= 20) {
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-950',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-900 dark:text-yellow-100',
      };
    } else if (indice <= 40) {
      return {
        bg: 'bg-orange-50 dark:bg-orange-950',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-900 dark:text-orange-100',
      };
    } else {
      return {
        bg: 'bg-red-50 dark:bg-red-950',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-900 dark:text-red-100',
      };
    }
  };

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

  // Función para determinar si la historia clínica está completa
  // Función para determinar si la historia clínica está completa
  // Campos obligatorios: Motivo de consulta, SpO2, PA, Talla, Peso
  const isTriageComplete = (triage: TriageRecord | null): boolean => {
    if (!triage) {
      console.log('🔍 isTriageComplete: No hay triage');
      return false;
    }
    if (triage.is_draft) {
      console.log('🔍 isTriageComplete: Es borrador');
      return false;
    }

    // Campos obligatorios: Motivo de consulta, SpO2, Presión Arterial, Talla, Peso
    const hasRequired = !!(
      triage.reason &&
      triage.oxygen_saturation &&
      triage.blood_pressure &&
      triage.height_cm &&
      triage.weight_kg
    );

    console.log('🔍 isTriageComplete:', {
      hasRequired,
      reason: triage.reason,
      oxygen_saturation: triage.oxygen_saturation,
      blood_pressure: triage.blood_pressure,
      height_cm: triage.height_cm,
      weight_kg: triage.weight_kg,
    });

    return hasRequired;
  };

  // Si el triaje está completo y no estamos editando, mostrar vista
  const triageComplete = isTriageComplete(existingTriage ?? null);

  // Cargar datos existentes cuando hay historia clínica y se muestra el formulario
  // (modo edición, forzado a editar, o historia incompleta que muestra formulario en lugar de vista)
  useEffect(() => {
    const shouldPopulate =
      existingTriage &&
      (isEditing ||
        forceEditMode ||
        !triageComplete);
    if (shouldPopulate) {
      if (isEnfermero) {
        setFormData((prev) => ({
          ...prev,
          frecuenciaCardiaca: existingTriage.heart_rate?.toString() || '',
          frecuenciaRespiratoria:
            existingTriage.respiratory_rate?.toString() || '',
          saturacionOxigeno: existingTriage.oxygen_saturation?.toString() || '',
          temperatura: existingTriage.temperature_celsius?.toString() || '',
          presionArterial: existingTriage.blood_pressure?.toString() || '',
          glicemia: existingTriage.blood_glucose?.toString() || '',
          talla: existingTriage.height_cm?.toString() || '',
          peso: existingTriage.weight_kg?.toString() || '',
          imc: existingTriage.bmi?.toString() || '',
        }));
      } else {
        // Médico o cualquier otro rol con permiso: cargar todos los datos
        setFormData((prev) => ({
          ...prev,
          frecuenciaCardiaca: existingTriage.heart_rate?.toString() || '',
          frecuenciaRespiratoria:
            existingTriage.respiratory_rate?.toString() || '',
          saturacionOxigeno: existingTriage.oxygen_saturation?.toString() || '',
          temperatura: existingTriage.temperature_celsius?.toString() || '',
          presionArterial: existingTriage.blood_pressure?.toString() || '',
          glicemia: existingTriage.blood_glucose?.toString() || '',
          talla: existingTriage.height_cm?.toString() || '',
          peso: existingTriage.weight_kg?.toString() || '',
          imc: existingTriage.bmi?.toString() || '',
          motivoConsulta: existingTriage.reason || '',
          antecedentesPersonales: existingTriage.personal_background || '',
          antecedentesFamiliares: existingTriage.family_history || '',
          habitosPsicobiologicos: existingTriage.psychobiological_habits || '',
          examenFisico: existingTriage.examen_fisico || '',
          comentario: existingTriage.comment || '',
          enfermedadActual: existingTriage.enfermedad_actual || '',
          antecedentesQuirurgicos: existingTriage.antecedentes_quirurgicos || '',
          antecedentesSexuales: (existingTriage as { antecedentes_sexuales?: string | null }).antecedentes_sexuales || '',
          diagnostico: existingTriage.diagnostico || '',
          planDeAccion: existingTriage.plan_de_accion || '',
          lugarNacimiento: existingTriage.lugar_de_nacimiento || '',
          telefonoEmergencia: existingTriage.telefono_emergencia || '',
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
  }, [
    existingTriage,
    isEditing,
    forceEditMode,
    triageComplete,
    isMedico,
    isEnfermero,
  ]);

  // Si forceEditMode está activo, forzar el modo de edición
  useEffect(() => {
    if (forceEditMode && existingTriage) {
      setIsEditing(true);
    }
  }, [forceEditMode, existingTriage]);

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

  // Permite decimales usando coma o punto (normaliza a punto)
  const handleDecimalInput = (field: keyof TriajeFormData, value: string) => {
    // Normalizar coma a punto para parseFloat / backend
    let v = value.replace(/,/g, '.');
    // Mantener solo dígitos y un separador decimal
    v = v.replace(/[^0-9.]/g, '');
    const firstDot = v.indexOf('.');
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    }
    // Si inicia con ".", prefijar "0" para mejor UX/parseo
    if (v.startsWith('.')) v = `0${v}`;
    handleInputChange(field, v);
  };

  // Función para validar rangos de signos vitales
  const validateVitalSignsRanges = (): { isValid: boolean; errorMessage: string } => {
    const errors: string[] = [];
    
    // Validar Frecuencia Cardíaca (30-250 lpm)
    if (formData.frecuenciaCardiaca) {
      const fc = parseFloat(formData.frecuenciaCardiaca);
      if (!isNaN(fc) && (fc < 30 || fc > 250)) {
        errors.push('La frecuencia cardíaca debe estar entre 30 y 250 lpm.');
      }
    }
    
    // Validar Frecuencia Respiratoria (8-60 rpm)
    if (formData.frecuenciaRespiratoria) {
      const fr = parseFloat(formData.frecuenciaRespiratoria);
      if (!isNaN(fr) && (fr < 8 || fr > 60)) {
        errors.push('La frecuencia respiratoria debe estar entre 8 y 60 rpm.');
      }
    }
    
    // Validar Saturación de Oxígeno (50-100%)
    if (formData.saturacionOxigeno) {
      const sat = parseFloat(formData.saturacionOxigeno);
      if (!isNaN(sat) && (sat < 50 || sat > 100)) {
        errors.push('La saturación de oxígeno debe estar entre 50 y 100%.');
      }
    }
    
    // Validar Temperatura (32-43°C)
    if (formData.temperatura) {
      const temp = parseFloat(formData.temperatura);
      if (!isNaN(temp) && (temp < 32 || temp > 43)) {
        errors.push('La temperatura debe estar entre 32 y 43°C.');
      }
    }
    
    // Validar Peso (1-300 kg)
    if (formData.peso) {
      const peso = parseFloat(formData.peso);
      if (!isNaN(peso) && (peso < 1 || peso > 300)) {
        errors.push('El peso debe estar entre 1 y 300 kg.');
      }
    }
    
    // Validar Talla (30-250 cm)
    if (formData.talla) {
      const talla = parseFloat(formData.talla);
      if (!isNaN(talla) && (talla < 30 || talla > 250)) {
        errors.push('La talla debe estar entre 30 y 250 cm.');
      }
    }
    
    // Validar Presión Arterial (formato: sistólica/diastólica)
    if (formData.presionArterial && formData.presionArterial.includes('/')) {
      const [sistolica, diastolica] = formData.presionArterial.split('/').map(v => parseFloat(v.trim()));
      if (!isNaN(sistolica) && (sistolica < 50 || sistolica > 250)) {
        errors.push('La presión sistólica debe estar entre 50 y 250 mmHg.');
      }
      if (!isNaN(diastolica) && (diastolica < 20 || diastolica > 150)) {
        errors.push('La presión diastólica debe estar entre 20 y 150 mmHg.');
      }
    }
    
    if (errors.length > 0) {
      return {
        isValid: false,
        errorMessage: errors.join(' ')
      };
    }
    
    return { isValid: true, errorMessage: '' };
  };

  // Función para validar que todos los signos vitales obligatorios estén completos
  const validateRequiredVitalSigns = (): { isValid: boolean; errorMessage: string } => {
    const missingFields: string[] = [];
    
    // Helper para verificar si un campo tiene valor válido
    const hasValue = (value: string | undefined | null): boolean => {
      return value !== null && value !== undefined && value.trim().length > 0;
    };
    
    // Verificar Motivo de consulta (obligatorio)
    if (!hasValue(formData.motivoConsulta)) {
      missingFields.push('Motivo de consulta');
    }

    // Verificar cada signo vital obligatorio
    // FC (Frecuencia Cardíaca) - No es obligatorio
    // FR (Frecuencia Respiratoria) - No es obligatorio
    // Temperatura - No es obligatorio
    // Glicemia - No es obligatorio

    if (!hasValue(formData.saturacionOxigeno)) {
      missingFields.push('SpO₂ (Saturación de Oxígeno)');
    }

    if (!hasValue(formData.presionArterial)) {
      missingFields.push('P.A. (Presión Arterial)');
    }
    
    if (!hasValue(formData.peso)) {
      missingFields.push('Peso');
    }
    
    if (!hasValue(formData.talla)) {
      missingFields.push('Talla');
    }
    
    // Si faltan campos, retornar mensaje específico
    if (missingFields.length > 0) {
      const fieldsText = missingFields.length === 1 
        ? missingFields[0]
        : missingFields.slice(0, -1).join(', ') + ' y ' + missingFields[missingFields.length - 1];
        
      return {
        isValid: false,
        errorMessage: `Es obligatorio completar todos los campos requeridos. Falta(n): ${fieldsText}.`
      };
    }
    
    return { isValid: true, errorMessage: '' };
  };

  // Función para validar que el formulario tenga datos antes de guardar
  const validateFormData = (): { isValid: boolean; errorMessage: string } => {
    // Helper para verificar si un campo tiene valor real (no vacío ni solo espacios)
    const hasValue = (value: string | HabitLevel | undefined | null): boolean => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      // Para otros tipos (como HabitLevel), verificar si tiene valor
      return !!value;
    };

    // Verificar si hay al menos un signo vital con valor real
    const hasVitalSigns =
      hasValue(formData.frecuenciaCardiaca) ||
      hasValue(formData.frecuenciaRespiratoria) ||
      hasValue(formData.saturacionOxigeno) ||
      hasValue(formData.temperatura) ||
      hasValue(formData.presionArterial) ||
      hasValue(formData.talla) ||
      hasValue(formData.peso);

    // Si es enfermero, solo necesita signos vitales
    if (isEnfermero) {
      if (!hasVitalSigns) {
        return {
          isValid: false,
          errorMessage:
            'Debe ingresar los signos vitales completos para registrar en el sistema.',
        };
      }
      return { isValid: true, errorMessage: '' };
    }

    // Si es médico, necesita signos vitales Y datos clínicos
    if (isMedico) {
      const hasClinicalData =
        hasValue(formData.motivoConsulta) ||
        hasValue(formData.antecedentesPersonales) ||
        hasValue(formData.antecedentesFamiliares) ||
        hasValue(formData.antecedentesSexuales) ||
        hasValue(formData.habitosPsicobiologicos) ||
        hasValue(formData.examenFisico) ||
        hasValue(formData.tabaco) ||
        hasValue(formData.cafe) ||
        hasValue(formData.alcohol);

      if (!hasVitalSigns && !hasClinicalData) {
        return {
          isValid: false,
          errorMessage:
            'Debe ingresar los signos vitales completos y al menos un dato clínico para registrar en el sistema.',
        };
      }

      if (!hasVitalSigns) {
        return {
          isValid: false,
          errorMessage:
            'Debe ingresar los signos vitales completos para registrar en el sistema.',
        };
      }

      if (!hasClinicalData) {
        return {
          isValid: false,
          errorMessage:
            'Debe ingresar al menos un dato clínico (motivo de consulta, antecedentes, examen físico, etc.) para poder guardar.',
        };
      }

      return { isValid: true, errorMessage: '' };
    }

    // Para otros roles, validación básica
    return { isValid: true, errorMessage: '' };
  };

  const hasRealValue = (value: string | HabitLevel | undefined | null): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return !!value;
  };

  const hasAnyData = (): boolean =>
    hasRealValue(formData.frecuenciaCardiaca) ||
    hasRealValue(formData.frecuenciaRespiratoria) ||
    hasRealValue(formData.saturacionOxigeno) ||
    hasRealValue(formData.temperatura) ||
    hasRealValue(formData.presionArterial) ||
    hasRealValue(formData.glicemia) ||
    hasRealValue(formData.talla) ||
    hasRealValue(formData.peso) ||
    hasRealValue(formData.motivoConsulta) ||
    hasRealValue(formData.enfermedadActual) ||
    hasRealValue(formData.antecedentesPersonales) ||
    hasRealValue(formData.antecedentesFamiliares) ||
    hasRealValue(formData.antecedentesQuirurgicos) ||
    hasRealValue(formData.antecedentesSexuales) ||
    hasRealValue(formData.habitosPsicobiologicos) ||
    hasRealValue(formData.examenFisico) ||
    hasRealValue(formData.diagnostico) ||
    hasRealValue(formData.planDeAccion) ||
    hasRealValue(formData.tabaco) ||
    hasRealValue(formData.cafe) ||
    hasRealValue(formData.alcohol) ||
    hasRealValue(formData.comentario);

  const buildVitalSignsData = () => ({
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
    blood_glucose: formData.glicemia ? parseFloat(formData.glicemia) : null,
    height_cm: formData.talla ? parseFloat(formData.talla) : null,
    weight_kg: formData.peso ? parseFloat(formData.peso) : null,
  });

  const buildFullTriageData = () => ({
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
    enfermedad_actual: formData.enfermedadActual || null,
    antecedentes_quirurgicos: formData.antecedentesQuirurgicos || null,
    antecedentes_sexuales: formData.antecedentesSexuales || null,
    diagnostico: formData.diagnostico || null,
    plan_de_accion: formData.planDeAccion || null,
    lugar_de_nacimiento: formData.lugarNacimiento || null,
    telefono_emergencia: formData.telefonoEmergencia || null,
    ...buildVitalSignsData(),
  });

  const lastDraftPayloadRef = React.useRef<string>('');
  const draftRecordIdRef = React.useRef<string | null>(null);
  const draftSavingRef = React.useRef(false);
  const saveDraft = useCallback(async () => {
    if (!case_?.id || !case_?.patient_id) return;
    if (loading) return;
    if (!hasAnyData()) return;
    if (triageComplete && !isEditing) return;
    if (draftSavingRef.current) return;

    try {
      draftSavingRef.current = true;
      if (isEnfermero) {
        const payload = { ...buildVitalSignsData(), is_draft: true };
        const payloadHash = JSON.stringify(payload);
        if (payloadHash === lastDraftPayloadRef.current) return;

        // Si estamos editando un triaje existente, SIEMPRE usar su ID (sea draft o completo)
        const targetId = existingTriage?.id || draftRecordIdRef.current;
        if (targetId) {
          await updateTriageRecord(targetId, payload);
        } else {
          const created = await createTriageRecord({
            patient_id: case_.patient_id,
            case_id: case_.id,
            ...payload,
          });
          draftRecordIdRef.current = created.id;
          await refetchTriage();
        }
        lastDraftPayloadRef.current = payloadHash;
      } else {
        const payload = { ...buildFullTriageData(), is_draft: true };
        const payloadHash = JSON.stringify(payload);
        if (payloadHash === lastDraftPayloadRef.current) return;

        // Si estamos editando un triaje existente, SIEMPRE usar su ID (sea draft o completo)
        const targetId = existingTriage?.id || draftRecordIdRef.current;
        if (targetId) {
          await updateTriageRecord(targetId, payload);
        } else {
          const created = await createTriageRecord({
            patient_id: case_.patient_id,
            case_id: case_.id,
            ...payload,
          });
          draftRecordIdRef.current = created.id;
          await refetchTriage();
        }
        lastDraftPayloadRef.current = payloadHash;
      }
    } catch (draftError) {
      console.warn('Error guardando borrador de triaje:', draftError);
    } finally {
      draftSavingRef.current = false;
    }
  }, [
    case_,
    existingTriage,
    hasAnyData,
    isEditing,
    isEnfermero,
    loading,
    refetchTriage,
    triageComplete,
  ]);

  useEffect(() => {
    return () => {
      void saveDraft();
    };
  }, [saveDraft]);

  useEffect(() => {
    if (!hasAnyData()) return;
    if (triageComplete && !isEditing) return;
    if (loading) return;

    const timer = setTimeout(() => {
      void saveDraft();
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, hasAnyData, isEditing, loading, saveDraft, triageComplete]);

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

    // Validar que el formulario tenga datos antes de guardar
    const validation = validateFormData();
    if (!validation.isValid) {
      setError(validation.errorMessage);
      toast({
        title: '⚠️ Formulario incompleto',
        description: validation.errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Validar que todos los signos vitales obligatorios estén completos
    const requiredValidation = validateRequiredVitalSigns();
    if (!requiredValidation.isValid) {
      setError(requiredValidation.errorMessage);
      toast({
        title: '⚠️ Campos obligatorios incompletos',
        description: requiredValidation.errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Validar rangos de signos vitales
    const rangeValidation = validateVitalSignsRanges();
    if (!rangeValidation.isValid) {
      setError(rangeValidation.errorMessage);
      toast({
        title: '❌ Valores fuera de rango',
        description: rangeValidation.errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Validación adicional: Si estamos editando una historia clínica existente, 
    // verificar que no se esté intentando guardar todo vacío
    if (existingTriage) {
      if (!hasAnyData()) {
        setError(
          'No puede guardar un triaje completamente vacío. Debe ingresar al menos un dato.',
        );
        toast({
          title: '⚠️ Formulario vacío',
          description:
            'No puede guardar un triaje completamente vacío. Debe ingresar al menos un dato.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setLoading(true);

      // Preparar datos de signos vitales (siempre se incluyen)
      const vitalSignsData = {
        ...buildVitalSignsData(),
        is_draft: false,
      };

      // Si es enfermero, solo guardar signos vitales
      if (isEnfermero) {
        if (existingTriage) {
          // Si ya existe historia clínica, actualizar solo los signos vitales
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
        // Si es médico, guardar/actualizar toda la historia clínica
        const fullTriageData = {
          patient_id: case_.patient_id,
          case_id: case_.id,
          ...buildFullTriageData(),
          is_draft: false,
        };

        if (existingTriage) {
          // Si ya existe triaje, actualizarlo
          await updateTriageRecord(existingTriage.id, fullTriageData);
          toast({
            title: '✅ Historia clínica actualizada exitosamente',
            description: `Los datos de historia clínica han sido actualizados para el caso ${
              case_.code || case_.id
            }.`,
          });
          setMessage('Historia clínica actualizada exitosamente.');
        } else {
          // Si no existe triaje, crear uno nuevo
          await createTriageRecord(fullTriageData);
          toast({
            title: '✅ Historia clínica registrada exitosamente',
            description: `Los datos de historia clínica han sido guardados para el caso ${
              case_.code || case_.id
            }.`,
          });
          setMessage('Historia clínica registrada exitosamente.');
        }
      }

      // Refrescar la historia clínica
      await refetchTriage();

      // Verificar si la historia clínica quedó completa después de guardar
      const updatedTriage = await getTriageByCase(case_.id);
      const isComplete = isTriageComplete(updatedTriage || null);

      // Si la historia clínica está completa, volver al modo vista
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
            enfermedadActual: updatedTriage.enfermedad_actual || '',
            antecedentesQuirurgicos: updatedTriage.antecedentes_quirurgicos || '',
            antecedentesSexuales: (updatedTriage as { antecedentes_sexuales?: string | null }).antecedentes_sexuales || '',
            diagnostico: updatedTriage.diagnostico || '',
            planDeAccion: updatedTriage.plan_de_accion || '',
            lugarNacimiento: updatedTriage.lugar_de_nacimiento || '',
            telefonoEmergencia: updatedTriage.telefono_emergencia || '',
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
            enfermedadActual: '',
            antecedentesQuirurgicos: '',
            antecedentesSexuales: '',
            diagnostico: '',
            planDeAccion: '',
            lugarNacimiento: '',
            telefonoEmergencia: '',
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
      console.error('Error al registrar historia clínica:', err);
      
      let errorMessage = 'No se pudo guardar la historia clínica. Por favor, intenta de nuevo.';
      
      if (err instanceof Error) {
        if (err.message.includes('no autenticado')) {
          errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        } else if (err.message.includes('laboratorio')) {
          errorMessage = 'No tienes permisos para editar esta historia clínica.';
        } else if (err.message.includes('patient')) {
          errorMessage = 'El paciente asociado al caso no existe.';
        } else if (err.message.includes('constraint') || err.message.includes('required')) {
          errorMessage = 'Por favor, completa todos los campos obligatorios de la historia clínica.';
        } else if (err.message.includes('signos vitales') || err.message.includes('vital')) {
          errorMessage = 'Verifica que los signos vitales estén dentro de rangos válidos.';
        }
      }
      
      setError(errorMessage);
      toast({
        title: '❌ Error al guardar historia clínica',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    'transition-transform duration-300 focus:border-primary focus:ring-primary';

  // Early returns DESPUÉS de todos los hooks
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
            Cargando información de historia clínica...
          </span>
        </div>
      </div>
    );
  }

  // Debug: Ver por qué no se muestra la vista de solo lectura
  console.log('🔍 Debug TriageView Condition:', {
    existingTriage: !!existingTriage,
    triageComplete,
    isEditing,
    forceEditMode,
    isDraft: existingTriage?.is_draft,
    userRole: { isMedico, isEnfermero },
    patientType: (case_ as any)?.tipo_paciente,
  });

  if (existingTriage && triageComplete && !isEditing && !forceEditMode) {
    console.log('✅ Mostrando vista de solo lectura');
    return (
      <div className='p-4'>
        <TriageInfoDisplay
          record={existingTriage}
        />
      </div>
    );
  }

  console.log('⚠️ Mostrando formulario de edición');

  // Mostrar formulario (ya sea porque no existe triaje, o porque estamos editando)
  return (
    <TooltipProvider delayDuration={0}>
      <div className='p-4 sm:p-6'>
        <form onSubmit={handleSubmit} className='space-y-3 sm:space-y-4'>
          {/* Banner informativo de campos obligatorios */}
          <div className='bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-3 rounded-r-lg'>
            <div className='flex items-start gap-2'>
              <Info className='h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0' />
              <div>
                <p className='text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1'>
                  Campos obligatorios para guardar
                </p>
                <p className='text-xs text-blue-700 dark:text-blue-300'>
                  <span className='font-medium'>Motivo de consulta</span>, <span className='font-medium'>SpO₂</span>, <span className='font-medium'>P.A.</span>, <span className='font-medium'>Talla</span> y <span className='font-medium'>Peso</span>
                </p>
              </div>
            </div>
          </div>

          {/* Sección 1: Examen Físico y Observaciones (6 campos en 2 filas de 3) */}
          {!showOnlyVitalSigns && (
            <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20'>
              <CardHeader className='p-4 sm:p-6'>
                <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-violet-700 dark:text-violet-300'>
                  <Stethoscope className='h-5 w-5 text-violet-600 dark:text-violet-400' />
                  Examen Físico y Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0'>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3'>
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300'>
                      <MessageSquare className='h-4 w-4 inline mr-1.5 text-gray-600 dark:text-gray-400' />
                      Motivo de consulta <span className='text-red-500'>*</span>
                    </label>
                    <Textarea
                      placeholder='Ingrese el motivo de consulta'
                      value={formData.motivoConsulta}
                      onChange={(e) =>
                        handleInputChange('motivoConsulta', e.target.value)
                      }
                      disabled={loading}
                      rows={4}
                      className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                    />
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300'>
                      Enfermedad actual
                    </label>
                    <Textarea
                      placeholder='Ingrese la enfermedad actual'
                      value={formData.enfermedadActual}
                      onChange={(e) =>
                        handleInputChange('enfermedadActual', e.target.value)
                      }
                      disabled={loading}
                      rows={4}
                      className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                    />
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300'>
                      <Stethoscope className='h-4 w-4 inline mr-1.5 text-gray-600 dark:text-gray-400' />
                      Examen físico
                    </label>
                    <Textarea
                      placeholder='Ingrese el examen físico'
                      value={formData.examenFisico}
                      onChange={(e) =>
                        handleInputChange('examenFisico', e.target.value)
                      }
                      disabled={loading}
                      rows={4}
                      className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                    />
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300'>
                      <FileText className='h-4 w-4 inline mr-1.5 text-gray-600 dark:text-gray-400' />
                      Observaciones
                    </label>
                    <Textarea
                      placeholder='Ingrese observaciones adicionales'
                      value={formData.comentario}
                      onChange={(e) =>
                        handleInputChange('comentario', e.target.value)
                      }
                      disabled={loading}
                      rows={4}
                      className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                    />
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300'>
                      <FileText className='h-4 w-4 inline mr-1.5 text-gray-600 dark:text-gray-400' />
                      Diagnóstico
                    </label>
                    <Textarea
                      placeholder='Ingrese el diagnóstico'
                      value={formData.diagnostico}
                      onChange={(e) =>
                        handleInputChange('diagnostico', e.target.value)
                      }
                      disabled={loading}
                      rows={4}
                      className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                    />
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300'>
                      <FileText className='h-4 w-4 inline mr-1.5 text-gray-600 dark:text-gray-400' />
                      Plan de acción
                    </label>
                    <Textarea
                      placeholder='Ingrese el plan de acción'
                      value={formData.planDeAccion}
                      onChange={(e) =>
                        handleInputChange('planDeAccion', e.target.value)
                      }
                      disabled={loading}
                      rows={4}
                      className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sección: Antecedentes (filas 3 + 2) */}
          {!showOnlyVitalSigns && (
            <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20'>
              <CardHeader className='p-4 sm:p-6'>
                <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-teal-700 dark:text-teal-300'>
                  <FileText className='h-5 w-5 text-teal-600 dark:text-teal-400' />
                  Antecedentes
                </CardTitle>
              </CardHeader>
              <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 space-y-3'>
                {/* Fila 1: 3 antecedentes */}
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3'>
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-base font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                      <User className='h-4 w-4 text-gray-600 dark:text-gray-400' />
                      Antecedentes personales
                    </label>
                    <Textarea
                      placeholder='Ingrese los antecedentes personales'
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
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-base font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                      <Users className='h-4 w-4 text-gray-600 dark:text-gray-400' />
                      Antecedentes familiares
                    </label>
                    <Textarea
                      placeholder='Ingrese los antecedentes familiares'
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
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-base font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                      <Brain className='h-4 w-4 text-gray-600 dark:text-gray-400' />
                      Hábitos psicobiológicos
                    </label>
                    <Textarea
                      placeholder='Ingrese los hábitos psicobiológicos'
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
                </div>
                {/* Fila 2: 2 antecedentes */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'>
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-base font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                      <FileText className='h-4 w-4 text-gray-600 dark:text-gray-400' />
                      Antecedentes quirúrgicos
                    </label>
                    <Textarea
                      placeholder='Ingrese los antecedentes quirúrgicos'
                      value={formData.antecedentesQuirurgicos}
                      onChange={(e) =>
                        handleInputChange(
                          'antecedentesQuirurgicos',
                          e.target.value,
                        )
                      }
                      disabled={loading}
                      rows={4}
                      className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                    />
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <label className='text-base font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                      <FileText className='h-4 w-4 text-gray-600 dark:text-gray-400' />
                      Antecedentes sexuales
                    </label>
                    <Textarea
                      placeholder='Ingrese los antecedentes sexuales'
                      value={formData.antecedentesSexuales}
                      onChange={(e) =>
                        handleInputChange(
                          'antecedentesSexuales',
                          e.target.value,
                        )
                      }
                      disabled={loading}
                      rows={4}
                      className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sección: Hábitos (min-height para evitar salto al mostrar Índice tabáquico) */}
          {!showOnlyVitalSigns && (
            <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'>
              <CardHeader className='p-4 sm:p-6'>
                <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-amber-700 dark:text-amber-300'>
                  <Brain className='h-5 w-5 text-amber-600 dark:text-amber-400' />
                  Hábitos
                </CardTitle>
              </CardHeader>
              <CardContent className={`p-3 sm:p-4 pt-0 sm:pt-0 ${formData.tabaco === 'Si' ? 'min-h-[240px]' : ''}`}>
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4'>
                    <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <label className='text-sm font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                        <Cigarette className='h-4 w-4 text-gray-600 dark:text-gray-400' />
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
                        <option value='' disabled hidden>
                          Seleccione...
                        </option>
                        <option value='No'>No</option>
                        <option value='Si'>Sí</option>
                      </select>
                    </div>
                    <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <label className='text-sm font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                        <Coffee className='h-4 w-4 text-gray-600 dark:text-gray-400' />
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
                    <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <label className='text-sm font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                        <Wine className='h-4 w-4 text-gray-600 dark:text-gray-400' />
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
                        <option value='' disabled hidden>
                          Seleccione...
                        </option>
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
                      <div className='flex items-center gap-2 mb-3'>
                        <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                          Índice Tabáquico
                        </h4>
                        <TooltipPrimitive.Root delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                          </TooltipTrigger>
                          <TooltipContent
                            side='top'
                            sideOffset={5}
                            className='!z-[1000001] max-w-xs'
                          >
                            <p className='text-sm'>
                              Fórmula: (Cigarrillos al día × Años) / 20
                            </p>
                          </TooltipContent>
                        </TooltipPrimitive.Root>
                      </div>
                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                        <div>
                          <label className='text-sm font-medium mb-2 block'>
                            Cigarrillos al día
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
                        {/* Mostrar índice calculado en la misma línea */}
                        <div>
                          <label className='text-sm font-medium mb-2 block'>
                            Resultado
                          </label>
                          {formData.indiceTabaquico ? (
                            (() => {
                              // Calcular el índice para determinar el color
                              const cigarrillos = parseFloat(formData.cigarrillosPorDia);
                              const anos = parseFloat(formData.anosFumando);
                              const indice = cigarrillos > 0 && anos > 0 
                                ? Math.round(((cigarrillos * anos) / 20) * 100) / 100 
                                : 0;
                              const colorClasses = getSmokingIndexColorClasses(indice);
                              
                              return (
                                <div className={`p-3 ${colorClasses.bg} border ${colorClasses.border} rounded-lg h-10 flex items-center`}>
                                  <p className={`text-sm font-semibold ${colorClasses.text}`}>
                                    {formData.indiceTabaquico}
                                  </p>
                                </div>
                              );
                            })()
                          ) : (
                            <div className='p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg h-10 flex items-center'>
                              <p className='text-sm text-gray-500 dark:text-gray-400'>
                                Ingrese valores
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
          )}

          {/* Sección: Signos Vitales */}
          <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'>
            <CardHeader className='p-4 sm:p-6'>
              <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-blue-700 dark:text-blue-300'>
                <Activity className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                Signos Vitales
              </CardTitle>
            </CardHeader>
            <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0'>
              <div className='flex flex-wrap items-end gap-3'>
                <div className='flex-1 min-w-[120px]'>
                  <label className='text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <Heart className='h-4 w-4 text-pink-600 dark:text-pink-400' />
                    FC
                    <TooltipPrimitive.Root delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        sideOffset={5}
                        className='!z-[1000001]'
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
                <div className='flex-1 min-w-[120px]'>
                  <label className='text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <Wind className='h-4 w-4 text-cyan-600 dark:text-cyan-400' />
                    FR
                    <TooltipPrimitive.Root delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        sideOffset={5}
                        className='!z-[1000001]'
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
                <div className='flex-1 min-w-[100px]'>
                  <label className='text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <Droplets className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                    SpO₂ <span className='text-red-500'>*</span>
                    <TooltipPrimitive.Root delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        sideOffset={5}
                        className='!z-[1000001]'
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
                <div className='flex-1 min-w-[120px]'>
                  <label className='text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <Thermometer className='h-4 w-4 text-orange-600 dark:text-orange-400' />
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
                <div className='flex-1 min-w-[150px]'>
                  <label className='text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <Gauge className='h-4 w-4 text-red-600 dark:text-red-400' />
                    P.A. <span className='text-red-500'>*</span>
                    <TooltipPrimitive.Root delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        sideOffset={5}
                        className='!z-[1000001]'
                      >
                        <p>Presión Arterial</p>
                      </TooltipContent>
                    </TooltipPrimitive.Root>
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
                <div className='flex-1 min-w-[120px]'>
                  <label className='text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <Droplets className='h-4 w-4 text-yellow-600 dark:text-yellow-400' />
                    Glicemia
                    <TooltipPrimitive.Root delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        sideOffset={5}
                        className='!z-[1000001]'
                      >
                        <p>Glicemia (glucosa en sangre)</p>
                      </TooltipContent>
                    </TooltipPrimitive.Root>
                  </label>
                  <Input
                    type='text'
                    placeholder='mg/dL'
                    value={formData.glicemia}
                    onChange={(e) =>
                      handleNumericInput('glicemia', e.target.value)
                    }
                    disabled={loading}
                    className={inputStyles}
                  />
                </div>
                <div className='flex-1 min-w-[100px]'>
                  <label className='text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <Ruler className='h-4 w-4 text-indigo-600 dark:text-indigo-400' />
                    Talla <span className='text-red-500'>*</span>
                  </label>
                  <Input
                    type='text'
                    placeholder='Cm'
                    value={formData.talla}
                    inputMode='decimal'
                    onChange={(e) => handleDecimalInput('talla', e.target.value)}
                    disabled={loading}
                    className={inputStyles}
                  />
                </div>
                <div className='flex-1 min-w-[100px]'>
                  <label className='text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <Scale className='h-4 w-4 text-purple-600 dark:text-purple-400' />
                    Peso <span className='text-red-500'>*</span>
                  </label>
                  <Input
                    type='text'
                    placeholder='Kg'
                    value={formData.peso}
                    onChange={(e) => handleNumericInput('peso', e.target.value)}
                    disabled={loading}
                    className={inputStyles}
                  />
                </div>
                <div className='flex-1 min-w-[100px]'>
                  <label className='text-sm font-medium mb-1.5 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <Activity className='h-4 w-4 text-green-600 dark:text-green-400' />
                    IMC
                    <TooltipPrimitive.Root delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Info className='h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors' />
                      </TooltipTrigger>
                      <TooltipContent
                        side='top'
                        sideOffset={5}
                        className='!z-[1000001]'
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
              </div>
            </CardContent>
          </Card>

          {/* Sección: Datos adicionales - al final */}
          {!showOnlyVitalSigns && (
            <Card className='hover:border-primary hover:shadow-lg hover:shadow-primary/20 border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20'>
              <CardHeader className='p-4 sm:p-6'>
                <CardTitle className='text-base sm:text-lg flex items-center gap-2 text-slate-700 dark:text-slate-300'>
                  <User className='h-5 w-5 text-slate-600 dark:text-slate-400' />
                  Datos adicionales
                </CardTitle>
              </CardHeader>
              <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3'>
                <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                  <label className='text-base font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <User className='h-4 w-4 text-gray-600 dark:text-gray-400' />
                    Lugar de nacimiento
                  </label>
                  <Input
                    placeholder='Caracas, Venezuela'
                    value={formData.lugarNacimiento}
                    onChange={(e) =>
                      handleInputChange('lugarNacimiento', e.target.value)
                    }
                    disabled={loading}
                    className={inputStyles}
                  />
                </div>
                <div className='bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                  <label className='text-base font-medium mb-2 flex items-center gap-1.5 text-gray-700 dark:text-gray-300'>
                    <User className='h-4 w-4 text-gray-600 dark:text-gray-400' />
                    Número de teléfono de emergencia
                  </label>
                  <Input
                    placeholder="0412-1234567"
                    value={formData.telefonoEmergencia}
                    onChange={(e) =>
                      handleInputChange('telefonoEmergencia', e.target.value)
                    }
                    disabled={loading}
                    className={inputStyles}
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
          <div className='flex flex-col sm:flex-row gap-4 pt-4'>
            <Button
              type='submit'
              disabled={loading}
              className='flex-1 font-bold text-sm sm:text-base py-1.5 sm:py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-transform duration-300 transform hover:-translate-y-1 min-w-0'
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
                    ? 'Completar historia clínica'
                    : 'Registrar Historia Clínica'}
                </>
              )}
            </Button>
            <Button
              type='button'
              onClick={() => {
                void saveDraft();
                // Cerrar el modal inmediatamente cuando se cancela la edición
                onClose();
              }}
              disabled={loading}
              variant='outline'
              className='px-6 flex-shrink-0 whitespace-nowrap'
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
