import { useCallback, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service'
import { getAllCasesWithPatientInfo } from '@/services/supabase/cases/medical-cases-service'
import { calculatePaymentDetails } from '@features/form/lib/payment/payment-utils'
import { EXPORT_COLUMN_OPTIONS } from '@shared/constants/exportColumns'
import { useToast } from './use-toast'

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

interface ServerFilters {
	searchTerm?: string
	branch?: string
	branchFilter?: string[]
	dateFrom?: string
	dateTo?: string
	examType?: string
	consulta?: string
	paymentStatus?: 'Incompleto' | 'Pagado'
	userRole?: 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner'
	documentStatus?: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado'
	pdfStatus?: 'pendientes' | 'faltantes'
	citoStatus?: 'positivo' | 'negativo'
	doctorFilter?: string[]
	originFilter?: string[]
	sortField?: string
	sortDirection?: 'asc' | 'desc'
	emailSentStatus?: boolean
}

export const useExportToExcel = () => {
	const { toast } = useToast()
	const { laboratory } = useLaboratory()
	// SPT tiene pagos deshabilitados: no mostrar columnas de Pagos (por feature o por slug)
	const hasPayment =
		Boolean(laboratory?.features?.hasPayment) && laboratory?.slug !== 'spt'

	// Columnas visibles según features y slug del lab
	const effectiveOptions = useMemo(
		() =>
			EXPORT_COLUMN_OPTIONS.filter((c) => {
				// Solo para lab con este slug (ej. Tipo de consulta para SPT)
				if (c.laboratorySlug && laboratory?.slug !== c.laboratorySlug) return false
				// Sin feature = siempre visible
				if (!c.feature) return true
				if (c.feature === 'hasPayment' && hasPayment) return true
				if (c.feature === 'hasEvaluateCitology' && Boolean(laboratory?.features?.hasEvaluateCitology)) return true
				return false
			}),
		[hasPayment, laboratory?.slug, laboratory?.features?.hasEvaluateCitology],
	)
	const effectiveKeys = useMemo(() => effectiveOptions.map((c) => c.key), [effectiveOptions])

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false)
	const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[] | null>(null)
	const [pendingExport, setPendingExport] = useState<{
		serverFilters: ServerFilters
		estimatedCount: number
		onConfirm: () => void
	} | null>(null)

	const exportToExcel = useCallback(
		(serverFilters: ServerFilters, estimatedCount: number, onConfirm: () => void) => {
			// Validar que hay casos para exportar
			if (estimatedCount === 0) {
				toast({
					title: '❌ Sin datos para exportar',
					description: 'No hay casos que coincidan con los filtros actuales.',
					variant: 'destructive',
				})
				return
			}

			// Guardar datos pendientes y abrir modal
			setPendingExport({
				serverFilters,
				estimatedCount,
				onConfirm,
			})
			setIsModalOpen(true)
		},
		[toast],
	)

	const generateExcel = useCallback(
		async (serverFilters: ServerFilters, selectedKeys: string[] | null) => {
			try {
				// Mostrar mensaje de carga
				toast({
					title: '⏳ Obteniendo datos...',
					description: 'Por favor espera mientras obtenemos todos los casos filtrados.',
				})

				// Obtener TODOS los casos filtrados del servidor
				const response = await getAllCasesWithPatientInfo(serverFilters)
				// La función puede retornar un array directamente o un objeto con propiedad data
				const cases = Array.isArray(response) ? response : response.data

				// Validar que cases sea un array válido
				if (!cases || !Array.isArray(cases) || cases.length === 0) {
					toast({
						title: '❌ Sin datos para exportar',
						description: 'No se encontraron casos para exportar.',
						variant: 'destructive',
					})
					return
				}

				const keysToExport = selectedKeys && selectedKeys.length > 0 ? selectedKeys : effectiveKeys

				// Preparar los datos para Excel
				const fullRows = cases.map((case_) => {
					const { paymentStatus, missingAmount } = calculateCasePaymentStatus(case_)
					const ageDisplay = case_.edad || ''

					// Calcular monto total en bolívares
					const exchangeRate = case_.exchange_rate || 0
					const totalInBs = exchangeRate > 0 ? (case_.total_amount || 0) * exchangeRate : 0

					const row: Record<string, string | number> = {
						Código: case_.code || '',
						Registro: case_.created_at ? new Date(case_.created_at).toLocaleDateString('es-ES') : 'N/A',
						'Nombre del Paciente': case_.nombre || '',
						Cédula: case_.cedula || '',
						Email: case_.patient_email || '',
						Edad: ageDisplay,
						Sede: case_.branch || '',
						'Tipo de Estudio': case_.exam_type || '',
						'Tipo de consulta': case_.consulta || '',
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
					return Object.fromEntries(Object.entries(row).filter(([k]) => keysToExport.includes(k))) as Record<
						string,
						string | number
					>
				})

				// Crear el workbook
				const wb = XLSX.utils.book_new()
				const ws = XLSX.utils.json_to_sheet(fullRows)

				// Ancho de columnas según catálogo (mismo orden que keysToExport)
				const keyToWidth = Object.fromEntries(effectiveOptions.map((c) => [c.key, c.defaultWidth]))
				const colWidths = keysToExport.map((k) => ({ wch: keyToWidth[k] ?? 15 }))
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
				if (serverFilters.paymentStatus) filterParts.push(`estado_${serverFilters.paymentStatus}`)
				if (serverFilters.branch) filterParts.push(`sede_${serverFilters.branch}`)
				if (serverFilters.branchFilter && serverFilters.branchFilter.length > 0)
					filterParts.push(`sedes_${serverFilters.branchFilter.length}`)
				if (serverFilters.pdfStatus) filterParts.push(`pdf_${serverFilters.pdfStatus}`)
				if (serverFilters.doctorFilter && serverFilters.doctorFilter.length > 0)
					filterParts.push(`medicos_${serverFilters.doctorFilter.length}`)
				if (serverFilters.originFilter && serverFilters.originFilter.length > 0)
					filterParts.push(`origenes_${serverFilters.originFilter.length}`)
				if (serverFilters.citoStatus) filterParts.push(`citologia_${serverFilters.citoStatus}`)
				if (serverFilters.documentStatus) filterParts.push(`doc_${serverFilters.documentStatus}`)
				if (serverFilters.examType) filterParts.push(`examen_${serverFilters.examType}`)
				if (serverFilters.searchTerm) filterParts.push('busqueda')
				if (serverFilters.dateFrom || serverFilters.dateTo) filterParts.push('rango_fechas')
				if (serverFilters.sortField) filterParts.push(`orden_${serverFilters.sortField}_${serverFilters.sortDirection}`)

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
		[toast, effectiveKeys, effectiveOptions],
	)

	const handleConfirmExport = useCallback(async () => {
		if (pendingExport) {
			pendingExport.onConfirm()
			await generateExcel(pendingExport.serverFilters, selectedColumnKeys)
			setPendingExport(null)
			setIsModalOpen(false)
		}
	}, [pendingExport, generateExcel, selectedColumnKeys])

	const handleCancelExport = useCallback(() => {
		setPendingExport(null)
	}, [])

	const handleApplyColumnSelection = useCallback((keys: string[]) => {
		setSelectedColumnKeys(keys.length === effectiveKeys.length ? null : keys)
		setIsColumnsModalOpen(false)
	}, [effectiveKeys.length])

	const exportColumnOptions = useMemo(
		() =>
			effectiveOptions.map((c) => ({
				key: c.key,
				label: c.label,
				group: c.group,
			})),
		[effectiveOptions],
	)

	return {
		exportToExcel,
		isModalOpen,
		setIsModalOpen,
		pendingExport,
		handleConfirmExport,
		handleCancelExport,
		isColumnsModalOpen,
		setIsColumnsModalOpen,
		selectedColumnKeys,
		exportColumnOptions,
		handleApplyColumnSelection,
	}
}
