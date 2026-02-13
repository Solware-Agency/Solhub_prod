import React, { useState, useMemo } from 'react'
import { Card } from '@shared/components/ui/card'
import { Download, FileText, Loader2, CheckSquare, Calendar } from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { Checkbox } from '@shared/components/ui/checkbox'
import { Label } from '@shared/components/ui/label'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@shared/components/ui/dialog'
import { useToast } from '@shared/hooks/use-toast'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatCurrencyWithSymbol } from '@shared/utils/number-utils'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@shared/components/ui/select'
import {
	getDateRangeForPreset,
	buildReportWorkbook,
	getRangeLabelForFilename,
	type ReportTimeRange,
	type ReportSectionFlags,
} from '../utils/reportExcel'

const PAGE_HEIGHT = 297
const TABLE_OPTIONS = {
	theme: 'grid' as const,
	styles: { fontSize: 9 },
	headStyles: { fillColor: [71, 85, 105], textColor: 255 },
}

function addSectionTable(
	doc: jsPDF,
	y: number,
	title: string,
	margin: number,
	rows: string[][],
	opts: { margin: { left: number } },
): number {
	if (rows.length < 2) return y
	if (y > PAGE_HEIGHT - 60) {
		doc.addPage()
		y = 14
	}
	doc.setFontSize(11)
	doc.text(title, margin, y)
	y += 7
	autoTable(doc, {
		head: [rows[0]],
		body: rows.slice(1),
		startY: y,
		...TABLE_OPTIONS,
		...opts,
	})
	return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
}

