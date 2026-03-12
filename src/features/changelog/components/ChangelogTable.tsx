import { useLaboratory } from '@/app/providers/LaboratoryContext'
import { getAllChangeLogs } from '@/services/legacy/supabase-service'
import { getCaseByIdWithPatient, findCaseByCode } from '@/services/supabase/cases/medical-cases-service'
import { supabase } from '@/services/supabase/config/config'
import { useRealtimeInvalidate } from '@shared/hooks/useRealtimeInvalidate'
import { Button } from '@shared/components/ui/button'
import { Calendar as CalendarComponent } from '@shared/components/ui/calendar'
import { Card } from '@shared/components/ui/card'
import { CustomDropdown } from '@shared/components/ui/custom-dropdown'
import { Input } from '@shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
import { useToast } from '@shared/hooks/use-toast'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
	AlertCircle,
	ArrowUpDown,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Edit,
	Eye,
	FileText,
	Filter,
	History,
	Mail,
	MailX,
	RefreshCw,
	Trash2,
} from 'lucide-react'
import React, { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import UnifiedCaseModal from '@features/cases/components/UnifiedCaseModal'
import PatientHistoryModal from '@features/patients/components/PatientHistoryModal'
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service'
import type { Patient } from '@/services/supabase/patients/patients-service'
import { ChangeDetailsModal } from './ChangeDetailsModal'

// Type for the actual data returned from the query - updated for new structure
import type { ChangeLogData } from './ChangeDetailsModal'

// Tipo para grupos de cambios agrupados por sesión
type GroupedChangeLog = {
	sessionId: string
	changes: ChangeLogData[]
	firstChange: ChangeLogData
	changeCount: number
}

const ChangelogTable: React.FC = () => {
	const { toast } = useToast()

	// Función para traducir nombres de campos en inglés a español
	const translateFieldLabel = (fieldName: string, fieldLabel: string): string => {
		// Si el field_label ya está en español, usarlo tal como está
		if (fieldLabel !== fieldName) {
			return fieldLabel
		}

		// Mapeo de campos en inglés a español
		const translations: Record<string, string> = {
			payment_method_1: 'Método de Pago 1',
			payment_amount_1: 'Monto de Pago 1',
			payment_reference_1: 'Referencia de Pago 1',
			payment_method_2: 'Método de Pago 2',
			payment_amount_2: 'Monto de Pago 2',
			payment_reference_2: 'Referencia de Pago 2',
			payment_method_3: 'Método de Pago 3',
			payment_amount_3: 'Monto de Pago 3',
			payment_reference_3: 'Referencia de Pago 3',
			payment_method_4: 'Método de Pago 4',
			payment_amount_4: 'Monto de Pago 4',
			payment_reference_4: 'Referencia de Pago 4',
			display_name: 'Nombre para mostrar',
			phone: 'Teléfono',
		}

		return translations[fieldName] || fieldLabel
	}

	// Para campos de monto: mostrar moneda (USD/Bs) si no viene en el valor (logs antiguos)
	const formatAmountForDisplay = (fieldName: string, value: string | null): string => {
		if (value == null || value === '' || value === '(vacío)') return value ?? '(vacío)'
		const isAmountField =
			fieldName === 'total_amount' ||
			fieldName === 'remaining' ||
			/^payment_amount_\d+$/.test(fieldName)
		if (!isAmountField) return value
		const hasCurrency = /\s*(USD|Bs)\s*$/.test(value.trim())
		return hasCurrency ? value : `${value} (USD)`
	}

	// Helper: texto de entidad para casos médicos y si debe mostrarse como "Caso eliminado" (badge rojo)
	const getCaseEntityDisplay = (log: ChangeLogData): { text: string; isDeletedCase: boolean } => {
		const isCreated = log.field_name === 'created_record'
		const hasCode = !!log.medical_records_clean?.code
		const hasDeletedInfo = !!log.deleted_record_info?.trim()

		if (isCreated && !hasCode && !hasDeletedInfo) {
			// Creación: el caso puede estar ya eliminado (join devuelve null). Mostrar código desde new_value o "Nuevo registro"
			const newVal = log.new_value || ''
			const match = newVal.match(/Registro médico creado:\s*(.+)/)
			const text = match ? match[1].trim() : 'Nuevo registro'
			return { text, isDeletedCase: false }
		}

		const raw = log.medical_records_clean?.code || log.deleted_record_info || 'Caso eliminado'
		// Evitar truncamiento: si deleted_record_info es "CODE - Nombre tipo", mostrar solo el código
		const displayText = raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw
		const isDeletedCase = raw === 'Caso eliminado'
		return { text: displayText, isDeletedCase }
	}

	const { profile } = useUserProfile()
	const { laboratory } = useLaboratory()

	const labId = profile?.laboratory_id
	useRealtimeInvalidate('change_logs', ['change-logs'], {
		filter: labId ? `laboratory_id=eq.${labId}` : undefined,
		enabled: !!labId,
		delayMs: 1000,
	})
	useRealtimeInvalidate('email_send_logs', ['change-logs'], {
		filter: labId ? `laboratory_id=eq.${labId}` : undefined,
		enabled: !!labId,
		delayMs: 1000,
	})

	const [searchTerm, setSearchTerm] = useState('')
	const [actionFilter, setActionFilter] = useState<string>('all')
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
	const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
	const [page, setPage] = useState(0)
	const [rowsPerPage] = useState(20)
	const [isDeleting, setIsDeleting] = useState<string | null>(null)
	const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
	const [logToDelete, setLogToDelete] = useState<string | null>(null)
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
	const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
	const [selectedCaseForView, setSelectedCaseForView] = useState<MedicalCaseWithPatient | null>(null)
	const [isLoadingCase, setIsLoadingCase] = useState(false)
	const [selectedPatientForView, setSelectedPatientForView] = useState<Patient | null>(null)
	const [isLoadingPatient, setIsLoadingPatient] = useState(false)

	// Resetear página cuando cambian los filtros de fecha o la búsqueda
	React.useEffect(() => {
		setPage(0)
	}, [dateRange, searchTerm])

	// Check if user is owner (only owners can delete logs)

	// Query to fetch change logs
	const {
		data: logsData,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ['change-logs', page, rowsPerPage, dateRange, searchTerm.trim()],
		queryFn: () => {
			const filters: { dateFrom?: string; dateTo?: string; search?: string } = {}
			const formatYmd = (d: Date) => {
				const y = d.getFullYear()
				const m = String(d.getMonth() + 1).padStart(2, '0')
				const day = String(d.getDate()).padStart(2, '0')
				return `${y}-${m}-${day}`
			}

			// Si solo hay from (una fecha), filtrar solo ese día; si hay from y to, filtrar el rango
			if (dateRange?.from) {
				filters.dateFrom = formatYmd(dateRange.from)
				filters.dateTo = dateRange.to ? formatYmd(dateRange.to) : filters.dateFrom
			}

			// Búsqueda en servidor para que filtre en todos los resultados, no solo en la página actual
			if (searchTerm.trim()) {
				filters.search = searchTerm.trim()
			}

			return getAllChangeLogs(rowsPerPage, page * rowsPerPage, filters)
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	})

	// Filtro por tipo de acción (búsqueda y fecha ya se aplican en el servidor)
	const filteredLogs = React.useMemo(() => {
		if (!logsData?.data) return []

		return logsData.data.filter((log: ChangeLogData) => {
			let matchesAction = true
			if (actionFilter === 'created') {
				matchesAction = log.field_name === 'created_record'
			} else if (actionFilter === 'deleted') {
				matchesAction = log.field_name === 'deleted_record'
			} else if (actionFilter === 'edited') {
				matchesAction = log.field_name !== 'created_record' && log.field_name !== 'deleted_record'
			}
			return matchesAction
		})
	}, [logsData?.data, actionFilter])

	// Agrupar logs por change_session_id (fallback inteligente para data vieja)
	const groupedLogs = React.useMemo(() => {
		if (filteredLogs.length === 0) return []

		const groups = new Map<string, ChangeLogData[]>()

		filteredLogs.forEach((log: ChangeLogData) => {
			let sessionId: string

			if (log.change_session_id) {
				// Si tiene change_session_id, usarlo directamente
				sessionId = log.change_session_id
			} else {
				// Para data vieja sin change_session_id, crear un ID de sesión basado en:
				// user_id + entity_type + patient_id/medical_record_id + changed_at (redondeado a segundo)
				// Esto agrupa cambios del mismo usuario, misma entidad, mismo momento
				const entityId = log.patient_id || log.medical_record_id || 'unknown'
				const changedAtDate = new Date(log.changed_at)
				// Redondear a segundo para agrupar cambios en la misma ventana de tiempo (±1 segundo)
				const roundedTime = new Date(Math.floor(changedAtDate.getTime() / 1000) * 1000).toISOString()

				sessionId = `${log.user_id}-${log.entity_type}-${entityId}-${roundedTime}`
			}

			if (!groups.has(sessionId)) {
				groups.set(sessionId, [])
			}
			groups.get(sessionId)!.push(log)
		})

		// Debug: Log para verificar agrupación
		if (process.env.NODE_ENV === 'development') {
			console.log('🔍 Agrupación de cambios:', {
				totalLogs: filteredLogs.length,
				totalGroups: groups.size,
				groupsWithMultipleChanges: Array.from(groups.entries())
					.filter(([changes]) => changes.length > 1)
					.map(([sessionId, changes]) => ({
						sessionId,
						count: changes.length,
						fields: changes.map((c) => c.field_name),
					})),
			})
		}

		// Convertir a array de grupos y ordenar por fecha (más reciente primero)
		return Array.from(groups.entries())
			.map(([sessionId, changes]) => {
				// Ordenar cambios dentro del grupo por changed_at
				const sortedChanges = [...changes].sort(
					(a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
				)

				return {
					sessionId,
					changes: sortedChanges,
					firstChange: sortedChanges[0], // Primer cambio (más reciente) para mostrar en tabla
					changeCount: sortedChanges.length,
				} as GroupedChangeLog
			})
			.sort((a, b) => new Date(b.firstChange.changed_at).getTime() - new Date(a.firstChange.changed_at).getTime())
	}, [filteredLogs])

	// Función para abrir modal de detalles
	const handleViewDetails = (sessionId: string) => {
		setSelectedSessionId(sessionId)
		setIsDetailsModalOpen(true)
	}

	// Abrir modal de detalles del caso al hacer clic en el código (solo si es caso y no eliminado)
	const handleOpenCaseDetail = async (log: ChangeLogData) => {
		if (log.entity_type === 'patient' || log.entity_type === 'profile') return
		const { text: caseCode, isDeletedCase } = getCaseEntityDisplay(log)
		if (isDeletedCase) {
			toast({
				title: 'Caso no disponible',
				description: 'No se puede abrir un caso eliminado.',
				variant: 'destructive',
			})
			return
		}
		const canOpenById = !!log.medical_record_id
		const canOpenByCode = caseCode && caseCode !== 'Caso eliminado' && caseCode !== 'Nuevo registro'
		if (!canOpenById && !canOpenByCode) {
			toast({
				title: 'Caso no disponible',
				description: 'No hay suficiente información para abrir este caso.',
				variant: 'destructive',
			})
			return
		}
		setIsLoadingCase(true)
		try {
			let caseData: MedicalCaseWithPatient | null = null
			if (canOpenById) {
				caseData = await getCaseByIdWithPatient(log.medical_record_id)
			}
			if (!caseData && canOpenByCode) {
				caseData = await findCaseByCode(caseCode)
			}
			if (caseData) {
				setSelectedCaseForView(caseData)
			} else {
				toast({
					title: 'Caso no encontrado',
					description: 'No se pudo cargar el caso.',
					variant: 'destructive',
				})
			}
		} catch {
			toast({
				title: 'Error',
				description: 'No se pudo cargar el caso. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setIsLoadingCase(false)
		}
	}

	// Abrir modal de información del paciente al hacer clic en el nombre (solo si es paciente y no eliminado)
	const handleOpenPatientDetail = async (log: ChangeLogData) => {
		if (log.entity_type !== 'patient' || !log.patient_id) return
		if (!log.patients) {
			toast({
				title: 'Paciente no disponible',
				description: 'No se puede abrir un paciente eliminado.',
				variant: 'destructive',
			})
			return
		}
		setIsLoadingPatient(true)
		try {
			const { data: patient, error } = await supabase
				.from('patients')
				.select('*')
				.eq('id', log.patient_id)
				.single()
			if (error) throw error
			if (patient) {
				setSelectedPatientForView(patient as Patient)
			} else {
				toast({
					title: 'Paciente no encontrado',
					description: 'No se pudo cargar el paciente.',
					variant: 'destructive',
				})
			}
		} catch {
			toast({
				title: 'Error',
				description: 'No se pudo cargar el paciente. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setIsLoadingPatient(false)
		}
	}

	// Obtener cambios del grupo seleccionado
	const selectedGroupChanges = React.useMemo(() => {
		if (!selectedSessionId) return []
		const group = groupedLogs.find((g) => g.sessionId === selectedSessionId)
		return group?.changes || []
	}, [selectedSessionId, groupedLogs])

	// Function to delete a change log entry (only for owners)

	// Function to confirm deletion
	const confirmDelete = async () => {
		if (!logToDelete) return

		setIsDeleting(logToDelete)
		try {
			// 🔐 MULTI-TENANT: Obtener laboratory_id del usuario actual
			const {
				data: { user },
			} = await supabase.auth.getUser()
			if (!user) {
				throw new Error('Usuario no autenticado')
			}

			const { data: userProfile, error: profileError } = (await supabase
				.from('profiles')
				.select('laboratory_id')
				.eq('id', user.id)
				.single()) as { data: { laboratory_id?: string } | null; error: any | null }

			if (profileError || !userProfile?.laboratory_id) {
				throw new Error('Usuario no tiene laboratorio asignado')
			}

			// 🔐 MULTI-TENANT: Validar laboratory_id antes de eliminar
			const { error } = await supabase
				.from('change_logs')
				.delete()
				.eq('id', logToDelete)
				.eq('laboratory_id', userProfile.laboratory_id!) // 🔐 VALIDACIÓN MULTI-TENANT

			if (error) {
				throw error
			}

			toast({
				title: '✅ Registro eliminado',
				description: 'El registro del historial ha sido eliminado exitosamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// Refresh data
			refetch()
		} catch (error) {
			console.error('Error deleting change log:', error)
			toast({
				title: '❌ Error al eliminar',
				description: 'Hubo un problema al eliminar el registro. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setIsDeleting(null)
			setIsConfirmDeleteOpen(false)
			setLogToDelete(null)
		}
	}

	// Function to view the case details

	// Function to clear filters
	const clearFilters = () => {
		setSearchTerm('')
		setActionFilter('all')
		setDateRange(undefined)
	}

	// Get action type display text and icon
	const getActionTypeInfo = (log: ChangeLogData) => {
		if (log.field_name === 'created_record') {
			return {
				text: 'Creación',
				icon: <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />,
				bgColor: 'bg-green-100 dark:bg-green-900/30',
				textColor: 'text-green-800 dark:text-green-300',
			}
		} else if (log.field_name === 'deleted_record') {
			return {
				text: 'Eliminación',
				icon: <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />,
				bgColor: 'bg-red-100 dark:bg-red-900/30',
				textColor: 'text-red-800 dark:text-red-300',
			}
		} else if (log.field_name === 'email_sent') {
			// Verificar si es un error (deleted_record_info contiene el mensaje de error)
			const isError = log.deleted_record_info && log.deleted_record_info.trim() !== ''
			return {
				text: isError ? 'Email (Error)' : 'Email Enviado',
				icon: isError ? (
					<MailX className="w-4 h-4 text-orange-600 dark:text-orange-400" />
				) : (
					<Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
				),
				bgColor: isError ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-purple-100 dark:bg-purple-900/30',
				textColor: isError ? 'text-orange-800 dark:text-orange-300' : 'text-purple-800 dark:text-purple-300',
			}
		} else {
			return {
				text: 'Edición',
				icon: <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
				bgColor: 'bg-blue-100 dark:bg-blue-900/30',
				textColor: 'text-blue-800 dark:text-blue-300',
			}
		}
	}

	if (error) {
		return (
			<div>
				<Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
					<div className="flex items-center gap-3 mb-4">
						<AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
						<h2 className="text-xl font-bold text-red-800 dark:text-red-300">Error al cargar el historial</h2>
					</div>
					<p className="text-red-700 dark:text-red-400 mb-4">
						No se pudo cargar el historial de acciones. Por favor, intenta de nuevo más tarde.
					</p>
					<Button onClick={() => refetch()} className="bg-red-600 hover:bg-red-700">
						<RefreshCw className="w-4 h-4 mr-2" />
						Reintentar
					</Button>
				</Card>
			</div>
		)
	}

	return (
		<div>
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Historial de Acciones</h1>
					<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
				</div>
			</div>

			{/* Filters - desktop: todo en una línea; móvil: búsqueda arriba, filtros abajo en una línea */}
			<Card className="mb-6 p-4">
				<div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
					{/* Search */}
					<div className="flex-1 min-w-0">
						<Input
							type="text"
							placeholder="Buscar por usuario, caso, acción..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>

					{/* Tipo de acción + Rango fechas + Limpiar */}
					<div className="flex flex-wrap items-center gap-2 shrink-0">
						{/* Action Type Filter */}
						<div className="flex items-center gap-2">
							<Filter className="w-4 h-4 text-gray-400 shrink-0" />
							<div className="w-40">
								<CustomDropdown
									value={actionFilter}
									onChange={(v) => setActionFilter(v)}
									placeholder="Tipo de acción"
									options={[
										{ value: 'all', label: 'Todas' },
										{ value: 'created', label: 'Creaciones' },
										{ value: 'edited', label: 'Ediciones' },
										{ value: 'deleted', label: 'Eliminaciones' },
									]}
								/>
							</div>
						</div>

						{/* Date Range Filter - responsive: "Rango" + icon en móvil; texto completo en desktop */}
						<Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline" className="flex items-center gap-2 shrink-0">
									<Calendar className="w-4 h-4 text-gray-400 shrink-0" />
									<span className="sm:hidden">
										{dateRange?.from
											? dateRange.from.toDateString() === dateRange.to?.toDateString() || !dateRange?.to
												? format(dateRange.from, 'dd/MM/yyyy', { locale: es })
												: `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`
											: 'Rango'}
									</span>
									<span className="hidden sm:inline">
										{dateRange?.from
											? dateRange.from.toDateString() === dateRange.to?.toDateString() || !dateRange?.to
												? format(dateRange.from, 'dd/MM/yyyy', { locale: es })
												: `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(
														dateRange.to!,
														'dd/MM/yyyy',
														{ locale: es },
													)}`
											: 'Filtrar por rango de fechas'}
									</span>
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0">
								<CalendarComponent
									mode="range"
									selected={dateRange}
									onSelect={(range) => {
										setDateRange(range ?? undefined)
										// Cerrar solo cuando hay rango completo (segundo click), no al elegir la primera fecha
										if (range?.from && range?.to) {
											setIsDatePickerOpen(false)
										}
									}}
									initialFocus
									locale={es}
									toDate={new Date()}
									disabled={{ after: new Date() }}
									numberOfMonths={1}
								/>
							</PopoverContent>
						</Popover>

						{/* Clear Filters */}
						{(searchTerm || actionFilter !== 'all' || dateRange?.from || dateRange?.to) && (
							<Button
								variant="outline"
								size="sm"
								onClick={clearFilters}
								className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
							>
								<Trash2 className="w-4 h-4 mr-1.5" />
								Limpiar
							</Button>
						)}
					</div>
				</div>
			</Card>

			{/* Changelog Table */}
			<Card className="overflow-hidden">
				<div className="overflow-x-auto">
					{isLoading ? (
						<div className="flex items-center justify-center p-8">
							<div className="flex items-center gap-3">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
								<p className="text-lg">Cargando historial...</p>
							</div>
						</div>
					) : groupedLogs.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8">
							<History className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
							<p className="text-lg font-medium text-gray-500 dark:text-gray-400">No se encontraron registros</p>
							<p className="text-sm text-gray-400 dark:text-gray-500">
								{searchTerm || actionFilter !== 'all' || dateRange?.from || dateRange?.to
									? 'Intenta ajustar los filtros de búsqueda'
									: 'Aún no hay registros en el historial de acciones'}
							</p>
						</div>
					) : (
						<>
							{/* Desktop view */}
							<div className="hidden lg:block">
								<table className="w-full">
									<thead className="bg-gray-50/50 dark:bg-background/50 backdrop-blur-[10px] sticky top-0 z-10">
										<tr>
											<th className="px-4 py-3 text-left">
												<div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Fecha
													<ArrowUpDown className="w-3 h-3" />
												</div>
											</th>
											<th className="px-4 py-3 text-left">
												<div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Usuario
												</div>
											</th>
											<th className="px-4 py-3 text-left">
												<div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Entidad
												</div>
											</th>
											<th className="px-4 py-3 text-left">
												<div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Resumen
												</div>
											</th>
											<th className="px-4 py-3 text-left">
												<div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Acción
												</div>
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
										{groupedLogs.map((group: GroupedChangeLog) => {
											const log = group.firstChange

											return (
												<tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-none">
													{/* Date */}
													<td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
														<div className="flex flex-col">
															<span>{format(new Date(log.changed_at), 'dd/MM/yyyy', { locale: es })}</span>
															<span className="text-xs text-gray-500 dark:text-gray-400">
																{format(new Date(log.changed_at), 'HH:mm:ss', { locale: es })}
															</span>
														</div>
													</td>

													{/* User */}
													<td className="px-4 py-4">
														<span
															className="text-sm"
															style={{
																color: log.user_display_name
																	? laboratory?.branding?.primaryColor || undefined
																	: undefined,
															}}
														>
															{log.user_display_name || log.user_email}
														</span>
													</td>

													{/* Entity (Case/Patient/Profile) */}
													<td className="px-4 py-4">
														<div className="flex flex-col">
															{log.entity_type === 'profile' ? (
																<span
																	className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full w-fit bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
																	title="Cambios en perfil de usuario"
																>
																	Perfil
																</span>
															) : log.entity_type === 'patient' ? (
																<>
																	{log.patient_id && log.patients ? (
																		<button
																			type="button"
																			onClick={(e) => {
																				e.stopPropagation()
																				handleOpenPatientDetail(log)
																			}}
																			disabled={isLoadingPatient}
																			className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full w-fit cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 disabled:opacity-50 bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
																			title="Ver información del paciente"
																		>
																			{log.patients.nombre}
																		</button>
																	) : (
																		<span className="text-sm font-medium text-gray-900 dark:text-gray-100">
																			{log.patients?.nombre || log.deleted_record_info || 'Paciente eliminado'}
																		</span>
																	)}
																</>
															) : (
																(() => {
																	const { text, isDeletedCase } = getCaseEntityDisplay(log)
																	const hasValidCode = text && text !== 'Caso eliminado' && text !== 'Nuevo registro'
																	const canOpenCase = log.entity_type !== 'patient' && !isDeletedCase && (!!log.medical_record_id || !!hasValidCode)
																	return (
																		canOpenCase ? (
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation()
																					handleOpenCaseDetail(log)
																				}}
																				disabled={isLoadingCase}
																				className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full w-fit cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 disabled:opacity-50 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
																				title="Ver detalles del caso"
																			>
																				{text}
																			</button>
																		) : (
																			<span
																				className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full w-fit ${
																					isDeletedCase
																						? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
																						: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
																				}`}
																			>
																				{text}
																			</span>
																		)
																	)
																})()
															)}
														</div>
													</td>

													{/* Resumen */}
													<td className="px-4 py-4">
														<div className="max-w-xs wrap-break-word overflow-wrap-anywhere">
															{log.field_name === 'created_record' ? (
																<span className="text-sm text-gray-900 dark:text-gray-100 wrap-break-word">
																	Creación de nuevo registro médico
																</span>
															) : log.field_name === 'deleted_record' ? (
																<span className="text-sm text-gray-900 dark:text-gray-100 wrap-break-word">
																	Eliminación del registro:{' '}
																	{(() => {
																		const value = log.old_value || ''
																		if (typeof value === 'string' && value.startsWith('http') && value.length > 50) {
																			return value.substring(0, 50) + '...'
																		}
																		return value
																	})()}
																</span>
															) : group.changeCount === 1 ? (
																// Si solo hay un cambio, mostrar resumen simple (con moneda en montos)
																<div className="text-sm wrap-break-word">
																	<p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
																		{translateFieldLabel(log.field_name, log.field_label)}
																	</p>
																	<div className="flex flex-col gap-1">
																		<div className="text-xs text-gray-500 dark:text-gray-400 wrap-break-word">
																			<span className="line-through">
																				Antes:{' '}
																				{formatAmountForDisplay(log.field_name, log.old_value)}
																			</span>
																		</div>
																		<div className="text-xs text-green-600 dark:text-green-400 wrap-break-word">
																			<span>
																				Ahora:{' '}
																				{formatAmountForDisplay(log.field_name, log.new_value)}
																			</span>
																		</div>
																	</div>
																</div>
															) : (
																// Si hay múltiples cambios, mostrar resumen agrupado
																<div className="text-sm">
																	<p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
																		{group.changeCount}{' '}
																		{group.changeCount === 1 ? 'campo modificado' : 'campos modificados'}
																	</p>
																	<p className="text-xs text-gray-500 dark:text-gray-400">
																		{group.changes
																			.slice(0, 3)
																			.map((c) => translateFieldLabel(c.field_name, c.field_label))
																			.join(', ')}
																		{group.changeCount > 3 && '...'}
																	</p>
																</div>
															)}
														</div>
													</td>

													{/* Botón Ver Detalles */}
													<td className="px-4 py-4">
														{log.field_name !== 'created_record' && log.field_name !== 'deleted_record' && (
															<Button
																variant="outline"
																size="sm"
																onClick={() => handleViewDetails(group.sessionId)}
																className="flex items-center gap-2"
															>
																<Eye className="w-4 h-4" />
																Ver Detalles
															</Button>
														)}
													</td>
												</tr>
											)
										})}
									</tbody>
								</table>
							</div>

							{/* Mobile view - Card layout */}
							<div className="lg:hidden">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3">
									{groupedLogs.map((group: GroupedChangeLog) => {
										const log = group.firstChange
										const actionInfo = getActionTypeInfo(log)
										const logDate = format(new Date(log.changed_at), 'dd/MM/yyyy', { locale: es })
										const logTime = format(new Date(log.changed_at), 'HH:mm:ss', { locale: es })

										return (
											<div
												key={group.sessionId}
												className="bg-white dark:bg-background sm:p-3 border border-gray-200 dark:border-gray-700 hover:border-primary/70 dark:hover:border-primary/60 transition-colors duration-200 cursor-pointer rounded-lg p-3 shadow-sm overflow-hidden"
											>
												{/* Header with date and action type */}
												<div className="flex items-center justify-between mb-2">
													<div className="flex flex-col">
														<span className="text-xs font-medium">{logDate}</span>
														<span className="text-xs text-gray-500">{logTime}</span>
													</div>
													<div className="flex flex-col gap-1">
														{log.entity_type === 'profile' ? (
															<span
																className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full w-fit bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
																title="Cambios en perfil de usuario"
															>
																Perfil
															</span>
														) : log.entity_type === 'patient' ? (
															<>
																{log.patient_id && log.patients ? (
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation()
																			handleOpenPatientDetail(log)
																		}}
																		disabled={isLoadingPatient}
																		className="text-xs text-gray-900 dark:text-gray-100 truncate font-semibold text-left w-fit cursor-pointer transition-all duration-200 hover:opacity-100 hover:decoration-2 hover:decoration-teal-600 dark:hover:decoration-teal-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 disabled:opacity-50 underline decoration-teal-500 decoration-1 underline-offset-1"
																		title="Ver información del paciente"
																	>
																		{log.patients.nombre}
																	</button>
																) : (
																	<span className="text-xs text-gray-900 dark:text-gray-100 truncate font-semibold">
																		{log.patients?.nombre || log.deleted_record_info || 'Paciente eliminado'}
																	</span>
																)}
															</>
														) : (
															(() => {
																const { text, isDeletedCase } = getCaseEntityDisplay(log)
																const hasValidCode = text && text !== 'Caso eliminado' && text !== 'Nuevo registro'
																const canOpenCase = log.entity_type !== 'patient' && log.entity_type !== 'profile' && !isDeletedCase && (!!log.medical_record_id || !!hasValidCode)
																return (
																	canOpenCase ? (
																		<button
																			type="button"
																			onClick={(e) => {
																				e.stopPropagation()
																				handleOpenCaseDetail(log)
																			}}
																			disabled={isLoadingCase}
																			className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full w-fit cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 disabled:opacity-50 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
																			title="Ver detalles del caso"
																		>
																			{text}
																		</button>
																	) : (
																		<span
																			className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full w-fit ${
																				isDeletedCase
																					? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
																					: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
																			}`}
																		>
																			{text}
																		</span>
																	)
																)
															})()
														)}
													</div>
													<div
														className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${actionInfo.bgColor} ${actionInfo.textColor}`}
													>
														{actionInfo.icon}
														<span>{actionInfo.text}</span>
													</div>
												</div>

												{/* User */}
												<div className="mb-2 border-t border-gray-100 dark:border-gray-700 pt-2">
													<span className="text-xs text-gray-900 dark:text-gray-100 truncate">{log.user_email}</span>
												</div>

												{/* Resumen */}
												<div className="border-t border-gray-100 dark:border-gray-700 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
													<div>
														<span className="text-xs text-gray-500 dark:text-gray-400">Resumen:</span>
														<div className="mt-1 wrap-break-word overflow-wrap-anywhere">
															{log.field_name === 'created_record' ? (
																<span className="text-sm text-gray-900 dark:text-gray-100 wrap-break-word">
																	Creación de nuevo registro médico
																</span>
															) : log.field_name === 'deleted_record' ? (
																<span className="text-sm text-gray-900 dark:text-gray-100 wrap-break-word">
																	Eliminación del registro: {log.old_value}
																</span>
															) : group.changeCount === 1 ? (
																<div className="text-sm flex flex-col gap-1">
																	<p className="font-medium text-gray-900 dark:text-gray-100">
																		{translateFieldLabel(log.field_name, log.field_label)}
																	</p>
																	<div className="flex flex-col gap-1 wrap-break-word">
																		<div className="text-xs text-gray-500 dark:text-gray-400 wrap-break-word">
																			<span className="line-through">
																				Antes:{' '}
																				{formatAmountForDisplay(log.field_name, log.old_value)}
																			</span>
																		</div>
																		<div className="text-xs text-green-600 dark:text-green-400 wrap-break-word">
																			<span>
																				Ahora:{' '}
																				{formatAmountForDisplay(log.field_name, log.new_value)}
																			</span>
																		</div>
																	</div>
																</div>
															) : (
																<div className="text-sm">
																	<p className="font-medium text-gray-900 dark:text-gray-100">
																		{group.changeCount}{' '}
																		{group.changeCount === 1 ? 'campo modificado' : 'campos modificados'}
																	</p>
																	<p className="text-xs text-gray-500 dark:text-gray-400">
																		{group.changes
																			.slice(0, 3)
																			.map((c) => translateFieldLabel(c.field_name, c.field_label))
																			.join(', ')}
																		{group.changeCount > 3 && '...'}
																	</p>
																</div>
															)}
														</div>
													</div>
													{log.field_name !== 'created_record' && log.field_name !== 'deleted_record' && (
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleViewDetails(group.sessionId)}
															className="mt-2 w-full flex items-center justify-center gap-2 text-xs"
														>
															<Eye className="w-4 h-4" />
															Ver Detalles
														</Button>
													)}
												</div>
											</div>
										)
									})}
								</div>
							</div>
						</>
					)}
				</div>

				{/* Pagination */}
				{!isLoading && groupedLogs.length > 0 && (
					<div className="flex items-center justify-start gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage(Math.max(0, page - 1))}
							disabled={page === 0}
							aria-label="Página anterior"
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<span className="text-sm font-medium min-w-16 text-center">
							{page + 1}/{logsData?.totalCount ? Math.ceil(logsData.totalCount / rowsPerPage) : 1}
						</span>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage(page + 1)}
							disabled={
								!logsData?.data ||
								logsData.data.length < rowsPerPage ||
								(logsData?.totalCount ? page + 1 >= Math.ceil(logsData.totalCount / rowsPerPage) : false)
							}
							aria-label="Página siguiente"
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				)}
			</Card>

			{/* Confirm Delete Modal */}
			{isConfirmDeleteOpen && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-background rounded-lg p-6 max-w-md w-full mx-4">
						<h3 className="text-lg font-bold mb-4">Confirmar eliminación</h3>
						<p className="mb-6">
							¿Estás seguro de que quieres eliminar este registro del historial? Esta acción no se puede deshacer.
						</p>
						<div className="flex justify-end gap-3">
							<Button
								variant="outline"
								onClick={() => {
									setIsConfirmDeleteOpen(false)
									setLogToDelete(null)
								}}
							>
								Cancelar
							</Button>
							<Button variant="destructive" onClick={confirmDelete} disabled={isDeleting !== null}>
								{isDeleting ? (
									<>
										<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
										Eliminando...
									</>
								) : (
									'Eliminar'
								)}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Modal de Detalles */}
			<ChangeDetailsModal
				isOpen={isDetailsModalOpen}
				onClose={() => {
					setIsDetailsModalOpen(false)
					setSelectedSessionId(null)
				}}
				changes={selectedGroupChanges}
			/>

			{/* Modal de detalles del caso (al hacer clic en código en Entidad) */}
			<UnifiedCaseModal
				case_={selectedCaseForView}
				isOpen={!!selectedCaseForView}
				onClose={() => setSelectedCaseForView(null)}
				onCloseComplete={() => setSelectedCaseForView(null)}
				onSave={() => refetch()}
				onDelete={() => {
					setSelectedCaseForView(null)
					refetch()
				}}
				onCaseSelect={(case_) => setSelectedCaseForView(case_)}
			/>

			{/* Modal de información del paciente (al hacer clic en nombre en Entidad) */}
			<PatientHistoryModal
				patient={selectedPatientForView}
				isOpen={!!selectedPatientForView}
				onClose={() => setSelectedPatientForView(null)}
			/>
		</div>
	)
}

export default ChangelogTable
