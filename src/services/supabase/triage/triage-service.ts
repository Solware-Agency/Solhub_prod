// =====================================================================
// SERVICIO DE TRIAGE - NUEVA ESTRUCTURA
// =====================================================================
// Servicios para manejar la tabla triaje_records con referencia a patients

import { supabase } from '@services/supabase/config/config';
import type { Database } from '@shared/types/types';

// Extender los tipos de Supabase para incluir triaje_records
type SupabaseClient = typeof supabase;
type ExtendedDatabase = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      triaje_records: {
        Row: {
          id: string;
          patient_id: string;
          case_id: string | null;
          laboratory_id: string;
          measurement_date: string;
          height_cm: string | null;
          weight_kg: string | null;
          bmi: string | null;
          heart_rate: number | null;
          respiratory_rate: number | null;
          oxygen_saturation: number | null;
          temperature_celsius: string | null;
          blood_pressure: number | null;
          reason: string | null;
          personal_background: string | null;
          family_history: string | null;
          psychobiological_habits: string | null;
          examen_fisico: string | null;
          alcohol: string | null;
          tabaco: number | null;
          cafe: number | null;
          comment: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          case_id?: string | null;
          laboratory_id: string;
          measurement_date?: string;
          height_cm?: string | null;
          weight_kg?: string | null;
          bmi?: string | null;
          heart_rate?: number | null;
          respiratory_rate?: number | null;
          oxygen_saturation?: number | null;
          temperature_celsius?: string | null;
          blood_pressure?: number | null;
          reason?: string | null;
          personal_background?: string | null;
          family_history?: string | null;
          psychobiological_habits?: string | null;
          examen_fisico?: string | null;
          alcohol?: string | null;
          tabaco?: number | null;
          cafe?: number | null;
          comment?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          case_id?: string | null;
          laboratory_id?: string;
          measurement_date?: string;
          height_cm?: string | null;
          weight_kg?: string | null;
          bmi?: string | null;
          heart_rate?: number | null;
          respiratory_rate?: number | null;
          oxygen_saturation?: number | null;
          temperature_celsius?: string | null;
          blood_pressure?: number | null;
          reason?: string | null;
          personal_background?: string | null;
          family_history?: string | null;
          psychobiological_habits?: string | null;
          examen_fisico?: string | null;
          alcohol?: string | null;
          tabaco?: number | null;
          cafe?: number | null;
          comment?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

// Tipo para niveles de hábitos
export type HabitLevel = 'muy alta' | 'alta' | 'media' | 'baja' | 'muy baja' | 'No' | '';

// Tipos específicos para triaje
export interface TriageRecord {
  id: string;
  patient_id: string;
  case_id: string | null; // Referencia al caso médico (opcional para compatibilidad)
  case_code?: string | null; // Código del caso médico (obtenido mediante JOIN)
  laboratory_id: string; // Multi-tenant
  measurement_date: string;
  reason: string | null;
  personal_background: string | null;
  family_history: string | null;
  psychobiological_habits: string | null; // Mantener para compatibilidad
  tabaco: number | null; // Índice tabáquico (paquetes-año)
  cafe: number | null; // Tazas de café por día
  alcohol: HabitLevel | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  temperature_celsius: number | null;
  blood_pressure: number | null;
  blood_glucose: number | null; // Glicemia
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  examen_fisico: string | null;
  comment: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TriageRecordInsert {
  patient_id: string;
  case_id?: string | null; // Referencia al caso médico
  laboratory_id: string;
  measurement_date?: string;
  reason?: string | null;
  personal_background?: string | null;
  family_history?: string | null;
  psychobiological_habits?: string | null; // Mantener para compatibilidad
  tabaco?: number | null; // Índice tabáquico (paquetes-año)
  cafe?: number | null; // Tazas de café por día
  alcohol?: HabitLevel | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  oxygen_saturation?: number | null;
  temperature_celsius?: number | null;
  blood_pressure?: number | string | null; // Acepta string porque se parsea internamente
  blood_glucose?: number | null; // Glicemia
  height_cm?: number | null;
  weight_kg?: number | null;
  bmi?: number | null; // Se calcula automáticamente si hay altura y peso
  examen_fisico?: string | null;
  comment?: string | null;
  created_by?: string | null;
}

export interface TriageStatistics {
  total_measurements: number;
  latest: TriageRecord | null;
  averages: {
    height_cm: number | null;
    weight_kg: number | null;
    bmi: number | null;
    blood_pressure: number | null;
    heart_rate: number | null;
    respiratory_rate: number | null;
    oxygen_saturation: number | null;
    temperature_celsius: number | null;
  };
  trends: {
    weight_change: number | null;
    height_change: number | null;
    bmi_change: number | null;
  };
}

// =====================================================================
// FUNCIONES HELPER
// =====================================================================

/**
 * Obtener laboratory_id del usuario autenticado
 * Helper function para multi-tenant
 */
const getUserLaboratoryId = async (): Promise<string> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    const laboratoryId = (profile as { laboratory_id?: string }).laboratory_id;
    
    if (!laboratoryId) {
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    return laboratoryId;
  } catch (error) {
    console.error('Error obteniendo laboratory_id:', error);
    throw error;
  }
};

/**
 * Obtener user_id del usuario autenticado
 */
const getCurrentUserId = async (): Promise<string> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    return user.id;
  } catch (error) {
    console.error('Error obteniendo user_id:', error);
    throw error;
  }
};

