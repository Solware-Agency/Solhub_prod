import { z } from 'zod'
import type { ModuleConfig } from '@/shared/types/types'

// --- Validation Schema ---
export const paymentSchema = z.object({
	method: z.string().optional(),
	amount: z.coerce
		.number({ invalid_type_error: 'El monto debe ser un número' })
		.min(0, 'El monto debe ser un número positivo o cero.')
		.optional(),
	reference: z.string().optional(),
})

/**
 * Crea un schema de validación dinámico basado en la configuración del módulo
 * Si un campo está deshabilitado, no se valida como requerido
 * 
 * Nota: Algunos campos como 'consulta' tienen validaciones específicas por laboratorio
 * que se manejan en validateRegistrationData (ej: consulta es requerido solo para lab SPT)
 */
export const createFormSchema = (moduleConfig?: ModuleConfig | null, laboratorySlug?: string | null) => {
	// Obtener configuraciones de campos
	const examTypeConfig = moduleConfig?.fields?.examType
	const originConfig = moduleConfig?.fields?.procedencia
	const sampleTypeConfig = moduleConfig?.fields?.sampleType
	const numberOfSamplesConfig = moduleConfig?.fields?.numberOfSamples
	const branchConfig = moduleConfig?.fields?.branch
	const consultaConfig = moduleConfig?.fields?.consulta
	const isSPT = laboratorySlug?.toLowerCase() === 'spt'

	// Definir schemas condicionales para cada campo
	// Para SPT: Solo sede es obligatorio, los demás campos son opcionales
	const examTypeSchema = examTypeConfig?.enabled && examTypeConfig?.required && !isSPT
		? z.string().min(1, 'El tipo de examen es requerido')
		: z.string().optional().or(z.literal(''))

	const originSchema = originConfig?.enabled && originConfig?.required
		? z
			.string()
			.min(1, 'El origen es requerido')
			.regex(
				/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s0-9]+$/,
				'Procedencia solo debe contener letras, números y espacios',
			)
		: z
			.string()
			.regex(
				/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s0-9]*$/,
				'Procedencia solo debe contener letras, números y espacios',
			)
			.optional()
			.or(z.literal(''))

	const sampleTypeSchema = sampleTypeConfig?.enabled && sampleTypeConfig?.required
		? z.string().min(1, 'El tipo de muestra es requerido')
		: z.string().optional().or(z.literal(''))

	const numberOfSamplesSchema = numberOfSamplesConfig?.enabled && numberOfSamplesConfig?.required
		? z.coerce
			.number({ invalid_type_error: 'El número de muestras es requerido' })
			.int()
			.positive('El número debe ser positivo')
			.min(1, 'El número de muestras es requerido')
		: z.coerce
			.number({ invalid_type_error: 'El número de muestras debe ser un número' })
			.int()
			.positive('El número debe ser positivo')
			.min(1, 'El número debe ser al menos 1')
			.optional()
			.or(z.literal(1))

	// Para SPT: sede es 100% obligatoria si está habilitado
	// Para otros labs: solo es requerido si branchConfig.required es true
	const branchSchema = branchConfig?.enabled && (isSPT || branchConfig?.required)
		? z.string().min(1, 'La sede es requerida')
		: z.string().optional().or(z.literal(''))

	// Para SPT: consulta es opcional aunque esté habilitado y marcado como requerido
	const consultaSchema = consultaConfig?.enabled && consultaConfig?.required && !isSPT
		? z.string().min(1, 'La consulta (especialidad médica) es requerida')
		: z.string().optional().or(z.literal(''))

	// totalAmount es opcional porque se valida en validateRegistrationData
	// Solo es requerido si hay pagos (labs con módulo de pagos)
	// Permite 0 o valores mayores, y es opcional para labs sin módulo de pagos
	const totalAmountSchema = z.coerce
		.number({ invalid_type_error: 'El monto total debe ser un número' })
		.min(0, 'El monto total debe ser mayor o igual a cero')
		.optional()
		.default(0)

	return z.object({
		fullName: z
			.string()
			.min(1, 'Nombre completo es requerido')
			.regex(
				/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]+$/,
				'Nombre solo debe contener letras y espacios',
			),
		idType: z.enum(['V', 'E', 'J', 'C', 'S/C'], {
			required_error: 'Debe seleccionar el tipo de cédula.',
		}),
		idNumber: z
			.string()
			.default('')
			.refine(
				(val) => !val || /^[0-9]+$/.test(val),
				'Cédula solo debe contener números',
			),
		phone: z
			.string()
			.min(1, 'El número de teléfono es requerido')
			.max(15, 'El número de teléfono no puede tener más de 15 caracteres')
			.regex(
				/^[0-9-+\s()]+$/,
				'El teléfono solo puede contener números, guiones, espacios, paréntesis y el símbolo +',
			),
		ageValue: z
			.number({
				required_error: 'La edad es requerida.',
				invalid_type_error: 'La edad debe ser un número.',
			})
			.min(0, 'La edad debe ser un número positivo')
			.max(150, 'La edad no puede ser mayor a 150'),
		ageUnit: z.enum(['Meses', 'Años'], {
			required_error: 'Debe seleccionar la unidad de edad.',
		}),
		email: z
			.string()
			.email('Correo electrónico inválido')
			.optional()
			.or(z.literal('')),
		gender: z
			.enum(['Masculino', 'Femenino'], {
				required_error: 'Debe seleccionar el género.',
			})
			.or(z.literal('')),
		registrationDate: z.date({
			required_error: 'La fecha de registro es requerida.',
		}),
		examType: examTypeSchema,
		origin: originSchema,
		treatingDoctor: z
			.string()
			.regex(
				/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]*$/,
				'Médico tratante solo debe contener letras y espacios',
			)
			.optional()
			.or(z.literal('')), // Opcional: solo requerido si está habilitado en la configuración del módulo
		sampleType: sampleTypeSchema,
		numberOfSamples: numberOfSamplesSchema,
		relationship: z.string().optional(),
		branch: branchSchema,
		consulta: consultaSchema,
		totalAmount: totalAmountSchema,
		payments: z.array(paymentSchema).optional().default([]),
		comments: z.string().optional(),
		// Campos adicionales para compatibilidad con registration-service
		doctorName: z.string().default(''),
		patientType: z.string().default(''),
		originType: z.string().default(''),
		patientBranch: z.string().default(''),
	})
}

// Schema por defecto (sin configuración de módulo - para compatibilidad)
export const formSchema = createFormSchema();

export type FormValues = z.infer<ReturnType<typeof createFormSchema>>