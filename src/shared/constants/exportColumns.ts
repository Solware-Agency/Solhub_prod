/**
 * Catálogo de columnas exportables a Excel para casos médicos.
 * key = header en Excel (identificador estable), group = agrupación en el modal Personalizar.
 */
export interface ExportColumnOption {
	key: string
	label: string
	group: string
	defaultWidth: number
}

export const EXPORT_COLUMN_OPTIONS: ExportColumnOption[] = [
	// Caso
	{ key: 'Código', label: 'Código', group: 'Caso', defaultWidth: 15 },
	{ key: 'Registro', label: 'Fecha de registro', group: 'Caso', defaultWidth: 18 },
	{ key: 'Sede', label: 'Sede', group: 'Caso', defaultWidth: 10 },
	{ key: 'Tipo de Estudio', label: 'Tipo de estudio', group: 'Caso', defaultWidth: 20 },
	{ key: 'Médico Tratante', label: 'Médico tratante', group: 'Caso', defaultWidth: 25 },
	// Paciente
	{ key: 'Nombre del Paciente', label: 'Nombre del paciente', group: 'Paciente', defaultWidth: 25 },
	{ key: 'Cédula', label: 'Cédula', group: 'Paciente', defaultWidth: 15 },
	{ key: 'Email', label: 'Email', group: 'Paciente', defaultWidth: 25 },
	{ key: 'Edad', label: 'Edad', group: 'Paciente', defaultWidth: 8 },
	// Pagos
	{ key: 'Tasa de Cambio (Bs)', label: 'Tasa de cambio (Bs)', group: 'Pagos', defaultWidth: 18 },
	{ key: 'Monto Total (USD)', label: 'Monto total (USD)', group: 'Pagos', defaultWidth: 18 },
	{ key: 'Monto Total (Bs)', label: 'Monto total (Bs)', group: 'Pagos', defaultWidth: 18 },
	{ key: 'Estado de Pago', label: 'Estado de pago', group: 'Pagos', defaultWidth: 15 },
	{ key: 'Monto Faltante', label: 'Monto faltante', group: 'Pagos', defaultWidth: 15 },
	{ key: 'Método de Pago 1', label: 'Método de pago 1', group: 'Pagos', defaultWidth: 20 },
	{ key: 'Monto Pago 1', label: 'Monto pago 1', group: 'Pagos', defaultWidth: 15 },
	{ key: 'Referencia Pago 1', label: 'Referencia pago 1', group: 'Pagos', defaultWidth: 25 },
	{ key: 'Método de Pago 2', label: 'Método de pago 2', group: 'Pagos', defaultWidth: 20 },
	{ key: 'Monto Pago 2', label: 'Monto pago 2', group: 'Pagos', defaultWidth: 15 },
	{ key: 'Referencia Pago 2', label: 'Referencia pago 2', group: 'Pagos', defaultWidth: 25 },
	{ key: 'Método de Pago 3', label: 'Método de pago 3', group: 'Pagos', defaultWidth: 20 },
	{ key: 'Monto Pago 3', label: 'Monto pago 3', group: 'Pagos', defaultWidth: 15 },
	{ key: 'Referencia Pago 3', label: 'Referencia pago 3', group: 'Pagos', defaultWidth: 25 },
	{ key: 'Método de Pago 4', label: 'Método de pago 4', group: 'Pagos', defaultWidth: 20 },
	{ key: 'Monto Pago 4', label: 'Monto pago 4', group: 'Pagos', defaultWidth: 15 },
	{ key: 'Referencia Pago 4', label: 'Referencia pago 4', group: 'Pagos', defaultWidth: 25 },
	// Documentos / Citología
	{ key: 'PDF Listo', label: 'PDF listo', group: 'Documentos', defaultWidth: 12 },
	{ key: 'Estatus Citología', label: 'Estatus citología', group: 'Documentos', defaultWidth: 15 },
]

export const EXPORT_COLUMN_KEYS = EXPORT_COLUMN_OPTIONS.map((c) => c.key)