/**
 * Calcular BMI automáticamente desde altura y peso
 */
const calculateBMI = (height_cm: number | null, weight_kg: number | null): number | null => {
  if (!height_cm || !weight_kg || height_cm <= 0 || weight_kg <= 0) {
    return null;
  }
  
  const height_m = height_cm / 100;
  const bmi = weight_kg / (height_m * height_m);
  
  // Redondear a 2 decimales
  return Math.round(bmi * 100) / 100;
};

/**
 * Obtener categoría de riesgo EPOC según índice tabáquico
 */
export const getSmokingRiskCategory = (smoking_index: number | null): string => {
  if (smoking_index === null || smoking_index === 0) {
    return 'No fumador';
  }
  if (smoking_index < 10) {
    return 'Nulo';
  }
  if (smoking_index <= 20) {
    return 'Riesgo moderado';
  }
  if (smoking_index <= 40) {
    return 'Riesgo intenso';
  }
  return 'Riesgo alto';
};

/**
 * Convertir presión arterial de formato "120/80" a número (toma el valor sistólico)
 * Si viene como número, lo devuelve tal cual
 */
const parseBloodPressure = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  // Intentar parsear formato "120/80" o "120"
  const match = value.toString().match(/^(\d+)(?:\/\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  // Si no coincide, intentar parsear como número directo
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : Math.round(parsed);
};

/**
 * Traducir errores de constraints de PostgreSQL a mensajes amigables
 */
const getTriageErrorMessage = (error: any): string => {
  const message = error.message || '';
  const code = error.code || '';

  // Errores de constraints de validación en orden lógico del formulario
  // Primero: datos antropométricos básicos que ingresa el usuario
  if (message.includes('valid_height')) {
    return 'Altura inválida. Debe estar entre 20 y 300 cm.';
  }
  if (message.includes('valid_weight')) {
    return 'Peso inválido. Debe estar entre 0.5 y 500 kg.';
  }
  
  // Segundo: signos vitales
  if (message.includes('valid_heart_rate')) {
    return 'Frecuencia cardíaca inválida. Debe estar entre 30 y 220 latidos por minuto.';
  }
  if (message.includes('valid_respiratory_rate')) {
    return 'Frecuencia respiratoria inválida. Debe estar entre 8 y 60 respiraciones por minuto.';
  }
  if (message.includes('valid_oxygen_saturation')) {
    return 'Saturación de oxígeno inválida. Debe estar entre 0 y 100%.';
  }
  if (message.includes('valid_temperature')) {
    return 'Temperatura inválida. Debe estar entre 30°C y 45°C.';
  }
  if (message.includes('valid_blood_pressure')) {
    return 'Presión arterial inválida. Debe estar entre 40 y 300 mmHg.';
  }
  
  // Tercero: hábitos
  if (message.includes('valid_tabaco')) {
    return 'Índice tabáquico inválido. Debe ser un valor positivo.';
  }
  if (message.includes('valid_cafe')) {
    return 'Consumo de café inválido. Debe ser un valor positivo.';
  }
  
  // Último: IMC (es calculado automáticamente, no lo ingresa el usuario)
  if (message.includes('valid_bmi')) {
    return 'La combinación de talla y peso genera un IMC fuera del rango válido (5-100). Verifique los valores ingresados.';
  }

  // Error de overflow numérico
  if (code === '22003' || message.includes('numeric field overflow')) {
    if (message.includes('heart_rate') || message.includes('FC')) {
      return 'Frecuencia cardíaca demasiado alta. Verifique el valor ingresado.';
    }
    if (message.includes('respiratory_rate') || message.includes('FR')) {
      return 'Frecuencia respiratoria demasiado alta. Verifique el valor ingresado.';
    }
    if (message.includes('oxygen_saturation') || message.includes('SpO')) {
      return 'Saturación de oxígeno inválida. Verifique el valor ingresado.';
    }
    if (message.includes('temperature') || message.includes('Temperatura')) {
      return 'Temperatura demasiado alta. Verifique el valor ingresado.';
    }
    if (message.includes('blood_pressure') || message.includes('Presión')) {
      return 'Presión arterial demasiado alta. Verifique el valor ingresado.';
    }
    if (message.includes('height') || message.includes('Talla')) {
      return 'Altura demasiado alta. Verifique el valor ingresado.';
    }
    if (message.includes('weight') || message.includes('Peso')) {
      return 'Peso demasiado alto. Verifique el valor ingresado.';
    }
    return 'Uno de los valores ingresados es demasiado alto. Verifique los datos.';
  }

  // Error de clave foránea
  if (code === '23503' || message.includes('foreign key')) {
    if (message.includes('patient_id')) {
      return 'El paciente especificado no existe.';
    }
    if (message.includes('case_id')) {
      return 'El caso médico especificado no existe.';
    }
    if (message.includes('laboratory_id')) {
      return 'El laboratorio especificado no existe.';
    }
    return 'Referencia inválida en el registro.';
  }

  // Error de duplicado
  if (code === '23505' || message.includes('duplicate key')) {
    return 'Ya existe un registro de historia clínica con estos datos.';
  }

  // Error de not null
  if (code === '23502' || message.includes('null value')) {
    if (message.includes('patient_id')) {
      return 'El ID del paciente es obligatorio.';
    }
    if (message.includes('laboratory_id')) {
      return 'El ID del laboratorio es obligatorio.';
    }
    return 'Falta un campo obligatorio en el registro.';
  }

  // Error genérico
  return message || 'Error desconocido al procesar la historia clínica.';
};

/**
 * Validar que la historia clínica tenga datos mínimos necesarios
 */
const validateTriageData = (data: Omit<TriageRecordInsert, 'laboratory_id' | 'created_by'>): void => {
  const missingFields: string[] = [];
  
  // Validar datos antropométricos obligatorios
  if (!data.height_cm || data.height_cm <= 0) {
    missingFields.push('Talla');
  }
  if (!data.weight_kg || data.weight_kg <= 0) {
    missingFields.push('Peso');
  }
  
  // Validar signos vitales obligatorios
  if (!data.heart_rate || data.heart_rate <= 0) {
    missingFields.push('FC (Frecuencia Cardíaca)');
  }
  if (!data.respiratory_rate || data.respiratory_rate <= 0) {
    missingFields.push('FR (Frecuencia Respiratoria)');
  }
  if (data.oxygen_saturation === null || data.oxygen_saturation === undefined || data.oxygen_saturation < 0 || data.oxygen_saturation > 100) {
    missingFields.push('SpO₂ (Saturación de Oxígeno)');
  }
  if (!data.temperature_celsius || data.temperature_celsius <= 0) {
    missingFields.push('Temperatura');
  }
  
  // Validar presión arterial (puede ser string o number)
  const bloodPressureValue = typeof data.blood_pressure === 'string' 
    ? parseBloodPressure(data.blood_pressure)
    : data.blood_pressure;
  if (!bloodPressureValue || bloodPressureValue <= 0) {
    missingFields.push('Presión Arterial');
  }
  
  if (missingFields.length > 0) {
    throw new Error(`Debe completar todos los signos vitales. Faltantes: ${missingFields.join(', ')}`);
  }
  
  // Validar que el IMC calculado esté en rango válido (5-100)
  // Esto previene errores de constraint en la base de datos
  if (data.height_cm && data.weight_kg && data.height_cm > 0 && data.weight_kg > 0) {
    const calculatedBMI = calculateBMI(data.height_cm, data.weight_kg);
    if (calculatedBMI !== null && (calculatedBMI < 5 || calculatedBMI > 100)) {
      throw new Error(
        `La combinación de talla (${data.height_cm} cm) y peso (${data.weight_kg} kg) genera un IMC de ${calculatedBMI.toFixed(2)}, ` +
        `que está fuera del rango válido (5-100). Verifique que los valores sean correctos.`
      );
    }
  }
};

// =====================================================================
// FUNCIONES DEL SERVICIO DE TRIAGE
// =====================================================================

/**
 * Crear un nuevo registro de historia clínica
 * Calcula BMI automáticamente si hay altura y peso
 */
export const createTriageRecord = async (
  data: Omit<TriageRecordInsert, 'laboratory_id' | 'created_by'>
): Promise<TriageRecord> => {
  try {
    // Validar datos mínimos antes de continuar
    validateTriageData(data);
    
    const laboratoryId = await getUserLaboratoryId();
    const userId = await getCurrentUserId();

    // Calcular BMI si hay altura y peso
    const bmi = calculateBMI(data.height_cm || null, data.weight_kg || null);

    // Parsear presión arterial si viene como string
    const blood_pressure = parseBloodPressure(data.blood_pressure);

    const recordData: TriageRecordInsert = {
      ...data,
      laboratory_id: laboratoryId,
      created_by: userId,
      bmi: bmi,
      blood_pressure: blood_pressure,
      measurement_date: data.measurement_date || new Date().toISOString(),
    };

    const { data: record, error } = await (supabase as any as { from(table: 'triaje_records'): any })
      .from('triaje_records')
      .insert(recordData)
      .select()
      .single();

    if (error) {
      console.error('Error creando registro de historia clínica:', error);
      throw new Error(getTriageErrorMessage(error));
    }

    if (!record) {
      throw new Error('No se pudo crear el registro de historia clínica');
    }

    return record as TriageRecord;
  } catch (error) {
    console.error('Error en createTriageRecord:', error);
    throw error;
  }
};

/**
 * Actualizar un registro de historia clínica existente
 * Calcula BMI automáticamente si hay altura y peso
 */
export const updateTriageRecord = async (
  triage_id: string,
  data: Partial<Omit<TriageRecordInsert, 'laboratory_id' | 'created_by' | 'patient_id' | 'case_id'>>
): Promise<TriageRecord> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    // Obtener el registro actual para validar con los datos completos
    const { data: currentRecord, error: fetchError } = await (supabase as any as { from(table: 'triaje_records'): any })
      .from('triaje_records')
      .select('*')
      .eq('id', triage_id)
      .eq('laboratory_id', laboratoryId)
      .single();

    if (fetchError || !currentRecord) {
      throw new Error('No se encontró el registro de historia clínica para actualizar');
    }

    // Combinar datos actuales con los nuevos para validación
    const mergedData = {
      ...currentRecord,
      ...data,
    };

    // Validar que los datos completos cumplan con los requisitos
    validateTriageData(mergedData);

    // Calcular BMI si hay altura y peso
    const bmi = calculateBMI(data.height_cm || null, data.weight_kg || null);

    // Parsear presión arterial si viene como string
    const blood_pressure = data.blood_pressure !== undefined 
      ? parseBloodPressure(data.blood_pressure) 
      : undefined;

    const updateData: Record<string, any> = {
      ...data,
    };

    // Agregar BMI si se calculó
    if (bmi !== null) {
      updateData.bmi = bmi;
    }

    // Agregar presión arterial parseada si existe
    if (blood_pressure !== undefined) {
      updateData.blood_pressure = blood_pressure;
    }

    // Remover campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const { data: record, error } = await (supabase as any as { from(table: 'triaje_records'): any })
      .from('triaje_records')
      .update(updateData)
      .eq('id', triage_id)
      .eq('laboratory_id', laboratoryId)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando registro de historia clínica:', error);
      throw new Error(getTriageErrorMessage(error));
    }

    if (!record) {
      throw new Error('No se pudo actualizar el registro de historia clínica');
    }

    return record as TriageRecord;
  } catch (error) {
    console.error('Error en updateTriageRecord:', error);
    throw error;
  }
};

