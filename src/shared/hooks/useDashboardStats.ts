import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase/config/config'
import { startOfMonth, endOfMonth, format, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { isVESPaymentMethod } from '@shared/utils/number-utils'
import { useEffect } from 'react'
import { extractLaboratoryId } from '@services/supabase/types/helpers'

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
	// Porcentajes de crecimiento vs periodo anterior
	revenueGrowthPercentage: number
	casesGrowthPercentage: number
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

export const useDashboardStats = (startDate?: Date, endDate?: Date, selectedYear?: number) => {
	const queryClient = useQueryClient()

	const query = useQuery({
		queryKey: ['dashboard-stats', startDate?.toISOString(), endDate?.toISOString(), selectedYear],
		queryFn: async (): Promise<DashboardStats> => {
			try {
				// Obtener laboratory_id del usuario actual
				const {
					data: { user },
				} = await supabase.auth.getUser()
				if (!user) {
					throw new Error('Usuario no autenticado')
				}

				const { data: profile, error: profileError } = await supabase
					.from('profiles')
					.select('laboratory_id')
					.eq('id', user.id)
					.single()

				const laboratoryId = extractLaboratoryId(profile)

				if (profileError || !laboratoryId) {
					throw new Error('Usuario no tiene laboratorio asignado')
				}

				// Get date range for filtering - use provided dates or default to current month
				const filterStart = startDate || startOfMonth(new Date())
				const filterEnd = endDate || endOfMonth(new Date())

				// OPTIMIZACIÓN: Filtrar en el servidor en lugar de traer todos los registros
				// Solo traer campos necesarios para las estadísticas
				const { data: filteredRecords, error: allError } = await supabase
					.from('medical_records_clean')
					.select(
						`
						id,
						total_amount,
						payment_status,
						remaining,
						branch,
						exam_type,
						origin,
						treating_doctor,
						created_at,
						patient_id,
						exchange_rate,
						payment_method_1,
						payment_amount_1,
						payment_method_2,
						payment_amount_2,
						payment_method_3,
						payment_amount_3,
						payment_method_4,
						payment_amount_4,
						patients!inner(
							id,
							cedula,
							nombre,
							edad,
							telefono,
							email
						)
					`,
					)
					.eq('laboratory_id', laboratoryId)
					.gte('created_at', filterStart.toISOString())
					.lte('created_at', filterEnd.toISOString())

				if (allError) throw allError

				// Transformar los datos para que coincidan con la interfaz
				const transformedFilteredRecords = (filteredRecords || []).map((item: any) => ({
					...item,
					cedula: item.patients?.cedula || '',
					nombre: item.patients?.nombre || '',
					edad: item.patients?.edad || null,
					telefono: item.patients?.telefono || null,
					patient_email: item.patients?.email || null,
					version: item.version || null,
				})) as MedicalCaseWithPatient[]

				// Para el total histórico, necesitamos una consulta separada (sin filtro de fecha)
				const { data: allRecordsForTotal } = await supabase
					.from('medical_records_clean')
					.select('total_amount, patient_id, created_at')
					.eq('laboratory_id', laboratoryId)
					.not('created_at', 'is', null)

				const allRecords = allRecordsForTotal || []

				// Calculate total revenue (all time) - usando consulta separada optimizada
				const totalRevenue = allRecords?.reduce((sum, record) => sum + (record.total_amount || 0), 0) || 0

				// Calculate unique patients - usando consulta separada optimizada
				const uniquePatientIds = new Set(allRecords?.filter((r) => r.patient_id).map((record) => record.patient_id))
				const uniquePatients = uniquePatientIds.size

				// Alternative: Get actual count from patients table for accuracy
				const { count: actualPatientsCount } = await supabase
					.from('patients')
					.select('*', { count: 'exact', head: true })
					.eq('laboratory_id', laboratoryId)

				// Use actual count from patients table for more accurate stats
				const finalUniquePatients = actualPatientsCount || uniquePatients

				// Calcular casos pagados e incompletos (filtered by date range)
				const completedCases =
					transformedFilteredRecords?.filter((record) => record.payment_status === 'Pagado').length || 0
				const totalCases = transformedFilteredRecords?.length || 0
				const incompleteCases = totalCases - completedCases

				// Calcular pagos pendientes (montos restantes) - filtered by date range
				const pendingPayments =
					transformedFilteredRecords?.reduce((sum, record) => {
						// Si el estado de pago no es pagado, sumar el total
						if (record.payment_status !== 'Pagado') {
							return sum + (record.total_amount || 0)
						}
						return sum
					}, 0) || 0

				// Calculate revenue for the filtered period (REAL paid amounts in USD)
				let monthlyRevenue = 0
				transformedFilteredRecords?.forEach((record) => {
					let totalPaidUSD = 0
					for (let i = 1; i <= 4; i++) {
						const method = (record as any)[`payment_method_${i}`]
						const amount = (record as any)[`payment_amount_${i}`]
						if (method && amount && amount > 0) {
							if (isVESPaymentMethod(method)) {
								const rate = record.exchange_rate || 0
								if (rate > 0) {
									totalPaidUSD += amount / rate
								}
							} else {
								totalPaidUSD += amount
							}
						}
					}
				monthlyRevenue += totalPaidUSD
			})

			// Calculate revenue by currency (Bs vs $) for filtered period
			let monthlyRevenueBolivares = 0
				let monthlyRevenueDollars = 0

				transformedFilteredRecords?.forEach((record) => {
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

				// Calculate new patients in the filtered period - usando patient_id de la nueva estructura
				const existingPatientIds = new Set(
					allRecords
						?.filter((record) => record.patient_id && record.created_at && new Date(record.created_at) < filterStart)
						.map((record) => record.patient_id) || [],
				)
				const periodPatientIds = new Set(
					transformedFilteredRecords?.filter((record) => record.patient_id).map((record) => record.patient_id) || [],
				)
				const newPatientsThisMonth = Array.from(periodPatientIds).filter((id) => !existingPatientIds.has(id)).length

				// Calculate stats for previous period for growth comparison
				const periodDuration = filterEnd.getTime() - filterStart.getTime()
				const previousPeriodEnd = new Date(filterStart.getTime() - 1)
				const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDuration)

				const { data: previousPeriodRecords } = await supabase
					.from('medical_records_clean')
					.select(
						`
						id,
						exchange_rate,
						payment_method_1,
						payment_amount_1,
						payment_method_2,
						payment_amount_2,
						payment_method_3,
						payment_amount_3,
						payment_method_4,
						payment_amount_4
					`,
					)
					.eq('laboratory_id', laboratoryId)
					.gte('created_at', previousPeriodStart.toISOString())
					.lte('created_at', previousPeriodEnd.toISOString())

				const previousRecords = previousPeriodRecords || []

				// Calculate previous period revenue (real paid amount)
				const previousRevenue = previousRecords.reduce((sum, record) => {
					let totalPaidUSD = 0
					for (let i = 1; i <= 4; i++) {
						const method = (record as any)[`payment_method_${i}`]
						const amount = (record as any)[`payment_amount_${i}`]
						if (method && amount && amount > 0) {
							if (isVESPaymentMethod(method)) {
								const rate = record.exchange_rate || 0
								if (rate > 0) {
									totalPaidUSD += amount / rate
								}
							} else {
								totalPaidUSD += amount
							}
						}
					}
					return sum + totalPaidUSD
				}, 0)

				const previousCases = previousRecords.length

				// Calculate growth percentages
				const revenueGrowthPercentage =
					previousRevenue > 0 ? ((monthlyRevenue - previousRevenue) / previousRevenue) * 100 : 0
				const casesGrowthPercentage = previousCases > 0 ? ((totalCases - previousCases) / previousCases) * 100 : 0

				// Calculate revenue by branch - Use transformedFilteredRecords for the selected period
				const branchRevenue = new Map<string, number>()
				transformedFilteredRecords?.forEach((record) => {
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

				// Calculate revenue by exam type (with normalization) - Use transformedFilteredRecords
				const examTypeRevenue = new Map<string, { revenue: number; count: number; originalName: string }>()
				transformedFilteredRecords?.forEach((record) => {
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

				// Calculate sales trend by month for the selected year (independent of dateRange)
				const currentYear = selectedYear || new Date().getFullYear()
				const yearStart = startOfYear(new Date(currentYear, 0, 1))
				const yearEnd = endOfYear(new Date(currentYear, 0, 1))

				// Filter records for the selected year - usar consulta separada para el año completo
				const { data: yearRecordsData } = await supabase
					.from('medical_records_clean')
					.select(
						`
						total_amount,
						created_at,
						exchange_rate,
						payment_method_1,
						payment_amount_1,
						payment_method_2,
						payment_amount_2,
						payment_method_3,
						payment_amount_3,
						payment_method_4,
						payment_amount_4
					`,
					)
					.eq('laboratory_id', laboratoryId)
					.gte('created_at', yearStart.toISOString())
					.lte('created_at', yearEnd.toISOString())
					.not('created_at', 'is', null)

				const yearRecords = yearRecordsData || []

				// Create 12 months for the selected year - Start from January (0) to December (11)
				const salesTrendByMonth = []
				for (let month = 0; month < 12; month++) {
					const monthDate = new Date(currentYear, month, 1)
					const monthKey = format(monthDate, 'yyyy-MM')

					// Calcular el monto REAL pagado (suma de métodos de pago en USD)
					const filteredMonthRecords = yearRecords.filter(
						(record) => record.created_at && format(new Date(record.created_at), 'yyyy-MM') === monthKey,
					)

					const monthRevenue = filteredMonthRecords.reduce((sum, record) => {
						let totalPaidUSD = 0

						// Sumar todos los métodos de pago
						for (let i = 1; i <= 4; i++) {
							const method = (record as any)[`payment_method_${i}`]
							const amount = (record as any)[`payment_amount_${i}`]

							if (method && amount && amount > 0) {
								if (isVESPaymentMethod(method)) {
									// Convertir Bs a USD usando exchange_rate
									const rate = record.exchange_rate || 0
									if (rate > 0) {
										totalPaidUSD += amount / rate
									}
								} else {
									// Ya está en USD
									totalPaidUSD += amount
								}
							}
						}

					return sum + totalPaidUSD
				}, 0)

				// Check if this month is within the selected date range
					const isSelected =
						startDate && endDate ? monthDate >= startOfMonth(startDate) && monthDate <= endOfMonth(endDate) : false

					salesTrendByMonth.push({
						month: monthKey,
						revenue: monthRevenue,
						monthIndex: month, // Add month index for proper ordering
						isSelected,
					})
				}

				// Calculate top exam types by frequency (with normalization) - Use transformedFilteredRecords
				const examTypeCounts = new Map<string, { count: number; revenue: number; originalName: string }>()
				transformedFilteredRecords?.forEach((record) => {
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

				// Calculate top treating doctors - Use transformedFilteredRecords
				const doctorStats = new Map<string, { cases: number; revenue: number }>()
				transformedFilteredRecords?.forEach((record) => {
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

				// Calculate revenue by origin (procedencia) - Use transformedFilteredRecords
				const originStats = new Map<string, { cases: number; revenue: number }>()
				transformedFilteredRecords?.forEach((record) => {
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
					revenueGrowthPercentage,
					casesGrowthPercentage,
				}
			} catch (error) {
				console.error('Error fetching dashboard stats:', error)
				throw error
			}
		},
		staleTime: 1000 * 60 * 15, // 15 minutes - OPTIMIZACIÓN: Cache más largo
		gcTime: 1000 * 60 * 30, // 30 minutes - OPTIMIZACIÓN: Mantener en cache más tiempo (antes cacheTime)
		refetchOnWindowFocus: false,
		refetchOnMount: false, // OPTIMIZACIÓN: No refetch automático al montar
	})

	// REALTIME: Suscripción para actualizar stats automáticamente
	useEffect(() => {
		// Esperar un poco antes de suscribirse para asegurar que la conexión esté lista
		const timeoutId = setTimeout(() => {

			const channel = supabase
				.channel('realtime-dashboard-stats')
				.on(
					'postgres_changes',
					{
						event: '*', // INSERT | UPDATE | DELETE
						schema: 'public',
						table: 'medical_records_clean',
					},
					(payload) => {
						// Invalidar todas las queries de dashboard-stats para forzar refetch
						queryClient.invalidateQueries({
							queryKey: ['dashboard-stats'],
							exact: false, // Invalidar todas las variaciones (con diferentes fechas)
						})

						// También invalidar queries relacionadas que podrían afectar las stats
						queryClient.invalidateQueries({ queryKey: ['medical-cases'] })
						queryClient.invalidateQueries({ queryKey: ['my-medical-cases'] })
					},
				)
				.subscribe((status) => {
					if (status === 'CHANNEL_ERROR') {
						console.error('Error en canal realtime de dashboard')
					}
				})

			// Store channel reference for cleanup
			return channel
		}, 2000) // Esperar 2 segundos

		return () => {
			clearTimeout(timeoutId)
		}
	}, [queryClient])

	return {
		data: query.data,
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
	}
}

export const useMonthSelector = () => {
	const currentDate = new Date()
	const months = []

	// Generate last 12 months
	for (let i = 11; i >= 0; i--) {
		const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
		months.push({
			value: date,
			label: format(date, 'MMMM yyyy', { locale: es }),
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
			label: i.toString(),
		})
	}

	return years
}
