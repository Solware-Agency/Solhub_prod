import * as XLSX from 'xlsx'

export const exportRowsToExcel = (fileBaseName: string, rows: Record<string, string | number | boolean | null>[]) => {
	const wb = XLSX.utils.book_new()
	const ws = XLSX.utils.json_to_sheet(rows)
	XLSX.utils.book_append_sheet(wb, ws, 'Export')

	const now = new Date()
	const dateStr = now.toISOString().split('T')[0]
	const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')
	const fileName = `${fileBaseName}_${dateStr}_${timeStr}.xlsx`

	XLSX.writeFile(wb, fileName)
}

/** Reduce filas a las columnas indicadas (en orden) y aplica anchos opcionales. */
export const exportRowsToExcelOrdered = (
	fileBaseName: string,
	rows: Record<string, string | number | boolean | null>[],
	columnKeys: string[],
	columnWidths?: Record<string, number>,
	sheetName = 'Export',
) => {
	const narrowed = rows.map((row) =>
		Object.fromEntries(columnKeys.map((k) => [k, row[k] ?? ''])) as Record<string, string | number | boolean>,
	)
	const wb = XLSX.utils.book_new()
	const ws = XLSX.utils.json_to_sheet(narrowed)
	ws['!cols'] = columnKeys.map((k) => ({ wch: columnWidths?.[k] ?? 15 }))
	XLSX.utils.book_append_sheet(wb, ws, sheetName)

	const now = new Date()
	const dateStr = now.toISOString().split('T')[0]
	const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')
	const fileName = `${fileBaseName}_${dateStr}_${timeStr}.xlsx`

	XLSX.writeFile(wb, fileName)
}
