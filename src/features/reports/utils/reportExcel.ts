import * as XLSX from 'xlsx'
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { formatCurrency, formatCurrencyWithSymbol } from '@shared/utils/number-utils'
import type { DashboardStats } from '@shared/hooks/useDashboardStats'

export type ReportTimeRange = 'today' | 'week' | 'month' | 'year'

/**
 * Returns start and end dates for the given preset (in local time).
 * "week" = last 7 days including today.
 */
export function getDateRangeForPreset(range: ReportTimeRange): { start: Date; end: Date; label: string } {
	const now = new Date()
	switch (range) {
		case 'today':
			return { start: startOfDay(now), end: endOfDay(now), label: 'Hoy' }
		case 'week': {
			const end = endOfDay(now)
			const start = startOfDay(subDays(now, 6))
			return { start, end, label: 'Última semana' }
		}
		case 'month':
			return { start: startOfMonth(now), end: endOfMonth(now), label: 'Este mes' }
		case 'year':
			return { start: startOfYear(now), end: endOfYear(now), label: 'Este año' }
		default:
			return { start: startOfMonth(now), end: endOfMonth(now), label: 'Este mes' }
	}
}

export interface ReportSectionFlags {
	includeDoctors: boolean
	includeOrigins: boolean
	includeExamTypes: boolean
	includeBranches: boolean
	includePaymentStatus: boolean
}

/**
 * Builds an Excel workbook for the income report: Resumen sheet + optional sheets per section.
 * Uses stats for the selected period (monthlyRevenue = period revenue).
 */
