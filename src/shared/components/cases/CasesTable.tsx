import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronUp, ChevronDown, Search, Maximize2 } from 'lucide-react'
import type { MedicalCaseWithPatient } from '@lib/medical-cases-service'
import type { DateRange } from 'react-day-picker'

// Tipo unificado que incluye todos los campos necesarios para compatibilidad
type UnifiedMedicalRecord = MedicalCaseWithPatient
import { useToast } from '@shared/hooks/use-toast'
import { Input } from '@shared/components/ui/input'
import { useAuth } from '@app/providers/AuthContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import RequestCaseModal from './RequestCaseModal'
import UnifiedCaseModal from './UnifiedCaseModal'
import HorizontalLinearStepper from './StepsCaseModal'
import CaseActionsPopover from './CaseActionsPopover'
import CaseCard from './CaseCard'
import Pagination from './Pagination'
import FiltersModal from './FiltersModal'
import { getStatusColor } from './status'
import { BranchBadge } from '@shared/components/ui/branch-badge'
import { calculatePaymentDetails } from '@features/form/lib/payment/payment-utils'

interface CasesTableProps {
	cases: UnifiedMedicalRecord[]
	isLoading: boolean
	error: unknown
	refetch: () => void
	isFullscreen: boolean
	setIsFullscreen: (value: boolean) => void
	onSearch?: (term: string) => void
	onCaseSelect?: (case_: UnifiedMedicalRecord) => void
}

type SortField = 'id' | 'created_at' | 'nombre' | 'total_amount' | 'code'
type SortDirection = 'asc' | 'desc'

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

	// Convert "Parcial" to "Incompleto" for consistency
	const normalizedStatus = paymentStatus === 'Parcial' ? 'Incompleto' : paymentStatus || 'Incompleto'

	return {
		paymentStatus: normalizedStatus,
		isPaymentComplete,
		missingAmount: missingAmount || 0,
	}
}

