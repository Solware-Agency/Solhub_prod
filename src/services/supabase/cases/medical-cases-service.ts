// =====================================================================
// SERVICIO DE CASOS MÉDICOS - NUEVA ESTRUCTURA
// =====================================================================
// Servicios para manejar medical_records_clean con referencia a patients

import { supabase } from '../config/config';
// import type { Database } from '@shared/types/types' // No longer used
import { hasRealChange, formatValueForLog, generateChangeSessionId } from '../shared/change-log-utils';

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

// Tipos específicos para casos médicos (simplificados para evitar problemas de importación)
export interface MedicalCase {
  id: string;
  laboratory_id: string; // NUEVO: Multi-tenant
  patient_id: string | null;
  exam_type: string;
  consulta: string | null; // Especialidad médica (SPT)
  origin: string;
  treating_doctor: string;
  sample_type: string;
  number_of_samples: number;
  relationship: string | null;
  branch: string;
  date: string;
  code: string | null;
  total_amount: number;
  payment_status: 'Incompleto' | 'Pagado';
  remaining: number | null;
  payment_method_1: string | null;
  payment_amount_1: number | null;
  payment_reference_1: string | null;
  payment_method_2: string | null;
  payment_amount_2: number | null;
  payment_reference_2: string | null;
  payment_method_3: string | null;
  payment_amount_3: number | null;
  payment_reference_3: string | null;
  payment_method_4: string | null;
  payment_amount_4: number | null;
  payment_reference_4: string | null;
  comments: string | null;
  generated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Campos adicionales del esquema original para compatibilidad
  log: string | null;
  diagnostico: string | null;
  inmunohistoquimica: string | null;
  ims: string | null;
  googledocs_url: string | null;
  informepdf_url: string | null;
  attachment_url: string | null;
  doc_aprobado: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | undefined;
  // Campos adicionales que existen en la tabla
  exchange_rate: number | null;
  created_by: string | null;
  created_by_display_name: string | null;
  material_remitido: string | null;
  informacion_clinica: string | null;
  descripcion_macroscopica: string | null;
  comentario: string | null;
  pdf_en_ready: boolean | null;
  informe_qr: string | null;
  generated_by_display_name: string | null;
  generated_at: string | null;
  token: string | null;
  cito_status: 'positivo' | 'negativo' | null; // Nueva columna para estado citológico
  email_sent: boolean; // Nueva columna para indicar si el email fue enviado
  version: number | null;
  positivo: string | null;
  negativo: string | null;
  ki67: string | null;
  conclusion_diagnostica: string | null;
  image_url: string | null; // URL de imagen para imagenología
  uploaded_pdf_url: string | null; // URL del PDF subido manualmente (solo SPT, roles: laboratorio, owner, prueba, call_center)
  owner_display_code: string | null; // Código visible que el owner de Marihorgen asigna a casos Inmunohistoquímica (máx. 5 dígitos). Solo UI; code sigue siendo el único interno.
}

export interface MedicalCaseInsert {
  id?: string;
  laboratory_id: string; // NUEVO: Multi-tenant
  patient_id?: string | null;
  exam_type: string | null; // NULL permitido si no está configurado
  consulta?: string | null; // Especialidad médica (SPT)
  origin: string;
  treating_doctor: string;
  sample_type: string;
  number_of_samples: number;
  relationship?: string | null;
  branch: string | null; // Nullable en BD
  date: string;
  code?: string | null;
  total_amount: number | null; // NULL permitido para labs sin módulo de pagos
  payment_status: 'Incompleto' | 'Pagado';
  remaining?: number | null;
  payment_method_1?: string | null;
  payment_amount_1?: number | null;
  payment_reference_1?: string | null;
  payment_method_2?: string | null;
  payment_amount_2?: number | null;
  payment_reference_2?: string | null;
  payment_method_3?: string | null;
  payment_amount_3?: number | null;
  payment_reference_3?: string | null;
  payment_method_4?: string | null;
  payment_amount_4?: number | null;
  payment_reference_4?: string | null;
  comments?: string | null;
  generated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Campos adicionales que existen en la tabla
  exchange_rate?: number | null;
  created_by?: string | null;
  created_by_display_name?: string | null;
  material_remitido?: string | null;
  informacion_clinica?: string | null;
  descripcion_macroscopica?: string | null;
  diagnostico?: string | null;
  comentario?: string | null;
  pdf_en_ready?: boolean | null;
  attachment_url?: string | null;
  inmunohistoquimica?: string | null;
  positivo?: string | null;
  negativo?: string | null;
  ki67?: string | null;
  conclusion_diagnostica?: string | null;
  generated_by_display_name?: string | null;
  generated_at?: string | null;
  log?: string | null;
  ims?: string | null;
  googledocs_url?: string | null;
  informepdf_url?: string | null;
  informe_qr?: string | null;
  token?: string | null;
  doc_aprobado?:
    | 'faltante'
    | 'pendiente'
    | 'aprobado'
    | 'rechazado'
    | undefined;
  cito_status?: 'positivo' | 'negativo' | null; // Nueva columna para estado citológico
  email_sent?: boolean; // Nueva columna para indicar si el email fue enviado
}

export interface MedicalCaseUpdate {
  id?: string;
  laboratory_id?: string; // NUEVO: Multi-tenant
  patient_id?: string | null;
  exam_type?: string;
  consulta?: string | null; // Especialidad médica (SPT)
  origin?: string;
  treating_doctor?: string;
  sample_type?: string;
  number_of_samples?: number;
  relationship?: string | null;
  branch?: string;
  date?: string;
  code?: string;
  total_amount?: number;
  payment_status?: 'Incompleto' | 'Pagado';
  remaining?: number;
  payment_method_1?: string | null;
  payment_amount_1?: number | null;
  payment_reference_1?: string | null;
  payment_method_2?: string | null;
  payment_amount_2?: number | null;
  payment_reference_2?: string | null;
  payment_method_3?: string | null;
  payment_amount_3?: number | null;
  payment_reference_3?: string | null;
  payment_method_4?: string | null;
  payment_amount_4?: number | null;
  payment_reference_4?: string | null;
  comments?: string | null;
  generated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Campos adicionales que existen en la tabla
  image_url?: string | null; // URL de imagen para imagenologia
  exchange_rate?: number | null;
  created_by?: string | null;
  created_by_display_name?: string | null;
  material_remitido?: string | null;
  informacion_clinica?: string | null;
  descripcion_macroscopica?: string | null;
  diagnostico?: string | null;
  comentario?: string | null;
  pdf_en_ready?: boolean | null;
  attachment_url?: string | null;
  inmunohistoquimica?: string | null;
  positivo?: string | null;
  negativo?: string | null;
  ki67?: string | null;
  conclusion_diagnostica?: string | null;
  generated_by_display_name?: string | null;
  generated_at?: string | null;
  log?: string | null;
  ims?: string | null;
  googledocs_url?: string | null;
  informepdf_url?: string | null;
  informe_qr?: string | null;
  token?: string | null;
  doc_aprobado?:
    | 'faltante'
    | 'pendiente'
    | 'aprobado'
    | 'rechazado'
    | undefined;
  cito_status?: 'positivo' | 'negativo' | null; // Nueva columna para estado citológico
  email_sent?: boolean; // Nueva columna para indicar si el email fue enviado
  uploaded_pdf_url?: string | null; // URL del PDF subido manualmente (solo SPT, roles: laboratorio, owner, prueba, call_center)
  owner_display_code?: string | null; // Marihorgen + Inmunohistoquímica: código visible del owner (máx. 5 dígitos)
}