/**
 * Obtener historia clínica de un caso médico específico
 * Retorna el registro de historia clínica asociado al caso o null si no existe
 */
export const getTriageByCase = async (
  case_id: string
): Promise<TriageRecord | null> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    const { data: record, error } = await (supabase as any as { from(table: 'triaje_records'): any })
      .from('triaje_records')
      .select('*')
      .eq('case_id', case_id)
      .eq('laboratory_id', laboratoryId)
      .single();

    if (error) {
      // Si no hay registros, retornar null (no es un error)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error obteniendo historia clínica del caso:', error);
      throw new Error('Error al obtener la historia clínica del caso médico.');
    }

    return record as TriageRecord;
  } catch (error) {
    console.error('Error en getTriageByCase:', error);
    throw error;
  }
};

/**
 * Obtener historial completo de historias clínicas de un paciente
 * Ordenado por fecha (más reciente primero)
 */
export const getTriageHistoryByPatient = async (
  patient_id: string
): Promise<TriageRecord[]> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    const { data: records, error } = await (supabase as any as { from(table: 'triaje_records'): any })
      .from('triaje_records')
      .select(`
        *,
        medical_records_clean(
          code
        )
      `)
      .eq('patient_id', patient_id)
      .eq('laboratory_id', laboratoryId)
      .order('measurement_date', { ascending: false });

    if (error) {
      console.error('Error obteniendo historial de triaje:', error);
      throw new Error('Error al obtener el historial de triaje del paciente.');
    }

    // Transformar los datos para incluir el código del caso
    return (records || []).map((record: any) => ({
      ...record,
      case_code: record.medical_records_clean?.code || null,
    })) as TriageRecord[];
  } catch (error) {
    console.error('Error en getTriageHistoryByPatient:', error);
    throw error;
  }
};

