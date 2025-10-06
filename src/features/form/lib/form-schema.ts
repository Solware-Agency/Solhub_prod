import { z } from 'zod'

// --- Validation Schema ---
export const paymentSchema = z.object({
	method: z.string().optional(),
	amount: z.coerce
		.number({ invalid_type_error: 'El monto debe ser un número' })
		.min(0, 'El monto debe ser un número positivo o cero.')
		.optional(),
	reference: z.string().optional(),
})

export const formSchema = z.object({
	fullName: z
		.string()
		.min(1, 'Nombre completo es requerido')
		.regex(/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]+$/, 'Nombre solo debe contener letras y espacios'),
	idType: z.enum(['V', 'E', 'J', 'C', 'S/C'], {
		required_error: 'Debe seleccionar el tipo de cédula.',
	}),
	idNumber: z
		.string()
		.default('')
		.refine((val) => !val || /^[0-9]+$/.test(val), 'Cédula solo debe contener números'),
	phone: z
		.string()
		.min(1, 'El número de teléfono es requerido')
		.max(15, 'El número de teléfono no puede tener más de 15 caracteres')
		.regex(/^[0-9-+\s()]+$/, 'El teléfono solo puede contener números, guiones, espacios, paréntesis y el símbolo +'),
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
	email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
	gender: z
		.enum(['Masculino', 'Femenino'], {
			required_error: 'Debe seleccionar el género.',
		})
		.or(z.literal('')),
	registrationDate: z.date({ required_error: 'La fecha de registro es requerida.' }),
	examType: z.string().min(1, 'El tipo de exámen es requerido'),
	origin: z
		.string()
		.min(1, 'El origen es requerido')
		.regex(/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s0-9]+$/, 'Procedencia solo debe contener letras, números y espacios'),
	treatingDoctor: z
		.string()
		.min(1, 'El médico tratante es requerido')
		.regex(/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]+$/, 'Médico tratante solo debe contener letras y espacios'),
	sampleType: z.string().min(1, 'El tipo de muestra es requerido'),
	numberOfSamples: z.coerce
		.number({ invalid_type_error: 'El número de muestras es requerido' })
		.int()
		.positive('El número debe ser positivo')
		.min(1, 'El número de muestras es requerido'),
	relationship: z.string().optional(),
	branch: z.string().min(1, 'La sede es requerida'),
	totalAmount: z.coerce
		.number({ invalid_type_error: 'El monto total es requerido' })
		.min(0.01, 'El monto total debe ser mayor a cero'),
	payments: z.array(paymentSchema).optional().default([]),
	comments: z.string().optional(),
	// Campos adicionales para compatibilidad con registration-service
	doctorName: z.string().default(''),
	patientType: z.string().default(''),
	originType: z.string().default(''),
	patientBranch: z.string().default(''),
})

export type FormValues = z.infer<typeof formSchema>