import React, { useState } from 'react'
import { Card } from '@shared/components/ui/card'
import { Download, FileText, Loader2, CheckSquare } from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { Checkbox } from '@shared/components/ui/checkbox'
import { Label } from '@shared/components/ui/label'
import { useToast } from '@shared/hooks/use-toast'
import { useDashboardStats } from '@shared/hooks/useDashboardStats'
// import { exportTableToPdf } from '@shared/components/ui/pdf-export'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency } from '@shared/utils/number-utils'

const ExportSection: React.FC = () => {
	const { data: stats, isLoading } = useDashboardStats()
	const { toast } = useToast()
	const [isExporting, setIsExporting] = useState(false)

	// Export options
	const [includeDoctors, setIncludeDoctors] = useState(true)
	const [includeOrigins, setIncludeOrigins] = useState(true)
	const [includeExamTypes, setIncludeExamTypes] = useState(true)
	const [includeBranches, setIncludeBranches] = useState(true)
	const [includePaymentStatus, setIncludePaymentStatus] = useState(true)

	// formatCurrency is now imported from number-utils

	const handleExportPDF = async () => {
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
			// Prepare data for export based on selected options
			const reportData = []

			// Add title and date
			reportData.push([
				{
					content: 'REPORTE COMPLETO DE INGRESOS',
					styles: {
						halign: 'center',
						fontStyle: 'bold',
						fontSize: 16,
						textColor: [33, 33, 33],
						cellPadding: 10,
					},
					colSpan: 4,
				},
			])

			reportData.push([
				{
					content: `Fecha de generación: ${format(new Date(), 'PPP', { locale: es })}`,
					styles: {
						halign: 'center',
						fontStyle: 'normal',
						fontSize: 10,
						textColor: [100, 100, 100],
						cellPadding: 5,
					},
					colSpan: 4,
				},
			])

			reportData.push([{ content: '', colSpan: 4 }]) // Empty row as separator

			// Add summary section
			reportData.push([
				{
					content: 'RESUMEN GENERAL',
					styles: {
						halign: 'left',
						fontStyle: 'bold',
						fontSize: 12,
						fillColor: [240, 240, 240],
					},
					colSpan: 4,
				},
			])

			reportData.push([
				{ content: 'Total de Ingresos', styles: { fontStyle: 'bold' } },
				{ content: formatCurrency(stats.totalRevenue) },
				{ content: 'Total de Casos', styles: { fontStyle: 'bold' } },
				{ content: stats.totalCases.toString() },
			])

			reportData.push([
				{ content: 'Casos Pagados', styles: { fontStyle: 'bold' } },
				{ content: stats.completedCases.toString() },
				{ content: 'Casos Incompletos', styles: { fontStyle: 'bold' } },
				{ content: stats.incompleteCases.toString() },
			])

			reportData.push([
				{ content: 'Pagos Pendientes', styles: { fontStyle: 'bold' } },
				{ content: formatCurrency(stats.pendingPayments) },
				{ content: 'Pacientes Únicos', styles: { fontStyle: 'bold' } },
				{ content: stats.uniquePatients.toString() },
			])

			reportData.push([{ content: '', colSpan: 4 }]) // Empty row as separator

			// Add doctors section if selected
			if (includeDoctors && stats.topTreatingDoctors && stats.topTreatingDoctors.length > 0) {
				reportData.push([
					{
						content: 'INGRESOS POR MÉDICO TRATANTE',
						styles: {
							halign: 'left',
							fontStyle: 'bold',
							fontSize: 12,
							fillColor: [230, 240, 255],
						},
						colSpan: 4,
					},
				])

				reportData.push([
					{ content: 'Médico', styles: { fontStyle: 'bold' } },
					{ content: 'Casos', styles: { fontStyle: 'bold' } },
					{ content: 'Monto', styles: { fontStyle: 'bold' } },
					{ content: '% del Total', styles: { fontStyle: 'bold' } },
				])

				stats.topTreatingDoctors.forEach((doctor) => {
					const percentage = ((doctor.revenue / stats.totalRevenue) * 100).toFixed(1)
					reportData.push([
						{ content: doctor.doctor },
						{ content: doctor.cases.toString() },
						{ content: formatCurrency(doctor.revenue) },
						{ content: `${percentage}%` },
					])
				})

				reportData.push([{ content: '', colSpan: 4 }]) // Empty row as separator
			}

			// Add origins section if selected
			if (includeOrigins && stats.revenueByOrigin && stats.revenueByOrigin.length > 0) {
				reportData.push([
					{
						content: 'INGRESOS POR PROCEDENCIA',
						styles: {
							halign: 'left',
							fontStyle: 'bold',
							fontSize: 12,
							fillColor: [245, 230, 255],
						},
						colSpan: 4,
					},
				])

				reportData.push([
					{ content: 'Procedencia', styles: { fontStyle: 'bold' } },
					{ content: 'Casos', styles: { fontStyle: 'bold' } },
					{ content: 'Monto', styles: { fontStyle: 'bold' } },
					{ content: '% del Total', styles: { fontStyle: 'bold' } },
				])

				stats.revenueByOrigin.forEach((origin) => {
					reportData.push([
						{ content: origin.origin },
						{ content: origin.cases.toString() },
						{ content: formatCurrency(origin.revenue) },
						{ content: `${origin.percentage.toFixed(1)}%` },
					])
				})

				reportData.push([{ content: '', colSpan: 4 }]) // Empty row as separator
			}

			// Add exam types section if selected
			if (includeExamTypes && stats.revenueByExamType && stats.revenueByExamType.length > 0) {
				reportData.push([
					{
						content: 'INGRESOS POR TIPO DE EXAMEN',
						styles: {
							halign: 'left',
							fontStyle: 'bold',
							fontSize: 12,
							fillColor: [230, 255, 240],
						},
						colSpan: 4,
					},
				])

				reportData.push([
					{ content: 'Tipo de Examen', styles: { fontStyle: 'bold' } },
					{ content: 'Casos', styles: { fontStyle: 'bold' } },
					{ content: 'Monto', styles: { fontStyle: 'bold' } },
					{ content: '% del Total', styles: { fontStyle: 'bold' } },
				])

				stats.revenueByExamType.forEach((exam) => {
					const percentage = ((exam.revenue / stats.totalRevenue) * 100).toFixed(1)
					reportData.push([
						{ content: exam.examType },
						{ content: exam.count.toString() },
						{ content: formatCurrency(exam.revenue) },
						{ content: `${percentage}%` },
					])
				})

				reportData.push([{ content: '', colSpan: 4 }]) // Empty row as separator
			}

			// Add branches section if selected
			if (includeBranches && stats.revenueByBranch && stats.revenueByBranch.length > 0) {
				reportData.push([
					{
						content: 'INGRESOS POR SEDE',
						styles: {
							halign: 'left',
							fontStyle: 'bold',
							fontSize: 12,
							fillColor: [255, 240, 230],
						},
						colSpan: 4,
					},
				])

				reportData.push([
					{ content: 'Sede', styles: { fontStyle: 'bold' } },
					{ content: 'Monto', styles: { fontStyle: 'bold' } },
					{ content: '% del Total', styles: { fontStyle: 'bold' } },
					{ content: '' },
				])

				stats.revenueByBranch.forEach((branch) => {
					reportData.push([
						{ content: branch.branch },
						{ content: formatCurrency(branch.revenue) },
						{ content: `${branch.percentage.toFixed(1)}%` },
						{ content: '' },
					])
				})

				reportData.push([{ content: '', colSpan: 4 }]) // Empty row as separator
			}

			// Add payment status section if selected
			if (includePaymentStatus) {
				reportData.push([
					{
						content: 'ESTADO DE PAGOS',
						styles: {
							halign: 'left',
							fontStyle: 'bold',
							fontSize: 12,
							fillColor: [255, 230, 230],
						},
						colSpan: 4,
					},
				])

				reportData.push([
					{ content: 'Estado', styles: { fontStyle: 'bold' } },
					{ content: 'Casos', styles: { fontStyle: 'bold' } },
					{ content: '% del Total', styles: { fontStyle: 'bold' } },
					{ content: 'Monto Pendiente', styles: { fontStyle: 'bold' } },
				])

				const completedPercentage = ((stats.completedCases / stats.totalCases) * 100).toFixed(1)
				const incompletePercentage = ((stats.incompleteCases / stats.totalCases) * 100).toFixed(1)

				reportData.push([
					{ content: 'Pagados' },
					{ content: stats.completedCases.toString() },
					{ content: `${completedPercentage}%` },
					{ content: formatCurrency(0) },
				])

				reportData.push([
					{ content: 'Incompletos' },
					{ content: stats.incompleteCases.toString() },
					{ content: `${incompletePercentage}%` },
					{ content: formatCurrency(stats.pendingPayments) },
				])
			}

			// Use the imported exportTableToPdf utility function with correct argument order
			// await exportTableToPdf(
			//   [], // headers - empty array since structure is embedded in reportData
			//   reportData, // data - the actual report content
			//   {
			//     filename: `reporte-ingresos-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
			//     title: 'REPORTE COMPLETO DE INGRESOS'
			//   }
			// )

			toast({
				title: '✅ Reporte exportado',
				description: 'El reporte ha sido exportado como PDF exitosamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch (error) {
			console.error('Error exporting to PDF:', error)
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
						<h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
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
								<li>• Incluye resumen general de ingresos</li>
								<li>• Formato PDF optimizado para impresión</li>
								<li>• Datos actualizados al {format(new Date(), 'PPP', { locale: es })}</li>
								<li>• Selecciona las secciones que deseas incluir</li>
							</ul>
						</div>

						<Button
							onClick={handleExportPDF}
							// disabled={
							// 	isExporting ||
							// 	isLoading ||
							// 	(!includeDoctors && !includeOrigins && !includeExamTypes && !includeBranches && !includePaymentStatus)
							// }
							disabled={true}
							className="w-full bg-primary hover:bg-primary/80 text-white"
						>
							{isExporting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Generando PDF...
								</>
							) : (
								<>
									<Download className="mr-2 h-4 w-4" />
									Exportar PDF
								</>
							)}
						</Button>
					</div>
				</div>

				<div className="text-xs text-red-500 dark:text-red-400 border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
					{/* <p>El reporte se generará en formato PDF y se descargará automáticamente.</p>
					<p>Para mejores resultados, selecciona al menos una sección para incluir en el reporte.</p> */}
					<p>Actualmente no se puede exportar el reporte, pero pronto se habilitará esta funcionalidad.</p>
				</div>
			</div>
		</Card>
	)
}

export default ExportSection