/**
 * Obtener la última historia clínica de un paciente
 * Retorna el registro más reciente o null
 */
export const getLatestTriageRecord = async (
  patient_id: string
): Promise<TriageRecord | null> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

    const { data: record, error } = await (supabase as any as { from(table: 'triaje_records'): any })
      .from('triaje_records')
      .select(`
        *,
        medical_records_clean(
          code
        )
      `)
      .eq('patient_id', patient_id)
      .eq('laboratory_id', laboratoryId)
      .order('measurement_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Si no hay registros, retornar null (no es un error)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error obteniendo último triaje:', error);
      throw new Error('Error al obtener el último registro de triaje.');
    }

    // Transformar los datos para incluir el código del caso
    return {
      ...record,
      case_code: (record as any).medical_records_clean?.code || null,
    } as TriageRecord;
  } catch (error) {
    console.error('Error en getLatestTriageRecord:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de historia clínica de un paciente
 * Retorna total, promedios, tendencias, etc.
 */
export const getTriageStatistics = async (
  patient_id: string
): Promise<TriageStatistics> => {
  try {
    const records = await getTriageHistoryByPatient(patient_id);

    if (records.length === 0) {
      return {
        total_measurements: 0,
        latest: null,
        averages: {
          height_cm: null,
          weight_kg: null,
          bmi: null,
          blood_pressure: null,
          heart_rate: null,
          respiratory_rate: null,
          oxygen_saturation: null,
          temperature_celsius: null,
        },
        trends: {
          weight_change: null,
          height_change: null,
          bmi_change: null,
        },
      };
    }

    const latest = records[0];

    // Calcular promedios
    const averages = {
      height_cm: calculateAverage(records.map(r => r.height_cm)),
      weight_kg: calculateAverage(records.map(r => r.weight_kg)),
      bmi: calculateAverage(records.map(r => r.bmi)),
      blood_pressure: calculateAverage(records.map(r => r.blood_pressure)),
      heart_rate: calculateAverage(records.map(r => r.heart_rate)),
      respiratory_rate: calculateAverage(records.map(r => r.respiratory_rate)),
      oxygen_saturation: calculateAverage(records.map(r => r.oxygen_saturation)),
      temperature_celsius: calculateAverage(records.map(r => r.temperature_celsius)),
    };

    // Calcular tendencias (comparar último con primero)
    const oldest = records[records.length - 1];
    const trends = {
      weight_change: latest.weight_kg && oldest.weight_kg
        ? latest.weight_kg - oldest.weight_kg
        : null,
      height_change: latest.height_cm && oldest.height_cm
        ? latest.height_cm - oldest.height_cm
        : null,
      bmi_change: latest.bmi && oldest.bmi
        ? latest.bmi - oldest.bmi
        : null,
    };

    return {
      total_measurements: records.length,
      latest,
      averages,
      trends,
    };
  } catch (error) {
    console.error('Error en getTriageStatistics:', error);
    throw error;
  }
};

/**
 * Helper para calcular promedio de un array de números
 */
const calculateAverage = (values: (number | null)[]): number | null => {
  const validValues = values.filter((v): v is number => v !== null && v !== undefined && !isNaN(v));
  if (validValues.length === 0) return null;
  const sum = validValues.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / validValues.length) * 100) / 100;
};

