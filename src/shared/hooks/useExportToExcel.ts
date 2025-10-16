import { useCallback, useState } from 'react'
import * as XLSX from 'xlsx'
import { useToast } from './use-toast'
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service'
import { calculatePaymentDetails } from '@features/form/lib/payment/payment-utils'

type UnifiedMedicalRecord = MedicalCaseWithPatient

// Helper function to calculate correct payment status for a case
const calculateCasePaymentStatus = (case_: UnifiedMedicalRecord) => {
	// Convert medical record payment fields to payments array format
	const payments = []

	for (let i = 1; i <= 4; i++) {
		const method = case_[`payment_method_${i}` as keyof UnifiedMedicalRecord] as string | null
		const amount = case_[`payment_amount_${i}` as keyof UnifiedMedicalRecord] as number | null

		if (method && amount && amount > 0) {
			payments.push({
				method,
				amount,
				reference: '', // Reference not needed for calculation
			})
		}
	}

	// Use the correct payment calculation logic
	const { paymentStatus, isPaymentComplete, missingAmount } = calculatePaymentDetails(
		payments,
		case_.total_amount,
		case_.exchange_rate || undefined,
	)

	return {
		paymentStatus: paymentStatus || 'Incompleto',
		isPaymentComplete,
		missingAmount: missingAmount || 0,
	}
}

interface ExportFilters {
	statusFilter: string
	branchFilter: string
	showPdfReadyOnly: boolean
	selectedDoctors: string[]
	citologyPositiveFilter: boolean
	citologyNegativeFilter: boolean
	searchTerm: string
	dateRange?: { from?: Date; to?: Date }
}