const CasesTable: React.FC<CasesTableProps> = React.memo(
	({ cases, isLoading, error, refetch, isFullscreen, setIsFullscreen, onSearch, onCaseSelect }) => {
		useAuth()
		const { profile } = useUserProfile()
		const { toast } = useToast()
		const [searchTerm, setSearchTerm] = useState('')
		const [statusFilter, setStatusFilter] = useState<string>('all')
		const [branchFilter, setBranchFilter] = useState<string>('all')
		const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
		const [sortField, setSortField] = useState<SortField>('created_at')
		const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
		const [selectedCaseForGenerate, setSelectedCaseForGenerate] = useState<UnifiedMedicalRecord | null>(null)
		const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
		const [selectedCaseForView, setSelectedCaseForView] = useState<UnifiedMedicalRecord | null>(null)
		const [isViewModalOpen, setIsViewModalOpen] = useState(false)
		const [showPdfReadyOnly, setShowPdfReadyOnly] = useState(false)
		const [selectedDoctors, setSelectedDoctors] = useState<string[]>([])
		const [isSearching, setIsSearching] = useState(false)
		const [isStepsModalOpen, setIsStepsModalOpen] = useState(false)
		const [shouldUpdateSelectedCase, setShouldUpdateSelectedCase] = useState(false)
		const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)

		// Filtros de citología
		const [citologyPositiveFilter, setCitologyPositiveFilter] = useState(false)
		const [citologyNegativeFilter, setCitologyNegativeFilter] = useState(false)

		// Filtros temporales para el modal (solo se aplican al hacer clic en "Aplicar Filtros")
		const [tempStatusFilter, setTempStatusFilter] = useState<string>('all')
		const [tempBranchFilter, setTempBranchFilter] = useState<string>('all')
		const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined)
		const [tempShowPdfReadyOnly, setTempShowPdfReadyOnly] = useState(false)
		const [tempSelectedDoctors, setTempSelectedDoctors] = useState<string[]>([])
		const [tempCitologyPositiveFilter, setTempCitologyPositiveFilter] = useState(false)
		const [tempCitologyNegativeFilter, setTempCitologyNegativeFilter] = useState(false)

		// Paginación
		const [currentPage, setCurrentPage] = useState(1)
		const [itemsPerPage, setItemsPerPage] = useState(20)

		// Dropdown options
		const statusOptions = useMemo(
			() => [
				{ value: 'all', label: 'Estado de Pago' },
				{ value: 'Pagado', label: 'Pagado' },
				{ value: 'Incompleto', label: 'Incompleto' },
			],
			[],
		)

		const branchOptions = useMemo(
			() => [
				{ value: 'all', label: 'Todas las sedes' },
				{ value: 'PMG', label: 'PMG' },
				{ value: 'CPC', label: 'CPC' },
				{ value: 'CNX', label: 'CNX' },
				{ value: 'STX', label: 'STX' },
				{ value: 'MCY', label: 'MCY' },
			],
			[],
		)

		const pageSizeOptions = useMemo(
			() => [
				{ value: '10', label: '10' },
				{ value: '20', label: '20' },
				{ value: '50', label: '50' },
				{ value: '100', label: '100' },
			],
			[],
		)
		const handleGenerateEmployeeCase = useCallback((case_: UnifiedMedicalRecord) => {
			setSelectedCaseForGenerate(case_)
			setIsStepsModalOpen(true)
		}, [])

		// Effect to update selected case when cases data changes and we need to update
		useEffect(() => {
			if (shouldUpdateSelectedCase && selectedCaseForView && cases.length > 0) {
				const updatedCase = cases.find((c) => c.id === selectedCaseForView.id)
				if (updatedCase) {
					setSelectedCaseForView(updatedCase)
				}
				setShouldUpdateSelectedCase(false)
			}
		}, [cases, selectedCaseForView, shouldUpdateSelectedCase])

		// Reset pagination when filters change
		useEffect(() => {
			setCurrentPage(1)
		}, [
			statusFilter,
			branchFilter,
			showPdfReadyOnly,
			selectedDoctors,
			searchTerm,
			dateRange,
			citologyPositiveFilter,
			citologyNegativeFilter,
		])

		// Sync temp filters with current filters when modal opens
		useEffect(() => {
			if (isFiltersModalOpen) {
				setTempStatusFilter(statusFilter)
				setTempBranchFilter(branchFilter)
				setTempDateRange(dateRange)
				setTempShowPdfReadyOnly(showPdfReadyOnly)
				setTempSelectedDoctors(selectedDoctors)
				setTempCitologyPositiveFilter(citologyPositiveFilter)
				setTempCitologyNegativeFilter(citologyNegativeFilter)
			}
		}, [
			isFiltersModalOpen,
			statusFilter,
			branchFilter,
			dateRange,
			showPdfReadyOnly,
			selectedDoctors,
			citologyPositiveFilter,
			citologyNegativeFilter,
		])

		// Determine if user can edit, delete, or generate cases based on role
		// const canGenerate = profile?.role === 'owner' || profile?.role === 'admin'
		const canRequest = profile?.role === 'owner' || profile?.role === 'admin'

		// const isAdmin = profile?.role === 'admin'
		// const isOwner = profile?.role === 'owner'
		// const isEmployee = profile?.role === 'employee'

		// Use a ref to track if we're in the dashboard or form view

		const handleSort = useCallback(
			(field: SortField) => {
				if (sortField === field) {
					setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
				} else {
					setSortField(field)
					setSortDirection('asc')
				}
			},
			[sortField, sortDirection],
		)

		const handleGenerateCase = useCallback(
			(case_: UnifiedMedicalRecord) => {
				// Check if user has permission to generate cases
				if (!canRequest) {
					toast({
						title: '❌ Permiso denegado',
						description: 'No tienes permisos para generar casos.',
						variant: 'destructive',
					})
					return
				}

				// Check if this is a generatable case type
				const examType = case_.exam_type?.toLowerCase().trim() || ''
				const isRequestableCase = examType.includes('inmuno')

				if (!isRequestableCase) {
					toast({
						title: '❌ Tipo de examen incorrecto',
						description: 'La generación de casos solo está disponible para biopsias, inmunohistoquímica y citología.',
						variant: 'destructive',
					})
					return
				}

				setSelectedCaseForGenerate(case_)
				setIsGenerateModalOpen(true)
			},
			[toast, canRequest],
		)

		// Handle search input change
		const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchTerm(e.target.value)
		}, [])

		// Handle search on Enter key or when search term changes (debounced)
		const handleSearchKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLInputElement>) => {
				if (e.key === 'Enter' && onSearch) {
					setIsSearching(true)
					// Limpiar y validar el término de búsqueda
					const cleanSearchTerm = searchTerm.trim()
					if (cleanSearchTerm) {
						onSearch(cleanSearchTerm)
					} else {
						// Si el término está vacío, limpiar la búsqueda
						onSearch('')
					}
					setTimeout(() => setIsSearching(false), 500)
				}
			},
			[onSearch, searchTerm],
		)

		// Debounced search effect
		useEffect(() => {
			if (!onSearch) return

			const timeoutId = setTimeout(() => {
				const cleanSearchTerm = searchTerm.trim()
				if (cleanSearchTerm.length >= 2 || cleanSearchTerm.length === 0) {
					setIsSearching(true)
					onSearch(cleanSearchTerm)
					setTimeout(() => setIsSearching(false), 500)
				}
			}, 300) // Debounce de 300ms

			return () => clearTimeout(timeoutId)
		}, [searchTerm, onSearch])

		// Handle clear all filters
		const handleClearAllFilters = useCallback(() => {
			setStatusFilter('all')
			setBranchFilter('all')
			setDateRange(undefined)
			setShowPdfReadyOnly(false)
			setSelectedDoctors([])
			setCitologyPositiveFilter(false)
			setCitologyNegativeFilter(false)
			setSearchTerm('')
			// También limpiar los filtros temporales
			setTempStatusFilter('all')
			setTempBranchFilter('all')
			setTempDateRange(undefined)
			setTempShowPdfReadyOnly(false)
			setTempSelectedDoctors([])
			setTempCitologyPositiveFilter(false)
			setTempCitologyNegativeFilter(false)
		}, [])

		// Handle apply filters from modal
		const handleApplyFilters = useCallback(() => {
			setStatusFilter(tempStatusFilter)
			setBranchFilter(tempBranchFilter)
			setDateRange(tempDateRange)
			setShowPdfReadyOnly(tempShowPdfReadyOnly)
			setSelectedDoctors(tempSelectedDoctors)
			setCitologyPositiveFilter(tempCitologyPositiveFilter)
			setCitologyNegativeFilter(tempCitologyNegativeFilter)
		}, [
			tempStatusFilter,
			tempBranchFilter,
			tempDateRange,
			tempShowPdfReadyOnly,
			tempSelectedDoctors,
			tempCitologyPositiveFilter,
			tempCitologyNegativeFilter,
		])

		// Handle temp filter changes
		const handleTempStatusFilterChange = useCallback((value: string) => {
			setTempStatusFilter(value)
		}, [])

		const handleTempBranchFilterChange = useCallback((value: string) => {
			setTempBranchFilter(value)
		}, [])

		const handleTempDateRangeChange = useCallback((range: DateRange | undefined) => {
			setTempDateRange(range)
		}, [])

		const handleTempPdfFilterToggle = useCallback(() => {
			setTempShowPdfReadyOnly(!tempShowPdfReadyOnly)
		}, [tempShowPdfReadyOnly])

		const handleTempDoctorFilterChange = useCallback((doctors: string[]) => {
			setTempSelectedDoctors(doctors)
		}, [])

		const handleTempCitologyPositiveFilterToggle = useCallback(() => {
			setTempCitologyPositiveFilter(!tempCitologyPositiveFilter)
		}, [tempCitologyPositiveFilter])

		const handleTempCitologyNegativeFilterToggle = useCallback(() => {
			setTempCitologyNegativeFilter(!tempCitologyNegativeFilter)
		}, [tempCitologyNegativeFilter])

		const handleCaseSelect = useCallback(
			(case_: UnifiedMedicalRecord) => {
				// If onCaseSelect prop is provided, use it (for external selection)
				if (onCaseSelect) {
					onCaseSelect(case_)
				} else {
					// Otherwise, handle selection locally with modal
					setSelectedCaseForView(case_)
					setIsViewModalOpen(true)
				}
			},
			[onCaseSelect],
		)

		// Memoize the filtered and sorted cases to improve performance - OPTIMIZED
		const filteredAndSortedCases = useMemo(() => {
			if (!cases || !Array.isArray(cases)) {
				console.warn('Cases is not an array:', cases)
				return { filtered: [], hasActiveFilters: false, totalCases: 0 }
			}

			// Check if we have active filters or search terms
			const hasActiveFilters =
				statusFilter !== 'all' ||
				branchFilter !== 'all' ||
				showPdfReadyOnly ||
				selectedDoctors.length > 0 ||
				citologyPositiveFilter ||
				citologyNegativeFilter ||
				(searchTerm && searchTerm.trim() !== '') ||
				(onSearch && searchTerm && searchTerm.trim() !== '')

			// Process all cases for filtering (pagination will handle the limiting)
			const casesToProcess = cases

			// Apply client-side filtering only for local filters
			// (searchTerm is handled by the parent component via onSearch)
			const filtered = casesToProcess.filter((case_: UnifiedMedicalRecord) => {
				// Skip if case_ is null or undefined
				if (!case_) return false

				// Doctor filter
				const matchesDoctor =
					selectedDoctors.length === 0 ||
					(case_.treating_doctor && selectedDoctors.includes(case_.treating_doctor.trim()))

				// Status filter - use calculated payment status instead of database field
				let matchesStatus = true
				if (statusFilter !== 'all') {
					const { paymentStatus } = calculateCasePaymentStatus(case_)
					const paymentStatusNormalized = paymentStatus.toLowerCase()
					if (statusFilter === 'Pagado') {
						matchesStatus = paymentStatusNormalized === 'pagado'
					} else if (statusFilter === 'Incompleto') {
						// "Incompleto" incluye todos los estados distintos de pagado (incluyendo "Parcial")
						matchesStatus = paymentStatusNormalized !== 'pagado'
					}
				}

				// Branch filter
				const normalize = (str: string | null | undefined) => (str ? str.trim().toLowerCase() : '')
				const matchesBranch = branchFilter === 'all' || normalize(case_.branch) === normalize(branchFilter)

				// Exam type filter
				const matchesExamType = true // No exam type filter active

				// PDF ready filter
				let matchesPdfReady = true
				if (showPdfReadyOnly) {
					// Usar la columna pdf_en_ready de Supabase
					// Manejar tanto boolean como string
					const pdfReadyValue = case_.pdf_en_ready
					if (pdfReadyValue === true) {
						matchesPdfReady = true
					} else if (typeof pdfReadyValue === 'string') {
						matchesPdfReady = pdfReadyValue === 'true' || pdfReadyValue === 'TRUE'
					} else {
						matchesPdfReady = false
					}
				}

				// Date range filter (comparing only calendar dates robustly)
				let matchesDate = true
				if (dateRange?.from || dateRange?.to) {
					// Helper to format a Date object in local YYYY-MM-DD
					const formatLocalYmd = (date: Date) => {
						const year = date.getFullYear()
						const month = String(date.getMonth() + 1).padStart(2, '0')
						const day = String(date.getDate()).padStart(2, '0')
						return `${year}-${month}-${day}`
					}

					// Derive created date string in LOCAL calendar date.
					// - If DB gives a date-only (YYYY-MM-DD), use it as-is (no TZ shift).
					// - If DB gives timestamp (with time/zone), parse and convert to local date.
					let createdDateStr: string | null = null
					const rawCreatedAt = case_.created_at as unknown as string | null | undefined
					if (typeof rawCreatedAt === 'string') {
						if (/^\d{4}-\d{2}-\d{2}$/.test(rawCreatedAt.trim())) {
							// Pure date, keep as-is
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
						// Check if date is within range
						if (dateRange.from && dateRange.to) {
							// Both from and to dates selected - check if within range
							const fromStr = formatLocalYmd(dateRange.from)
							const toStr = formatLocalYmd(dateRange.to)
							matchesDate = createdDateStr >= fromStr && createdDateStr <= toStr
						} else if (dateRange.from) {
							// Only from date selected - check if date is >= from
							const fromStr = formatLocalYmd(dateRange.from)
							matchesDate = createdDateStr >= fromStr
						} else if (dateRange.to) {
							// Only to date selected - check if date is <= to
							const toStr = formatLocalYmd(dateRange.to)
							matchesDate = createdDateStr <= toStr
						}
					} else {
						matchesDate = false
					}
				}

				// Local search filter (only if onSearch is not provided)
				let matchesSearch = true
				if (!onSearch && searchTerm && searchTerm.trim()) {
					const searchLower = searchTerm.toLowerCase()
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
				if (citologyPositiveFilter || citologyNegativeFilter) {
					const citoEstatus = case_.cito_status
					if (citologyPositiveFilter && citologyNegativeFilter) {
						// Si ambos filtros están activos, mostrar todos los casos con cito_estatus
						matchesCitology = citoEstatus === 'positivo' || citoEstatus === 'negativo'
					} else if (citologyPositiveFilter) {
						matchesCitology = citoEstatus === 'positivo'
					} else if (citologyNegativeFilter) {
						matchesCitology = citoEstatus === 'negativo'
					}
				}

				return (
					matchesStatus &&
					matchesBranch &&
					matchesExamType &&
					matchesPdfReady &&
					matchesDate &&
					matchesSearch &&
					matchesDoctor &&
					matchesCitology
				)
			})

			// Apply sorting - optimized to avoid expensive Date operations when possible
			filtered.sort((a, b) => {
				let aValue: unknown = a[sortField]
				let bValue: unknown = b[sortField]

				// Handle null/undefined values
				if (aValue === null || aValue === undefined) aValue = ''
				if (bValue === null || bValue === undefined) bValue = ''

				// Optimize date sorting by using string comparison when possible
				if (sortField === 'created_at') {
					// Use string comparison for ISO dates (they sort correctly)
					aValue = aValue || '0000-00-00'
					bValue = bValue || '0000-00-00'
				} else if (typeof aValue === 'string' && typeof bValue === 'string') {
					aValue = aValue.toLowerCase()
					bValue = bValue.toLowerCase()
				}

				if (sortDirection === 'asc') {
					return (aValue as string | number) > (bValue as string | number) ? 1 : -1
				} else {
					return (aValue as string | number) < (bValue as string | number) ? 1 : -1
				}
			})

			return { filtered, hasActiveFilters, totalCases: cases.length }
		}, [
			cases,
			statusFilter,
			branchFilter,
			sortField,
			sortDirection,
			showPdfReadyOnly,
			searchTerm,
			onSearch,
			selectedDoctors,
			dateRange,
			citologyPositiveFilter,
			citologyNegativeFilter,
		])

		// Paginación
		const totalPages = Math.ceil(filteredAndSortedCases.filtered.length / itemsPerPage)
		const startIndex = (currentPage - 1) * itemsPerPage
		const endIndex = startIndex + itemsPerPage
		const paginatedCases = filteredAndSortedCases.filtered.slice(startIndex, endIndex)

		// Funciones de paginación
		const goToPage = useCallback(
			(page: number) => {
				setCurrentPage(Math.max(1, Math.min(page, totalPages)))
			},
			[totalPages],
		)

		const goToNextPage = useCallback(() => {
			if (currentPage < totalPages) {
				setCurrentPage(currentPage + 1)
			}
		}, [currentPage, totalPages])

		const goToPreviousPage = useCallback(() => {
			if (currentPage > 1) {
				setCurrentPage(currentPage - 1)
			}
		}, [currentPage])

		const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
			setItemsPerPage(newItemsPerPage)
			setCurrentPage(1) // Reset to first page when changing items per page
		}, [])

		const SortIcon = useCallback(
			({ field }: { field: SortField }) => {
				if (sortField !== field) {
					return <ChevronUp className="w-4 h-4 text-gray-400" />
				}
				return sortDirection === 'asc' ? (
					<ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
				) : (
					<ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
				)
			},
			[sortField, sortDirection],
		)

		// Render loading state
		if (isLoading) {
			return (
				<div className="bg-white dark:bg-background rounded-xl h-full">
					<div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
						<div className="flex items-center justify-center py-12">
							<div className="flex items-center gap-3">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
								<span className="text-lg text-gray-700 dark:text-gray-300">Cargando casos...</span>
							</div>
						</div>
					</div>
				</div>
			)
		}

		// Render error state
		if (error) {
			return (
				<div className="bg-white dark:bg-background rounded-xl h-full">
					<div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
						<div className="text-center py-12">
							<div className="text-red-500 dark:text-red-400">
								<p className="text-lg font-medium">Error al cargar los casos</p>
								<p className="text-sm mt-2">Verifica tu conexión a internet o contacta al administrador</p>
								<button
									onClick={() => refetch()}
									className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
								>
									Reintentar
								</button>
							</div>
						</div>
					</div>
				</div>
			)
		}

		// Fullscreen view
		if (isFullscreen) {
			return (
				<>
					<div className="fixed inset-0 z-[999999] bg-white dark:bg-background h-screen flex flex-col overflow-hidden">
						{/* Fixed Header with Controls */}
						<div className="flex-shrink-0 p-3 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-background">
							<div className="flex flex-wrap items-center gap-2 sm:gap-4">
								{/* Search and Filters Row */}
								<div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-1">
									{/* Search - Acortada */}
									<div className="w-full sm:max-w-md relative flex-1">
										<Input
											type="text"
											placeholder="Buscar por nombre, código, cédula, estudio o médico..."
											value={searchTerm}
											onChange={handleSearchChange}
											onKeyDown={handleSearchKeyDown}
										/>
										{isSearching && (
											<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
											</div>
										)}
									</div>

									{/* Unified Filters Modal */}
									<FiltersModal
										isOpen={isFiltersModalOpen}
										onOpenChange={setIsFiltersModalOpen}
										statusFilter={tempStatusFilter}
										onStatusFilterChange={handleTempStatusFilterChange}
										branchFilter={tempBranchFilter}
										onBranchFilterChange={handleTempBranchFilterChange}
										dateRange={tempDateRange}
										onDateRangeChange={handleTempDateRangeChange}
										showPdfReadyOnly={tempShowPdfReadyOnly}
										onPdfFilterToggle={handleTempPdfFilterToggle}
										selectedDoctors={tempSelectedDoctors}
										onDoctorFilterChange={handleTempDoctorFilterChange}
										citologyPositiveFilter={tempCitologyPositiveFilter}
										onCitologyPositiveFilterToggle={handleTempCitologyPositiveFilterToggle}
										citologyNegativeFilter={tempCitologyNegativeFilter}
										onCitologyNegativeFilterToggle={handleTempCitologyNegativeFilterToggle}
										statusOptions={statusOptions}
										branchOptions={branchOptions}
										cases={cases}
										onApplyFilters={handleApplyFilters}
										onClearAllFilters={handleClearAllFilters}
									/>
								</div>

								{/* Results count */}
								<div className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block"></div>

								{/* Close button */}
								<button
									onClick={() => setIsFullscreen(false)}
									className="text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm border px-2 sm:px-3 py-1 rounded-md ml-auto sm:ml-0 transition-all duration-200 mr-8"
								>
									<span className="hidden sm:inline">Cerrar</span> ✕
								</button>
							</div>
						</div>

						{/* Scrollable Content Area */}
						<div className="flex-1 overflow-hidden">
							{/* Mobile View - Cards */}
							<div className="block lg:hidden h-full overflow-y-auto px-3 py-4">
								<div className="p-2 sm:p-4 space-y-3 max-h-[45vh] overflow-y-auto">
									{paginatedCases.length > 0 ? (
										paginatedCases.map((case_) => (
											<CaseCard
												key={case_.id}
												case_={case_}
												onView={handleCaseSelect}
												onGenerate={handleGenerateEmployeeCase}
												onReactions={handleGenerateCase}
												canRequest={canRequest}
											/>
										))
									) : (
										<div className="text-center py-12">
											<div className="text-gray-500 dark:text-gray-400">
												<Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
												<p className="text-lg font-medium">No se encontraron casos</p>
												<p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Desktop View - Table with virtualization */}
							<div className="hidden lg:block h-full overflow-y-auto">
								<table className="w-full responsive-table">
									<thead className="bg-gray-50/50 dark:bg-background/50 backdrop-blur-[10px] sticky top-0 z-[1000]">
										<tr>
											<th className="px-4 py-3 text-left">
												<button
													onClick={() => handleSort('code')}
													className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
												>
													Código / Estatus
													<SortIcon field="code" />
												</button>
											</th>
											<th className="px-4 py-3 text-left">
												<button
													onClick={() => handleSort('created_at')}
													className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
												>
													Fecha de Registro
													<SortIcon field="created_at" />
												</button>
											</th>
											<th className="px-4 py-3 text-left">
												<button
													onClick={() => handleSort('nombre')}
													className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
												>
													Paciente
													<SortIcon field="nombre" />
												</button>
											</th>
											<th className="px-3 py-3 text-center">
												<span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Sede
												</span>
											</th>
											<th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
												Estudio
											</th>
											<th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
												Médico Tratante
											</th>
											<th className="px-4 py-3 text-left">
												<button
													onClick={() => handleSort('total_amount')}
													className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
												>
													Monto Total
													<SortIcon field="total_amount" />
												</button>
											</th>
											<th className="px-4 py-3 text-center">
												<span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Opciones
												</span>
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
										{paginatedCases.length > 0 ? (
											// Render paginated cases
											paginatedCases.map((case_) => {
												const ageDisplay = case_.edad || ''

												return (
													<tr key={case_.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
														<td className="px-4 py-4">
															<div className="flex flex-col items-start space-y-1 text-left">
																{case_.code && (
																	<div className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 mb-1">
																		{case_.code}
																	</div>
																)}
																{(() => {
																	const { paymentStatus } = calculateCasePaymentStatus(case_)
																	return (
																		<span
																			className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
																				paymentStatus,
																			)}`}
																		>
																			{paymentStatus}
																		</span>
																	)
																})()}
															</div>
														</td>
														<td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 text-left">
															{case_.created_at ? new Date(case_.created_at).toLocaleDateString('es-ES') : 'N/A'}
														</td>
														<td className="px-4 py-4">
															<div className="text-left">
																<div className="text-sm font-medium text-gray-900 dark:text-gray-100">
																	{case_.nombre}
																</div>
																<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
																	<span>{case_.cedula}</span>
																	{ageDisplay && (
																		<>
																			<span>•</span>
																			<span>{ageDisplay}</span>
																		</>
																	)}
																</div>
															</div>
														</td>
														<td className="text-sm text-gray-900 dark:text-gray-100">
															<BranchBadge branch={case_.branch} />
														</td>
														<td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 text-center">
															{case_.exam_type}
														</td>
														<td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
															{case_.treating_doctor}
														</td>
														<td className="px-4 py-4">
															<div className="text-sm font-medium text-gray-900 dark:text-gray-100">
																${case_.total_amount.toLocaleString()}
															</div>
															{(() => {
																const { missingAmount } = calculateCasePaymentStatus(case_)
																return (
																	missingAmount > 0 && (
																		<div className="text-xs text-red-600 dark:text-red-400">
																			Faltante: ${missingAmount.toFixed(2)}
																		</div>
																	)
																)
															})()}
														</td>
														<td className="px-4 py-4">
															<div className="flex justify-center mx-5">
																<CaseActionsPopover
																	case_={case_}
																	onView={handleCaseSelect}
																	onGenerate={handleGenerateEmployeeCase}
																	onReactions={handleGenerateCase}
																	canRequest={canRequest}
																/>
															</div>
														</td>
													</tr>
												)
											})
										) : (
											<tr>
												<td colSpan={8}>
													<div className="text-center py-12">
														<div className="text-gray-500 dark:text-gray-400">
															<Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
															<p className="text-lg font-medium">No se encontraron casos</p>
															<p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
														</div>
													</div>
												</td>
											</tr>
										)}
									</tbody>
								</table>

								{/* Paginación en vista fullscreen */}
								<Pagination
									currentPage={currentPage}
									totalPages={totalPages}
									itemsPerPage={itemsPerPage}
									pageSizeOptions={pageSizeOptions}
									onItemsPerPageChange={handleItemsPerPageChange}
									onGoToPage={goToPage}
									onNext={goToNextPage}
									onPrev={goToPreviousPage}
								/>
							</div>
						</div>
					</div>

					{/* Modals for fullscreen mode */}
					<UnifiedCaseModal
						case_={selectedCaseForView}
						isOpen={isViewModalOpen}
						onClose={() => {
							setIsViewModalOpen(false)
							setSelectedCaseForView(null)
						}}
						onSave={() => {
							// Refetch the data to update the cases list
							refetch()

							// Mark that we should update the selected case when data changes
							setShouldUpdateSelectedCase(true)
						}}
						onDelete={() => {
							setIsViewModalOpen(false)
							setSelectedCaseForView(null)
							refetch()
						}}
						onCaseSelect={handleCaseSelect}
						isFullscreen={isFullscreen}
					/>

					{/* Generate Case Modal - Solo para admin y solo para inmunohistoquímica */}
					{(profile?.role === 'admin' || profile?.role === 'owner') &&
						selectedCaseForGenerate?.exam_type?.toLowerCase().includes('inmuno') && (
							<RequestCaseModal
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								case_={selectedCaseForGenerate as any}
								isOpen={isGenerateModalOpen}
								onClose={() => {
									setIsGenerateModalOpen(false)
									setSelectedCaseForGenerate(null)
								}}
								onSuccess={() => {
									refetch()
								}}
							/>
						)}

					{/* Steps Case Modal - Para todos los roles */}
					{selectedCaseForGenerate && (
						<HorizontalLinearStepper
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							case_={selectedCaseForGenerate as any}
							isOpen={isStepsModalOpen}
							onClose={() => {
								setIsStepsModalOpen(false)
								setSelectedCaseForGenerate(null)
							}}
							onSuccess={() => {
								refetch()
							}}
							isFullscreen={isFullscreen}
						/>
					)}
				</>
			)
		}

		return (
			<>
				<div className="bg-white dark:bg-background rounded-xl h-full overflow-hidden border border-gray-200 dark:border-gray-700">
					{/* Search and Filter Controls */}
					<div className="p-3 sm:p-6 border-b border-gray-200 dark:border-gray-700">
						<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
							{/* Search and Filters Row */}
							<div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full">
								{/* Search - Acortada */}
								<div className="flex-1 min-w-[200px] relative">
									<Input
										type="text"
										placeholder="Buscar por nombre, código, cédula, estudio o médico..."
										value={searchTerm}
										onChange={handleSearchChange}
										onKeyDown={handleSearchKeyDown}
									/>
									{isSearching && (
										<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
										</div>
									)}
								</div>

								{/* Unified Filters Modal */}
								<FiltersModal
									isOpen={isFiltersModalOpen}
									onOpenChange={setIsFiltersModalOpen}
									statusFilter={tempStatusFilter}
									onStatusFilterChange={handleTempStatusFilterChange}
									branchFilter={tempBranchFilter}
									onBranchFilterChange={handleTempBranchFilterChange}
									dateRange={tempDateRange}
									onDateRangeChange={handleTempDateRangeChange}
									showPdfReadyOnly={tempShowPdfReadyOnly}
									onPdfFilterToggle={handleTempPdfFilterToggle}
									selectedDoctors={tempSelectedDoctors}
									onDoctorFilterChange={handleTempDoctorFilterChange}
									citologyPositiveFilter={tempCitologyPositiveFilter}
									onCitologyPositiveFilterToggle={handleTempCitologyPositiveFilterToggle}
									citologyNegativeFilter={tempCitologyNegativeFilter}
									onCitologyNegativeFilterToggle={handleTempCitologyNegativeFilterToggle}
									statusOptions={statusOptions}
									branchOptions={branchOptions}
									cases={cases}
									onApplyFilters={handleApplyFilters}
									onClearAllFilters={handleClearAllFilters}
								/>

								{/* Results count */}
								<div className="text-sm text-gray-600 dark:text-gray-400 hidden sm:flex"></div>

								{/* Fullscreen Button */}
								<button
									onClick={() => setIsFullscreen(true)}
									className="hidden lg:flex items-center gap-2 px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary dark:bg-background dark:text-white text-sm hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-primary hover:shadow-sm transition-transform duration-200 flex-shrink-0 whitespace-nowrap"
								>
									<Maximize2 className="w-4 h-4" />
									Expandir
								</button>
							</div>
						</div>
					</div>

					{/* Mobile View - Cards */}
					<div className="block lg:hidden overflow-hidden">
						<div className="p-4 space-y-4 max-h-[45vh] overflow-y-auto">
							{paginatedCases.length > 0 ? (
								paginatedCases.map((case_) => (
									<CaseCard
										key={case_.id}
										case_={case_}
										onView={handleCaseSelect}
										onGenerate={handleGenerateEmployeeCase}
										onReactions={handleGenerateCase}
										canRequest={canRequest}
									/>
								))
							) : (
								<div className="text-center py-12">
									<div className="text-gray-500 dark:text-gray-400">
										<Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
										<p className="text-lg font-medium">No se encontraron casos</p>
										<p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Desktop View - Table */}
					<div className="hidden lg:block">
						<div className="overflow-x-auto responsive-table">
							<div className="max-h-[45vh] overflow-y-auto">
								<table className="w-full min-w-[800px]">
									<thead className="bg-gray-50/50 dark:bg-background/50 backdrop-blur-[10px] sticky top-0 z-[1000]">
										<tr>
											<th className="px-4 py-3 text-left">
												<button
													onClick={() => handleSort('code')}
													className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
												>
													Código / Estatus
													<SortIcon field="code" />
												</button>
											</th>
											<th className="px-4 py-3 text-left">
												<button
													onClick={() => handleSort('created_at')}
													className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
												>
													Fecha de Registro
													<SortIcon field="created_at" />
												</button>
											</th>
											<th className="px-4 py-3 text-left">
												<button
													onClick={() => handleSort('nombre')}
													className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
												>
													Paciente
													<SortIcon field="nombre" />
												</button>
											</th>
											<th className="px-3 py-3 text-center">
												<span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Sede
												</span>
											</th>
											<th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
												Estudio
											</th>
											<th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
												Médico Tratante
											</th>
											<th className="px-4 py-3 text-left">
												<button
													onClick={() => handleSort('total_amount')}
													className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
												>
													Monto Total
													<SortIcon field="total_amount" />
												</button>
											</th>
											<th className="px-4 py-3 text-center">
												<span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Opciones
												</span>
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
										{paginatedCases.length > 0 ? (
											// Render paginated cases
											paginatedCases.map((case_) => {
												const ageDisplay = case_.edad || ''
												return (
													<tr key={case_.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
														<td className="px-4 py-4">
															<div className="flex flex-col items-start space-y-1 text-left">
																{case_.code && (
																	<div className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 mb-1">
																		{case_.code}
																	</div>
																)}
																{(() => {
																	const { paymentStatus } = calculateCasePaymentStatus(case_)
																	return (
																		<span
																			className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
																				paymentStatus,
																			)}`}
																		>
																			{paymentStatus}
																		</span>
																	)
																})()}
															</div>
														</td>
														<td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 text-left">
															{case_.created_at ? new Date(case_.created_at).toLocaleDateString('es-ES') : 'N/A'}
														</td>
														<td className="px-4 py-4">
															<div className="text-left">
																<div className="text-sm font-medium text-gray-900 dark:text-gray-100">
																	{case_.nombre}
																</div>
																<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
																	<span>{case_.cedula}</span>
																	{ageDisplay && (
																		<>
																			<span>•</span>
																			<span>{ageDisplay}</span>
																		</>
																	)}
																</div>
															</div>
														</td>
														<td className="text-sm text-gray-900 dark:text-gray-100">
															<BranchBadge branch={case_.branch} />
														</td>
														<td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 text-center">
															{case_.exam_type}
														</td>
														<td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
															{case_.treating_doctor}
														</td>
														<td className="px-4 py-4">
															<div className="text-sm font-medium text-gray-900 dark:text-gray-100">
																${case_.total_amount.toLocaleString()}
															</div>
															{(() => {
																const { missingAmount } = calculateCasePaymentStatus(case_)
																return (
																	missingAmount > 0 && (
																		<div className="text-xs text-red-600 dark:text-red-400">
																			Faltante: ${missingAmount.toFixed(2)}
																		</div>
																	)
																)
															})()}
														</td>
														<td className="px-4 py-4">
															<div className="flex justify-center mx-5">
																<CaseActionsPopover
																	case_={case_}
																	onView={handleCaseSelect}
																	onGenerate={handleGenerateEmployeeCase}
																	onReactions={handleGenerateCase}
																	canRequest={canRequest}
																/>
															</div>
														</td>
													</tr>
												)
											})
										) : (
											<tr>
												<td colSpan={8}>
													<div className="text-center py-12">
														<div className="text-gray-500 dark:text-gray-400">
															<Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
															<p className="text-lg font-medium">No se encontraron casos</p>
															<p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
														</div>
													</div>
												</td>
											</tr>
										)}
									</tbody>
								</table>

								{/* Paginación en vista normal */}
							</div>
							<Pagination
								currentPage={currentPage}
								totalPages={totalPages}
								itemsPerPage={itemsPerPage}
								pageSizeOptions={pageSizeOptions}
								onItemsPerPageChange={handleItemsPerPageChange}
								onGoToPage={goToPage}
								onNext={goToNextPage}
								onPrev={goToPreviousPage}
							/>
						</div>
					</div>
				</div>

				{/* Unified View/Edit Modal */}
				<UnifiedCaseModal
					case_={selectedCaseForView}
					isOpen={isViewModalOpen}
					onClose={() => {
						setIsViewModalOpen(false)
						setSelectedCaseForView(null)
					}}
					onSave={() => {
						// Refetch the data to update the cases list
						refetch()

						// Mark that we should update the selected case when data changes
						setShouldUpdateSelectedCase(true)
					}}
					onDelete={() => {
						setIsViewModalOpen(false)
						setSelectedCaseForView(null)
						refetch()
					}}
					onCaseSelect={handleCaseSelect}
					isFullscreen={isFullscreen}
				/>

				{/* Generate Case Modal - Solo para admin y solo para inmunohistoquímica */}
				{(profile?.role === 'admin' || profile?.role === 'owner') &&
					selectedCaseForGenerate?.exam_type?.toLowerCase().includes('inmuno') && (
						<RequestCaseModal
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							case_={selectedCaseForGenerate as any}
							isOpen={isGenerateModalOpen}
							onClose={() => {
								setIsGenerateModalOpen(false)
								setSelectedCaseForGenerate(null)
							}}
							onSuccess={() => {
								refetch()
							}}
						/>
					)}

				{/* Steps Case Modal - Para todos los roles */}
				{selectedCaseForGenerate && (
					<HorizontalLinearStepper
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						case_={selectedCaseForGenerate as any}
						isOpen={isStepsModalOpen}
						onClose={() => {
							setIsStepsModalOpen(false)
							setSelectedCaseForGenerate(null)
						}}
						onSuccess={() => {
							refetch()
						}}
						isFullscreen={isFullscreen}
					/>
				)}
			</>
		)
	},
)

CasesTable.displayName = 'CasesTable'

export default CasesTable