const ExportSection: React.FC = () => {
	const [timeRange, setTimeRange] = useState<ReportTimeRange>('month')
	const { start: rangeStart, end: rangeEnd, label: rangeLabel } = useMemo(
		() => getDateRangeForPreset(timeRange),
		[timeRange],
	)

	const { data: stats, isLoading } = useDashboardStats(rangeStart, rangeEnd)
	const { toast } = useToast()
	const [isExporting, setIsExporting] = useState(false)
	const [openExportModal, setOpenExportModal] = useState(false)

	// Export options
	const [includeDoctors, setIncludeDoctors] = useState(true)
	const [includeOrigins, setIncludeOrigins] = useState(true)
	const [includeExamTypes, setIncludeExamTypes] = useState(true)
	const [includeBranches, setIncludeBranches] = useState(true)
	const [includePaymentStatus, setIncludePaymentStatus] = useState(true)

	const handleExportExcel = () => {
		if (isLoading || !stats) {
			toast({
				title: '❌ Datos no disponibles',
				description: 'Espera a que se carguen los datos antes de exportar.',
				variant: 'destructive',
			})
			return
		}

		setIsExporting(true)
		try {
			const wb = buildReportWorkbook(
				stats,
				{
					includeDoctors,
					includeOrigins,
					includeExamTypes,
					includeBranches,
					includePaymentStatus,
				},
				rangeLabel,
				rangeStart,
				rangeEnd,
			)
			const fileName = `reporte-ingresos-${getRangeLabelForFilename(timeRange)}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
			XLSX.writeFile(wb, fileName)
			toast({
				title: '✅ Reporte exportado',
				description: `Se descargó ${fileName}`,
			})
		} catch (error) {
			console.error('Error al exportar Excel:', error)
			toast({
				title: '❌ Error al exportar',
				description: 'Hubo un problema al generar el Excel. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setIsExporting(false)
		}
	}

	const handleExportPdf = () => {
		if (isLoading || !stats) {
			toast({
				title: '❌ Datos no disponibles',
				description: 'Espera a que se carguen los datos antes de exportar.',
				variant: 'destructive',
			})
			return
		}
		setIsExporting(true)
		setOpenExportModal(false)
		try {
			const periodText = `${format(rangeStart, 'dd/MM/yyyy')} - ${format(rangeEnd, 'dd/MM/yyyy')}`
			const sections: ReportSectionFlags = {
				includeDoctors,
				includeOrigins,
				includeExamTypes,
				includeBranches,
				includePaymentStatus,
			}
			const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
			const margin = 14
			let y = 14
			doc.setFontSize(16)
			doc.text('Reporte de ingresos', margin, y)
			y += 8
			doc.setFontSize(10)
			doc.text(`${rangeLabel} · ${periodText}`, margin, y)
			y += 10

			// Tabla Resumen
			const summaryHead = [['Concepto', 'Valor']]
			const summaryBody: string[][] = [
				['Período del reporte', rangeLabel],
				['Fechas', periodText],
				['', ''],
				['Ingresos cobrados en USD', formatCurrency(stats.monthlyRevenueDollars ?? 0)],
				['Ingresos cobrados en Bs', formatCurrencyWithSymbol(stats.monthlyRevenueBolivares ?? 0, 'Bs ')],
				['Casos con al menos un pago en Bs', String(stats.casesWithPaymentInBolivares ?? 0)],
				['Total ingresos (equivalente USD)', formatCurrency(stats.monthlyRevenue)],
				['', ''],
				['Total casos', String(stats.totalCases)],
				['Casos pagados', String(stats.completedCases)],
				['Casos incompletos', String(stats.incompleteCases)],
				['Pagos pendientes (USD)', formatCurrency(stats.pendingPayments)],
				['', ''],
				['Pacientes únicos', String(stats.uniquePatients)],
			]
			autoTable(doc, {
				head: summaryHead,
				body: summaryBody,
				startY: y,
				theme: 'grid',
				styles: { fontSize: 9 },
				headStyles: { fillColor: [71, 85, 105], textColor: 255 },
				columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 85 } },
				margin: { left: margin },
			})
			y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

			const pdfMargin = { margin: { left: margin } }

			if (sections.includeDoctors && stats.topTreatingDoctors?.length) {
				const totalRev = stats.monthlyRevenue || 1
				y = addSectionTable(doc, y, 'Ingresos por Médico Tratante', margin, [
					['Médico', 'Casos', 'Monto (USD)', '% del total'],
					...stats.topTreatingDoctors.map((d) => [
						d.doctor,
						String(d.cases),
						formatCurrency(d.revenue),
						`${((d.revenue / totalRev) * 100).toFixed(1)}%`,
					]),
				], pdfMargin)
			}
			if (sections.includeOrigins && stats.revenueByOrigin?.length) {
				y = addSectionTable(doc, y, 'Ingresos por Procedencia', margin, [
					['Procedencia', 'Casos', 'Monto', '% del total'],
					...stats.revenueByOrigin.map((o) => [
						o.origin,
						String(o.cases),
						formatCurrency(o.revenue),
						`${o.percentage.toFixed(1)}%`,
					]),
				], pdfMargin)
			}
			if (sections.includeExamTypes && stats.revenueByExamType?.length) {
				const totalRev = stats.monthlyRevenue || 1
				y = addSectionTable(doc, y, 'Ingresos por Tipo de Examen', margin, [
					['Tipo de examen', 'Casos', 'Monto', '% del total'],
					...stats.revenueByExamType.map((e) => [
						e.examType,
						String(e.count),
						formatCurrency(e.revenue),
						`${((e.revenue / totalRev) * 100).toFixed(1)}%`,
					]),
				], pdfMargin)
			}
			if (sections.includeBranches && stats.revenueByBranch?.length) {
				y = addSectionTable(doc, y, 'Ingresos por Sede', margin, [
					['Sede', 'Monto', '% del total'],
					...stats.revenueByBranch.map((b) => [
						b.branch,
						formatCurrency(b.revenue),
						`${b.percentage.toFixed(1)}%`,
					]),
				], pdfMargin)
			}
			if (sections.includePaymentStatus) {
				const totalCases = stats.totalCases || 1
				const completedPct = ((stats.completedCases / totalCases) * 100).toFixed(1)
				const incompletePct = ((stats.incompleteCases / totalCases) * 100).toFixed(1)
				addSectionTable(doc, y, 'Estado de Pagos', margin, [
					['Estado', 'Casos', '% del total', 'Monto pendiente'],
					['Pagados', String(stats.completedCases), `${completedPct}%`, formatCurrency(0)],
					['Incompletos', String(stats.incompleteCases), `${incompletePct}%`, formatCurrency(stats.pendingPayments)],
				], pdfMargin)
			}

			const fileName = `reporte-ingresos-${getRangeLabelForFilename(timeRange)}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
			doc.save(fileName)
			toast({
				title: '✅ Reporte exportado',
				description: `Se descargó ${fileName}`,
			})
		} catch (error) {
			console.error('Error al exportar PDF:', error)
			toast({
				title: '❌ Error al exportar',
				description: 'Hubo un problema al generar el PDF. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setIsExporting(false)
		}
	}

	return (
		<>
		<Card className="col-span-1 grid hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg mb-6">
			<div className="bg-white dark:bg-background rounded-xl p-3 sm:p-5">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6">
					<h3 className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-0 flex items-center gap-2">
						<FileText className="w-5 h-5 text-blue-500" />
						Exportar Reportes
					</h3>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
					<div className="space-y-4">
						<div className="space-y-2">
							<h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
								<Calendar className="w-4 h-4 text-primary" />
								Rango de tiempo
							</h4>
							<Select
								value={timeRange}
								onValueChange={(value) => setTimeRange(value as ReportTimeRange)}
							>
								<SelectTrigger className="w-full max-w-xs">
									<SelectValue placeholder="Selecciona el período" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="today">Hoy</SelectItem>
									<SelectItem value="week">Última semana</SelectItem>
									<SelectItem value="month">Este mes</SelectItem>
									<SelectItem value="year">Este año</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 pt-2">
							<CheckSquare className="w-4 h-4 text-primary" />
							Selecciona las secciones a incluir:
						</h4>

						<div className="space-y-3">
							<div className="flex items-center space-x-2">
								<Checkbox
									id="doctors"
									checked={includeDoctors}
									onCheckedChange={(checked) => setIncludeDoctors(checked === true)}
								/>
								<Label
									htmlFor="doctors"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Ingresos por Médico Tratante
								</Label>
							</div>

							<div className="flex items-center space-x-2">
								<Checkbox
									id="origins"
									checked={includeOrigins}
									onCheckedChange={(checked) => setIncludeOrigins(checked === true)}
								/>
								<Label
									htmlFor="origins"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Ingresos por Procedencia
								</Label>
							</div>

							<div className="flex items-center space-x-2">
								<Checkbox
									id="examTypes"
									checked={includeExamTypes}
									onCheckedChange={(checked) => setIncludeExamTypes(checked === true)}
								/>
								<Label
									htmlFor="examTypes"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Ingresos por Tipo de Examen
								</Label>
							</div>

							<div className="flex items-center space-x-2">
								<Checkbox
									id="branches"
									checked={includeBranches}
									onCheckedChange={(checked) => setIncludeBranches(checked === true)}
								/>
								<Label
									htmlFor="branches"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Ingresos por Sede
								</Label>
							</div>

							<div className="flex items-center space-x-2">
								<Checkbox
									id="paymentStatus"
									checked={includePaymentStatus}
									onCheckedChange={(checked) => setIncludePaymentStatus(checked === true)}
								/>
								<Label
									htmlFor="paymentStatus"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Estado de Pagos
								</Label>
							</div>
						</div>
					</div>

					<div className="flex flex-col justify-between">
						<div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-3 sm:mb-4">
							<h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Información del Reporte</h4>
							<ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
								<li>• Período: {rangeLabel}</li>
								<li>• Incluye resumen general de ingresos</li>
								<li>• Formato Excel (.xlsx) o PDF con varias hojas</li>
								<li>• Datos actualizados al {format(new Date(), 'PPP', { locale: es })}</li>
								<li>• Selecciona las secciones que deseas incluir</li>
							</ul>
						</div>

						<Button
							onClick={() => setOpenExportModal(true)}
							disabled={isExporting || isLoading}
							className="w-full bg-primary hover:bg-primary/80 text-white dark:text-black"
						>
							{isExporting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Generando...
								</>
							) : (
								<>
									<Download className="mr-2 h-4 w-4" />
									Exportar
								</>
							)}
						</Button>
					</div>
				</div>

				<div className="text-xs text-muted-foreground border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
					<p>Elige exportar en Excel o PDF. Incluye resumen y una sección por cada opción seleccionada.</p>
				</div>
			</div>
		</Card>

		<Dialog open={openExportModal} onOpenChange={setOpenExportModal}>
			<DialogContent className="sm:max-w-sm bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px]">
				<DialogHeader>
					<DialogTitle>Exportar reporte</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground py-1">
					Elige el formato. Período: {rangeLabel}. Se incluirán las secciones que tienes marcadas.
				</p>
				<div className="flex flex-col gap-2 pt-2">
					<Button
						type="button"
						variant="outline"
						className="justify-start"
						disabled={isLoading || !stats}
						onClick={() => {
							setOpenExportModal(false)
							handleExportExcel()
						}}
					>
						<Download className="h-4 w-4 mr-2" />
						Exportar a Excel (.xlsx)
					</Button>
					<Button
						type="button"
						variant="outline"
						className="justify-start"
						disabled={isLoading || !stats}
						onClick={handleExportPdf}
					>
						<FileText className="h-4 w-4 mr-2" />
						Exportar a PDF
					</Button>
				</div>
			</DialogContent>
		</Dialog>
		</>
	)
}

export default ExportSection
