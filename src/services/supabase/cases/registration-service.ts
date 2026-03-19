// =====================================================================
// SERVICIO DE REGISTRO - NUEVA ESTRUCTURA
// =====================================================================
// Servicio principal para registrar casos médicos con la nueva estructura
// Maneja la lógica de buscar/crear pacientes y crear casos médicos

import {
	findPatientByCedula,
	findPatientUnified,
	createPatient,
	updatePatient,
} from '@services/supabase/patients/patients-service'
import { createMedicalCase } from '@services/supabase/cases/medical-cases-service'
import { supabase } from '@services/supabase/config/config'
import { validateFormPayments, calculatePaymentDetails, calculatePaymentDetailsWithCredit, calculateTotalPaidUSD } from '@features/form/lib/payment/payment-utils'
import { prepareDefaultValues, preparePaymentValues } from './registration-helpers'
import type { ModuleConfig } from '@/shared/types/types'
// Nuevo sistema: servicios de identificaciones (dual-write)
import {
	createIdentification,
	parseCedula,
	formatCedulaCanonical,
} from '@services/supabase/patients/identificaciones-service'

// Tipo de formulario (evita importación circular)
export interface FormValues {
	fullName: string
	idType: 'V' | 'E' | 'J' | 'C' | 'S/C'
	idNumber: string
	phone: string
	ageValue: number
	ageUnit: 'Años' | 'Meses' | 'Días'
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
	fechaMuestra?: string | null
}

