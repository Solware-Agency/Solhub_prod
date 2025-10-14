import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronUp, ChevronDown, Search, Maximize2, Download } from 'lucide-react'
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service'
import type { DateRange } from 'react-day-picker'
import { Button } from '@shared/components/ui/button'

// Tipo unificado que incluye todos los campos necesarios para compatibilidad
type UnifiedMedicalRecord = MedicalCaseWithPatient
import { useToast } from '@shared/hooks/use-toast'
import { Input } from '@shared/components/ui/input'
import { useAuth } from '@app/providers/AuthContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useExportToExcel } from '@shared/hooks/useExportToExcel'
import { ExportConfirmationModal } from '@shared/components/ui/ExportConfirmationModal'
import RequestCaseModal from './RequestCaseModal'
import UnifiedCaseModal from './UnifiedCaseModal'
import HorizontalLinearStepper from './StepsCaseModal'
import CaseActionsPopover from './CaseActionsPopover'
import CaseCard from './CaseCard'
import Pagination from './Pagination'
import FiltersModal from './FiltersModal'
import ActiveFiltersDisplay from './ActiveFiltersDisplay'
import { getStatusColor } from './status'
import { BranchBadge } from '@shared/components/ui/branch-badge'
// import { calculatePaymentDetails } from '@features/form/lib/payment/payment-utils'
import { formatCurrency } from '@shared/utils/number-utils'

interface CasesTableProps {
	cases: UnifiedMedicalRecord[]
	isLoading: boolean
	error: unknown
	refetch: () => void
	isFullscreen: boolean
	setIsFullscreen: (value: boolean) => void
	onSearch?: (term: string) => void
	onCaseSelect?: (case_: UnifiedMedicalRecord) => void
	onFiltersChange?: (filters: {
		examType?: string
		documentStatus?: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado'
		pdfStatus?: 'pendientes' | 'faltantes'
		citoStatus?: 'positivo' | 'negativo'
		branch?: string
		paymentStatus?: 'Incompleto' | 'Pagado'
		doctorFilter?: string[]
		originFilter?: string[]
		dateFrom?: string
		dateTo?: string
	}) => void
	pagination?: {
		currentPage: number
		totalPages: number
		totalItems: number
		itemsPerPage: number
		onPageChange: (page: number) => void
		onItemsPerPageChange: (items: number) => void
	}
}

type SortField = 'id' | 'created_at' | 'nombre' | 'total_amount' | 'code'
type SortDirection = 'asc' | 'desc'

// Helper function to calculate correct payment status for a case
// const getCasePaymentStatus = (case_: UnifiedMedicalRecord) => {
// 	// Convert medical record payment fields to payments array format
// 	const payments = []

// 	for (let i = 1; i <= 4; i++) {
// 		const method = case_[`payment_method_${i}` as keyof UnifiedMedicalRecord] as string | null
// 		const amount = case_[`payment_amount_${i}` as keyof UnifiedMedicalRecord] as number | null

// 		if (method && amount && amount > 0) {
// 			payments.push({
// 				method,
// 				amount,
// 				reference: '', // Reference not needed for calculation
// 			})
// 		}
// 	}

// 	// Use the correct payment calculation logic
// 	const { paymentStatus, isPaymentComplete, missingAmount } = calculatePaymentDetails(
// 		payments,
// 		case_.total_amount,
// 		case_.exchange_rate || undefined,
// 	)

// 	return {
// 		paymentStatus: paymentStatus || 'Incompleto',
// 		isPaymentComplete,
// 		missingAmount: missingAmount || 0,
// 	}
// }

const getCasePaymentStatus = (case_: UnifiedMedicalRecord) => {
	return {
		paymentStatus: case_.payment_status || 'Incompleto',
		isPaymentComplete: case_.payment_status === 'Pagado',
		missingAmount: case_.remaining || 0,
	}
}