// Tipo para casos médicos con información del paciente (usando JOIN directo)
export interface MedicalCaseWithPatient {
  // Campos de medical_records_clean
  id: string;
  laboratory_id: string; // Multi-tenant
  patient_id: string | null;
  exam_type: string;
  consulta: string | null; // Especialidad médica (SPT)
  origin: string;
  treating_doctor: string;
  sample_type: string;
  number_of_samples: number;
  relationship: string | null;
  branch: string;
  date: string;
  total_amount: number;
  exchange_rate: number | null;
  payment_status: 'Incompleto' | 'Pagado';
  remaining: number;
  payment_method_1: string | null;
  payment_amount_1: number | null;
  payment_reference_1: string | null;
  payment_method_2: string | null;
  payment_amount_2: number | null;
  payment_reference_2: string | null;
  payment_method_3: string | null;
  payment_amount_3: number | null;
  payment_reference_3: string | null;
  payment_method_4: string | null;
  payment_amount_4: number | null;
  payment_reference_4: string | null;
  comments: string | null;
  code: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  created_by_display_name: string | null;
  material_remitido: string | null;
  informacion_clinica: string | null;
  descripcion_macroscopica: string | null;
  diagnostico: string | null;
  comentario: string | null;
  pdf_en_ready: boolean | null;
  attachment_url: string | null;
  doc_aprobado: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | null;
  generated_by: string | null;
  version: number | null;
  cito_status: 'positivo' | 'negativo' | null; // Nueva columna para estado citológico
  email_sent: boolean; // Nueva columna para indicar si el email fue enviado
  image_url: string | null; // URL de imagen para imagenología
  uploaded_pdf_url: string | null; // URL del PDF subido manualmente (solo SPT, roles: laboratorio, owner, prueba, call_center)
  owner_display_code: string | null; // Marihorgen + Inmunohistoquímica: código visible del owner (máx. 5 dígitos)
  // Campos de patients
  informepdf_url: string | null;
  cedula: string;
  nombre: string;
  edad: string | null;
  telefono: string | null;
  patient_email: string | null;
  fecha_nacimiento?: string | null; // Fecha de nacimiento del paciente
}

// =====================================================================
// FUNCIONES DEL SERVICIO DE CASOS MÉDICOS
// =====================================================================

/**
 * Crear nuevo caso médico
 */