// Tipo para insertar pacientes (local para evitar problemas de importación)
export interface PatientInsert {
	id?: string
	cedula: string | null // Puede ser null para dependientes (menores/animales)
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
	exam_type: string | null // NULL permitido si no está configurado
	origin: string
	treating_doctor: string
	sample_type: string
	number_of_samples: number
	relationship?: string | null
	branch: string | null // Nullable en BD
	consulta?: string | null // Especialidad médica (solo para lab SPT)
	date: string
	code?: string
	total_amount: number | null // NULL permitido para labs sin módulo de pagos
	payment_status: 'Incompleto' | 'Pagado'
	remaining?: number | null
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
	saldo_a_favor?: number | null
	credit_applied?: number | null
	exchange_rate?: number | null
	comments?: string | null
	price_type?: string | null // taquilla | convenios | descuento (Marihorgen)
	fecha_muestra?: string | null // YYYY-MM-DD (Marihorgen)
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
 *
 * @param formData - Datos del formulario
 * @param exchangeRate - Tasa de cambio (opcional)
 * @param moduleConfig - Configuración del módulo registrationForm (opcional)
 */
export const registerMedicalCase = async (
	formData: FormValues,
	exchangeRate?: number,
	moduleConfig?: ModuleConfig | null,
): Promise<RegistrationResult> => {
	try {
		console.log('🚀 Iniciando registro con nueva estructura...')

		// Obtener información del usuario actual
		const {
			data: { user },
		} = await supabase.auth.getUser()
		if (!user) {
			throw new Error('Usuario no autenticado')
		}

		// Obtener perfil del usuario para acceder a assigned_branch y laboratory_id
		const { data: profile } = await supabase
			.from('profiles')
			.select('assigned_branch, laboratory_id')
			.eq('id', user.id)
			.single()

		// Type assertion para laboratory_id (existe en BD pero puede no estar en tipos generados)
		const profileWithLab = profile as { assigned_branch?: string | null; laboratory_id?: string } | null

		// Obtener el slug del laboratorio actual
		// Nota: Usamos 'as never' porque 'laboratories' no está en los tipos generados de Supabase
		let laboratorySlug: string | null = null
		if (profileWithLab?.laboratory_id) {
			const { data: labData } = await (supabase as any)
				.from('laboratories')
				.select('slug')
				.eq('id', profileWithLab.laboratory_id)
				.single()

			laboratorySlug = (labData as { slug?: string } | null)?.slug || null
		}

		// Preparar datos del paciente y del caso
		const { patientData, caseData } = prepareRegistrationData(
			formData,
			user,
			exchangeRate,
			moduleConfig,
			profileWithLab?.assigned_branch,
			laboratorySlug,
		)

		console.log('📊 Datos preparados para inserción:')
		console.log('Patient Data:', patientData)
		console.log('Case Data:', caseData)
		console.log('Exchange Rate:', exchangeRate)

		// PASO 1: Buscar paciente existente
		// FASE 8: Usar función unificada que decide entre sistema nuevo/antiguo según feature flag
		// Si la cédula es null (dependiente), buscar por nombre y teléfono en su lugar
		let patient: any = null
		if (patientData.cedula) {
			console.log(`🔍 Buscando paciente con cédula: ${patientData.cedula}`)
			// FASE 8: Usar función unificada (usa feature flag internamente)
			patient = await findPatientUnified(patientData.cedula)
		} else {
			// Para dependientes sin cédula, buscar por nombre y teléfono
			console.log(`🔍 Buscando dependiente por nombre y teléfono: ${patientData.nombre}`)
			const laboratoryId = profileWithLab?.laboratory_id
			if (laboratoryId) {
				// Buscar pacientes con nombre y teléfono coincidentes y sin cédula
				const { data: patients, error } = await supabase
					.from('patients')
					.select('*')
					.eq('laboratory_id', laboratoryId)
					.eq('is_active', true)
					.eq('nombre', patientData.nombre)
					.is('cedula', null)
					.limit(1)

				if (error) {
					console.error('Error buscando dependiente:', error)
				} else if (patients && patients.length > 0) {
					patient = patients[0]
				}
			}
		}

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

		// =====================================================================
		// DUAL-WRITE: Escribir en sistema nuevo (identificaciones)
		// =====================================================================
		// Esto es NO-CRÍTICO: si falla, solo loggear pero no fallar el registro
		// El sistema antiguo (patients.cedula) ya funcionó correctamente
		// =====================================================================
		if (patientData.cedula && patientData.cedula !== 'S/C') {
			try {
				console.log('🔄 Dual-write: Creando identificación en sistema nuevo...')

				// Parsear cédula para obtener tipo y número
				const { tipo, numero } = parseCedula(patientData.cedula)

				// Obtener laboratory_id del paciente (ya está disponible después de crear/actualizar)
				const laboratoryId = (patient as any).laboratory_id || profileWithLab?.laboratory_id

				if (!laboratoryId) {
					console.warn('⚠️ Dual-write: No se pudo obtener laboratory_id, omitiendo identificación')
				} else {
					// Verificar si ya existe identificación para este paciente
					const { data: existingIdentificaciones } = await supabase
						.from('identificaciones' as any)
						.select('id')
						.eq('paciente_id', patient.id)
						.eq('tipo_documento', tipo)
						.eq('numero', numero)
						.eq('laboratory_id', laboratoryId)
						.maybeSingle()

					// Solo crear si no existe
					if (!existingIdentificaciones) {
						await createIdentification({
							paciente_id: patient.id,
							tipo_documento: tipo,
							numero: numero,
							laboratory_id: laboratoryId, // Pasar explícitamente para evitar doble consulta
						})
						console.log('✅ Dual-write: Identificación creada exitosamente')
					} else {
						console.log('ℹ️ Dual-write: Identificación ya existe, omitiendo creación')
					}
				}
			} catch (error) {
				// NO fallar si falla el sistema nuevo, solo loggear
				console.warn('⚠️ Dual-write: No se pudo crear identificación (no crítico):', error)
				console.warn('⚠️ El registro del caso se completó exitosamente en el sistema antiguo')
			}
		} else {
			console.log('ℹ️ Dual-write: Paciente sin cédula (S/C), omitiendo identificación')
		}

		// PASO 2: Crear caso médico enlazado al paciente
		console.log('📋 Creando caso médico...')
		// Remove auto-generated fields before passing to createMedicalCase
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { created_at, updated_at, ...cleanCaseData } = caseData
		const medicalCase = await createMedicalCase({
			...cleanCaseData,
			patient_id: patient.id,
		})

		// Descontar crédito del paciente (FIFO) si se aplicó saldo a favor en este caso
		const creditApplied = Number((caseData as any).credit_applied) || 0
		if (creditApplied > 0 && profileWithLab?.laboratory_id) {
			try {
				await (supabase as any).rpc('deduct_patient_credit', {
					p_patient_id: patient.id,
					p_laboratory_id: profileWithLab.laboratory_id,
					p_amount_to_deduct: creditApplied,
				})
				console.log('✅ Crédito del paciente descontado (FIFO):', creditApplied)
			} catch (err) {
				console.error('❌ Error al descontar crédito del paciente:', err)
				// No fallar el registro; el caso ya se creó. El saldo_a_favor en otros casos quedó sin descontar.
			}
		}

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
 *
 * @param formData - Datos del formulario
 * @param user - Usuario actual
 * @param exchangeRate - Tasa de cambio (opcional)
 * @param moduleConfig - Configuración del módulo registrationForm (opcional)
 * @param userAssignedBranch - Sede asignada al usuario (assigned_branch del perfil)
 */
const prepareRegistrationData = (
	formData: FormValues,
	user: any,
	exchangeRate?: number,
	moduleConfig?: ModuleConfig | null,
	userAssignedBranch?: string | null,
	laboratorySlug?: string | null,
) => {
	// Datos del paciente (tabla patients). Cédula SIEMPRE en formato canónico (TIPO-NUMERO).
	const cedulaRaw = formData.idType === 'S/C' ? null : `${formData.idType}-${formData.idNumber}`
	const patientData: PatientInsert = {
		cedula:
			cedulaRaw == null || cedulaRaw === ''
				? null // NULL para dependientes (no viola constraint unique_cedula_per_laboratory)
				: (formatCedulaCanonical(cedulaRaw) ?? cedulaRaw),
		nombre: formData.fullName,
		edad: formData.ageValue ? `${formData.ageValue} ${formData.ageUnit}` : null,
		telefono: formData.phone,
		email: formData.email || null,
		gender: formData.gender || null, // Si está vacío, guardar como null
	}

	// Preparar edad para el caso médico (mantener el formato original) - No se usa en nueva estructura
	// const edadFormatted = formData.ageUnit === 'Años' ? `${formData.ageValue}` : `${formData.ageValue} ${formData.ageUnit.toLowerCase()}`

	// Verificar si hay pagos y crédito aplicado (saldo a favor - labs con hasPositiveBalance)
	const hasPayments = formData.payments?.some((payment) => (payment.amount || 0) > 0) || false
	const hasTotalAmount = formData.totalAmount > 0
	const creditApplied = Number((formData as any).creditApplied) || 0
	const hasPositiveBalance = laboratorySlug === 'lm'

	// Calcular remaining amount y estado de pago (considerando crédito aplicado si aplica)
	let missingAmount = 0
	let isPaymentComplete = false
	let remaining = 0
	let excessAmount = 0

	if (creditApplied > 0 && hasTotalAmount) {
		const withCredit = calculatePaymentDetailsWithCredit(
			formData.payments || [],
			formData.totalAmount,
			exchangeRate,
			creditApplied,
		)
		missingAmount = withCredit.missingAmount ?? 0
		isPaymentComplete = withCredit.isPaymentComplete
		remaining = Math.max(0, missingAmount)
		// Excedente cuando crédito + pagos > total (guardar como saldo_a_favor en el nuevo caso)
		const totalPaidUSD = calculateTotalPaidUSD(formData.payments || [], exchangeRate)
		const totalCovered = totalPaidUSD + creditApplied
		if (totalCovered > formData.totalAmount) {
			excessAmount = parseFloat((totalCovered - formData.totalAmount).toFixed(2))
		}
	} else if (hasPayments && hasTotalAmount) {
		const paymentDetails = calculatePaymentDetails(formData.payments || [], formData.totalAmount, exchangeRate)
		missingAmount = paymentDetails.missingAmount || 0
		excessAmount = paymentDetails.excessAmount ?? 0
		isPaymentComplete = paymentDetails.isPaymentComplete
		remaining = Math.max(0, missingAmount)
	}

	// Solo crédito aplicado sin métodos de pago: pago completo si creditApplied >= totalAmount
	if (creditApplied > 0 && !hasPayments && hasTotalAmount) {
		remaining = Math.max(0, formData.totalAmount - creditApplied)
		isPaymentComplete = creditApplied >= formData.totalAmount
	}

	// Obtener valores por defecto basados en configuración del módulo
	const defaultValues = prepareDefaultValues(formData, moduleConfig, userAssignedBranch, laboratorySlug)

	// Preparar valores de pago (incluye saldo_a_favor y credit_applied para hasPositiveBalance)
	const paymentValues = preparePaymentValues(
		formData,
		hasPayments,
		hasTotalAmount,
		isPaymentComplete,
		remaining,
		hasPositiveBalance ? { saldoAFavor: excessAmount, creditApplied } : undefined,
	)

	// Datos del caso médico (tabla medical_records_clean)
	const caseData: MedicalCaseInsert = {
		// Aplicar valores por defecto primero (para campos NOT NULL)
		// Estos valores ya tienen en cuenta si el campo está habilitado o deshabilitado
		// Asegurar que campos NOT NULL nunca sean null/undefined
		origin: (defaultValues.origin || '') as string,
		treating_doctor: (defaultValues.treating_doctor || '') as string,
		sample_type: (defaultValues.sample_type || '') as string,
		number_of_samples: defaultValues.number_of_samples || 1,
		branch: defaultValues.branch ?? null, // Convertir undefined a null
		date: defaultValues.date || new Date().toISOString(),
		// payment_status se define en paymentValues, no duplicar aquí

		// Información del examen: exam_type y consulta son independientes.
		// Si el usuario no selecciona tipo de examen, debe quedar null (no rellenar con consulta).
		// El trigger en BD usa COALESCE(exam_type, consulta) solo para generar el código.
		exam_type: (formData.examType && String(formData.examType).trim()) ? formData.examType : null,

		// Campos opcionales
		relationship: formData.relationship || null,
		consulta: (formData as any).consulta && String((formData as any).consulta).trim() ? (formData as any).consulta : null, // Especialidad médica (solo para lab SPT)
		code: '', // Se generará automáticamente

		// Información financiera (usar valores preparados - maneja labs sin módulo de pagos)
		...paymentValues,
		exchange_rate: exchangeRate || null,

		// Información adicional
		comments: formData.comments || null,
		price_type: (formData as any).priceType && String((formData as any).priceType).trim() ? (formData as any).priceType : null,
		fecha_muestra: (formData as any).fechaMuestra && String((formData as any).fechaMuestra).trim() ? (formData as any).fechaMuestra : null,

		// Metadatos
		generated_by: user.id || null,
		// Campos adicionales para tracking de creación
		created_by: user.id || null,
		created_by_display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || null,
	}

	// Debug: Verificar que treating_doctor nunca sea null/undefined
	if (caseData.treating_doctor === null || caseData.treating_doctor === undefined) {
		console.error('❌ ERROR: treating_doctor es null/undefined!', {
			defaultValue: defaultValues.treating_doctor,
			formValue: formData.treatingDoctor,
			doctorName: formData.doctorName,
			moduleConfig: moduleConfig?.fields?.medicoTratante,
		})
		// Forzar string vacío si es null/undefined
		caseData.treating_doctor = ''
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
		let idType: 'V' | 'E' | 'J' | 'C' | 'S/C' = 'V'
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
 * Tipo para errores de validación mapeados a campos
 */
export interface ValidationErrors {
  [fieldName: string]: string; // Nombre del campo -> mensaje de error
}

/**
 * Validar datos antes del registro
 * 
 * NOTA: La mayoría de las validaciones de campos se hacen en Zod (form-schema.ts)
 * Esta función solo valida lógica de negocio compleja que no se puede hacer en Zod:
 * - Validación de pagos y conversión de monedas
 * - Validaciones que requieren datos externos
 * 
 * @param formData - Datos del formulario
 * @param exchangeRate - Tasa de cambio (opcional)
 * @param moduleConfig - Configuración del módulo registrationForm (opcional)
 * @param laboratorySlug - Slug del laboratorio (opcional); si es 'marihorgen', el teléfono no es obligatorio
 * @returns Objeto con errores mapeados a nombres de campos y array de mensajes para retrocompatibilidad
 */
export const validateRegistrationData = (
	formData: FormValues,
	exchangeRate?: number,
	moduleConfig?: ModuleConfig | null,
	laboratorySlug?: string | null,
): { fieldErrors: ValidationErrors; errorMessages: string[] } => {
	const fieldErrors: ValidationErrors = {}
	const errorMessages: string[] = []
	const isMarihorgen = laboratorySlug === 'marihorgen' || laboratorySlug === 'lm'

	// Validaciones obligatorias básicas (siempre requeridas)
	// NOTA: Estas también están en Zod, pero las mantenemos aquí como validación de seguridad
	if (!formData.idType) {
		const errorMsg = 'El tipo de cédula es obligatorio'
		fieldErrors.idType = errorMsg
		errorMessages.push(errorMsg)
	}
	if (!formData.idNumber && formData.idType !== 'S/C') {
		const errorMsg = 'El número de cédula es obligatorio'
		fieldErrors.idNumber = errorMsg
		errorMessages.push(errorMsg)
	}

	if (!formData.fullName) {
		const errorMsg = 'El nombre completo es obligatorio'
		fieldErrors.fullName = errorMsg
		errorMessages.push(errorMsg)
	}

	if (!isMarihorgen && !formData.phone) {
		const errorMsg = 'El teléfono es obligatorio'
		fieldErrors.phone = errorMsg
		errorMessages.push(errorMsg)
	}

	// Validar examType y consulta: Al menos uno debe estar presente
	// Para SPT: examType o consulta son suficientes para generar código
	const consultaValue = (formData as any).consulta
	const hasExamType = formData.examType && formData.examType.trim() !== ''
	const hasConsulta = consultaValue && consultaValue.trim() !== ''

	if (!hasExamType && !hasConsulta) {
		const errorMsg = 'Debe seleccionar al menos el tipo de examen o la consulta'
		fieldErrors.examType = errorMsg // Mostrar error en examType, pero afecta ambos campos
		errorMessages.push(errorMsg)
	}

	// Validar branch: SIEMPRE obligatorio
	if (!formData.branch && !formData.patientBranch) {
		const errorMsg = 'La sede es obligatoria'
		fieldErrors.branch = errorMsg
		errorMessages.push(errorMsg)
	}

	// Validar consulta solo si está habilitado y es requerido en la configuración del módulo
	// (Esta validación adicional solo aplica si la configuración específica lo requiere,
	//  además de la validación de "al menos uno")
	const consultaConfig = moduleConfig?.fields?.consulta

	if (consultaConfig?.enabled && consultaConfig?.required && !consultaValue) {
		const errorMsg = 'La consulta (especialidad médica) es obligatoria'
		fieldErrors.consulta = errorMsg
		errorMessages.push(errorMsg)
	}

	// Validar otros campos según configuración (solo si están habilitados y son requeridos)
	const originConfig = moduleConfig?.fields?.procedencia
	if (originConfig?.enabled && originConfig?.required && !formData.origin) {
		const errorMsg = 'El origen es obligatorio'
		fieldErrors.origin = errorMsg
		errorMessages.push(errorMsg)
	}

	const doctorConfig = moduleConfig?.fields?.medicoTratante
	if (doctorConfig?.enabled && doctorConfig?.required && !formData.treatingDoctor && !formData.doctorName) {
		const errorMsg = 'El doctor tratante es requerido'
		fieldErrors.treatingDoctor = errorMsg
		errorMessages.push(errorMsg)
	}

	const sampleTypeConfig = moduleConfig?.fields?.sampleType
	if (sampleTypeConfig?.enabled && sampleTypeConfig?.required && !formData.sampleType) {
		const errorMsg = 'El tipo de muestra es obligatorio'
		fieldErrors.sampleType = errorMsg
		errorMessages.push(errorMsg)
	}

	const numberOfSamplesConfig = moduleConfig?.fields?.numberOfSamples
	if (
		numberOfSamplesConfig?.enabled &&
		numberOfSamplesConfig?.required &&
		(!formData.numberOfSamples || formData.numberOfSamples < 1)
	) {
		const errorMsg = 'El número de muestras es obligatorio'
		fieldErrors.numberOfSamples = errorMsg
		errorMessages.push(errorMsg)
	}

	// Validaciones complejas de negocio (pagos y conversión de monedas)
	const hasPayments = formData.payments?.some((payment) => (payment.amount || 0) > 0) || false
	if (hasPayments && formData.totalAmount <= 0) {
		const errorMsg = 'El monto total debe ser mayor a 0 cuando hay pagos'
		fieldErrors.totalAmount = errorMsg
		errorMessages.push(errorMsg)
	}

	// Validar pagos usando la función que convierte correctamente las monedas
	// Labs con hasPositiveBalance (lm) pueden tener overpayment (saldo a favor)
	const hasPositiveBalance = laboratorySlug === 'lm'
	if (hasPayments) {
		const paymentValidation = validateFormPayments(
			formData.payments || [],
			formData.totalAmount,
			exchangeRate,
			{ allowOverpayment: hasPositiveBalance },
		)

		if (!paymentValidation.isValid) {
			const errorMsg = paymentValidation.errorMessage || 'Error en la validación de pagos'
			fieldErrors.totalAmount = errorMsg
			errorMessages.push(errorMsg)
		}
	}

	return { fieldErrors, errorMessages }
}
