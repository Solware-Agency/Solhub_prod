// =====================================================================
// SERVICIO DE REGISTRO - NUEVA ESTRUCTURA
// =====================================================================
// Servicio principal para registrar casos médicos con la nueva estructura
// Maneja la lógica de buscar/crear pacientes y crear casos médicos

import { findPatientByCedula, createPatient, updatePatient } from './patients-service'
import { createMedicalCase } from './medical-cases-service'
import { supabase } from './supabase/config'
import { validateFormPayments, calculatePaymentDetails } from '../features/form/lib/payment/payment-utils'

// Tipo de formulario (evita importación circular)
export interface FormValues {
	fullName: string
	idType: 'V' | 'E' | 'J' | 'C'
	idNumber: string
	phone: string
	ageValue: number
	ageUnit: 'Años' | 'Meses'
	email?: string
	gender: 'Masculino' | 'Femenino' | ''
	examType: string
	doctorName: string
	treatingDoctor: string
	patientType: string
	origin: string
	originType: string
	patientBranch: string
	branch: string
	sampleType: string
	numberOfSamples: number
	relationship?: string
	registrationDate: Date
	totalAmount: number
	payments: Array<{
		method?: string
		amount?: number
		reference?: string
	}>
	comments?: string
}

// Tipo para insertar pacientes (local para evitar problemas de importación)
export interface PatientInsert {
	id?: string
	cedula: string
	nombre: string
	edad?: string | null
	telefono?: string | null
	email?: string | null
	gender?: 'Masculino' | 'Femenino' | null
	created_at?: string | null
	updated_at?: string | null
	version?: number | null
}

// Tipo para insertar casos médicos (local para evitar problemas de importación)
export interface MedicalCaseInsert {
	id?: string
	patient_id?: string | null
	exam_type: string
	origin: string
	treating_doctor: string
	sample_type: string
	number_of_samples: number
	relationship?: string | null
	branch: string
	date: string
	code?: string
	total_amount: number
	payment_status: 'Incompleto' | 'Pagado'
	remaining?: number
	payment_method_1?: string | null
	payment_amount_1?: number | null
	payment_reference_1?: string | null
	payment_method_2?: string | null
	payment_amount_2?: number | null
	payment_reference_2?: string | null
	payment_method_3?: string | null
	payment_amount_3?: number | null
	payment_reference_3?: string | null
	payment_method_4?: string | null
	payment_amount_4?: number | null
	payment_reference_4?: string | null
	exchange_rate?: number | null
	comments?: string | null
	generated_by?: string | null
	created_at?: string | null
	updated_at?: string | null
	version?: number | null
	// Campos adicionales para tracking de creación
	created_by?: string | null
	created_by_display_name?: string | null
}

// Tipos para el resultado del registro
export interface RegistrationResult {
	patient: any | null // Patient type from service
	medicalCase: any | null // MedicalCase type from service
	isNewPatient: boolean
	patientUpdated: boolean
	error?: string
}

// =====================================================================
// FUNCIÓN PRINCIPAL DE REGISTRO
// =====================================================================

/**
 * Registrar un nuevo caso médico con la nueva estructura
 * 1. Busca si el paciente existe por cédula
 * 2. Si no existe, crea nuevo paciente
 * 3. Si existe, verifica si hay cambios en datos del paciente
 * 4. Crea el caso médico enlazado al paciente
 */