export const createMedicalCase = async (
  caseData: Omit<MedicalCaseInsert, 'laboratory_id'>,
): Promise<MedicalCase> => {
  try {
    // Obtener laboratory_id del usuario autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single() as { data: { laboratory_id: string } | null; error: any };

    if (profileError || !profile?.laboratory_id) {
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    // Validar que patient_id esté presente
    if (!caseData.patient_id) {
      throw new Error('patient_id es requerido para crear un caso médico');
    }

    // Remove auto-generated fields for insert
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { created_at, updated_at, ...insertData } = caseData;
    const { data, error } = await supabase
      .from('medical_records_clean')
      .insert({
        ...insertData,
        laboratory_id: profile.laboratory_id, // CRÍTICO: Multi-tenant
      } as any)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Registrar la creación en change_logs
    if (data && caseData.created_by) {
      try {
        // Obtener información del usuario
        const { data: user } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', caseData.created_by)
          .single();

        const userEmail =
          profile?.email || user.user?.email || 'unknown@email.com';
        const userDisplayName =
          profile?.display_name ||
          user.user?.user_metadata?.display_name ||
          'Usuario';

        const changeLog = {
          medical_record_id: data.id,
          user_id: caseData.created_by,
          user_email: userEmail,
          user_display_name: userDisplayName,
          field_name: 'created_record',
          field_label: 'Registro Creado',
          old_value: null,
          new_value: `Registro médico creado: ${data.code || data.id}`,
          changed_at: new Date().toISOString(),
          entity_type: 'medical_case',
        };

        const { error: logError } = await supabase
          .from('change_logs')
          .insert(changeLog);
        if (logError) {
          console.error('Error logging case creation:', logError);
        } else {
          console.log('✅ Changelog de creación registrado');
        }
      } catch (logError) {
        console.error('Error logging case creation:', logError);
        // Continue even if logging fails
      }
    }

    console.log('✅ Caso médico creado exitosamente:', data);
    return data as MedicalCase;
  } catch (error) {
    console.error('❌ Error creando caso médico:', error);
    throw error;
  }
};

/**
 * Obtener casos médicos por patient_id
 */
export const getCasesByPatientId = async (
  patientId: string,
): Promise<MedicalCase[]> => {
  try {
    const { data, error } = await supabase
      .from('medical_records_clean')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as MedicalCase[];
  } catch (error) {
    console.error('Error obteniendo casos por paciente:', error);
    throw error;
  }
};

/**
 * Obtener casos médicos por patient_id con información del paciente
 */
export const getCasesByPatientIdWithInfo = async (
  patientId: string,
): Promise<MedicalCaseWithPatient[]> => {
  try {
    const { data, error } = await supabase
      .from('medical_records_clean')
      .select(
        `
				*,
				patients!inner(
					cedula,
					nombre,
					edad,
					telefono,
					email
				)
			`,
      )
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transformar los datos
    const transformedData = (data || []).map((item: any) => ({
      ...item,
      cedula: item.patients?.cedula || '',
      nombre: item.patients?.nombre || '',
      edad: item.patients?.edad || null,
      telefono: item.patients?.telefono || null,
      patient_email: item.patients?.email || null,
      version: item.version || null,
    })) as MedicalCaseWithPatient[];

    return transformedData;
  } catch (error) {
    console.error('Error obteniendo casos por paciente con info:', error);
    throw error;
  }
};

/**
 * Obtener caso médico por ID
 */
export const getCaseById = async (
  caseId: string,
): Promise<MedicalCase | null> => {
  try {
    // Obtener laboratory_id del usuario autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single() as { data: { laboratory_id: string } | null; error: any };

    if (profileError || !profile?.laboratory_id) {
      throw new Error('Usuario no tiene laboratorio asignado');
    }

    const { data, error } = await supabase
      .from('medical_records_clean')
      .select('*')
      .eq('id', caseId)
      .eq('laboratory_id', profile.laboratory_id) // FILTRO MULTI-TENANT
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as MedicalCase;
  } catch (error) {
    console.error('Error obteniendo caso por ID:', error);
    throw error;
  }
};

/**
 * Obtener casos médicos con información del paciente (usando JOIN directo)
 */
/**
 * Obtener casos médicos con información del paciente (usando búsquedas separadas para evitar errores)
 */
export const getCasesWithPatientInfo = async (
  page = 1,
  limit = 50,
  filters?: {
    searchTerm?: string;
    branch?: string;
    branchFilter?: string[]; // Filtro de múltiples sedes
    dateFrom?: string;
    dateTo?: string;
    examType?: string;
    consulta?: string;
    paymentStatus?: 'Incompleto' | 'Pagado';
    userRole?:
      | 'owner'
      | 'employee'
      | 'residente'
      | 'citotecno'
      | 'patologo'
      | 'medicowner';
    documentStatus?: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado';
    pdfStatus?: 'pendientes' | 'faltantes';
    citoStatus?: 'positivo' | 'negativo';
    doctorFilter?: string[];
    originFilter?: string[];
    emailSentStatus?: boolean;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
  },
) => {
  try {
    // Obtener laboratory_id del usuario autenticado para filtro multi-tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data: profile, error: profileError } = (await supabase
      .from('profiles')
      .select('laboratory_id')
      .eq('id', user.id)
      .single()) as { data: { laboratory_id: string } | null; error: any };

    if (profileError || !profile?.laboratory_id) {
      throw new Error('No se pudo obtener el laboratory_id del usuario');
    }

    const cleanSearchTerm = filters?.searchTerm?.trim();

    // Si hay término de búsqueda, usar estrategia de búsquedas múltiples
    if (cleanSearchTerm) {
      console.log('🔍 [DEBUG] Término de búsqueda:', cleanSearchTerm);
      const escapedSearchTerm = cleanSearchTerm.replace(/[%_\\]/g, '\\$&');

      // Hacer búsquedas separadas por cada campo con filtro multi-tenant
      const searchPromises = [
        // Búsqueda por código
        supabase
          .from('medical_records_clean')
          .select(
            `
						*,
						patients!inner(
							cedula,
							nombre,
							edad,
							telefono,
							email
						)
					`,
            { count: 'exact' },
          )
          .eq('laboratory_id', profile.laboratory_id)
          .ilike('code', `%${escapedSearchTerm}%`)
          .order('created_at', { ascending: false }),

        // Búsqueda por médico tratante
        supabase
          .from('medical_records_clean')
          .select(
            `
						*,
						patients!inner(
							cedula,
							nombre,
							edad,
							telefono,
							email
						)
					`,
            { count: 'exact' },
          )
          .eq('laboratory_id', profile.laboratory_id)
          .ilike('treating_doctor', `%${escapedSearchTerm}%`)
          .order('created_at', { ascending: false }),

        // Búsqueda por nombre del paciente
        supabase
          .from('medical_records_clean')
          .select(
            `
						*,
						patients!inner(
							cedula,
							nombre,
							edad,
							telefono,
							email
						)
					`,
            { count: 'exact' },
          )
          .eq('laboratory_id', profile.laboratory_id)
          .ilike('patients.nombre', `%${escapedSearchTerm}%`)
          .order('created_at', { ascending: false }),

        // Búsqueda por cédula del paciente
        supabase
          .from('medical_records_clean')
          .select(
            `
						*,
						patients!inner(
							cedula,
							nombre,
							edad,
							telefono,
							email
						)
					`,
            { count: 'exact' },
          )
          .eq('laboratory_id', profile.laboratory_id)
          .ilike('patients.cedula', `%${escapedSearchTerm}%`)
          .order('created_at', { ascending: false }),
      ];

      // Ejecutar todas las búsquedas en paralelo
      const results = await Promise.all(searchPromises);

      // Combinar y deduplicar resultados
      const allResults = results.flatMap((result) => result.data || []);
      const uniqueResults = new Map();

      for (const item of allResults) {
        uniqueResults.set(item.id, item);
      }

      let combinedResults = Array.from(uniqueResults.values());

      // Aplicar filtros adicionales
      if (filters?.branch) {
        combinedResults = combinedResults.filter(
          (item: any) => item.branch === filters.branch,
        );
      }

      // Filtro por sedes (array)
      if (filters?.branchFilter && filters.branchFilter.length > 0) {
        const normalize = (str: string | null | undefined) =>
          str ? str.trim().toLowerCase() : '';
        
        combinedResults = combinedResults.filter((item: any) =>
          filters.branchFilter!.some(
            (branch) => normalize(item.branch) === normalize(branch),
          ),
        );
      }

      if (filters?.dateFrom) {
        combinedResults = combinedResults.filter(
          (item: any) => item.date >= filters.dateFrom!,
        );
      }

      if (filters?.dateTo) {
        combinedResults = combinedResults.filter(
          (item: any) => item.date <= filters.dateTo!,
        );
      }

      if (filters?.examType) {
        // Mapear el valor del filtro al valor exacto en la base de datos
        let exactExamType = filters.examType;
        if (filters.examType === 'inmunohistoquimica') {
          exactExamType = 'Inmunohistoquímica';
        } else if (filters.examType === 'citologia') {
          exactExamType = 'Citología';
        } else if (filters.examType === 'biopsia') {
          exactExamType = 'Biopsia';
        }
        combinedResults = combinedResults.filter((item: any) => {
          return item.exam_type === exactExamType;
        });
      }

      // Filtro por tipo de consulta (especialidad médica)
      if (filters?.consulta) {
        combinedResults = combinedResults.filter((item: any) => {
          return item.consulta === filters.consulta;
        });
      }

      if (filters?.paymentStatus) {
        combinedResults = combinedResults.filter(
          (item: any) => item.payment_status === filters.paymentStatus,
        );
      }

      // Filtro por estatus de documento
      if (filters?.documentStatus) {
        combinedResults = combinedResults.filter((item: any) => {
          const status = (item.doc_aprobado || 'faltante').toLowerCase().trim();
          return status === filters.documentStatus;
        });
      }

      // Filtro por estatus de PDF
      if (filters?.pdfStatus) {
        combinedResults = combinedResults.filter((item: any) => {
          const pdfReady = item.pdf_en_ready;
          if (filters.pdfStatus === 'pendientes') {
            return pdfReady === false || pdfReady === 'FALSE';
          } else if (filters.pdfStatus === 'faltantes') {
            return pdfReady === true || pdfReady === 'TRUE';
          }
          return true;
        });
      }

      // Filtro por estatus de citología
      if (filters?.citoStatus) {
        combinedResults = combinedResults.filter(
          (item: any) => item.cito_status === filters.citoStatus,
        );
      }

      // Filtro por médico tratante
      if (filters?.doctorFilter && filters.doctorFilter.length > 0) {
        combinedResults = combinedResults.filter((item: any) =>
          filters.doctorFilter!.includes(item.treating_doctor),
        );
      }

      // Filtro por procedencia
      if (filters?.originFilter && filters.originFilter.length > 0) {
        combinedResults = combinedResults.filter((item: any) =>
          filters.originFilter!.includes(item.origin),
        );
      }

      // Filtro por email enviado
      if (filters?.emailSentStatus !== undefined) {
        combinedResults = combinedResults.filter((item: any) => {
          const emailSent =
            item.email_sent === true ||
            item.email_sent === 'true' ||
            item.email_sent === 'TRUE';
          return emailSent === filters.emailSentStatus;
        });
      }

      // Filtrar por rol de usuario
      if (filters?.userRole === 'residente') {
        combinedResults = combinedResults.filter(
          (item: any) => item.exam_type === 'Biopsia',
        );
      }

      if (filters?.userRole === 'citotecno') {
        combinedResults = combinedResults.filter(
          (item: any) => item.exam_type === 'Citología',
        );
      }

      if (filters?.userRole === 'patologo') {
        combinedResults = combinedResults.filter(
          (item: any) =>
            item.exam_type === 'Biopsia' ||
            item.exam_type === 'Inmunohistoquímica',
        );
      }

      // Aplicar ordenamiento dinámico antes de paginar
      const sortField = filters?.sortField || 'created_at';
      const sortDirection = filters?.sortDirection || 'desc';

      combinedResults.sort((a: any, b: any) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Manejar valores null/undefined
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        // Convertir a minúsculas si son strings
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });

      // Paginar los resultados
      const totalCount = combinedResults.length;
      const from = (page - 1) * limit;
      const to = from + limit;
      const paginatedResults = combinedResults.slice(from, to);

      // Transformar los datos
      const transformedData = paginatedResults.map((item: any) => ({
        ...item,
        cedula: item.patients?.cedula || '',
        nombre: item.patients?.nombre || '',
        edad: item.patients?.edad || null,
        telefono: item.patients?.telefono || null,
        patient_email: item.patients?.email || null,
        version: item.version || null,
      })) as MedicalCaseWithPatient[];

      console.log(
        `✅ Búsqueda encontró ${totalCount} resultados totales, mostrando página ${page}`,
      );

      return {
        data: transformedData,
        count: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      };
    }

    // Sin término de búsqueda, consulta normal
    let query = supabase.from('medical_records_clean').select(
      `
			*,
			patients!inner(
				cedula,
				nombre,
				edad,
				telefono,
				email
			)
		`,
      { count: 'exact' },
    );

    // Filtro multi-tenant crítico
    query = query.eq('laboratory_id', profile.laboratory_id);

    // Aplicar filtros
    if (filters?.branchFilter && filters.branchFilter.length > 0) {
      query = query.in('branch', filters.branchFilter);
    } else if (filters?.branch) {
      query = query.eq('branch', filters.branch);
    }

    if (filters?.dateFrom) {
      // Cast a date para asegurar comparación correcta (evita problemas con timestamps)
      query = query.filter('created_at', 'gte', filters.dateFrom);
    }

    if (filters?.dateTo) {
      // Sumar un día para incluir todo el día seleccionado (usar < en lugar de <=)
      const nextDay = new Date(filters.dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      query = query.filter('created_at', 'lt', nextDayStr);
    }

    if (filters?.examType) {
      // Mapear el valor del filtro al valor exacto en la base de datos
      let exactExamType = filters.examType;
      if (filters.examType === 'inmunohistoquimica') {
        exactExamType = 'Inmunohistoquímica';
      } else if (filters.examType === 'citologia') {
        exactExamType = 'Citología';
      } else if (filters.examType === 'biopsia') {
        exactExamType = 'Biopsia';
      }
      query = query.eq('exam_type', exactExamType);
    }

    // Filtro por tipo de consulta (especialidad médica)
    if (filters?.consulta) {
      query = query.eq('consulta', filters.consulta);
    }

    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus);
    }

    // Filtro por estatus de documento
    if (filters?.documentStatus) {
      query = query.eq('doc_aprobado', filters.documentStatus);
    }

    // Filtro por estatus de PDF
    if (filters?.pdfStatus) {
      if (filters.pdfStatus === 'pendientes') {
        query = query.eq('pdf_en_ready', false);
      } else if (filters.pdfStatus === 'faltantes') {
        query = query.eq('pdf_en_ready', true);
      }
    }

    // Filtro por estatus de citología
    if (filters?.citoStatus) {
      query = query.eq('cito_status', filters.citoStatus);
    }

    // Filtro por médico tratante
    if (filters?.doctorFilter && filters.doctorFilter.length > 0) {
      query = query.in('treating_doctor', filters.doctorFilter);
    }

    // Filtro por procedencia
    if (filters?.originFilter && filters.originFilter.length > 0) {
      query = query.in('origin', filters.originFilter);
    }

    // Filtro por email enviado
    if (filters?.emailSentStatus !== undefined) {
      query = query.eq('email_sent', filters.emailSentStatus);
    }

    // Filtrar por rol de usuario
    if (filters?.userRole === 'residente') {
      query = query.eq('exam_type', 'Biopsia');
    }

    if (filters?.userRole === 'citotecno') {
      query = query.eq('exam_type', 'Citología');
    }

    if (filters?.userRole === 'patologo') {
      query = query.in('exam_type', ['Biopsia', 'Inmunohistoquímica']);
    }

    // Aplicar ordenamiento dinámico
    const sortField = filters?.sortField || 'created_at';
    const sortDirection = filters?.sortDirection || 'desc';
    const ascending = sortDirection === 'asc';

    // Campos que pertenecen a la tabla relacionada 'patients'
    const relatedFields = ['nombre', 'cedula'];
    const isRelatedField = relatedFields.includes(sortField);

    let data: any[] = [];
    let count = 0;
    let error: any = null;

    if (isRelatedField) {
      // Si el campo de ordenamiento es de la tabla relacionada,
      // necesitamos obtener todos los datos, ordenarlos en el cliente y luego paginar
      const { data: allData, error: allError, count: totalCount } = await query;

      if (allError) {
        error = allError;
      } else {
        // Transformar los datos primero para tener acceso a los campos aplanados
        const transformedAll = (allData || []).map((item: any) => ({
          ...item,
          cedula: item.patients?.cedula || '',
          nombre: item.patients?.nombre || '',
          edad: item.patients?.edad || null,
          telefono: item.patients?.telefono || null,
          patient_email: item.patients?.email || null,
          version: item.version || null,
        })) as MedicalCaseWithPatient[];

        // Ordenar en el cliente
        transformedAll.sort((a: any, b: any) => {
          let aValue = a[sortField];
          let bValue = b[sortField];

          // Manejar valores null/undefined
          if (aValue === null || aValue === undefined) aValue = '';
          if (bValue === null || bValue === undefined) bValue = '';

          // Convertir a minúsculas si son strings
          if (typeof aValue === 'string') aValue = aValue.toLowerCase();
          if (typeof bValue === 'string') bValue = bValue.toLowerCase();

          if (ascending) {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
          }
        });

        // Aplicar paginación después del ordenamiento
        count = totalCount || 0;
        const from = (page - 1) * limit;
        const to = from + limit;
        data = transformedAll.slice(from, to);
      }
    } else {
      // Si el campo es de la tabla principal, ordenar en Supabase
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const result = await query
        .range(from, to)
        .order(sortField, { ascending });
      data = result.data || [];
      count = result.count || 0;
      error = result.error;
    }

    if (error) {
      throw error;
    }

    // Transformar los datos (solo si no se transformaron antes)
    const transformedData = isRelatedField
      ? (data as MedicalCaseWithPatient[])
      : ((data || []).map((item: any) => ({
          ...item,
          cedula: item.patients?.cedula || '',
          nombre: item.patients?.nombre || '',
          edad: item.patients?.edad || null,
          telefono: item.patients?.telefono || null,
          patient_email: item.patients?.email || null,
          version: item.version || null,
        })) as MedicalCaseWithPatient[]);

    return {
      data: transformedData,
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error(
      'Error obteniendo casos con información del paciente:',
      error,
    );
    throw error;
  }
};

