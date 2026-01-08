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

// =====================================================================
// FUNCIONES DEL SERVICIO DE TRIAGE
// =====================================================================

/**
 * Crear un nuevo registro de triaje
 * Calcula BMI automáticamente si hay altura y peso
 */
export const createTriageRecord = async (
  data: Omit<TriageRecordInsert, 'laboratory_id' | 'created_by'>
): Promise<TriageRecord> => {
  try {
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
      console.error('Error creando registro de triaje:', error);
      throw new Error(`Error al crear registro de triaje: ${error.message}`);
    }

    if (!record) {
      throw new Error('No se pudo crear el registro de triaje');
    }

    return record as TriageRecord;
  } catch (error) {
    console.error('Error en createTriageRecord:', error);
    throw error;
  }
};

/**
 * Actualizar un registro de triaje existente
 * Calcula BMI automáticamente si hay altura y peso
 */
export const updateTriageRecord = async (
  triage_id: string,
  data: Partial<Omit<TriageRecordInsert, 'laboratory_id' | 'created_by' | 'patient_id' | 'case_id'>>
): Promise<TriageRecord> => {
  try {
    const laboratoryId = await getUserLaboratoryId();

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
      console.error('Error actualizando registro de triaje:', error);
      throw new Error(`Error al actualizar registro de triaje: ${error.message}`);
    }

    if (!record) {
      throw new Error('No se pudo actualizar el registro de triaje');
    }

    return record as TriageRecord;
  } catch (error) {
    console.error('Error en updateTriageRecord:', error);
    throw error;
  }
};

/**
 * Obtener triaje de un caso médico específico
 * Retorna el registro de triaje asociado al caso o null si no existe
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
      console.error('Error obteniendo triaje del caso:', error);
      throw new Error(`Error al obtener triaje del caso: ${error.message}`);
    }

    return record as TriageRecord;
  } catch (error) {
    console.error('Error en getTriageByCase:', error);
    throw error;
  }
};

/**
 * Obtener historial completo de triajes de un paciente
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
      throw new Error(`Error al obtener historial: ${error.message}`);
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
 * Obtener el último triaje de un paciente
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
      throw new Error(`Error al obtener último triaje: ${error.message}`);
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
 * Obtener estadísticas de triaje de un paciente
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