export const registerMedicalCase = async (formData: FormValues, exchangeRate?: number): Promise<RegistrationResult> => {
	try {
		console.log('🚀 Iniciando registro con nueva estructura...')

		// Obtener información del usuario actual
		const {
			data: { user },
		} = await supabase.auth.getUser()
		if (!user) {
			throw new Error('Usuario no autenticado')
		}

		// Preparar datos del paciente y del caso
		const { patientData, caseData } = prepareRegistrationData(formData, user, exchangeRate)

		console.log('📊 Datos preparados para inserción:')
		console.log('Patient Data:', patientData)
		console.log('Case Data:', caseData)
		console.log('Exchange Rate:', exchangeRate)

		// PASO 1: Buscar paciente existente por cédula
		console.log(`🔍 Buscando paciente con cédula: ${patientData.cedula}`)
		let patient = await findPatientByCedula(patientData.cedula)

		let isNewPatient = false
		let patientUpdated = false

		if (!patient) {
			// CASO A: Paciente nuevo - crear registro
			console.log('👤 Paciente no existe, creando nuevo...')
			patient = await createPatient(patientData)
			isNewPatient = true
		} else {
			// CASO B: Paciente existente - verificar si hay cambios
			console.log(`👤 Paciente existe (${patient.cedula}), verificando cambios...`)
			const hasChanges = detectPatientChanges(patient, patientData)

			if (hasChanges) {
				console.log('📝 Cambios detectados en el paciente, actualizando...')
				// Si la cédula cambió, actualizar el registro existente
				patient = await updatePatient(patient.id, patientData, user.id)
				patientUpdated = true
			} else {
				console.log('✅ No hay cambios en los datos del paciente')
			}
		}

		// PASO 2: Crear caso médico enlazado al paciente
		console.log('📋 Creando caso médico...')
		// Remove auto-generated fields before passing to createMedicalCase
		const { created_at, updated_at, ...cleanCaseData } = caseData
		const medicalCase = await createMedicalCase({
			...cleanCaseData,
			patient_id: patient.id,
		})

		console.log('✅ Registro completado exitosamente')

		return {
			patient,
			medicalCase,
			isNewPatient,
			patientUpdated,
		}
	} catch (error) {
		console.error('❌ Error en registro:', error)
		return {
			patient: null,
			medicalCase: null,
			isNewPatient: false,
			patientUpdated: false,
			error: error instanceof Error ? error.message : 'Error desconocido',
		}
	}
}

// =====================================================================
// FUNCIONES AUXILIARES
// =====================================================================

/**
 * Preparar datos separados para paciente y caso médico
 */
const prepareRegistrationData = (formData: FormValues, user: any, exchangeRate?: number) => {
	// Datos del paciente (tabla patients)
	const patientData: PatientInsert = {
		cedula: `${formData.idType}-${formData.idNumber}`,
		nombre: formData.fullName,
		edad: formData.ageValue ? `${formData.ageValue} ${formData.ageUnit}` : null,
		telefono: formData.phone,
		email: formData.email || null,
		gender: formData.gender || null, // Si está vacío, guardar como null
	}

	// Preparar edad para el caso médico (mantener el formato original) - No se usa en nueva estructura
	// const edadFormatted = formData.ageUnit === 'Años' ? `${formData.ageValue}` : `${formData.ageValue} ${formData.ageUnit.toLowerCase()}`

	// Calcular remaining amount usando la lógica correcta de conversión de monedas
	const { missingAmount } = calculatePaymentDetails(
		formData.payments || [],
		formData.totalAmount,
		exchangeRate,
	)
	const remaining = missingAmount || 0

	// Datos del caso médico (tabla medical_records_clean)
	const caseData: MedicalCaseInsert = {
		// Información del examen
		exam_type: formData.examType,
		origin: formData.origin,
		treating_doctor: formData.treatingDoctor || formData.doctorName,
		sample_type: formData.sampleType || '',
		number_of_samples: formData.numberOfSamples || 1,
		relationship: formData.relationship || null,
		branch: formData.branch || formData.patientBranch,
		date: formData.registrationDate.toISOString(),
		code: '', // Se generará automáticamente

		// Información financiera
		total_amount: formData.totalAmount,
		payment_status: 'Incompleto',
		remaining: remaining,
		exchange_rate: exchangeRate || null,

		// Información de pagos
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

		// Información adicional
		comments: formData.comments || null,

		// Metadatos
		generated_by: user.id || null,
		// Campos adicionales para tracking de creación
		created_by: user.id || null,
		created_by_display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || null,
	}

	return { patientData, caseData }
}

