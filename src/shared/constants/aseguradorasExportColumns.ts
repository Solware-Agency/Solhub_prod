/**
 * Columnas exportables Excel — módulo aseguradoras (keys = encabezados en el archivo).
 */

export interface AseguradorasExportColumnDef {
	key: string
	label: string
	group: string
	defaultWidth: number
}

export const ASEGURADO_EXPORT_COLUMN_OPTIONS: AseguradorasExportColumnDef[] = [
	{ key: 'Código', label: 'Código', group: 'Asegurado', defaultWidth: 12 },
	{ key: 'Nombre', label: 'Nombre', group: 'Asegurado', defaultWidth: 28 },
	{ key: 'Documento', label: 'Documento', group: 'Asegurado', defaultWidth: 18 },
	{ key: 'Teléfono', label: 'Teléfono', group: 'Asegurado', defaultWidth: 14 },
	{ key: 'Email', label: 'Email', group: 'Asegurado', defaultWidth: 28 },
	{ key: 'Fecha nac.', label: 'Fecha nac.', group: 'Asegurado', defaultWidth: 14 },
	{ key: 'Tipo', label: 'Tipo', group: 'Asegurado', defaultWidth: 18 },
]

export const ASEGURADORA_EXPORT_COLUMN_OPTIONS: AseguradorasExportColumnDef[] = [
	{ key: 'Código', label: 'Código', group: 'Compañía', defaultWidth: 10 },
	{ key: 'Nombre', label: 'Nombre', group: 'Compañía', defaultWidth: 28 },
	{ key: 'Código interno', label: 'Código interno', group: 'Compañía', defaultWidth: 14 },
	{ key: 'RIF', label: 'RIF', group: 'Compañía', defaultWidth: 16 },
	{ key: 'Teléfono', label: 'Teléfono', group: 'Compañía', defaultWidth: 14 },
	{ key: 'Email', label: 'Email', group: 'Compañía', defaultWidth: 24 },
	{ key: 'Web', label: 'Web', group: 'Compañía', defaultWidth: 28 },
	{ key: 'Activo', label: 'Activo', group: 'Compañía', defaultWidth: 10 },
]

export const POLIZA_EXPORT_COLUMN_OPTIONS: AseguradorasExportColumnDef[] = [
	{ key: 'Código', label: 'Código', group: 'Póliza', defaultWidth: 14 },
	{ key: 'Número de póliza', label: 'Número de póliza', group: 'Póliza', defaultWidth: 18 },
	{ key: 'Asegurado', label: 'Asegurado', group: 'Póliza', defaultWidth: 26 },
	{ key: 'Aseguradora', label: 'Aseguradora', group: 'Póliza', defaultWidth: 26 },
	{ key: 'Ramo', label: 'Ramo', group: 'Póliza', defaultWidth: 18 },
	{ key: 'Modalidad de pago', label: 'Modalidad de pago', group: 'Póliza', defaultWidth: 18 },
	{ key: 'Estatus póliza', label: 'Estatus póliza', group: 'Póliza', defaultWidth: 14 },
	{ key: 'Estatus pago', label: 'Estatus pago', group: 'Póliza', defaultWidth: 14 },
	{ key: 'Fecha vencimiento', label: 'Fecha vencimiento', group: 'Póliza', defaultWidth: 16 },
]