/**
 * Obtener TODOS los casos médicos con información del paciente (sin límite de paginación)
 * Esta función maneja automáticamente la paginación para obtener todos los registros
 */
export const getAllCasesWithPatientInfo = async (filters?: {
  searchTerm?: string;
  branch?: string;
  branchFilter?: string[];
  dateFrom?: string;
  dateTo?: string;
  examType?: string;
  consulta?: string;
  paymentStatus?: 'Incompleto' | 'Pagado';
  userRole?:
    | 'owner'
    | 'employee'
    | 'residente'
    | 'citotecno'
    | 'patologo'
    | 'medicowner';
  documentStatus?: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado';
  pdfStatus?: 'pendientes' | 'faltantes';
  citoStatus?: 'positivo' | 'negativo';
  doctorFilter?: string[];
  originFilter?: string[];
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  emailSentStatus?: boolean;
}) => {
  try {
    // Si hay un término de búsqueda, intentar usar función optimizada primero
    if (filters?.searchTerm) {
      const cleanSearchTerm = filters.searchTerm.trim();

      if (cleanSearchTerm) {
        // Intentar usar función SQL optimizada con pg_trgm
        try {
          const laboratoryId = await getUserLaboratoryId();
          const { data: optimizedResults, error: optimizedError } = await supabase.rpc(
            'search_medical_cases_optimized',
            {
              search_term: cleanSearchTerm,
              lab_id: laboratoryId,
              result_limit: 1000, // Límite alto para obtener todos los resultados relevantes
            },
          );

          if (!optimizedError && optimizedResults && optimizedResults.length > 0) {
						// IDs en orden de relevancia (exactos, luego primer nombre = término, score, código)
						const caseIds = optimizedResults.map((r: any) => r.id)

						// Obtener los casos completos (sin order para respetar relevancia después)
						const { data: fullCases, error: fullCasesError } = await supabase
							.from('medical_records_clean')
							.select(
								`
                *,
                patients(
                  cedula,
                  nombre,
                  edad,
                  telefono,
                  email,
                  fecha_nacimiento
                )
              `,
							)
							.in('id', caseIds)

						if (!fullCasesError && fullCases) {
							// Respetar orden por relevancia (no reordenar por created_at)
							const byRelevanceOrder = [...fullCases].sort(
								(a: any, b: any) => caseIds.indexOf(a.id) - caseIds.indexOf(b.id),
							)

							// Transformar los datos
							const transformedData = byRelevanceOrder.map((item: any) => ({
								...item,
								cedula: item.patients?.cedula || '',
								nombre: item.patients?.nombre || '',
								edad: item.patients?.edad || null,
								telefono: item.patients?.telefono || null,
								patient_email: item.patients?.email || null,
								fecha_nacimiento: item.patients?.fecha_nacimiento || null,
								version: item.version || null,
							})) as MedicalCaseWithPatient[]

							// Aplicar otros filtros si existen (misma lógica que el método tradicional)
							let filteredData = transformedData

							if (filters?.branch) {
								filteredData = filteredData.filter((item) => item.branch === filters.branch)
							}

							if (filters?.branchFilter && filters.branchFilter.length > 0) {
								filteredData = filteredData.filter((item) => item.branch && filters.branchFilter!.includes(item.branch))
							}

							if (filters?.dateFrom) {
								filteredData = filteredData.filter((item) => item.date >= filters.dateFrom!)
							}

							if (filters?.dateTo) {
								filteredData = filteredData.filter((item) => item.date <= filters.dateTo!)
							}

							if (filters?.examType) {
								let exactExamType = filters.examType
								if (filters.examType === 'inmunohistoquimica') {
									exactExamType = 'Inmunohistoquímica'
								} else if (filters.examType === 'citologia') {
									exactExamType = 'Citología'
								} else if (filters.examType === 'biopsia') {
									exactExamType = 'Biopsia'
								}
								filteredData = filteredData.filter((item) => item.exam_type === exactExamType)
							}

							// Filtro por tipo de consulta (especialidad médica)
							if (filters?.consulta) {
								filteredData = filteredData.filter((item) => item.consulta === filters.consulta)
							}

							if (filters?.paymentStatus) {
								filteredData = filteredData.filter((item) => item.payment_status === filters.paymentStatus)
							}

							if (filters?.documentStatus) {
								filteredData = filteredData.filter((item) => item.doc_aprobado === filters.documentStatus)
							}

							if (filters?.pdfStatus) {
								if (filters.pdfStatus === 'pendientes') {
									filteredData = filteredData.filter((item) => item.pdf_en_ready === false)
								} else if (filters.pdfStatus === 'faltantes') {
									filteredData = filteredData.filter((item) => item.pdf_en_ready === true)
								}
							}

							if (filters?.citoStatus) {
								filteredData = filteredData.filter((item) => item.cito_status === filters.citoStatus)
							}

							if (filters?.doctorFilter && filters.doctorFilter.length > 0) {
								filteredData = filteredData.filter(
									(item) => item.treating_doctor && filters.doctorFilter!.includes(item.treating_doctor),
								)
							}

							if (filters?.originFilter && filters.originFilter.length > 0) {
								filteredData = filteredData.filter((item) => item.origin && filters.originFilter!.includes(item.origin))
							}

							if (filters?.emailSentStatus !== undefined) {
								filteredData = filteredData.filter((item) => item.email_sent === filters.emailSentStatus)
							}

							if (filters?.userRole === 'residente') {
								filteredData = filteredData.filter((item) => item.exam_type === 'Biopsia')
							}

							if (filters?.userRole === 'citotecno') {
								filteredData = filteredData.filter((item) => item.exam_type === 'Citología')
							}

							if (filters?.userRole === 'patologo') {
								filteredData = filteredData.filter(
									(item) => item.exam_type === 'Biopsia' || item.exam_type === 'Inmunohistoquímica',
								)
							}

							// Aplicar ordenamiento si existe
							if (filters?.sortField && filters?.sortDirection) {
								filteredData.sort((a, b) => {
									const aValue = (a as any)[filters.sortField!]
									const bValue = (b as any)[filters.sortField!]
									if (filters.sortDirection === 'asc') {
										return aValue > bValue ? 1 : -1
									} else {
										return aValue < bValue ? 1 : -1
									}
								})
							}

							return filteredData
						}
					}
        } catch (optimizedError) {
          console.warn(
            '⚠️ Búsqueda optimizada falló, usando método tradicional:',
            optimizedError,
          );
          // Continuar con método tradicional como fallback
        }

        // FALLBACK: Método tradicional (múltiples queries con ILIKE)
        // Escapar caracteres especiales
        const escapedSearchTerm = cleanSearchTerm.replace(/[%_\\]/g, '\\$&');

        // Hacer múltiples consultas separadas y combinar resultados
        const searchPromises = [
          // Búsqueda por nombre del paciente
          supabase
            .from('medical_records_clean')
            .select(
              `
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
            )
            .ilike('patients.nombre', `%${escapedSearchTerm}%`)
            .order('created_at', { ascending: false }),

          // Búsqueda por cédula del paciente
          supabase
            .from('medical_records_clean')
            .select(
              `
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
            )
            .ilike('patients.cedula', `%${escapedSearchTerm}%`)
            .order('created_at', { ascending: false }),

          // Búsqueda por médico tratante
          supabase
            .from('medical_records_clean')
            .select(
              `
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
            )
            .ilike('treating_doctor', `%${escapedSearchTerm}%`)
            .order('created_at', { ascending: false }),

          // Búsqueda por tipo de examen
          supabase
            .from('medical_records_clean')
            .select(
              `
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
            )
            .ilike('exam_type', `%${escapedSearchTerm}%`)
            .order('created_at', { ascending: false }),

          // Búsqueda por código
          supabase
            .from('medical_records_clean')
            .select(
              `
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
            )
            .ilike('code', `%${escapedSearchTerm}%`)
            .order('created_at', { ascending: false }),
        ];

        // Ejecutar todas las consultas en paralelo
        const results = await Promise.all(searchPromises);

        // Verificar errores
        for (const result of results) {
          if (result.error) {
            throw result.error;
          }
        }

        // Combinar y deduplicar resultados
        const allResults = results.flatMap((result) => result.data || []);
        const uniqueResults = new Map();

        for (const item of allResults) {
          uniqueResults.set(item.id, item);
        }

        // Transformar los datos
        const transformedData = Array.from(uniqueResults.values()).map(
          (item: any) => ({
            ...item,
            cedula: item.patients?.cedula || '',
            nombre: item.patients?.nombre || '',
            edad: item.patients?.edad || null,
            telefono: item.patients?.telefono || null,
            patient_email: item.patients?.email || null,
            version: item.version || null,
          }),
        ) as MedicalCaseWithPatient[];

        // Aplicar otros filtros si existen
        let filteredData = transformedData;

        if (filters?.branch) {
          filteredData = filteredData.filter(
            (item) => item.branch === filters.branch,
          );
        }

        if (filters?.branchFilter && filters.branchFilter.length > 0) {
          filteredData = filteredData.filter(
            (item) => item.branch && filters.branchFilter!.includes(item.branch),
          );
        }

        if (filters?.dateFrom) {
          filteredData = filteredData.filter(
            (item) => item.date >= filters.dateFrom!,
          );
        }

        if (filters?.dateTo) {
          filteredData = filteredData.filter(
            (item) => item.date <= filters.dateTo!,
          );
        }

        if (filters?.examType) {
          // Mapear el valor del filtro al valor exacto en la base de datos
          let exactExamType = filters.examType;
          if (filters.examType === 'inmunohistoquimica') {
            exactExamType = 'Inmunohistoquímica';
          } else if (filters.examType === 'citologia') {
            exactExamType = 'Citología';
          } else if (filters.examType === 'biopsia') {
            exactExamType = 'Biopsia';
          }
          filteredData = filteredData.filter(
            (item) => item.exam_type === exactExamType,
          );
        }

        if (filters?.paymentStatus) {
          filteredData = filteredData.filter(
            (item) => item.payment_status === filters.paymentStatus,
          );
        }

        // Filtro por estatus de documento
        if (filters?.documentStatus) {
          filteredData = filteredData.filter(
            (item) => item.doc_aprobado === filters.documentStatus,
          );
        }

        // Filtro por estatus de PDF
        if (filters?.pdfStatus) {
          if (filters.pdfStatus === 'pendientes') {
            filteredData = filteredData.filter(
              (item) => item.pdf_en_ready === false,
            );
          } else if (filters.pdfStatus === 'faltantes') {
            filteredData = filteredData.filter(
              (item) => item.pdf_en_ready === true,
            );
          }
        }

        // Filtro por estatus de citología
        if (filters?.citoStatus) {
          filteredData = filteredData.filter(
            (item) => item.cito_status === filters.citoStatus,
          );
        }

        // Filtro por médico tratante
        if (filters?.doctorFilter && filters.doctorFilter.length > 0) {
          filteredData = filteredData.filter(
            (item) =>
              item.treating_doctor &&
              filters.doctorFilter!.includes(item.treating_doctor),
          );
        }

        // Filtro por procedencia
        if (filters?.originFilter && filters.originFilter.length > 0) {
          filteredData = filteredData.filter(
            (item) =>
              item.origin && filters.originFilter!.includes(item.origin),
          );
        }

        if (filters?.emailSentStatus !== undefined) {
          filteredData = filteredData.filter(
            (item) => item.email_sent === filters.emailSentStatus,
          );
        }

        // Si el usuario es residente, solo mostrar casos de biopsia
        if (filters?.userRole === 'residente') {
          filteredData = filteredData.filter(
            (item) => item.exam_type === 'Biopsia',
          );
        }

        if (filters?.userRole === 'citotecno') {
          filteredData = filteredData.filter(
            (item) => item.exam_type === 'Citología',
          );
        }

        if (filters?.userRole === 'patologo') {
          filteredData = filteredData.filter(
            (item) =>
              item.exam_type === 'Biopsia' ||
              item.exam_type === 'Inmunohistoquímica',
          );
        }

        // Aplicar ordenamiento
        const sortField = filters?.sortField || 'created_at';
        const sortDirection = filters?.sortDirection || 'desc';

        filteredData.sort((a: any, b: any) => {
          let aValue = a[sortField];
          let bValue = b[sortField];

          if (aValue === null || aValue === undefined) aValue = '';
          if (bValue === null || bValue === undefined) bValue = '';

          if (typeof aValue === 'string') aValue = aValue.toLowerCase();
          if (typeof bValue === 'string') bValue = bValue.toLowerCase();

          if (sortDirection === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
          }
        });

        console.log(
          `✅ Obtenidos ${filteredData.length} casos médicos con búsqueda`,
        );

        return {
          data: filteredData,
          count: filteredData.length,
          page: 1,
          limit: filteredData.length,
          totalPages: 1,
        };
      }
    }

    // Si no hay término de búsqueda, usar la consulta normal
    const allData: MedicalCaseWithPatient[] = [];
    let page = 1;
    const pageSize = 1000;
    let hasMoreData = true;
    let totalCount = 0;

    while (hasMoreData) {
      let query = supabase.from('medical_records_clean').select(
        `
					*,
					patients!inner(
						cedula,
						nombre,
						edad,
						telefono,
						email
					)
				`,
        { count: 'exact' },
      );

      // Aplicar otros filtros
      if (filters?.branch) {
        query = query.eq('branch', filters.branch);
      }

      // Si hay branchFilter (múltiples sedes), usar .in()
      if (filters?.branchFilter && filters.branchFilter.length > 0) {
        query = query.in('branch', filters.branchFilter);
      }

      if (filters?.dateFrom) {
        // Cast a date para asegurar comparación correcta (evita problemas con timestamps)
        query = query.filter('created_at', 'gte', filters.dateFrom);
      }

      if (filters?.dateTo) {
        // Sumar un día para incluir todo el día seleccionado (usar < en lugar de <=)
        const nextDay = new Date(filters.dateTo);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        query = query.filter('created_at', 'lt', nextDayStr);
      }

      if (filters?.examType) {
        // Mapear el valor del filtro al valor exacto en la base de datos
        let exactExamType = filters.examType;
        if (filters.examType === 'inmunohistoquimica') {
          exactExamType = 'Inmunohistoquímica';
        } else if (filters.examType === 'citologia') {
          exactExamType = 'Citología';
        } else if (filters.examType === 'biopsia') {
          exactExamType = 'Biopsia';
        }
        query = query.eq('exam_type', exactExamType);
      }

      // Filtro por tipo de consulta (especialidad médica)
      if (filters?.consulta) {
        query = query.eq('consulta', filters.consulta);
      }

      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus);
      }

      // Filtro por estatus de documento
      if (filters?.documentStatus) {
        query = query.eq('doc_aprobado', filters.documentStatus);
      }

      // Filtro por estatus de PDF
      if (filters?.pdfStatus) {
        if (filters.pdfStatus === 'pendientes') {
          query = query.eq('pdf_en_ready', false);
        } else if (filters.pdfStatus === 'faltantes') {
          query = query.eq('pdf_en_ready', true);
        }
      }

      // Filtro por estatus de citología
      if (filters?.citoStatus) {
        query = query.eq('cito_status', filters.citoStatus);
      }

      // Filtro por médico tratante
      if (filters?.doctorFilter && filters.doctorFilter.length > 0) {
        query = query.in('treating_doctor', filters.doctorFilter);
      }

      // Filtro por procedencia
      if (filters?.originFilter && filters.originFilter.length > 0) {
        query = query.in('origin', filters.originFilter);
      }

      // Filtro por email enviado
      if (filters?.emailSentStatus !== undefined) {
        query = query.eq('email_sent', filters.emailSentStatus);
      }

      // Si el usuario es residente, solo mostrar casos de biopsia
      if (filters?.userRole === 'residente') {
        query = query.eq('exam_type', 'Biopsia');
      }

      if (filters?.userRole === 'citotecno') {
        query = query.eq('exam_type', 'Citología');
      }

      if (filters?.userRole === 'patologo') {
        query = query.in('exam_type', ['Biopsia', 'Inmunohistoquímica']);
      }

      // Paginación
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Aplicar ordenamiento dinámico
      const sortField = filters?.sortField || 'created_at';
      const sortDirection = filters?.sortDirection || 'desc';
      const ascending = sortDirection === 'asc';

      const { data, error, count } = await query
        .range(from, to)
        .order(sortField, { ascending });

      if (error) {
        throw error;
      }

      if (page === 1) {
        totalCount = count || 0;
      }

      const transformedData = (data || []).map((item: any) => ({
        ...item,
        cedula: item.patients?.cedula || '',
        nombre: item.patients?.nombre || '',
        edad: item.patients?.edad || null,
        telefono: item.patients?.telefono || null,
        patient_email: item.patients?.email || null,
        version: item.version || null,
      })) as MedicalCaseWithPatient[];

      allData.push(...transformedData);
      hasMoreData =
        transformedData.length === pageSize && allData.length < totalCount;
      page++;

      if (page > 100) {
        console.warn(
          'Límite de páginas alcanzado para evitar bucles infinitos',
        );
        break;
      }
    }

    console.log(
      `✅ Obtenidos ${allData.length} casos médicos de ${totalCount} totales`,
    );

    return {
      data: allData,
      count: totalCount,
      page: 1,
      limit: allData.length,
      totalPages: 1,
    };
  } catch (error) {
    console.error(
      'Error obteniendo todos los casos con información del paciente:',
      error,
    );
    throw error;
  }
};

/**
 * Actualizar caso médico
 */
export const updateMedicalCase = async (
  caseId: string,
  updates: MedicalCaseUpdate,
  userId?: string,
): Promise<MedicalCase> => {
  try {
    // Obtener datos actuales para detectar cambios
    const currentCase = await getCaseById(caseId);
    if (!currentCase) {
      throw new Error('Caso médico no encontrado');
    }

    // Actualizar caso
    const { data, error } = await supabase
      .from('medical_records_clean')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Registrar cambios en change_logs si hay userId
    if (userId) {
      await logMedicalCaseChanges(caseId, currentCase, updates, userId);
    }

    console.log('✅ Caso médico actualizado exitosamente:', data);
    return data as MedicalCase;
  } catch (error) {
    console.error('❌ Error actualizando caso médico:', error);
    throw error;
  }
};

/**
 * Registrar cambios de caso médico en change_logs
 * 
 * IMPORTANTE: Esta función se ejecuta dentro de la misma promesa del update
 * para mitigar fallos parciales (si el update falla, el log no se registra)
 */
const logMedicalCaseChanges = async (
  caseId: string,
  oldData: MedicalCase,
  newData: MedicalCaseUpdate,
  userId: string,
) => {
  try {
    // Obtener información del usuario
    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single();

    const userEmail = profile?.email || user.user?.email || 'unknown';
    const userDisplayName = profile?.display_name || 'Usuario';

    // Generar session_id único para esta sesión de edición (por submit, no por modal)
    // Esto agrupa todos los cambios del mismo submit en una sola sesión
    const changeSessionId = generateChangeSessionId();
    const changedAt = new Date().toISOString();

    // Crear logs para cada campo que cambió
    const changes = [];

    // Mapeo de campos para nombres legibles
    const fieldLabels: Record<string, string> = {
      exam_type: 'Tipo de Examen',
      origin: 'Origen',
      treating_doctor: 'Doctor Tratante',
      sample_type: 'Tipo de Muestra',
      number_of_samples: 'Número de Muestras',
      relationship: 'Parentesco',
      branch: 'Sucursal',
      date: 'Fecha',
      total_amount: 'Monto Total',
      exchange_rate: 'Tasa de Cambio',
      payment_status: 'Estado de Pago',
      remaining: 'Monto Restante',
      comments: 'Comentarios',
      material_remitido: 'Material Remitido',
      informacion_clinica: 'Información Clínica',
      descripcion_macroscopica: 'Descripción Macroscópica',
      diagnostico: 'Diagnóstico',
      comentario: 'Comentario',
      consulta: 'Tipo de Consulta',
      image_url: 'URL de Imagen',
    };

    // Detectar cambios con normalización (evita falsos positivos)
    for (const [field, newValue] of Object.entries(newData)) {
			if (field === 'updated_at' || field === 'version') continue
			// No registrar campos con undefined: se interpretan como "no enviados / no modificados"
			if (newValue === undefined) continue

			const oldValue = oldData[field as keyof MedicalCase]

			// Usar hasRealChange para evitar registrar cambios falsos (null → null, '' → '', etc)
			if (hasRealChange(oldValue, newValue)) {
				changes.push({
					medical_record_id: caseId,
					entity_type: 'medical_case',
					field_name: field,
					field_label: fieldLabels[field] || field,
					old_value: formatValueForLog(oldValue),
					new_value: formatValueForLog(newValue),
					user_id: userId,
					user_email: userEmail,
					user_display_name: userDisplayName,
					change_session_id: changeSessionId, // Mismo session_id para todos los cambios del submit
					changed_at: changedAt, // Mismo timestamp para todos
				})
			}
		}

    // Insertar cambios si hay alguno
    if (changes.length > 0) {
      const { error } = await supabase.from('change_logs').insert(changes);

      if (error) {
        console.error('Error registrando cambios del caso médico:', error);
        // No lanzar error para no romper el flujo del update
      } else {
        console.log(
          `✅ ${changes.length} cambios registrados para el caso médico (session: ${changeSessionId})`,
        );
      }
    }
  } catch (error) {
    console.error('Error en logMedicalCaseChanges:', error);
    // No lanzar error para no romper el flujo del update
  }
};

/**
 * Buscar casos médicos por código
 */
export const findCaseByCode = async (
  code: string,
): Promise<MedicalCaseWithPatient | null> => {
  try {
    const { data, error } = await supabase
      .from('medical_records_clean')
      .select(
        `
				*,
				patients(
					id,
					cedula,
					nombre,
					edad,
					telefono,
					email,
					fecha_nacimiento
				)
			`,
      )
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    // Transformar los datos para que coincidan con la interfaz
    const transformedData = {
      ...data,
      laboratory_id: data.laboratory_id || '',
      patient_id: (data as any).patients?.id || data.patient_id,
      cedula: (data as any).patients?.cedula || '',
      nombre: (data as any).patients?.nombre || '',
      edad: (data as any).patients?.edad || null,
      telefono: (data as any).patients?.telefono || null,
      patient_email: (data as any).patients?.email || null,
      fecha_nacimiento: (data as any).patients?.fecha_nacimiento || null,
      consulta: (data as any).consulta || null,
      version: (data as any).version || null,
      image_url: (data as any).image_url || null,
      // Asegurar que todas las propiedades requeridas estén presentes
      material_remitido: (data as any).material_remitido || null,
      informacion_clinica: (data as any).informacion_clinica || null,
      descripcion_macroscopica: (data as any).descripcion_macroscopica || null,
      diagnostico: (data as any).diagnostico || null,
      comentario: (data as any).comentario || null,
    } as MedicalCaseWithPatient;

    return transformedData;
  } catch (error) {
    console.error('Error buscando caso por código:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de casos médicos
 */
export const getMedicalCasesStats = async (filters?: {
  dateFrom?: string;
  dateTo?: string;
  branch?: string;
}) => {
  try {
    let query = supabase
      .from('medical_records_clean')
      .select('total_amount, payment_status, exam_type, branch, date');

    // Aplicar filtros
    if (filters?.dateFrom) {
      // Cast a date para asegurar comparación correcta (evita problemas con timestamps)
      query = query.filter('created_at', 'gte', filters.dateFrom);
    }

    if (filters?.dateTo) {
      // Sumar un día para incluir todo el día seleccionado (usar < en lugar de <=)
      const nextDay = new Date(filters.dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      query = query.filter('created_at', 'lt', nextDayStr);
    }

    if (filters?.branch) {
      query = query.eq('branch', filters.branch);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Calcular estadísticas
    const stats = {
      totalCases: data?.length || 0,
      totalRevenue:
        data?.reduce((sum, case_) => sum + (case_.total_amount || 0), 0) || 0,
      paidCases:
        data?.filter((case_) => case_.payment_status === 'Pagado').length || 0,
      pendingCases:
        data?.filter((case_) => case_.payment_status === 'Incompleto').length ||
        0,
      examTypeBreakdown: {} as Record<string, number>,
      branchBreakdown: {} as Record<string, number>,
    };

    // Agrupar por tipo de examen
    data?.forEach((case_) => {
      if (case_.exam_type) {
        stats.examTypeBreakdown[case_.exam_type] =
          (stats.examTypeBreakdown[case_.exam_type] || 0) + 1;
      }
    });

    // Agrupar por sucursal
    data?.forEach((case_) => {
      if (case_.branch) {
        stats.branchBreakdown[case_.branch] =
          (stats.branchBreakdown[case_.branch] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error obteniendo estadísticas de casos médicos:', error);
    throw error;
  }
};

/**
 * Eliminar un caso médico
 */
export const deleteMedicalCase = async (
  caseId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!caseId) {
      return { success: false, error: 'ID del caso requerido' };
    }

    // Primero verificar que el caso existe y obtener más información
    const { data: existingCase, error: fetchError } = await supabase
      .from('medical_records_clean')
      .select('id, code, patient_id, exam_type, uploaded_pdf_url')
      .eq('id', caseId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return { success: false, error: 'Caso no encontrado' };
      }
      throw fetchError;
    }

    // Obtener información del usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Obtener información del perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single();

    const userEmail = profile?.email || user.email || 'unknown@email.com';
    const userDisplayName =
      profile?.display_name || user.user_metadata?.display_name || 'Usuario';

    // Crear el log de eliminación ANTES de eliminar el caso
    const recordInfo = `${existingCase.code || 'Sin código'} - ${
      existingCase.exam_type || 'Sin tipo de examen'
    }`;

    const changeLog = {
      medical_record_id: existingCase.id,
      patient_id: existingCase.patient_id,
      user_id: user.id,
      user_email: userEmail,
      user_display_name: userDisplayName,
      field_name: 'deleted_record',
      field_label: 'Registro Eliminado',
      old_value: recordInfo,
      new_value: null,
      deleted_record_info: recordInfo,
      changed_at: new Date().toISOString(),
      entity_type: 'medical_case',
    };

    // Insertar el log de eliminación
    const { error: logError } = await supabase
      .from('change_logs')
      .insert(changeLog);
    if (logError) {
      console.error('Error logging case deletion:', logError);
      // Continue with deletion even if logging fails
    } else {
      console.log('✅ Changelog de eliminación registrado');
    }

    // Eliminar el PDF adjunto si existe
    if (existingCase.uploaded_pdf_url) {
      try {
        const { deleteCasePDF } = await import('../storage/case-pdf-storage-service');
        
        // Obtener laboratory_id del usuario
        const laboratoryId = await getUserLaboratoryId();
        
        const { error: pdfDeleteError } = await deleteCasePDF(
          caseId,
          existingCase.uploaded_pdf_url,
          laboratoryId
        );
        
        if (pdfDeleteError) {
          console.warn('⚠️ Error al eliminar PDF adjunto (continuando con eliminación del caso):', pdfDeleteError);
          // Continuar con la eliminación del caso aunque falle la eliminación del PDF
        } else {
          console.log('✅ PDF adjunto eliminado exitosamente');
        }
      } catch (error) {
        console.warn('⚠️ Error al eliminar PDF adjunto (continuando con eliminación del caso):', error);
        // Continuar con la eliminación del caso aunque falle la eliminación del PDF
      }
    }

    // Eliminar el caso médico
    const { error: deleteError } = await supabase
      .from('medical_records_clean')
      .delete()
      .eq('id', caseId);

    if (deleteError) {
      throw deleteError;
    }

    console.log(
      `✅ Caso médico ${existingCase.code || caseId} eliminado exitosamente`,
    );
    return { success: true };
  } catch (error) {
    console.error('Error eliminando caso médico:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: errorMessage };
  }
};
