import React, { useState, useCallback, useMemo, useEffect } from 'react'
import CasesTable from '@shared/components/cases/CasesTable'
import { Users, MapPin, FileText, Activity, Download, BarChart3, Stethoscope, FlaskConical, Info } from 'lucide-react'
import { Card, CardContent } from '@shared/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent } from '@shared/components/ui/tooltip'
import { type MedicalRecord } from '@shared/types/types'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lib/supabase/config'

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
	const [showPendingOnly, setShowPendingOnly] = useState(false)
	const [selectedExamType, setSelectedExamType] = useState<string | null>(null)
	const [showPdfReadyOnly, setShowPdfReadyOnly] = useState(false)
	const [selectedDocAprobado, setSelectedDocAprobado] = useState<
		'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | null
	>(null)

	// Filter cases by assigned branch if user has an assigned branch
	const filteredCases = useMemo(() => {
		if (!cases || cases.length === 0) return []

		let filtered = [...cases]

		// If user is an employee with assigned branch, filter cases
		if (profile?.role === 'employee' && profile?.assigned_branch) {
			filtered = filtered.filter((c) => c.branch === profile.assigned_branch)
		}

		// If user is an admin with assigned branch, filter cases
		if (profile?.role === 'admin' && profile?.assigned_branch) {
			filtered = filtered.filter((c) => c.branch === profile.assigned_branch)
		}

		// If showPendingOnly is true, filter to show only incomplete cases
		if (showPendingOnly) {
			filtered = filtered.filter((c) => c.payment_status !== 'Pagado')
		}

		// If an exam type is selected, filter by that type
		if (selectedExamType) {
			filtered = filtered.filter((c) => {
				if (!c.exam_type) return false

				const type = c.exam_type.toLowerCase().trim()

				// Normalizar el tipo de examen usando la misma lógica
				let normalizedType = type
				if (type.includes('inmuno')) {
					normalizedType = 'inmunohistoquimica'
				} else if (type.includes('citolog')) {
					normalizedType = 'citologia'
				} else if (type.includes('biops')) {
					normalizedType = 'biopsia'
				}

				return normalizedType === selectedExamType.toLowerCase()
			})
		}

		// If showPdfReadyOnly is true, filter to show only cases with PDF ready
		if (showPdfReadyOnly) {
			filtered = filtered.filter((c) => {
				const pdfReadyValue = c.pdf_en_ready

				// Verificar si es string antes de usar toLowerCase
				if (typeof pdfReadyValue === 'string') {
					return pdfReadyValue === 'FALSE'
				}
				// Si es booleano
				if (typeof pdfReadyValue === 'boolean') {
					return pdfReadyValue === false
				}
				// Para cualquier otro caso (null, undefined, etc.)
				return false
			})
		}

		// Filter by doc_aprobado status when selected
		if (selectedDocAprobado) {
			filtered = filtered.filter((c) => {
				const raw = c.doc_aprobado as string | undefined | null
				const status = (raw ? String(raw) : 'faltante').toLowerCase().trim()
				return status === selectedDocAprobado
			})
		}

		return filtered
	}, [cases, profile, showPendingOnly, selectedExamType, showPdfReadyOnly, selectedDocAprobado])

	// Calculate statistics
	const stats = useMemo(() => {
		if (!filteredCases || filteredCases.length === 0) {
			return { total: 0, totalAmount: 0, completed: 0, examTypes: {} }
		}

		const total = filteredCases.length
		const totalAmount = filteredCases.reduce(
			(sum: number, record: MedicalRecord) => sum + (record.total_amount || 0),
			0,
		)
		const completed = filteredCases.filter((record: MedicalRecord) => record.payment_status === 'Pagado').length

		// Count cases by exam type
		const examTypes: Record<string, number> = {}
		filteredCases.forEach((record: MedicalRecord) => {
			if (!record.exam_type) return
			const type = record.exam_type.toLowerCase()
			examTypes[type] = (examTypes[type] || 0) + 1
		})

		return { total, totalAmount, completed, examTypes }
	}, [filteredCases])

	// Toggle pending cases filter
	const handleTogglePendingFilter = useCallback(() => {
		setShowPendingOnly(!showPendingOnly)
		setSelectedExamType(null) // Clear exam type filter when toggling pending filter
		setShowPdfReadyOnly(false) // Clear PDF filter when toggling pending filter
		setSelectedDocAprobado(null)
	}, [showPendingOnly])

	// Toggle exam type filter
	const handleExamTypeFilter = useCallback(
		(examType: string) => {
			if (selectedExamType === examType.toLowerCase()) {
				setSelectedExamType(null) // Clear filter if already selected
			} else {
				setSelectedExamType(examType.toLowerCase())
				setShowPendingOnly(false) // Clear pending filter when selecting exam type
				setShowPdfReadyOnly(false) // Clear PDF filter when selecting exam type
				setSelectedDocAprobado(null)
			}
		},
		[selectedExamType],
	)

	// Toggle PDF ready filter
	const handleTogglePdfFilter = useCallback(() => {
		setShowPdfReadyOnly(!showPdfReadyOnly)
		setShowPendingOnly(false) // Clear pending filter when toggling PDF filter
		setSelectedExamType(null) // Clear exam type filter when toggling PDF filter
		setSelectedDocAprobado(null)
	}, [showPdfReadyOnly])

	// Toggle doc_aprobado filter
	const handleDocAprobadoFilter = useCallback(
		(status: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | null) => {
			if (selectedDocAprobado === status) {
				setSelectedDocAprobado(null)
			} else {
				setSelectedDocAprobado(status)
				setShowPendingOnly(false)
				setShowPdfReadyOnly(false)
				setSelectedExamType(null)
			}
		},
		[selectedDocAprobado],
	)

	// Get exam type counts from all cases (SOLO PENDIENTES)
	const examTypeCounts = useMemo(() => {
		const counts: Record<string, number> = {
			biopsia: 0,
			citologia: 0,
			inmunohistoquimica: 0,
		}

		if (cases) {
			// Debug: log all unique exam types
			const uniqueTypes = new Set<string>()
			cases.forEach((record) => {
				if (record.exam_type) {
					uniqueTypes.add(record.exam_type)
				}
			})
			console.log('📊 Tipos de examen únicos en la BD:', Array.from(uniqueTypes))

			cases.forEach((record) => {
				if (record.exam_type) {
					// Solo contar casos pendientes (no pagados)
					const isPending = record.payment_status?.toLowerCase().trim() !== 'pagado'
					if (!isPending) return

					const originalType = record.exam_type
					const type = record.exam_type.toLowerCase().trim()

					// Mapear variaciones comunes
					let normalizedType = type
					if (type.includes('inmuno')) {
						normalizedType = 'inmunohistoquimica'
					} else if (type.includes('citolog')) {
						normalizedType = 'citologia'
					} else if (type.includes('biops')) {
						normalizedType = 'biopsia'
					}

					if (counts[normalizedType] !== undefined) {
						counts[normalizedType]++
					} else {
						console.warn('⚠️ Tipo de examen no reconocido:', originalType, '-> normalizado:', normalizedType)
					}
				}
			})
		}

		console.log('📊 Conteos pendientes finales:', counts)
		return counts
	}, [cases])

	// Count PDF-ready cases using pdf_en_ready column
	const pendingPdfCases = useMemo(() => {
		return (
			cases?.filter((c) => {
				const pdfReadyValue = c.pdf_en_ready

				// Verificar si es string antes de usar toLowerCase
				if (typeof pdfReadyValue === 'string') {
					return pdfReadyValue === 'FALSE'
				}
				// Si es booleano
				if (typeof pdfReadyValue === 'boolean') {
					return pdfReadyValue === false
				}
				// Para cualquier otro caso (null, undefined, etc.)
				return false
			}).length || 0
		)
	}, [cases])

	// Counts by doc_aprobado status
	const docAprobadoCounts = useMemo(() => {
		const counts: Record<'faltante' | 'pendiente' | 'aprobado' | 'rechazado', number> = {
			faltante: 0,
			pendiente: 0,
			aprobado: 0,
			rechazado: 0,
		}

		if (cases) {
			cases.forEach((record) => {
				const raw = record.doc_aprobado as string | undefined | null
				const status = (raw ? String(raw) : 'faltante').toLowerCase().trim()
				if (status === 'faltante' || status === 'pendiente' || status === 'aprobado' || status === 'rechazado') {
					counts[status] += 1
				}
			})
		}

		return counts
	}, [cases])

	return (
		<div>
			{/* Title Section */}
			<div className="mb-4 sm:mb-6">
				<h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Casos de Laboratorio</h2>
				<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full"></div>
			</div>

			{/* Statistics cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mb-4 sm:mb-6">
				{/* Combined Pending Cases and PDF Card */}
				<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 group transition-transform duration-300 relative">
					<CardContent className="p-4">
						{/* Tooltip informativo arriba derecha */}
						<div className="absolute top-2 right-2">
							<Tooltip>
								<TooltipTrigger>
									<Info className="size-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
								</TooltipTrigger>
								<TooltipContent>
									<p>Filtra para ver solo casos pendientes o solo PDF por generar.</p>
								</TooltipContent>
							</Tooltip>
						</div>

						{/* Pending Cases Button */}
						<button
							className={`w-full relative pr-12 mt-3 flex items-center justify-between p-3 rounded-lg border transition-transform duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md ${
								showPendingOnly
									? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
									: 'border-border hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
							}`}
							onClick={handleTogglePendingFilter}
						>
							<div className="flex items-center gap-3">
								<div
									className={`p-2 rounded-lg transition-none duration-200 ${
										showPendingOnly
											? 'bg-primary/20'
											: 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-800/40'
									}`}
								>
									<Users
										className={`h-5 w-5 transition-none duration-200 ${
											showPendingOnly ? 'text-primary' : 'text-orange-600 dark:text-orange-400'
										}`}
									/>
								</div>
								<p className="text-xs font-bold text-muted-foreground">Casos Pendientes</p>
							</div>
							<div className="absolute right-3 top-1/2 -translate-y-1/2 text-right tabular-nums">
								<p className="text-xl font-bold">
									{stats.total > 0 ? Math.round(((stats.total - stats.completed) / stats.total) * 100) : 0}%
								</p>
							</div>
						</button>

						{/* PDF Ready Button */}
						<button
							className={`w-full relative pr-12 flex items-center justify-between p-3 rounded-lg border transition-transform duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-md mt-3 ${
								showPdfReadyOnly
									? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
									: 'border-border hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
							}`}
							onClick={handleTogglePdfFilter}
						>
							<div className="flex items-center gap-3">
								<div
									className={`p-2 rounded-lg transition-none duration-200 ${
										showPdfReadyOnly
											? 'bg-primary/20'
											: 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/40'
									}`}
								>
									<Download
										className={`h-5 w-5 transition-none duration-200 ${
											showPdfReadyOnly ? 'text-primary' : 'text-green-600 dark:text-green-400'
										}`}
									/>
								</div>
								<p className="text-xs font-bold text-muted-foreground">PDF Pendientes</p>
							</div>
							<div className="absolute right-3 top-1/2 -translate-y-1/2 text-right tabular-nums">
								<p className="text-xl font-bold">{pendingPdfCases}</p>
							</div>
						</button>

						{/* Status indicators */}
						<div className="mt-3 pt-3 border-t border-border">
							{showPendingOnly && <p className="text-xs text-primary font-medium">Mostrando casos pendientes</p>}
							{showPdfReadyOnly && <p className="text-xs text-primary font-medium">Mostrando PDF disponibles</p>}
						</div>
					</CardContent>
				</Card>

				{/* Exam Types Card - Rediseñada más compacta */}
				<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 group transition-transform duration-300 relative">
					<CardContent className="p-4">
						{/* Tooltip informativo arriba derecha */}
						<div className="absolute top-2 right-2">
							<Tooltip>
								<TooltipTrigger>
									<Info className="size-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
								</TooltipTrigger>
								<TooltipContent>
									<p>Filtra por tipo de examen: Biopsia, Citología o Inmunohistoquímica.</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div className="flex items-center gap-3 mb-3">
							<div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
								<BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<p className="text-xs font-medium text-muted-foreground">Tipos de Examen</p>
							</div>
						</div>

						<div className="space-y-2">
							{/* Biopsia */}
							<div
								className={`flex items-center justify-between p-2 rounded-lg border transition-transform duration-200 cursor-pointer hover:bg-accent ${
									selectedExamType === 'biopsia'
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-primary/50'
								}`}
								onClick={() => handleExamTypeFilter('biopsia')}
							>
								<div className="flex items-center gap-2">
									<Activity className="h-3 w-3 text-pink-600" />
									<span className="text-xs font-medium">Biopsia</span>
								</div>
								<span className="text-sm font-bold">{examTypeCounts['biopsia'] || 0}</span>
							</div>

							{/* Citología */}
							<div
								className={`flex items-center justify-between p-2 rounded-lg border transition-transform duration-200 cursor-pointer hover:bg-accent ${
									selectedExamType === 'citologia'
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-primary/50'
								}`}
								onClick={() => handleExamTypeFilter('citologia')}
							>
								<div className="flex items-center gap-2">
									<Stethoscope className="h-3 w-3 text-purple-600" />
									<span className="text-xs font-medium">Citología</span>
								</div>
								<span className="text-sm font-bold">{examTypeCounts['citologia'] || 0}</span>
							</div>

							{/* Inmunohistoquímica */}
							<div
								className={`flex items-center justify-between p-2 rounded-lg border transition-transform duration-200 cursor-pointer hover:bg-accent ${
									selectedExamType === 'inmunohistoquimica'
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-primary/50'
								}`}
								onClick={() => handleExamTypeFilter('inmunohistoquimica')}
							>
								<div className="flex items-center gap-2">
									<FlaskConical className="h-3 w-3 text-blue-500" />
									<span className="text-xs font-medium">Inmunohistoquímica</span>
								</div>
								<span className="text-sm font-bold">{examTypeCounts['inmunohistoquimica'] || 0}</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Document Status Card (doc_aprobado) */}
				<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 group transition-transform duration-300 relative">
					<CardContent className="p-4">
						{/* Tooltip informativo arriba derecha */}
						<div className="absolute top-2 right-2">
							<Tooltip>
								<TooltipTrigger>
									<Info className="size-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
								</TooltipTrigger>
								<TooltipContent>
									<p>Filtra los casos por estatus del documento: faltante, pendiente o aprobado.</p>
								</TooltipContent>
							</Tooltip>
						</div>
						<div className="flex items-center gap-3 mb-3">
							<div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
								<FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
							</div>
							<div>
								<p className="text-xs font-medium text-muted-foreground">Estatus de Documento</p>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2 h-full">
							{/* Faltante */}
							<div
								className={`flex justify-between p-2 rounded-lg border transition-transform duration-200 cursor-pointer hover:bg-accent ${
									selectedDocAprobado === 'faltante'
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-primary/50'
								}`}
								onClick={() => handleDocAprobadoFilter('faltante')}
							>
								<div className="flex gap-2">
									<FileText className="h-3 w-3 text-red-500" />
									<span className="text-xs font-medium">Faltante</span>
								</div>
								<span className="text-sm font-bold">{docAprobadoCounts['faltante'] || 0}</span>
							</div>

							{/* Pendiente */}
							<div
								className={`flex items-center justify-between p-2 rounded-lg border transition-transform duration-200 cursor-pointer hover:bg-accent ${
									selectedDocAprobado === 'pendiente'
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-primary/50'
								}`}
								onClick={() => handleDocAprobadoFilter('pendiente')}
							>
								<div className="flex items-center gap-2">
									<FileText className="h-3 w-3 text-yellow-500" />
									<span className="text-xs font-medium">Pendiente</span>
								</div>
								<span className="text-sm font-bold">{docAprobadoCounts['pendiente'] || 0}</span>
							</div>

							{/* Rechazado */}
							<div
								className={`flex items-center justify-between p-2 rounded-lg border transition-transform duration-200 cursor-pointer hover:bg-accent ${
									selectedDocAprobado === 'rechazado'
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-primary/50'
								}`}
								onClick={() => handleDocAprobadoFilter('rechazado')}
							>
								<div className="flex items-center gap-2">
									<FileText className="h-3 w-3 text-orange-500" />
									<span className="text-xs font-medium">Rechazado</span>
								</div>
								<span className="text-sm font-bold">{docAprobadoCounts['rechazado'] || 0}</span>
							</div>

							{/* Aprobado */}
							<div
								className={`flex items-center justify-between p-2 rounded-lg border transition-transform duration-200 cursor-pointer hover:bg-accent ${
									selectedDocAprobado === 'aprobado'
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-primary/50'
								}`}
								onClick={() => handleDocAprobadoFilter('aprobado')}
							>
								<div className="flex items-center gap-2">
									<FileText className="h-3 w-3 text-green-500" />
									<span className="text-xs font-medium">Aprobado</span>
								</div>
								<span className="text-sm font-bold">{docAprobadoCounts['aprobado'] || 0}</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

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
						{selectedExamType && (
							<div className="flex items-center gap-1.5 sm:gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-2 sm:px-3 py-0.5 sm:py-1">
								<Activity className="w-4 h-4 text-orange-600 dark:text-orange-400" />
								<span className="text-xs sm:text-sm font-medium text-orange-800 dark:text-orange-300">
									Filtrando por:{' '}
									{selectedExamType === 'biopsia'
										? 'Biopsia'
										: selectedExamType === 'citologia'
										? 'Citología'
										: selectedExamType === 'inmunohistoquimica'
										? 'Inmunohistoquímica'
										: selectedExamType}
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
