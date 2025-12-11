// =====================================================================
// HELPERS PARA REGISTRO DE CASOS MÉDICOS
// =====================================================================
// Funciones helper para manejar valores por defecto cuando campos están deshabilitados

import type { ModuleConfig } from '@/shared/types/types'
import type { FormValues } from '@features/form/lib/form-schema'
import type { MedicalCaseInsert } from './registration-service'

/**
 * Obtiene el valor por defecto para un campo basándose en su configuración
 * Si el campo está deshabilitado, retorna un valor seguro para NOT NULL
 * 
 * @param fieldConfig - Configuración del campo (enabled, required)
 * @param formValue - Valor del formulario
 * @param defaultValue - Valor por defecto seguro si está deshabilitado
 * @returns Valor a usar para el campo
 */
export function getDefaultFieldValue(
	fieldConfig: { enabled: boolean; required: boolean } | null | undefined,
	formValue: any,
	defaultValue: any
): any {
	// Si el campo está habilitado, usar el valor del formulario (o el default si no hay valor)
	if (fieldConfig?.enabled) {
		return formValue !== undefined && formValue !== null && formValue !== '' ? formValue : defaultValue
	}

	// Si está deshabilitado, retornar valor por defecto seguro
	return defaultValue
}

/**
 * Prepara valores por defecto para todos los campos NOT NULL
 * basándose en la configuración del módulo
 * 
 * @param formData - Datos del formulario
 * @param moduleConfig - Configuración del módulo registrationForm
 * @param userAssignedBranch - Sede asignada al usuario (assigned_branch del perfil)
 * @returns Objeto con valores por defecto para campos NOT NULL
 */
export function prepareDefaultValues(
	formData: FormValues,
	moduleConfig: ModuleConfig | null | undefined,
	userAssignedBranch?: string | null
): Partial<MedicalCaseInsert> {
	const defaults: Partial<MedicalCaseInsert> = {}

	// origin (NOT NULL) - string vacío si deshabilitado
	const originConfig = moduleConfig?.fields?.procedencia
	defaults.origin = (getDefaultFieldValue(
		originConfig,
		formData.origin || '',
		'' // String vacío para NOT NULL
	) || '') as string // Asegurar que nunca sea null/undefined

	// treating_doctor (NOT NULL) - "No especificado" si deshabilitado
	const doctorConfig = moduleConfig?.fields?.medicoTratante
	const doctorValue = (formData.treatingDoctor || formData.doctorName || '').trim()
	
	// Si el campo está habilitado, usar el valor del formulario (o "No especificado" si no hay)
	// Si está deshabilitado, usar "No especificado"
	if (doctorConfig?.enabled) {
		defaults.treating_doctor = doctorValue || 'No especificado'
	} else {
		defaults.treating_doctor = 'No especificado' // Campo deshabilitado
	}
	
	// Asegurar que nunca sea null/undefined
	defaults.treating_doctor = (defaults.treating_doctor || 'No especificado') as string

	// sample_type (NOT NULL) - string vacío si deshabilitado
	const sampleConfig = moduleConfig?.fields?.sampleType
	defaults.sample_type = (getDefaultFieldValue(
		sampleConfig,
		formData.sampleType || '',
		'' // String vacío para NOT NULL
	) || '') as string // Asegurar que nunca sea null/undefined

	// number_of_samples (NOT NULL, CHECK > 0) - 1 si deshabilitado
	const samplesConfig = moduleConfig?.fields?.numberOfSamples
	defaults.number_of_samples = getDefaultFieldValue(
		samplesConfig,
		formData.numberOfSamples,
		1 // Mínimo válido para CHECK constraint
	)

	// branch (nullable en BD)
	// Si está deshabilitado, usar null
	// Si está habilitado, usar valor del formulario, luego patientBranch, luego assigned_branch del usuario, o null
	const branchConfig = moduleConfig?.fields?.branch
	if (branchConfig && !branchConfig.enabled) {
		// Campo deshabilitado: usar null (campo es nullable en BD)
		defaults.branch = null
	} else {
		// Campo habilitado: usar valor del formulario, luego patientBranch, luego assigned_branch del usuario, o null
		// Prioridad: formData.branch > formData.patientBranch > userAssignedBranch > null
		defaults.branch = formData.branch || formData.patientBranch || userAssignedBranch || null
	}

	// date (NOT NULL) - fecha actual si no hay valor
	defaults.date = formData.registrationDate?.toISOString() || new Date().toISOString()

	// payment_status (NOT NULL con default 'Incompleto') - siempre tiene valor
	// No necesita configuración porque siempre tiene default en la BD
	defaults.payment_status = 'Incompleto'

	return defaults
}

