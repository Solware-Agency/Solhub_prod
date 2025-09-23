import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/supabase/config'
import { startOfMonth, endOfMonth, format, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { isVESPaymentMethod } from '@shared/utils/number-utils'

// Tipo local para casos médicos con información del paciente
export interface MedicalCaseWithPatient {
	// Campos de medical_records_clean
	id: string
	patient_id: string | null
	exam_type: string
	origin: string
	treating_doctor: string
	sample_type: string
	number_of_samples: number
	relationship: string | null
	branch: string
	date: string
	total_amount: number
	exchange_rate: number | null
	payment_status: string
	remaining: number
	payment_method_1: string | null
	payment_amount_1: number | null
	payment_reference_1: string | null
	payment_method_2: string | null
	payment_amount_2: number | null
	payment_reference_2: string | null
	payment_method_3: string | null
	payment_amount_3: number | null
	payment_reference_3: string | null
	payment_method_4: string | null
	payment_amount_4: number | null
	payment_reference_4: string | null
	comments: string | null
	code: string | null
	created_at: string | null
	updated_at: string | null
	created_by: string | null
	created_by_display_name: string | null
	material_remitido: string | null
	informacion_clinica: string | null
	descripcion_macroscopica: string | null
	diagnostico: string | null
	comentario: string | null
	pdf_en_ready: boolean | null
	attachment_url: string | null
	doc_aprobado: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | null
	generated_by: string | null
	version: number | null
	cito_status: 'positivo' | 'negativo' | null // Nueva columna para estado citológico
	// Campos de patients
	cedula: string
	nombre: string
	edad: string | null
	telefono: string | null
	patient_email: string | null
}

export interface DashboardStats {
	totalRevenue: number
	uniquePatients: number
	completedCases: number
	incompleteCases: number
	pendingPayments: number
	monthlyRevenue: number
	newPatientsThisMonth: number
	revenueByBranch: Array<{ branch: string; revenue: number; percentage: number }>
	revenueByExamType: Array<{ examType: string; revenue: number; count: number }>
	salesTrendByMonth: Array<{ month: string; revenue: number; isSelected?: boolean; monthIndex: number }>
	topExamTypes: Array<{ examType: string; count: number; revenue: number }>
	topTreatingDoctors: Array<{ doctor: string; cases: number; revenue: number }>
	revenueByOrigin: Array<{ origin: string; revenue: number; cases: number; percentage: number }>
	totalCases: number
	// Nuevas estadísticas por moneda
	monthlyRevenueBolivares: number
	monthlyRevenueDollars: number
}

// Function to normalize exam type names
const normalizeExamType = (examType: string): string => {
	if (!examType) return ''

	return (
		examType
			.toLowerCase()
			.trim()
			// Remove accents and diacritics
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			// Normalize common variations
			.replace(/citologia/g, 'citologia')
			.replace(/biopsia/g, 'biopsia')
			.replace(/inmunohistoquimica/g, 'inmunohistoquimica')
	)
}

export const useDashboardStats = (selectedMonth?: Date, selectedYear?: number) => {
	return useQuery({
		queryKey: ['dashboard-stats', selectedMonth?.toISOString(), selectedYear],
		queryFn: async (): Promise<DashboardStats> => {
			try {
				// Obtener casos médicos con información del paciente usando JOIN directo
				const { data: allRecords, error: allError } = await supabase.from('medical_records_clean').select(`
						*,
						patients!inner(
							cedula,
							nombre,
							edad,
							telefono,
							email
						)
					`)

				if (allError) throw allError

				// Transformar los datos para que coincidan con la interfaz
				const transformedRecords = (allRecords || []).map((item: any) => ({
					...item,
					cedula: item.patients?.cedula || '',
					nombre: item.patients?.nombre || '',
					edad: item.patients?.edad || null,
					telefono: item.patients?.telefono || null,
					patient_email: item.patients?.email || null,
					version: item.version || null,
				})) as MedicalCaseWithPatient[]

				if (allError) throw allError

				// Get current month data if selectedMonth is provided
				const currentMonth = selectedMonth || new Date()
				const monthStart = startOfMonth(currentMonth)
				const monthEnd = endOfMonth(currentMonth)

				// Filter records for current month from transformedRecords (more efficient)
				const monthRecords =
					transformedRecords?.filter((record) => {
						if (!record.created_at) return false
						const recordDate = new Date(record.created_at)
						return recordDate >= monthStart && recordDate <= monthEnd
					}) || []

				// Calculate total revenue
				const totalRevenue = transformedRecords?.reduce((sum, record) => sum + (record.total_amount || 0), 0) || 0

				// Calculate unique patients - Con nueva estructura es más eficiente
				const uniquePatientIds = new Set(
					transformedRecords?.filter((r) => r.patient_id).map((record) => record.patient_id),
				)
				const uniquePatients = uniquePatientIds.size

				// Alternative: Get actual count from patients table for accuracy
				const { count: actualPatientsCount } = await supabase
					.from('patients')
					.select('*', { count: 'exact', head: true })

				// Use actual count from patients table for more accurate stats
				const finalUniquePatients = actualPatientsCount || uniquePatients

				// Calcular casos pagados e incompletos
				const completedCases = transformedRecords?.filter((record) => record.payment_status === 'Pagado').length || 0
				const totalCases = transformedRecords?.length || 0
				const incompleteCases = totalCases - completedCases

				// Calcular pagos pendientes (montos restantes)
				const pendingPayments =
					transformedRecords?.reduce((sum, record) => {
						// Si el estado de pago no es pagado, sumar el total
						if (record.payment_status !== 'Pagado') {
							return sum + (record.total_amount || 0)
						}
						return sum
					}, 0) || 0

				// Calculate monthly revenue
				const monthlyRevenue = monthRecords?.reduce((sum, record) => sum + (record.total_amount || 0), 0) || 0

				// Calculate monthly revenue by currency (Bs vs $)
				let monthlyRevenueBolivares = 0
				let monthlyRevenueDollars = 0

				monthRecords?.forEach((record) => {
					// Revisar todos los métodos de pago del caso
					for (let i = 1; i <= 4; i++) {
						const method = record[`payment_method_${i}` as keyof MedicalCaseWithPatient] as string | null
						const amount = record[`payment_amount_${i}` as keyof MedicalCaseWithPatient] as number | null

						if (method && amount && amount > 0) {
							if (isVESPaymentMethod(method)) {
								// Si es método en bolívares, sumar directamente
								monthlyRevenueBolivares += amount
							} else {
								// Si es método en dólares, sumar directamente
								monthlyRevenueDollars += amount
							}
						}
					}
				})

				// Calculate new patients this month - usando patient_id de la nueva estructura
				const existingPatientIds = new Set(
					transformedRecords
						?.filter((record) => record.patient_id && record.created_at && new Date(record.created_at) < monthStart)
						.map((record) => record.patient_id) || [],
				)
				const monthPatientIds = new Set(
					monthRecords?.filter((record) => record.patient_id).map((record) => record.patient_id) || [],
				)
				const newPatientsThisMonth = Array.from(monthPatientIds).filter((id) => !existingPatientIds.has(id)).length

				// Calculate revenue by branch - FIXED: Use monthRecords for filtering by selected month
				const branchRevenue = new Map<string, number>()
				monthRecords?.forEach((record) => {
					const current = branchRevenue.get(record.branch) || 0
					branchRevenue.set(record.branch, current + (record.total_amount || 0))
				})

				const revenueByBranch = Array.from(branchRevenue.entries())
					.map(([branch, revenue]) => ({
						branch,
						revenue,
						percentage: monthlyRevenue > 0 ? (revenue / monthlyRevenue) * 100 : 0,
					}))
					.sort((a, b) => b.revenue - a.revenue)

				// Calculate revenue by exam type (with normalization)
				const examTypeRevenue = new Map<string, { revenue: number; count: number; originalName: string }>()
				transformedRecords?.forEach((record) => {
					const normalizedType = normalizeExamType(record.exam_type)
					const current = examTypeRevenue.get(normalizedType) || {
						revenue: 0,
						count: 0,
						originalName: record.exam_type,
					}
					examTypeRevenue.set(normalizedType, {
						revenue: current.revenue + (record.total_amount || 0),
						count: current.count + 1,
						originalName: current.originalName, // Keep the first occurrence as display name
					})
				})

				const revenueByExamType = Array.from(examTypeRevenue.entries())
					.map(([, data]) => ({
						examType: data.originalName, // Use original name for display
						revenue: data.revenue,
						count: data.count,
					}))
					.sort((a, b) => b.revenue - a.revenue)

				// Calculate sales trend by month for selected year - FIXED: Start from January (month 0)
				const currentYear = selectedYear || new Date().getFullYear()
				const yearStart = startOfYear(new Date(currentYear, 0, 1))
				const yearEnd = endOfYear(new Date(currentYear, 0, 1))

				// Filter records for the selected year
				const yearRecords =
					transformedRecords?.filter((record) => {
						if (!record.created_at) return false
						const recordDate = new Date(record.created_at)
						return recordDate >= yearStart && recordDate <= yearEnd
					}) || []

				// Create 12 months for the selected year - FIXED: Start from January (0) to December (11)
				const salesTrendByMonth = []
				for (let month = 0; month < 12; month++) {
					const monthDate = new Date(currentYear, month, 1)
					const monthKey = format(monthDate, 'yyyy-MM')
					const monthRevenue = yearRecords
						.filter((record) => record.created_at && format(new Date(record.created_at), 'yyyy-MM') === monthKey)
						.reduce((sum, record) => sum + (record.total_amount || 0), 0)

					salesTrendByMonth.push({
						month: monthKey,
						revenue: monthRevenue,
						monthIndex: month, // Add month index for proper ordering
						isSelected: selectedMonth ? format(selectedMonth, 'yyyy-MM') === monthKey : false,
					})
				}

				// Calculate top exam types by frequency (with normalization)
				const examTypeCounts = new Map<string, { count: number; revenue: number; originalName: string }>()
				transformedRecords?.forEach((record) => {
					const normalizedType = normalizeExamType(record.exam_type)
					const current = examTypeCounts.get(normalizedType) || { count: 0, revenue: 0, originalName: record.exam_type }
					examTypeCounts.set(normalizedType, {
						count: current.count + 1,
						revenue: current.revenue + (record.total_amount || 0),
						originalName: current.originalName,
					})
				})

				const topExamTypes = Array.from(examTypeCounts.entries())
					.map(([, data]) => ({
						examType: data.originalName,
						count: data.count,
						revenue: data.revenue,
					}))
					.sort((a, b) => b.count - a.count)
					.slice(0, 5) // Top 5

				// Calculate top treating doctors
				const doctorStats = new Map<string, { cases: number; revenue: number }>()
				transformedRecords?.forEach((record) => {
					const doctor = record.treating_doctor?.trim()
					if (doctor) {
						const current = doctorStats.get(doctor) || { cases: 0, revenue: 0 }
						doctorStats.set(doctor, {
							cases: current.cases + 1,
							revenue: current.revenue + (record.total_amount || 0),
						})
					}
				})

				const topTreatingDoctors = Array.from(doctorStats.entries())
					.map(([doctor, stats]) => ({
						doctor,
						cases: stats.cases,
						revenue: stats.revenue,
					}))
					.sort((a, b) => b.revenue - a.revenue) // Sort by revenue
					.slice(0, 5) // Top 5 doctors

				// Calculate revenue by origin (procedencia)
				const originStats = new Map<string, { cases: number; revenue: number }>()
				transformedRecords?.forEach((record) => {
					const origin = record.origin?.trim()
					if (origin) {
						const current = originStats.get(origin) || { cases: 0, revenue: 0 }
						originStats.set(origin, {
							cases: current.cases + 1,
							revenue: current.revenue + (record.total_amount || 0),
						})
					}
				})

				const revenueByOrigin = Array.from(originStats.entries())
					.map(([origin, stats]) => ({
						origin,
						cases: stats.cases,
						revenue: stats.revenue,
						percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
					}))
					.sort((a, b) => b.revenue - a.revenue) // Sort by revenue
					.slice(0, 5) // Top 5 origins

				return {
					totalRevenue,
					uniquePatients: finalUniquePatients,
					completedCases,
					incompleteCases,
					pendingPayments,
					monthlyRevenue,
					newPatientsThisMonth,
					revenueByBranch,
					revenueByExamType,
					salesTrendByMonth,
					topExamTypes,
					topTreatingDoctors,
					revenueByOrigin,
					totalCases,
					monthlyRevenueBolivares,
					monthlyRevenueDollars,
				}
			} catch (error) {
				console.error('Error fetching dashboard stats:', error)
				throw error
			}
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
		refetchOnWindowFocus: false,
	})
}

export const useMonthSelector = () => {
  const currentDate = new Date()
  const months = []
  
  // Generate last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
    months.push({
      value: date,
      label: format(date, 'MMMM yyyy', { locale: es })
    })
  }
  
  return months
}

export const useYearSelector = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  
  // Generate last 5 years and next 2 years
  for (let i = currentYear - 5; i <= currentYear + 2; i++) {
    years.push({
      value: i,
      label: i.toString()
    })
  }
  
  return years
}