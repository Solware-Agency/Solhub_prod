// =====================================================================
// MAPPERS PARA COMPATIBILIDAD TEMPORAL
// =====================================================================
// Funciones para mapear entre nueva estructura y estructura legacy

import type { MedicalCaseWithPatient } from './medical-cases-service'
import type { MedicalRecord } from '@shared/types/types'

/**
 * Mapea MedicalCaseWithPatient a MedicalRecord para compatibilidad
 */
export const mapToLegacyRecord = (record: MedicalCaseWithPatient): MedicalRecord => {
	return {
		...record,
		// Mapeo de campos nuevos a antiguos
		full_name: record.nombre,
		id_number: record.cedula,
		phone: record.telefono,
		email: record.patient_email,
		edad: record.edad ? `${record.edad}` : null,
		edad_display: record.edad ? `${record.edad}` : undefined,
		// Agregar campos faltantes con valores por defecto
		gender: (record as any).gender || null, // Campo requerido
		inmuno: '', // Campo legacy
		inmunohistoquimica: (record as any).inmunohistoquimica || null,
		ims: (record as any).ims || null,
		googledocs_url: (record as any).googledocs_url || null,
		informepdf_url: (record as any).informepdf_url || null,
		archivo_adjunto_url: (record as any).archivo_adjunto_url || null,
		doc_aprobado: record.doc_aprobado || null,
		version: record.version || 1,
	} as MedicalRecord
}

/**
 * Mapea un array de MedicalCaseWithPatient a MedicalRecord para compatibilidad
 */
export const mapToLegacyRecords = (records: MedicalCaseWithPatient[]): MedicalRecord[] => {
	return records.map(mapToLegacyRecord)
}