const CasesTable: React.FC<CasesTableProps> = React.memo(
	({
		cases,
		isLoading,
		error,
		refetch,
		isFullscreen,
		setIsFullscreen,
		onSearch,
		onCaseSelect,
		onFiltersChange,
		pagination,
	}) => {
		useAuth()
		const { profile } = useUserProfile()
		const { toast } = useToast()
		const { exportToExcel, isModalOpen, setIsModalOpen, pendingExport, handleConfirmExport, handleCancelExport } =
			useExportToExcel()
		const [searchTerm, setSearchTerm] = useState('')
		const [statusFilter, setStatusFilter] = useState<string>('all')
		const [branchFilter, setBranchFilter] = useState<string>('all')
		const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
		// Nuevos filtros reales
		const [pendingCasesFilter, setPendingCasesFilter] = useState<string>('all')
		const [pdfStatusFilter, setPdfStatusFilter] = useState<string>('all')
		const [examTypeFilter, setExamTypeFilter] = useState<string>('all')
		const [documentStatusFilter, setDocumentStatusFilter] = useState<string>('all')
		const [sortField, setSortField] = useState<SortField>('created_at')
		const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
		const [selectedCaseForGenerate, setSelectedCaseForGenerate] = useState<UnifiedMedicalRecord | null>(null)
		const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
		const [selectedCaseForView, setSelectedCaseForView] = useState<UnifiedMedicalRecord | null>(null)
		const [isViewModalOpen, setIsViewModalOpen] = useState(false)
		const [showPdfReadyOnly, setShowPdfReadyOnly] = useState(false)
		const [selectedDoctors, setSelectedDoctors] = useState<string[]>([])
		const [selectedOrigins, setSelectedOrigins] = useState<string[]>([])
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
		const [tempSelectedOrigins, setTempSelectedOrigins] = useState<string[]>([])
		const [tempCitologyPositiveFilter, setTempCitologyPositiveFilter] = useState(false)
		const [tempCitologyNegativeFilter, setTempCitologyNegativeFilter] = useState(false)
		// Nuevos filtros temporales
		const [tempPendingCasesFilter, setTempPendingCasesFilter] = useState<string>('all')
		const [tempPdfStatusFilter, setTempPdfStatusFilter] = useState<string>('all')
		const [tempExamTypeFilter, setTempExamTypeFilter] = useState<string>('all')
		const [tempDocumentStatusFilter, setTempDocumentStatusFilter] = useState<string>('all')

		// Paginación local (solo se usa si no hay paginación del servidor)
		const [localCurrentPage, setLocalCurrentPage] = useState(1)
		const [localItemsPerPage, setLocalItemsPerPage] = useState(20)

		// Usar paginación del servidor si está disponible, si no usar local
		const currentPage = pagination?.currentPage ?? localCurrentPage
		const itemsPerPage = pagination?.itemsPerPage ?? localItemsPerPage
		const setCurrentPage = pagination?.onPageChange ?? setLocalCurrentPage
		const setItemsPerPage = pagination?.onItemsPerPageChange ?? setLocalItemsPerPage

		// const isResidente = profile?.role === 'residente'
		// const isOwner = profile?.role === 'owner'
		// const isEmployee = profile?.role === 'employee'

		// Dropdown options
		const statusOptions = useMemo(
			() => [
				{ value: 'Pagado', label: 'Pagado' },
				{ value: 'Incompleto', label: 'Incompleto' },
			],
			[],
		)

		const branchOptions = useMemo(
			() => [
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
		// const canGenerate = profile?.role === 'owner' || profile?.role === 'residente'
		const canRequest = profile?.role === 'owner' || profile?.role === 'residente'

		const notShow = profile?.role === 'residente' || profile?.role === 'citotecno' || profile?.role === 'patologo'
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
			setSelectedOrigins([])
			setCitologyPositiveFilter(false)
			setCitologyNegativeFilter(false)
			setSearchTerm('')
			// Limpiar nuevos filtros reales
			setPendingCasesFilter('all')
			setPdfStatusFilter('all')
			setExamTypeFilter('all')
			setDocumentStatusFilter('all')
			// También limpiar los filtros temporales
			setTempStatusFilter('all')
			setTempBranchFilter('all')
			setTempDateRange(undefined)
			setTempShowPdfReadyOnly(false)
			setTempSelectedDoctors([])
			setTempSelectedOrigins([])
			setTempCitologyPositiveFilter(false)
			setTempCitologyNegativeFilter(false)
			// Limpiar nuevos filtros temporales
			setTempPendingCasesFilter('all')
			setTempPdfStatusFilter('all')
			setTempExamTypeFilter('all')
			setTempDocumentStatusFilter('all')

			// Si tenemos paginación del servidor, limpiar filtros del servidor también
			if (pagination && onFiltersChange) {
				onFiltersChange({})
			}
		}, [pagination, onFiltersChange])

		// Handle apply filters from modal
		const handleApplyFilters = useCallback(() => {
			setStatusFilter(tempStatusFilter)
			setBranchFilter(tempBranchFilter)
			setDateRange(tempDateRange)
			setShowPdfReadyOnly(tempShowPdfReadyOnly)
			setSelectedDoctors(tempSelectedDoctors)
			setSelectedOrigins(tempSelectedOrigins)
			setCitologyPositiveFilter(tempCitologyPositiveFilter)
			setCitologyNegativeFilter(tempCitologyNegativeFilter)
			// Aplicar nuevos filtros
			setPendingCasesFilter(tempPendingCasesFilter)
			setPdfStatusFilter(tempPdfStatusFilter)
			setExamTypeFilter(tempExamTypeFilter)
			setDocumentStatusFilter(tempDocumentStatusFilter)

			// Si tenemos paginación del servidor Y la función para cambiar filtros, enviarlos al servidor
			if (pagination && onFiltersChange) {
				const serverFilters: any = {}

				// Solo enviar filtros que no sean 'all'
				if (tempExamTypeFilter !== 'all') {
					serverFilters.examType = tempExamTypeFilter
				}
				if (tempDocumentStatusFilter !== 'all') {
					serverFilters.documentStatus = tempDocumentStatusFilter as 'faltante' | 'pendiente' | 'aprobado' | 'rechazado'
				}
				if (tempPdfStatusFilter !== 'all') {
					serverFilters.pdfStatus = tempPdfStatusFilter as 'pendientes' | 'faltantes'
				}
				if (tempBranchFilter !== 'all') {
					serverFilters.branch = tempBranchFilter
				}
				if (tempStatusFilter !== 'all') {
					serverFilters.paymentStatus = tempStatusFilter as 'Incompleto' | 'Pagado'
				}
				if (tempSelectedDoctors.length > 0) {
					serverFilters.doctorFilter = tempSelectedDoctors
				}
				if (tempSelectedOrigins.length > 0) {
					serverFilters.originFilter = tempSelectedOrigins
				}
				if (tempCitologyPositiveFilter) {
					serverFilters.citoStatus = 'positivo'
				} else if (tempCitologyNegativeFilter) {
					serverFilters.citoStatus = 'negativo'
				}
				if (tempDateRange?.from) {
					serverFilters.dateFrom = tempDateRange.from.toISOString()
				}
				if (tempDateRange?.to) {
					serverFilters.dateTo = tempDateRange.to.toISOString()
				}

				onFiltersChange(serverFilters)
			}
		}, [
			tempStatusFilter,
			tempBranchFilter,
			tempDateRange,
			tempShowPdfReadyOnly,
			tempSelectedDoctors,
			tempSelectedOrigins,
			tempCitologyPositiveFilter,
			tempCitologyNegativeFilter,
			tempPendingCasesFilter,
			tempPdfStatusFilter,
			tempExamTypeFilter,
			tempDocumentStatusFilter,
			pagination,
			onFiltersChange,
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

		const handleTempOriginFilterChange = useCallback((origins: string[]) => {
			setTempSelectedOrigins(origins)
		}, [])

		const handleTempCitologyPositiveFilterToggle = useCallback(() => {
			setTempCitologyPositiveFilter(!tempCitologyPositiveFilter)
		}, [tempCitologyPositiveFilter])

		const handleTempCitologyNegativeFilterToggle = useCallback(() => {
			setTempCitologyNegativeFilter(!tempCitologyNegativeFilter)
		}, [tempCitologyNegativeFilter])

		// Handlers para los nuevos filtros temporales
		const handleTempPendingCasesFilterChange = useCallback((value: string) => {
			setTempPendingCasesFilter(value)
		}, [])

		const handleTempPdfStatusFilterChange = useCallback((value: string) => {
			setTempPdfStatusFilter(value)
		}, [])

		const handleTempExamTypeFilterChange = useCallback((value: string) => {
			setTempExamTypeFilter(value)
		}, [])

		const handleTempDocumentStatusFilterChange = useCallback((value: string) => {
			setTempDocumentStatusFilter(value)
		}, [])

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

		// Función para manejar la exportación
		const handleExportToExcel = useCallback(() => {
			// Validar que cases esté disponible
			if (!cases || !Array.isArray(cases)) {
				toast({
					title: '❌ Error',
					description: 'No hay datos disponibles para exportar.',
					variant: 'destructive',
				})
				return
			}

			const currentFilters = {
				statusFilter,
				branchFilter,
				showPdfReadyOnly,
				selectedDoctors,
				citologyPositiveFilter,
				citologyNegativeFilter,
				searchTerm,
				dateRange,
			}

			exportToExcel(cases, currentFilters, () => {
				// Callback que se ejecuta después de confirmar
				console.log('Exportación confirmada')
			})
		}, [
			cases,
			statusFilter,
			branchFilter,
			showPdfReadyOnly,
			selectedDoctors,
			citologyPositiveFilter,
			citologyNegativeFilter,
			searchTerm,
			dateRange,
			exportToExcel,
			toast,
		])

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
				selectedOrigins.length > 0 ||
				citologyPositiveFilter ||
				citologyNegativeFilter ||
				pendingCasesFilter !== 'all' ||
				pdfStatusFilter !== 'all' ||
				examTypeFilter !== 'all' ||
				documentStatusFilter !== 'all' ||
				(searchTerm && searchTerm.trim() !== '') ||
				(onSearch && searchTerm && searchTerm.trim() !== '')

			// Si hay paginación del servidor, NO aplicar filtros localmente
			// El servidor ya aplicó los filtros
			if (pagination && onFiltersChange) {
				// Solo aplicar sorting a los casos que vienen del servidor
				const sorted = [...cases].sort((a, b) => {
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

				return {
					filtered: sorted,
					hasActiveFilters,
					totalCases: cases.length,
				}
			}

			// Modo fallback: aplicar filtros localmente (sin paginación del servidor)
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

				// Origin filter
				const matchesOrigin =
					selectedOrigins.length === 0 || (case_.origin && selectedOrigins.includes(case_.origin.trim()))

				// Status filter - use calculated payment status instead of database field
				let matchesStatus = true
				if (statusFilter !== 'all') {
					const { paymentStatus } = getCasePaymentStatus(case_)
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

				// Nuevos filtros
				// Pending Cases Filter
				let matchesPendingCases = true
				if (pendingCasesFilter !== 'all') {
					const { paymentStatus } = getCasePaymentStatus(case_)
					const paymentStatusNormalized = paymentStatus.toLowerCase()
					if (pendingCasesFilter === 'pagados') {
						matchesPendingCases = paymentStatusNormalized === 'pagado'
					} else if (pendingCasesFilter === 'incompletos') {
						matchesPendingCases = paymentStatusNormalized !== 'pagado'
					}
				}

				// PDF Status Filter
				let matchesPdfStatus = true
				if (pdfStatusFilter !== 'all') {
					const pdfReadyValue = case_.pdf_en_ready
					if (pdfStatusFilter === 'pendientes') {
						// PDF pendientes = pdf_en_ready es false
						if (typeof pdfReadyValue === 'string') {
							matchesPdfStatus = pdfReadyValue === 'FALSE'
						} else if (typeof pdfReadyValue === 'boolean') {
							matchesPdfStatus = pdfReadyValue === false
						} else {
							matchesPdfStatus = false
						}
					} else if (pdfStatusFilter === 'faltantes') {
						// PDF faltantes = pdf_en_ready es true
						if (typeof pdfReadyValue === 'string') {
							matchesPdfStatus = pdfReadyValue === 'TRUE'
						} else if (typeof pdfReadyValue === 'boolean') {
							matchesPdfStatus = pdfReadyValue === true
						} else {
							matchesPdfStatus = false
						}
					}
				}

				// Exam Type Filter
				let matchesExamTypeNew = true
				if (examTypeFilter !== 'all') {
					if (!case_.exam_type) {
						matchesExamTypeNew = false
					} else {
						// Normalizar ambos valores para comparación
						const dbType = case_.exam_type.toLowerCase().trim()
						const filterType = examTypeFilter.toLowerCase().trim()

						// Mapear tipos de la base de datos a valores del filtro
						let normalizedDbType = dbType
						if (dbType.includes('inmuno')) {
							normalizedDbType = 'inmunohistoquimica'
						} else if (dbType.includes('citolog')) {
							normalizedDbType = 'citologia'
						} else if (dbType.includes('biops')) {
							normalizedDbType = 'biopsia'
						}

						matchesExamTypeNew = normalizedDbType === filterType
					}
				}

				// Document Status Filter
				let matchesDocumentStatus = true
				if (documentStatusFilter !== 'all') {
					const raw = case_.doc_aprobado as string | undefined | null
					const status = (raw ? String(raw) : 'faltante').toLowerCase().trim()
					matchesDocumentStatus = status === documentStatusFilter
				}

				return (
					matchesStatus &&
					matchesBranch &&
					matchesExamType &&
					matchesPdfReady &&
					matchesDate &&
					matchesSearch &&
					matchesDoctor &&
					matchesOrigin &&
					matchesCitology &&
					matchesPendingCases &&
					matchesPdfStatus &&
					matchesExamTypeNew &&
					matchesDocumentStatus
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
			selectedOrigins,
			dateRange,
			citologyPositiveFilter,
			citologyNegativeFilter,
			pendingCasesFilter,
			pdfStatusFilter,
			examTypeFilter,
			documentStatusFilter,
			pagination,
			onFiltersChange,
		])

		// Paginación
		// Si hay paginación del servidor, usar esos valores. Si no, calcular localmente
		const totalPages = pagination?.totalPages ?? Math.ceil(filteredAndSortedCases.filtered.length / itemsPerPage)

		// Si hay paginación del servidor, no hacer slice (ya viene paginado del servidor)
		// Si no, hacer slice local
		const paginatedCases = pagination
			? filteredAndSortedCases.filtered
			: filteredAndSortedCases.filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

		// Funciones de paginación
		const goToPage = useCallback(
			(page: number) => {
				setCurrentPage(Math.max(1, Math.min(page, totalPages)))
			},
			[totalPages, setCurrentPage],
		)

		const goToNextPage = useCallback(() => {
			if (currentPage < totalPages) {
				setCurrentPage(currentPage + 1)
			}
		}, [currentPage, totalPages, setCurrentPage])

		const goToPreviousPage = useCallback(() => {
			if (currentPage > 1) {
				setCurrentPage(currentPage - 1)
			}
		}, [currentPage, setCurrentPage])

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
											placeholder="Buscar por nombre, código, cédula, estudio o médico"
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
										selectedOrigins={tempSelectedOrigins}
										onOriginFilterChange={handleTempOriginFilterChange}
										citologyPositiveFilter={tempCitologyPositiveFilter}
										onCitologyPositiveFilterToggle={handleTempCitologyPositiveFilterToggle}
										citologyNegativeFilter={tempCitologyNegativeFilter}
										onCitologyNegativeFilterToggle={handleTempCitologyNegativeFilterToggle}
										pendingCasesFilter={tempPendingCasesFilter}
										onPendingCasesFilterChange={handleTempPendingCasesFilterChange}
										pdfStatusFilter={tempPdfStatusFilter}
										onPdfStatusFilterChange={handleTempPdfStatusFilterChange}
										examTypeFilter={tempExamTypeFilter}
										onExamTypeFilterChange={handleTempExamTypeFilterChange}
										documentStatusFilter={tempDocumentStatusFilter}
										onDocumentStatusFilterChange={handleTempDocumentStatusFilterChange}
										statusOptions={statusOptions}
										branchOptions={branchOptions}
										cases={cases}
										onApplyFilters={handleApplyFilters}
										onClearAllFilters={handleClearAllFilters}
									/>
								</div>

								{/* Results count */}
								<div className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block"></div>

								{/* Export Button */}
								<Button
									variant="outline"
									className="flex items-center gap-2 cursor-pointer"
									title="Exportar"
									onClick={handleExportToExcel}
								>
									<Download className="w-4 h-4" />
									<span className="hidden sm:inline">Exportar</span>
								</Button>

								{/* Close button */}
								<Button
									variant="outline"
									onClick={() => setIsFullscreen(false)}
									className="text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm border px-2 sm:px-3 py-1 rounded-md ml-auto sm:ml-0 transition-all duration-200 mr-8"
								>
									<span className="hidden sm:inline">Cerrar</span> ✕
								</Button>
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
											{!notShow && (
												<th className="px-4 py-3 text-left">
													<button
														onClick={() => handleSort('total_amount')}
														className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
													>
														Monto Total
														<SortIcon field="total_amount" />
													</button>
												</th>
											)}
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
																	const { paymentStatus } = getCasePaymentStatus(case_)
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
														{!notShow && (
															<td className="px-4 py-4">
																<div className="text-sm font-medium text-gray-900 dark:text-gray-100">
																	{formatCurrency(case_.total_amount)}
																</div>
																{(() => {
																	const { missingAmount } = getCasePaymentStatus(case_)
																	return (
																		missingAmount > 0 && (
																			<div className="text-xs text-red-600 dark:text-red-400">
																				Faltante: {formatCurrency(missingAmount)}
																			</div>
																		)
																	)
																})()}
															</td>
														)}
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
					{(profile?.role === 'residente' || profile?.role === 'owner') &&
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
				<div className="px-3 sm:px-6 pb-4">
					<ActiveFiltersDisplay
						statusFilter={statusFilter}
						branchFilter={branchFilter}
						dateRange={dateRange}
						showPdfReadyOnly={showPdfReadyOnly}
						selectedDoctors={selectedDoctors}
						selectedOrigins={selectedOrigins}
						citologyPositiveFilter={citologyPositiveFilter}
						citologyNegativeFilter={citologyNegativeFilter}
						pendingCasesFilter={pendingCasesFilter}
						pdfStatusFilter={pdfStatusFilter}
						examTypeFilter={examTypeFilter}
						documentStatusFilter={documentStatusFilter}
					/>
				</div>
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
										placeholder="Buscar por nombre, código, cédula, estudio o médico"
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
									selectedOrigins={tempSelectedOrigins}
									onOriginFilterChange={handleTempOriginFilterChange}
									citologyPositiveFilter={tempCitologyPositiveFilter}
									onCitologyPositiveFilterToggle={handleTempCitologyPositiveFilterToggle}
									citologyNegativeFilter={tempCitologyNegativeFilter}
									onCitologyNegativeFilterToggle={handleTempCitologyNegativeFilterToggle}
									pendingCasesFilter={tempPendingCasesFilter}
									onPendingCasesFilterChange={handleTempPendingCasesFilterChange}
									pdfStatusFilter={tempPdfStatusFilter}
									onPdfStatusFilterChange={handleTempPdfStatusFilterChange}
									examTypeFilter={tempExamTypeFilter}
									onExamTypeFilterChange={handleTempExamTypeFilterChange}
									documentStatusFilter={tempDocumentStatusFilter}
									onDocumentStatusFilterChange={handleTempDocumentStatusFilterChange}
									statusOptions={statusOptions}
									branchOptions={branchOptions}
									cases={cases}
									onApplyFilters={handleApplyFilters}
									onClearAllFilters={handleClearAllFilters}
								/>

								<Button
									variant="outline"
									className="flex items-center gap-2 cursor-pointer"
									title="Exportar"
									onClick={handleExportToExcel}
								>
									<Download className="w-4 h-4" />
									Exportar
								</Button>

								{/* Fullscreen Button */}
								<Button
									onClick={() => setIsFullscreen(true)}
									variant="outline"
									className="flex items-center gap-2 cursor-pointer"
									title="Expandir"
								>
									<Maximize2 className="w-4 h-4" />
									Expandir
								</Button>
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
							<div className="max-h-[55vh] overflow-y-auto">
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
											{!notShow && (
												<th className="px-4 py-3 text-left">
													<button
														onClick={() => handleSort('total_amount')}
														className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 text-left"
													>
														Monto Total
														<SortIcon field="total_amount" />
													</button>
												</th>
											)}
											<th className="px-4 py-3 text-center">
												<span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Opciones
												</span>
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
										{}

										{paginatedCases.length > 0 ? (
											// Render paginated cases
											paginatedCases.map((case_) => {
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
																	const { paymentStatus } = getCasePaymentStatus(case_)
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
														{!notShow && (
															<td className="px-4 py-4">
																<div className="text-sm font-medium text-gray-900 dark:text-gray-100">
																	{formatCurrency(case_.total_amount)}
																</div>
																{(() => {
																	const { missingAmount } = getCasePaymentStatus(case_)
																	return (
																		missingAmount > 0 && (
																			<div className="text-xs text-red-600 dark:text-red-400">
																				{formatCurrency(missingAmount)}
																			</div>
																		)
																	)
																})()}
															</td>
														)}
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
										) : isLoading ? (
											<tr>
												<td colSpan={8}>
													<div className="flex items-center justify-center py-12">
														<div className="flex items-center gap-3">
															<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
															<span className="text-lg text-gray-700 dark:text-gray-300">Cargando casos...</span>
														</div>
													</div>
												</td>
											</tr>
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
				{(profile?.role === 'residente' || profile?.role === 'owner') &&
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

				{/* Export Confirmation Modal */}
				<ExportConfirmationModal
					isOpen={isModalOpen}
					onOpenChange={setIsModalOpen}
					onConfirm={handleConfirmExport}
					onCancel={handleCancelExport}
					casesCount={pendingExport?.cases.length || 0}
				/>
			</>
		)
	},
)

CasesTable.displayName = 'CasesTable'

export default CasesTable
