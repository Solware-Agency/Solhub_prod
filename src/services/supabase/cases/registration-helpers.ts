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
	userAssignedBranch?: string | null,
	laboratorySlug?: string | null
): Partial<MedicalCaseInsert> {
	const isSPT = laboratorySlug?.toLowerCase() === 'spt'
	const isMarihorgen = laboratorySlug?.toLowerCase() === 'marihorgen' || laboratorySlug?.toLowerCase() === 'lm'
	const defaults: Partial<MedicalCaseInsert> = {}

	// origin (NOT NULL) - Para marihorgen siempre usar valor del formulario
	const originConfig = moduleConfig?.fields?.procedencia
	if (isMarihorgen) {
		// Para marihorgen, siempre usar el valor del formulario (aunque el campo esté deshabilitado en config)
		const originValue = (formData.origin || '').trim()
		defaults.origin = originValue || ''
		console.log('🔍 Marihorgen - origin value:', { 
			formDataOrigin: formData.origin, 
			trimmed: originValue, 
			final: defaults.origin 
		})
	} else {
		defaults.origin = (getDefaultFieldValue(
			originConfig,
			formData.origin || '',
			'' // String vacío para NOT NULL
		) || '') as string // Asegurar que nunca sea null/undefined
	}

	// treating_doctor (NOT NULL) - Para marihorgen siempre usar valor del formulario
	const doctorConfig = moduleConfig?.fields?.medicoTratante
	const doctorValue = (formData.treatingDoctor || formData.doctorName || '').trim()
	
	if (isMarihorgen) {
		// Para marihorgen, siempre usar el valor del formulario (aunque el campo esté deshabilitado en config)
		defaults.treating_doctor = doctorValue || 'No especificado'
	} else {
		// Si el campo está habilitado, usar el valor del formulario (o "No especificado" si no hay)
		// Si está deshabilitado, usar "No especificado"
		if (doctorConfig?.enabled) {
			defaults.treating_doctor = doctorValue || 'No especificado'
		} else {
			defaults.treating_doctor = 'No especificado' // Campo deshabilitado
		}
	}
	
	// Asegurar que nunca sea null/undefined
	defaults.treating_doctor = (defaults.treating_doctor || 'No especificado') as string

	// sample_type (NOT NULL) - Para marihorgen siempre usar valor del formulario
	const sampleConfig = moduleConfig?.fields?.sampleType
	if (isMarihorgen) {
		// Para marihorgen, siempre usar el valor del formulario (aunque el campo esté deshabilitado en config)
		const sampleTypeValue = (formData.sampleType || '').trim()
		defaults.sample_type = sampleTypeValue || ''
		console.log('🔍 Marihorgen - sample_type value:', { 
			formDataSampleType: formData.sampleType, 
			trimmed: sampleTypeValue, 
			final: defaults.sample_type 
		})
	} else {
		defaults.sample_type = (getDefaultFieldValue(
			sampleConfig,
			formData.sampleType || '',
			'' // String vacío para NOT NULL
		) || '') as string // Asegurar que nunca sea null/undefined
	}

	// number_of_samples (NOT NULL, CHECK > 0) - Para marihorgen siempre usar valor del formulario
	const samplesConfig = moduleConfig?.fields?.numberOfSamples
	if (isMarihorgen) {
		// Para marihorgen, siempre usar el valor del formulario (aunque el campo esté deshabilitado en config)
		defaults.number_of_samples = formData.numberOfSamples && formData.numberOfSamples > 0 
			? formData.numberOfSamples 
			: 1
	} else {
		defaults.number_of_samples = getDefaultFieldValue(
			samplesConfig,
			formData.numberOfSamples,
			1 // Mínimo válido para CHECK constraint
		)
	}

	// branch (nullable en BD)
	// IMPORTANTE: Para SPT la sede es 100% OBLIGATORIA - lanzar error si está vacía
	// Para otros labs: si está deshabilitado usar null, si está habilitado usar valor o null
	const branchConfig = moduleConfig?.fields?.branch
	const branchValue = formData.branch || formData.patientBranch || userAssignedBranch || null
	
	if (isSPT && !branchValue) {
		// SPT SIEMPRE requiere sede - esto NO debería pasar por validación de Zod, pero es una protección adicional
		throw new Error('La sede es obligatoria para SPT y no puede estar vacía')
	}
	
	if (branchConfig && !branchConfig.enabled) {
		// Campo deshabilitado: usar null (campo es nullable en BD)
		defaults.branch = null
	} else {
		// Campo habilitado: usar valor calculado
		defaults.branch = branchValue
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
 * Maneja el caso cuando el módulo de pagos está deshabilitado.
 * Incluye saldo_a_favor (excedente) y credit_applied (crédito aplicado) para labs con hasPositiveBalance.
 *
 * @param saldoAFavor - Excedente cuando el paciente paga de más (solo si hasPositiveBalance)
 * @param creditApplied - Crédito del paciente aplicado a este caso (del formulario)
 */
export function preparePaymentValues(
	formData: FormValues,
	hasPayments: boolean,
	hasTotalAmount: boolean,
	isPaymentComplete: boolean,
	remaining: number,
	options?: { saldoAFavor?: number; creditApplied?: number },
): {
	total_amount: number | null
	payment_status: 'Incompleto' | 'Pagado'
	remaining: number | null
	saldo_a_favor?: number | null
	credit_applied?: number | null
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
	const saldoAFavor = options?.saldoAFavor ?? 0
	const creditApplied = options?.creditApplied ?? 0
	const baseNulls = {
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

	// Si no hay monto total, todos los valores de pago son null
	if (!hasTotalAmount) {
		return {
			total_amount: null,
			payment_status: 'Incompleto',
			remaining: null,
			saldo_a_favor: null,
			credit_applied: null,
			...baseNulls,
		}
	}

	// Si hay monto total pero NO hay pagos ni crédito aplicado, guardar el monto y marcar como incompleto
	if (!hasPayments && creditApplied <= 0) {
		return {
			total_amount: formData.totalAmount,
			payment_status: 'Incompleto',
			remaining: formData.totalAmount,
			saldo_a_favor: null,
			credit_applied: null,
			...baseNulls,
		}
	}

	// Solo crédito aplicado (sin métodos de pago): el caller pasa remaining ya calculado
	if (!hasPayments && creditApplied > 0) {
		return {
			total_amount: formData.totalAmount,
			payment_status: remaining <= 0 ? 'Pagado' : 'Incompleto',
			remaining,
			saldo_a_favor: null,
			credit_applied: creditApplied,
			...baseNulls,
		}
	}

	// Si hay monto total Y (hay pagos o crédito aplicado), usar los valores del formulario
	return {
		total_amount: formData.totalAmount,
		payment_status: isPaymentComplete ? 'Pagado' : 'Incompleto',
		remaining: remaining,
		saldo_a_favor: saldoAFavor > 0 ? saldoAFavor : null,
		credit_applied: creditApplied > 0 ? creditApplied : null,
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