/**
 * Prepara valores de pago con valores por defecto seguros
 * Maneja el caso cuando el módulo de pagos está deshabilitado
 * 
 * @param formData - Datos del formulario
 * @param hasPayments - Si hay pagos en el formulario
 * @param hasTotalAmount - Si hay monto total
 * @param isPaymentComplete - Si el pago está completo
 * @param remaining - Monto restante
 * @returns Objeto con valores de pago (todos pueden ser null para labs sin módulo de pagos)
 */
export function preparePaymentValues(
	formData: FormValues,
	hasPayments: boolean,
	hasTotalAmount: boolean,
	isPaymentComplete: boolean,
	remaining: number
): {
	total_amount: number | null
	payment_status: 'Incompleto' | 'Pagado'
	remaining: number | null
	payment_method_1: string | null
	payment_amount_1: number | null
	payment_reference_1: string | null
	payment_method_2: string | null
	payment_amount_2: number | null
	payment_reference_2: string | null
	payment_method_3: string | null
	payment_amount_3: number | null
	payment_reference_3: string | null
	payment_method_4: string | null
	payment_amount_4: number | null
	payment_reference_4: string | null
} {
	// Si no hay monto total, todos los valores de pago son null
	// Esto permite que labs sin módulo de pagos funcionen correctamente
	if (!hasTotalAmount) {
		return {
			total_amount: null,
			payment_status: 'Incompleto', // NOT NULL, siempre debe tener valor
			remaining: null,
			payment_method_1: null,
			payment_amount_1: null,
			payment_reference_1: null,
			payment_method_2: null,
			payment_amount_2: null,
			payment_reference_2: null,
			payment_method_3: null,
			payment_amount_3: null,
			payment_reference_3: null,
			payment_method_4: null,
			payment_amount_4: null,
			payment_reference_4: null,
		}
	}

	// Si hay monto total pero NO hay pagos, guardar el monto y marcar como incompleto
	if (!hasPayments) {
		return {
			total_amount: formData.totalAmount,
			payment_status: 'Incompleto',
			remaining: formData.totalAmount, // El monto total queda pendiente
			payment_method_1: null,
			payment_amount_1: null,
			payment_reference_1: null,
			payment_method_2: null,
			payment_amount_2: null,
			payment_reference_2: null,
			payment_method_3: null,
			payment_amount_3: null,
			payment_reference_3: null,
			payment_method_4: null,
			payment_amount_4: null,
			payment_reference_4: null,
		}
	}

	// Si hay monto total Y hay pagos, usar los valores del formulario
	return {
		total_amount: formData.totalAmount,
		payment_status: isPaymentComplete ? 'Pagado' : 'Incompleto',
		remaining: remaining,
		payment_method_1: formData.payments?.[0]?.method || null,
		payment_amount_1: formData.payments?.[0]?.amount || null,
		payment_reference_1: formData.payments?.[0]?.reference || null,
		payment_method_2: formData.payments?.[1]?.method || null,
		payment_amount_2: formData.payments?.[1]?.amount || null,
		payment_reference_2: formData.payments?.[1]?.reference || null,
		payment_method_3: formData.payments?.[2]?.method || null,
		payment_amount_3: formData.payments?.[2]?.amount || null,
		payment_reference_3: formData.payments?.[2]?.reference || null,
		payment_method_4: formData.payments?.[3]?.method || null,
		payment_amount_4: formData.payments?.[3]?.amount || null,
		payment_reference_4: formData.payments?.[3]?.reference || null,
	}
}

