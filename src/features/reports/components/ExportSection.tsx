import React, { useState, useMemo } from 'react'
import { Card } from '@shared/components/ui/card'
import { Download, FileText, Loader2, CheckSquare, Calendar } from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { Checkbox } from '@shared/components/ui/checkbox'
import { Label } from '@shared/components/ui/label'
import { useToast } from '@shared/hooks/use-toast'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
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
} from '../utils/reportExcel'

const ExportSection: React.FC = () => {
	const [timeRange, setTimeRange] = useState<ReportTimeRange>('month')
	const { start: rangeStart, end: rangeEnd, label: rangeLabel } = useMemo(
		() => getDateRangeForPreset(timeRange),
		[timeRange],
	)

	const { data: stats, isLoading } = useDashboardStats(rangeStart, rangeEnd)
	const { toast } = useToast()
	const [isExporting, setIsExporting] = useState(false)

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

	return (
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
								<li>• Formato Excel (.xlsx) con varias hojas</li>
								<li>• Datos actualizados al {format(new Date(), 'PPP', { locale: es })}</li>
								<li>• Selecciona las secciones que deseas incluir</li>
							</ul>
						</div>

						<Button
							onClick={handleExportExcel}
							disabled={isExporting || isLoading}
							className="w-full bg-primary hover:bg-primary/80 text-white dark:text-black"
						>
							{isExporting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Generando Excel...
								</>
							) : (
								<>
									<Download className="mr-2 h-4 w-4" />
									Exportar Excel
								</>
							)}
						</Button>
					</div>
				</div>

				<div className="text-xs text-muted-foreground border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
					<p>El reporte se descargará en formato Excel. Incluye una hoja de resumen y una hoja por cada sección seleccionada.</p>
				</div>
			</div>
		</Card>
	)
}

export default ExportSection
