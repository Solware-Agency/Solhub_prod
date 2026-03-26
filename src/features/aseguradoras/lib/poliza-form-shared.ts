export const POLIZA_FORM_STEPS = ['Asegurado', 'Datos póliza', 'Fechas', 'Documentos'] as const

/** Opciones de ramo (desc_ramo) según catálogo de aseguradoras */
export const RAMOS_OPCIONES = [
	'MAQUINARIA Y EQUIPOS INDUSTRIALES',
	'AUTOMOVIL',
	'MILENIO DEL HOGAR',
	'HCM',
	'TODO RIESGO DE INCENDIO',
	'MILENIO INDUSTRIA Y COMERCIO',
	'SERVICIOS MEDICOS MERCANTIL',
	'GLOBAL BENEFITS INDIVIDUAL',
	'HCM COLECTIVO',
	'INTER INDUSTRIA Y COMERCIO',
	'SEGURO DE DINERO',
	'EQUIPOS ELECTRONICOS',
	'COMBINADO DE RESIDENCIA',
	'ROBO',
	'AVIACION',
	'TRANSPORTE TERRESTRE',
	'3D',
	'RESPONSABILIDAD CIVIL GENERAL',
	'RIESGOS ESPECIALES',
	'INCENDIO',
	'TODO RIESGO INCENDIO',
	'FIANZA',
	'ACCIDENTES PERSONALES',
	'TERREMOTO',
	'VIDA',
	'RCV EMBARCACIONES',
	'SEGURO SOLIDARIO SALUD',
	'SEGURO SOIDARIO FUNERARIO',
	'SEGURO SOLIDARIO ACCIDENTES PERSONALES',
	'SEGUROS FUNERARIOS COLECTIVO',
	'VIDA COLECTIVA',
	'ACCIDENTES PERSONALES COLECTIVO',
	'SERVICIOS DE EMERGENCIA MÉDICA',
	'SEGUROS DE INDUSTRIA Y COMERCIO',
	'GROUP BENEFITS INTEGRAL',
	'RESPONSABILIDAD CIVIL PROFESIONAL',
	'REPONSABILIDAD CIVIL PATRONAL',
	'REPONSABILIDAD CIVIL EMPRESARIAL',
	'INCENDIO Y TERREMOTO',
	'ACCIDENTES PERSONALES ESCOLARES',
	'PYME',
	'GLOBAL BENEFITS COLECTIVO',
	'RCV',
] as const

/** Mismos valores que `RAMOS_OPCIONES`, en orden alfabético para selects y filtros. */
export const RAMOS_OPCIONES_ALFABETICO = [...RAMOS_OPCIONES].sort((a, b) =>
	a.localeCompare(b, 'es', { sensitivity: 'base' }),
) as readonly (typeof RAMOS_OPCIONES)[number][]

/** Construye las 5 columnas de cobro/recordatorios desde los valores del formulario. */
export function buildPaymentColumnsFromForm(form: {
	fecha_prox_vencimiento: string
	fecha_vencimiento: string
	dia_vencimiento: string
	modalidad_pago: 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual'
	suma_asegurada: string
	estatus_pago: 'Pagado' | 'Parcial' | 'Pendiente' | 'En mora'
}) {
	const nextPaymentDate = form.fecha_prox_vencimiento || form.fecha_vencimiento || null
	const renewalDay = form.dia_vencimiento ? Number(form.dia_vencimiento) : null
	const paymentFrequency =
		form.modalidad_pago === 'Mensual'
			? 'monthly'
			: form.modalidad_pago === 'Trimestral'
				? 'quarterly'
				: form.modalidad_pago === 'Semestral'
					? 'semiannual'
					: 'yearly'
	const billingAmount = form.suma_asegurada ? Number(form.suma_asegurada) : null
	const paymentStatus: 'current' | 'overdue' =
		form.estatus_pago === 'Pagado'
			? 'current'
			: form.estatus_pago === 'En mora'
				? 'overdue'
				: (() => {
						const refDate = nextPaymentDate || form.fecha_vencimiento
						if (!refDate) return 'current'
						const ref = new Date(refDate)
						ref.setHours(0, 0, 0, 0)
						const today = new Date()
						today.setHours(0, 0, 0, 0)
						return ref < today ? 'overdue' : 'current'
					})()
	return {
		next_payment_date: nextPaymentDate || null,
		renewal_day_of_month: renewalDay,
		payment_frequency: paymentFrequency,
		billing_amount: billingAmount,
		payment_status: paymentStatus,
	}
}