/**
 * Detectar si hay cambios en los datos del paciente
 */
const detectPatientChanges = (existingPatient: PatientInsert, newPatientData: PatientInsert): boolean => {
	// Comparar campos principales incluyendo cédula
	const fields = ['cedula', 'nombre', 'edad', 'telefono', 'email', 'gender'] as const

	for (const field of fields) {
		const existingValue = existingPatient[field]
		const newValue = newPatientData[field]

		// Normalizar valores para comparación
		const normalizedExisting = existingValue === null ? null : String(existingValue).trim()
		const normalizedNew = newValue === null ? null : String(newValue || '').trim()

		if (normalizedExisting !== normalizedNew) {
			console.log(`Cambio detectado en ${field}: "${normalizedExisting}" → "${normalizedNew}"`)
			return true
		}
	}

	return false
}

// =====================================================================
// FUNCIONES DE BÚSQUEDA Y CONSULTA
// =====================================================================

/**
 * Buscar paciente por cédula para prellenar formulario
 */
export const searchPatientForForm = async (cedula: string) => {
	try {
		const patient = await findPatientByCedula(cedula)

		if (!patient) {
			return null
		}

		// Parsear la edad del paciente para extraer valor y unidad
		let ageValue = 0
		let ageUnit: 'Años' | 'Meses' = 'Años'

		if (patient.edad) {
			const match = patient.edad.match(/^(\d+)\s*(AÑOS|MESES)$/i)
			if (match) {
				ageValue = Number(match[1])
				ageUnit = match[2].toUpperCase() === 'AÑOS' ? 'Años' : 'Meses'
			}
		}

		// Parsear la cédula para extraer tipo y número
		const cedulaMatch = patient.cedula.match(/^([VEJC])-(.+)$/)
		let idType: 'V' | 'E' | 'J' | 'C' = 'V'
		let idNumber = patient.cedula

		if (cedulaMatch) {
			idType = cedulaMatch[1] as 'V' | 'E' | 'J' | 'C'
			idNumber = cedulaMatch[2]
		}

		// Convertir datos del paciente al formato del formulario
		return {
			fullName: patient.nombre,
			idType: idType,
			idNumber: idNumber,
			phone: patient.telefono || '',
			edad: patient.edad || '',
			email: patient.email || '',
			gender: patient.gender || '', // Incluir gender si existe, sino cadena vacía
			// Otros campos se llenan con valores por defecto
			ageValue: ageValue,
			ageUnit: ageUnit,
		}
	} catch (error) {
		console.error('Error buscando paciente para formulario:', error)
		return null
	}
}

/**
 * Validar datos antes del registro
 */
export const validateRegistrationData = (formData: FormValues, exchangeRate?: number): string[] => {
	const errors: string[] = []

	// Validaciones obligatorias
	if (!formData.idType) {
		errors.push('El tipo de cédula es obligatorio')
	}
	if (!formData.idNumber) {
		errors.push('El número de cédula es obligatorio')
	}

	if (!formData.fullName) {
		errors.push('El nombre completo es obligatorio')
	}

	if (!formData.phone) {
		errors.push('El teléfono es obligatorio')
	}

	if (!formData.examType) {
		errors.push('El tipo de examen es obligatorio')
	}

	if (!formData.treatingDoctor && !formData.doctorName) {
		errors.push('El doctor tratante es obligatorio')
	}

	if (formData.totalAmount <= 0) {
		errors.push('El monto total debe ser mayor a 0')
	}

	// Validar pagos usando la función que convierte correctamente las monedas
	const hasPayments = formData.payments?.some((payment) => (payment.amount || 0) > 0) || false

	if (hasPayments) {
		// Validar que los pagos no excedan el monto total (con conversión de monedas)
		const paymentValidation = validateFormPayments(formData.payments || [], formData.totalAmount, exchangeRate)

		if (!paymentValidation.isValid) {
			errors.push(paymentValidation.errorMessage || 'Error en la validación de pagos')
		}
	}

	return errors
}