export function buildReportWorkbook(
	stats: DashboardStats,
	sections: ReportSectionFlags,
	rangeLabel: string,
	periodStart: Date,
	periodEnd: Date,
): XLSX.WorkBook {
	const wb = XLSX.utils.book_new()
	const periodText = `${format(periodStart, 'dd/MM/yyyy')} - ${format(periodEnd, 'dd/MM/yyyy')}`

	// --- Hoja Resumen ---
	// Desglose por moneda: ingresos en USD, en Bs y equivalente total; pendientes en USD (los pendientes se registran en USD)
	const summaryRows: Record<string, string | number>[] = [
		{ Concepto: 'Período del reporte', Valor: rangeLabel },
		{ Concepto: 'Fechas', Valor: periodText },
		{ Concepto: '', Valor: '' },
		{ Concepto: 'Ingresos cobrados en USD', Valor: formatCurrency(stats.monthlyRevenueDollars ?? 0) },
		{ Concepto: 'Ingresos cobrados en Bs', Valor: formatCurrencyWithSymbol(stats.monthlyRevenueBolivares ?? 0, 'Bs ') },
		{ Concepto: 'Casos con al menos un pago en Bs', Valor: stats.casesWithPaymentInBolivares ?? 0 },
		{ Concepto: 'Total ingresos (equivalente USD)', Valor: formatCurrency(stats.monthlyRevenue) },
		{ Concepto: 'Nota ingresos', Valor: 'Ingresos en Bs convertidos a USD con la tasa de cambio de cada caso.' },
		{ Concepto: '', Valor: '' },
		{ Concepto: 'Total casos', Valor: stats.totalCases },
		{ Concepto: 'Casos pagados', Valor: stats.completedCases },
		{ Concepto: 'Casos incompletos', Valor: stats.incompleteCases },
		{ Concepto: 'Pagos pendientes (USD)', Valor: formatCurrency(stats.pendingPayments) },
		{ Concepto: 'Pagos pendientes (Bs)', Valor: '—' },
		{ Concepto: 'Nota pendientes', Valor: 'Los montos pendientes corresponden al total en USD de casos incompletos del período.' },
		{ Concepto: '', Valor: '' },
		{ Concepto: 'Pacientes únicos (laboratorio)', Valor: stats.uniquePatients },
	]
	const wsResumen = XLSX.utils.json_to_sheet(summaryRows)
	wsResumen['!cols'] = [{ wch: 36 }, { wch: 52 }]
	XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

	// --- Ingresos por Médico ---
	if (sections.includeDoctors && stats.topTreatingDoctors?.length) {
		const totalRev = stats.monthlyRevenue || 1
		const doctorRows = stats.topTreatingDoctors.map((d) => ({
			'Médico': d.doctor,
			'Casos': d.cases,
			'Monto (USD)': formatCurrency(d.revenue),
			'% del total': `${((d.revenue / totalRev) * 100).toFixed(1)}%`,
		}))
		const wsDoctors = XLSX.utils.json_to_sheet(doctorRows)
		wsDoctors['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 18 }, { wch: 12 }]
		XLSX.utils.book_append_sheet(wb, wsDoctors, 'Por Médico')
	}

	// --- Por Procedencia ---
	if (sections.includeOrigins && stats.revenueByOrigin?.length) {
		const originRows = stats.revenueByOrigin.map((o) => ({
			'Procedencia': o.origin,
			'Casos': o.cases,
			'Monto': formatCurrency(o.revenue),
			'% del total': `${o.percentage.toFixed(1)}%`,
		}))
		const wsOrigins = XLSX.utils.json_to_sheet(originRows)
		wsOrigins['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 18 }, { wch: 12 }]
		XLSX.utils.book_append_sheet(wb, wsOrigins, 'Por Procedencia')
	}

	// --- Por Tipo de Examen ---
	if (sections.includeExamTypes && stats.revenueByExamType?.length) {
		const totalRev = stats.monthlyRevenue || 1
		const examRows = stats.revenueByExamType.map((e) => ({
			'Tipo de examen': e.examType,
			'Casos': e.count,
			'Monto': formatCurrency(e.revenue),
			'% del total': `${((e.revenue / totalRev) * 100).toFixed(1)}%`,
		}))
		const wsExam = XLSX.utils.json_to_sheet(examRows)
		wsExam['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 18 }, { wch: 12 }]
		XLSX.utils.book_append_sheet(wb, wsExam, 'Por Tipo Examen')
	}

	// --- Por Sede ---
	if (sections.includeBranches && stats.revenueByBranch?.length) {
		const branchRows = stats.revenueByBranch.map((b) => ({
			'Sede': b.branch,
			'Monto': formatCurrency(b.revenue),
			'% del total': `${b.percentage.toFixed(1)}%`,
		}))
		const wsBranch = XLSX.utils.json_to_sheet(branchRows)
		wsBranch['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }]
		XLSX.utils.book_append_sheet(wb, wsBranch, 'Por Sede')
	}

	// --- Estado de Pagos ---
	if (sections.includePaymentStatus) {
		const totalCases = stats.totalCases || 1
		const completedPct = ((stats.completedCases / totalCases) * 100).toFixed(1)
		const incompletePct = ((stats.incompleteCases / totalCases) * 100).toFixed(1)
		const paymentRows: Record<string, string | number>[] = [
			{ 'Estado': 'Pagados', 'Casos': stats.completedCases, '% del total': `${completedPct}%`, 'Monto pendiente': formatCurrency(0) },
			{ 'Estado': 'Incompletos', 'Casos': stats.incompleteCases, '% del total': `${incompletePct}%`, 'Monto pendiente': formatCurrency(stats.pendingPayments) },
		]
		const wsPayment = XLSX.utils.json_to_sheet(paymentRows)
		wsPayment['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 18 }]
		XLSX.utils.book_append_sheet(wb, wsPayment, 'Estado de Pagos')
	}

	return wb
}

/**
 * Returns a safe filename segment for the selected range (no spaces/special chars).
 */
export function getRangeLabelForFilename(range: ReportTimeRange): string {
	switch (range) {
		case 'today':
			return 'hoy'
		case 'week':
			return 'ultima-semana'
		case 'month':
			return 'este-mes'
		case 'year':
			return 'este-ano'
		default:
			return 'reporte'
	}
}
