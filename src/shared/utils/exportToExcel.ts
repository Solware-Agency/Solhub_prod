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
