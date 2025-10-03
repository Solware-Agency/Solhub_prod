import React, { useMemo, useEffect } from 'react'
import CasesTable from '@shared/components/cases/CasesTable'
import {
	// Users,
	MapPin,
	// Activity,
	// Download
} from 'lucide-react'
// import { Card, CardContent } from '@shared/components/ui/card'
import { type MedicalRecord } from '@shared/types/types'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lib/supabase/config'
// import { formatNumber } from '@shared/utils/number-utils'

interface RecordsSectionProps {
	cases: MedicalRecord[]
	isLoading: boolean
	error: unknown
	refetch: () => void
	isFullscreen: boolean
	setIsFullscreen: (value: boolean) => void
	onSearch?: (term: string) => void
}

export const RecordsSection: React.FC<RecordsSectionProps> = ({
	cases,
	isLoading,
	error,
	refetch,
	isFullscreen,
	setIsFullscreen,
	onSearch,
}) => {
	const queryClient = useQueryClient()

	useEffect(() => {
		console.log('🚀 [RecordsSection] Iniciando suscripción realtime...')
		console.log('🔍 [RecordsSection] Estado de realtime:', supabase.realtime.isConnected())

		// Verificar autenticación
		supabase.auth.getSession().then(({ data: { session } }) => {
			console.log('🔐 [RecordsSection] Usuario autenticado:', session?.user?.email)
			console.log('🔐 [RecordsSection] Token válido:', !!session?.access_token)
		})

		// Esperar un poco antes de suscribirse para asegurar que la conexión esté lista
		const timeoutId = setTimeout(() => {
			console.log('⏰ [RecordsSection] Intentando suscripción después del timeout...')

			const channel = supabase
				.channel('realtime-records-section')
				.on(
					'postgres_changes',
					{
						event: '*', // INSERT | UPDATE | DELETE
						schema: 'public',
						table: 'medical_records_clean',
					},
					(payload) => {
						console.log('🔄 [RecordsSection] Cambio detectado en medical_records_clean:', payload)
						console.log('🔄 [RecordsSection] Invalidando queries...')
						// Invalidate any queries that might be used by the parent component
						queryClient.invalidateQueries({ queryKey: ['medical-cases'] })
						queryClient.invalidateQueries({ queryKey: ['my-medical-cases'] })
						// Also trigger the refetch function passed as prop
						refetch()
					},
				)
				.subscribe((status) => {
					console.log('📡 [RecordsSection] Estado del canal:', status)
					if (status === 'SUBSCRIBED') {
						console.log('✅ [RecordsSection] Suscripción exitosa')
					} else if (status === 'CHANNEL_ERROR') {
						console.error('❌ [RecordsSection] Error en canal')
					} else if (status === 'CLOSED') {
						console.warn('⚠️ [RecordsSection] Canal cerrado')
					}
				})

			// Store channel reference for cleanup
			return channel
		}, 2000) // Esperar 2 segundos

		return () => {
			console.log('🧹 [RecordsSection] Limpiando suscripción')
			clearTimeout(timeoutId)
		}
	}, [queryClient, refetch])

	const { profile } = useUserProfile()

	// Filter cases by assigned branch if user has an assigned branch
	const filteredCases = useMemo(() => {
		if (!cases || cases.length === 0) return []

		let filtered = [...cases]

		// If user is an employee with assigned branch, filter cases
		if (profile?.role === 'employee' && profile?.assigned_branch) {
			filtered = filtered.filter((c) => c.branch === profile.assigned_branch)
		}

		// If user is a residente with assigned branch, filter cases
		if (profile?.role === 'residente' && profile?.assigned_branch) {
			filtered = filtered.filter((c) => c.branch === profile.assigned_branch)
		}

		return filtered
	}, [cases, profile])

	// Calculate statistics
	// const stats = useMemo(() => {
	// 	if (!filteredCases || filteredCases.length === 0) {
	// 		return { total: 0, totalAmount: 0, completed: 0, examTypes: {} }
	// 	}

	// 	const total = filteredCases.length
	// 	const totalAmount = filteredCases.reduce(
	// 		(sum: number, record: MedicalRecord) => sum + (record.total_amount || 0),
	// 		0,
	// 	)
	// 	const completed = filteredCases.filter((record: MedicalRecord) => record.payment_status === 'Pagado').length

	// 	// Count cases by exam type
	// 	const examTypes: Record<string, number> = {}
	// 	filteredCases.forEach((record: MedicalRecord) => {
	// 		if (!record.exam_type) return
	// 		const type = record.exam_type.toLowerCase()
	// 		examTypes[type] = (examTypes[type] || 0) + 1
	// 	})

	// 	return { total, totalAmount, completed, examTypes }
	// }, [filteredCases])

	// Count PDF-ready cases using pdf_en_ready column
	// const pendingPdfCases = useMemo(() => {
	// 	return (
	// 		cases?.filter((c) => {
	// 			const pdfReadyValue = c.pdf_en_ready

	//
	// 			if (typeof pdfReadyValue === 'string') {
	// 				return pdfReadyValue === 'FALSE'
	// 			}
	//
	// 			if (typeof pdfReadyValue === 'boolean') {
	// 				return pdfReadyValue === false
	// 			}

	// 			return false
	// 		}).length || 0
	// 	)
	// }, [cases])

	return (
		<div>
			{/* Title Section */}
			<div className="mb-4 sm:mb-6">
				<h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Casos de Laboratorio</h2>
				<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full"></div>
			</div>

			{/* Statistics cards */}
			{/* <div className="grid grid-cols-1 md:grid-cols-4 gap-5 w-full mb-4 sm:mb-6">
				<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 group transition-transform duration-300">
					<CardContent className="p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
								<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<p className="text-xs font-medium text-muted-foreground">Total de Casos</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-2xl font-bold">{formatNumber(stats.total)}</p>
						</div>
					</CardContent>
				</Card>

				<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 group transition-transform duration-300">
					<CardContent className="p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
								<Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<p className="text-xs font-medium text-muted-foreground">Casos Completados</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-2xl font-bold">{formatNumber(stats.completed)}</p>
						</div>
					</CardContent>
				</Card>

				<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 group transition-transform duration-300">
					<CardContent className="p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
								<Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
							</div>
							<div>
								<p className="text-xs font-medium text-muted-foreground">Casos Pendientes</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-2xl font-bold">{formatNumber(stats.total - stats.completed)}</p>
						</div>
					</CardContent>
				</Card>

				<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 group transition-transform duration-300">
					<CardContent className="p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
								<Download className="h-5 w-5 text-purple-600 dark:text-purple-400" />
							</div>
							<div>
								<p className="text-xs font-medium text-muted-foreground">PDF Pendientes</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-2xl font-bold">{formatNumber(pendingPdfCases)}</p>
						</div>
					</CardContent>
				</Card>
			</div> */}

			{/* Branch Info */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
				<div>
					<div className="flex items-center gap-2 sm:gap-3">
						{profile?.assigned_branch && (
							<div className="flex items-center gap-1.5 sm:gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2 sm:px-3 py-0.5 sm:py-1">
								<MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
								<span className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300">
									Sede: {profile.assigned_branch}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Cases Table */}
			<CasesTable
				cases={filteredCases}
				isLoading={isLoading}
				error={error}
				refetch={refetch}
				isFullscreen={isFullscreen}
				setIsFullscreen={setIsFullscreen}
				onSearch={onSearch}
			/>
		</div>
	)
}