export const useExportToExcel = () => {
	const { toast } = useToast()
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [pendingExport, setPendingExport] = useState<{
		cases: UnifiedMedicalRecord[]
		filters: ExportFilters
		onConfirm: () => void
	} | null>(null)

	const exportToExcel = useCallback(
		(cases: UnifiedMedicalRecord[], filters: ExportFilters, onConfirm: () => void) => {
			// Validar que cases sea un array válido
			if (!cases || !Array.isArray(cases)) {
				toast({
					title: '❌ Error en los datos',
					description: 'No hay casos válidos para exportar.',
					variant: 'destructive',
				})
				return
			}
			// Aplicar los mismos filtros que usa la tabla
			const filteredCases = cases.filter((case_) => {
				if (!case_) return false

				// Doctor filter
				const matchesDoctor =
					filters.selectedDoctors.length === 0 ||
					(case_.treating_doctor && filters.selectedDoctors.includes(case_.treating_doctor.trim()))

				// Status filter - use calculated payment status
				let matchesStatus = true
				if (filters.statusFilter !== 'all') {
					const { paymentStatus } = calculateCasePaymentStatus(case_)
					const paymentStatusNormalized = paymentStatus.toLowerCase()
					if (filters.statusFilter === 'Pagado') {
						matchesStatus = paymentStatusNormalized === 'pagado'
					} else if (filters.statusFilter === 'Incompleto') {
						matchesStatus = paymentStatusNormalized !== 'pagado'
					}
				}

				// Branch filter
				const normalize = (str: string | null | undefined) => (str ? str.trim().toLowerCase() : '')
				const matchesBranch =
					filters.branchFilter === 'all' || normalize(case_.branch) === normalize(filters.branchFilter)

				// PDF ready filter
				let matchesPdfReady = true
				if (filters.showPdfReadyOnly) {
					const pdfReadyValue = case_.pdf_en_ready
					if (pdfReadyValue === true) {
						matchesPdfReady = true
					} else if (typeof pdfReadyValue === 'string') {
						matchesPdfReady = pdfReadyValue === 'true' || pdfReadyValue === 'TRUE'
					} else {
						matchesPdfReady = false
					}
				}

				// Date range filter
				let matchesDate = true
				if (filters.dateRange?.from || filters.dateRange?.to) {
					const formatLocalYmd = (date: Date) => {
						const year = date.getFullYear()
						const month = String(date.getMonth() + 1).padStart(2, '0')
						const day = String(date.getDate()).padStart(2, '0')
						return `${year}-${month}-${day}`
					}

					let createdDateStr: string | null = null
					const rawCreatedAt = case_.created_at as unknown as string | null | undefined
					if (typeof rawCreatedAt === 'string') {
						if (/^\d{4}-\d{2}-\d{2}$/.test(rawCreatedAt.trim())) {
							createdDateStr = rawCreatedAt.trim()
						} else {
							const d = new Date(rawCreatedAt)
							if (!Number.isNaN(d.getTime())) {
								createdDateStr = formatLocalYmd(d)
							}
						}
					} else if (rawCreatedAt) {
						const d = new Date(rawCreatedAt as unknown as string)
						if (!Number.isNaN(d.getTime())) {
							createdDateStr = formatLocalYmd(d)
						}
					}

					if (createdDateStr) {
						if (filters.dateRange.from && filters.dateRange.to) {
							const fromStr = formatLocalYmd(filters.dateRange.from)
							const toStr = formatLocalYmd(filters.dateRange.to)
							matchesDate = createdDateStr >= fromStr && createdDateStr <= toStr
						} else if (filters.dateRange.from) {
							const fromStr = formatLocalYmd(filters.dateRange.from)
							matchesDate = createdDateStr >= fromStr
						} else if (filters.dateRange.to) {
							const toStr = formatLocalYmd(filters.dateRange.to)
							matchesDate = createdDateStr <= toStr
						}
					} else {
						matchesDate = false
					}
				}

				// Search filter
				let matchesSearch = true
				if (filters.searchTerm && filters.searchTerm.trim()) {
					const searchLower = filters.searchTerm.toLowerCase()
					matchesSearch =
						(case_.nombre?.toLowerCase() || '').includes(searchLower) ||
						(case_.cedula?.toLowerCase() || '').includes(searchLower) ||
						(case_.treating_doctor?.toLowerCase() || '').includes(searchLower) ||
						(case_.code?.toLowerCase() || '').includes(searchLower) ||
						(case_.branch?.toLowerCase() || '').includes(searchLower) ||
						(case_.exam_type?.toLowerCase() || '').includes(searchLower)
				}

				// Citology filters
				let matchesCitology = true
				if (filters.citologyPositiveFilter || filters.citologyNegativeFilter) {
					const citoEstatus = case_.cito_status
					if (filters.citologyPositiveFilter && filters.citologyNegativeFilter) {
						matchesCitology = citoEstatus === 'positivo' || citoEstatus === 'negativo'
					} else if (filters.citologyPositiveFilter) {
						matchesCitology = citoEstatus === 'positivo'
					} else if (filters.citologyNegativeFilter) {
						matchesCitology = citoEstatus === 'negativo'
					}
				}

				return (
					matchesStatus &&
					matchesBranch &&
					matchesPdfReady &&
					matchesDate &&
					matchesSearch &&
					matchesDoctor &&
					matchesCitology
				)
			})

			// Preparar datos para el modal
			const count = filteredCases.length

			if (count === 0) {
				toast({
					title: '❌ Sin datos para exportar',
					description: 'No hay casos que coincidan con los filtros actuales.',
					variant: 'destructive',
				})
				return
			}

			// Guardar datos pendientes y abrir modal
			setPendingExport({
				cases: filteredCases,
				filters,
				onConfirm,
			})
			setIsModalOpen(true)
		},
		[toast],
	)

	const generateExcel = useCallback(
		(cases: UnifiedMedicalRecord[], filters: ExportFilters) => {
			try {
				// Validar que cases sea un array válido
				if (!cases || !Array.isArray(cases) || cases.length === 0) {
					toast({
						title: '❌ Sin datos para exportar',
						description: 'No hay casos para exportar.',
						variant: 'destructive',
					})
					return
				}
				// Preparar los datos para Excel
				const excelData = cases.map((case_) => {
					const { paymentStatus, missingAmount } = calculateCasePaymentStatus(case_)
					const ageDisplay = case_.edad || ''

					// Calcular monto total en bolívares
					const exchangeRate = case_.exchange_rate || 0
					const totalInBs = exchangeRate > 0 ? (case_.total_amount || 0) * exchangeRate : 0

					return {
						Código: case_.code || '',
						'Fecha de Registro': case_.created_at ? new Date(case_.created_at).toLocaleDateString('es-ES') : 'N/A',
						'Nombre del Paciente': case_.nombre || '',
						Cédula: case_.cedula || '',
						Edad: ageDisplay,
						Sede: case_.branch || '',
						'Tipo de Estudio': case_.exam_type || '',
						'Médico Tratante': case_.treating_doctor || '',
						'Tasa de Cambio (Bs)': exchangeRate,
						'Monto Total (USD)': case_.total_amount || 0,
						'Monto Total (Bs)': totalInBs,
						'Estado de Pago': paymentStatus,
						'Monto Faltante': missingAmount > 0 ? missingAmount : 0,
						'Método de Pago 1': case_.payment_method_1 || '',
						'Monto Pago 1': case_.payment_amount_1 || 0,
						'Referencia Pago 1': case_.payment_reference_1 || '',
						'Método de Pago 2': case_.payment_method_2 || '',
						'Monto Pago 2': case_.payment_amount_2 || 0,
						'Referencia Pago 2': case_.payment_reference_2 || '',
						'Método de Pago 3': case_.payment_method_3 || '',
						'Monto Pago 3': case_.payment_amount_3 || 0,
						'Referencia Pago 3': case_.payment_reference_3 || '',
						'Método de Pago 4': case_.payment_method_4 || '',
						'Monto Pago 4': case_.payment_amount_4 || 0,
						'Referencia Pago 4': case_.payment_reference_4 || '',
						'PDF Listo': case_.pdf_en_ready ? 'Sí' : 'No',
						'Estatus Citología': case_.cito_status || '',
					}
				})

				// Crear el workbook
				const wb = XLSX.utils.book_new()
				const ws = XLSX.utils.json_to_sheet(excelData)

				// Ajustar el ancho de las columnas
				const colWidths = [
					{ wch: 15 }, // Código
					{ wch: 18 }, // Fecha de Registro
					{ wch: 25 }, // Nombre del Paciente
					{ wch: 15 }, // Cédula
					{ wch: 8 }, // Edad
					{ wch: 10 }, // Sede
					{ wch: 20 }, // Tipo de Estudio
					{ wch: 25 }, // Médico Tratante
					{ wch: 18 }, // Tasa de Cambio (Bs)
					{ wch: 18 }, // Monto Total (USD)
					{ wch: 18 }, // Monto Total (Bs)
					{ wch: 15 }, // Estado de Pago
					{ wch: 15 }, // Monto Faltante
					{ wch: 20 }, // Método de Pago 1
					{ wch: 15 }, // Monto Pago 1
					{ wch: 25 }, // Referencia Pago 1
					{ wch: 20 }, // Método de Pago 2
					{ wch: 15 }, // Monto Pago 2
					{ wch: 25 }, // Referencia Pago 2
					{ wch: 20 }, // Método de Pago 3
					{ wch: 15 }, // Monto Pago 3
					{ wch: 25 }, // Referencia Pago 3
					{ wch: 20 }, // Método de Pago 4
					{ wch: 15 }, // Monto Pago 4
					{ wch: 25 }, // Referencia Pago 4
					{ wch: 12 }, // PDF Listo
					{ wch: 15 }, // Estatus Citología
				]
				ws['!cols'] = colWidths

				// Agregar la hoja al workbook
				XLSX.utils.book_append_sheet(wb, ws, 'Casos Médicos')

				// Generar el nombre del archivo con fecha y filtros
				const now = new Date()
				const dateStr = now.toISOString().split('T')[0]
				const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')

				let fileName = `casos_medicos_${dateStr}_${timeStr}`

				// Agregar información de filtros al nombre del archivo
				const filterParts = []
				if (filters.statusFilter !== 'all') filterParts.push(`estado_${filters.statusFilter}`)
				if (filters.branchFilter !== 'all') filterParts.push(`sede_${filters.branchFilter}`)
				if (filters.showPdfReadyOnly) filterParts.push('pdf_listo')
				if (filters.selectedDoctors.length > 0) filterParts.push(`medicos_${filters.selectedDoctors.length}`)
				if (filters.citologyPositiveFilter) filterParts.push('citologia_positiva')
				if (filters.citologyNegativeFilter) filterParts.push('citologia_negativa')
				if (filters.searchTerm) filterParts.push('busqueda')
				if (filters.dateRange?.from || filters.dateRange?.to) filterParts.push('rango_fechas')

				if (filterParts.length > 0) {
					fileName += `_filtrado_${filterParts.join('_')}`
				}

				fileName += '.xlsx'

				// Descargar el archivo
				XLSX.writeFile(wb, fileName)

				toast({
					title: '✅ Exportación exitosa',
					description: `Se exportaron ${cases.length} casos al archivo ${fileName}`,
				})
			} catch (error) {
				console.error('Error al generar Excel:', error)
				toast({
					title: '❌ Error en la exportación',
					description: 'Ocurrió un error al generar el archivo Excel. Intenta nuevamente.',
					variant: 'destructive',
				})
			}
		},
		[toast],
	)

	const handleConfirmExport = useCallback(() => {
		if (pendingExport) {
			pendingExport.onConfirm()
			generateExcel(pendingExport.cases, pendingExport.filters)
			setPendingExport(null)
		}
	}, [pendingExport, generateExcel])

	const handleCancelExport = useCallback(() => {
		setPendingExport(null)
	}, [])

	return {
		exportToExcel,
		isModalOpen,
		setIsModalOpen,
		pendingExport,
		handleConfirmExport,
		handleCancelExport,
	}
}
