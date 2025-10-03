import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@shared/components/ui/dialog'
import { Button } from '@shared/components/ui/button'
import { CustomDropdown } from '@shared/components/ui/custom-dropdown'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/card'
import {
	Popover as DatePopover,
	PopoverContent as DatePopoverContent,
	PopoverTrigger as DatePopoverTrigger,
} from '@shared/components/ui/popover'
import { Calendar as CalendarComponent } from '@shared/components/ui/calendar'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Filter, Stethoscope, Calendar as CalendarIcon, X, Settings, CheckCircle, XCircle, MapPin } from 'lucide-react'
import DoctorFilterPanel from './DoctorFilterPanel'
import PatientOriginFilterPanel from './PatientOriginFilterPanel'
import type { MedicalCaseWithPatient } from '@lib/medical-cases-service'
import type { DateRange } from 'react-day-picker'

interface FiltersModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	// Filtros actuales
	statusFilter: string
	onStatusFilterChange: (value: string) => void
	branchFilter: string
	onBranchFilterChange: (value: string) => void
	dateRange: DateRange | undefined
	onDateRangeChange: (range: DateRange | undefined) => void
	showPdfReadyOnly: boolean
	onPdfFilterToggle: () => void
	selectedDoctors: string[]
	onDoctorFilterChange: (doctors: string[]) => void
	selectedOrigins?: string[]
	onOriginFilterChange?: (origins: string[]) => void
	// Filtros de citología
	citologyPositiveFilter: boolean
	onCitologyPositiveFilterToggle: () => void
	citologyNegativeFilter: boolean
	onCitologyNegativeFilterToggle: () => void
	// Nuevos filtros
	pendingCasesFilter: string
	onPendingCasesFilterChange: (value: string) => void
	pdfStatusFilter: string
	onPdfStatusFilterChange: (value: string) => void
	examTypeFilter: string
	onExamTypeFilterChange: (value: string) => void
	documentStatusFilter: string
	onDocumentStatusFilterChange: (value: string) => void
	// Opciones para los dropdowns
	statusOptions: Array<{ value: string; label: string }>
	branchOptions: Array<{ value: string; label: string }>
	// Datos para el filtro de doctores
	cases: MedicalCaseWithPatient[]
	// Callbacks
	onApplyFilters: () => void
	onClearAllFilters: () => void
}

const FiltersModal: React.FC<FiltersModalProps> = ({
	isOpen,
	onOpenChange,
	statusFilter,
	onStatusFilterChange,
	branchFilter,
	onBranchFilterChange,
	dateRange,
	onDateRangeChange,
	showPdfReadyOnly,
	onPdfFilterToggle,
	selectedDoctors,
	onDoctorFilterChange,
	selectedOrigins,
	onOriginFilterChange,
	citologyPositiveFilter,
	onCitologyPositiveFilterToggle,
	citologyNegativeFilter,
	onCitologyNegativeFilterToggle,
	pendingCasesFilter,
	onPendingCasesFilterChange,
	pdfStatusFilter,
	onPdfStatusFilterChange,
	examTypeFilter,
	onExamTypeFilterChange,
	documentStatusFilter,
	onDocumentStatusFilterChange,
	statusOptions,
	branchOptions,
	cases,
	onApplyFilters,
	onClearAllFilters,
}) => {
	const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)
	const [showDoctorFilter, setShowDoctorFilter] = useState(false)
	const [showOriginFilter, setShowOriginFilter] = useState(false)

	// Check if there are any active filters
	const hasActiveFilters =
		statusFilter !== 'all' ||
		branchFilter !== 'all' ||
		showPdfReadyOnly ||
		selectedDoctors.length > 0 ||
		(selectedOrigins && selectedOrigins.length > 0) ||
		dateRange?.from ||
		dateRange?.to ||
		citologyPositiveFilter ||
		citologyNegativeFilter ||
		pendingCasesFilter !== 'all' ||
		pdfStatusFilter !== 'all' ||
		examTypeFilter !== 'all' ||
		documentStatusFilter !== 'all'

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant={hasActiveFilters ? 'default' : 'outline'}
					className="flex items-center gap-2 cursor-pointer"
					title="Filtros avanzados"
				>
					<Filter className="w-4 h-4" />
					<span>Filtros</span>
					{hasActiveFilters && (
						<span className="bg-white dark:bg-gray-800 text-primary text-xs px-2 py-0.5 rounded-full">
							{[
								statusFilter !== 'all' ? 1 : 0,
								branchFilter !== 'all' ? 1 : 0,
								showPdfReadyOnly ? 1 : 0,
								selectedDoctors.length,
								selectedOrigins ? selectedOrigins.length : 0,
								dateRange?.from || dateRange?.to ? 1 : 0,
								citologyPositiveFilter ? 1 : 0,
								citologyNegativeFilter ? 1 : 0,
								pendingCasesFilter !== 'all' ? 1 : 0,
								pdfStatusFilter !== 'all' ? 1 : 0,
								examTypeFilter !== 'all' ? 1 : 0,
								documentStatusFilter !== 'all' ? 1 : 0,
							].reduce((a, b) => a + b, 0)}
						</span>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent
				className="max-w-4xl max-h-[90vh] overflow-y-auto"
				style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(5px)' }}
			>
				<Tabs defaultValue="general" className="w-full">
					<TabsList className="grid w-full grid-cols-2 gap-4 mt-4">
						<TabsTrigger value="general" className="flex items-center gap-2 cursor-pointer">
							<Filter className="w-4 h-4" />
							Filtros Generales
						</TabsTrigger>
						<TabsTrigger value="role-specific" className="flex items-center gap-2 cursor-pointer">
							<Settings className="w-4 h-4" />
							Filtros por Rol
						</TabsTrigger>
					</TabsList>

					<TabsContent value="general" className="space-y-6 mt-6">
						{/* Status and Branch Filters */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-3">
								<CustomDropdown
									options={statusOptions}
									value={statusFilter}
									placeholder="Estado de Pago"
									onChange={onStatusFilterChange}
									data-testid="status-filter"
								/>
							</div>

							<div className="space-y-3">
								<CustomDropdown
									options={branchOptions}
									value={branchFilter}
									placeholder="Seleccionar sede"
									onChange={onBranchFilterChange}
									data-testid="branch-filter"
								/>
							</div>
						</div>

						{/* New Filters Row 1: Pending Cases and PDF Status */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

							<div className="space-y-3 col-span-2">
								<CustomDropdown
									options={[
										{ value: 'pendientes', label: 'PDF Pendientes' },
										{ value: 'faltantes', label: 'PDF Faltantes' },
									]}
									value={pdfStatusFilter}
									placeholder="Estado de PDF"
									onChange={onPdfStatusFilterChange}
									data-testid="pdf-status-filter"
								/>
							</div>
						</div>

						{/* New Filters Row 2: Exam Type and Document Status */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-3">
								<CustomDropdown
									options={[
										{ value: 'biopsia', label: 'Biopsia' },
										{ value: 'citologia', label: 'Citología' },
										{ value: 'inmunohistoquimica', label: 'Inmunohistoquímica' },
									]}
									value={examTypeFilter}
									placeholder="Tipo de Examen"
									onChange={onExamTypeFilterChange}
									data-testid="exam-type-filter"
								/>
							</div>

							<div className="space-y-3">
								<CustomDropdown
									options={[
										{ value: 'faltante', label: 'Faltante' },
										{ value: 'pendiente', label: 'Pendiente' },
										{ value: 'aprobado', label: 'Aprobado' },
										{ value: 'rechazado', label: 'Rechazado' },
									]}
									value={documentStatusFilter}
									placeholder="Estatus de Documento"
									onChange={onDocumentStatusFilterChange}
									data-testid="document-status-filter"
								/>
							</div>
						</div>

						{/* Doctor and Origin Filters - Same line */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Doctor Filter */}
							<div className="space-y-3">
								<Button
									onClick={() => setShowDoctorFilter(!showDoctorFilter)}
									variant={showDoctorFilter ? 'default' : 'outline'}
									className="w-full justify-start"
								>
									<Stethoscope className="w-4 h-4 mr-2" />
									Filtrar por Médico
								</Button>

								{showDoctorFilter && <DoctorFilterPanel cases={cases} onFilterChange={onDoctorFilterChange} />}
							</div>

							{/* Origin Filter */}
							<div className="space-y-3">
								<Button
									onClick={() => setShowOriginFilter(!showOriginFilter)}
									variant={showOriginFilter ? 'default' : 'outline'}
									className="w-full justify-start"
									disabled={!onOriginFilterChange}
								>
									<MapPin className="w-4 h-4 mr-2" />
									Filtrar por Procedencia
								</Button>

								{showOriginFilter && onOriginFilterChange && (
									<PatientOriginFilterPanel cases={cases} onFilterChange={onOriginFilterChange} />
								)}
							</div>
						</div>

						{/* Date Range Filter */}
						<div className="space-y-3">
							<h3 className="text-lg font-medium flex items-center gap-2">
								<CalendarIcon className="w-4 h-4" />
								Rango de Fechas
							</h3>
							<div className="flex items-center gap-2">
								<DatePopover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
									<DatePopoverTrigger asChild>
										<Button variant="outline" className="flex items-center gap-2">
											<CalendarIcon className="w-4 h-4" />
											{dateRange?.from && dateRange?.to
												? `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(
														dateRange.to,
														'dd/MM/yyyy',
														{ locale: es },
												  )}`
												: dateRange?.from
												? `Desde ${format(dateRange.from, 'dd/MM/yyyy', { locale: es })}`
												: 'Seleccionar rango de fechas'}
										</Button>
									</DatePopoverTrigger>
									<DatePopoverContent className="w-auto p-0">
										<CalendarComponent
											mode="range"
											selected={dateRange}
											onSelect={(range) => {
												onDateRangeChange(range)
												if (range?.from && range?.to) {
													setIsDateRangeOpen(false)
												}
											}}
											initialFocus
											locale={es}
											toDate={new Date()}
											disabled={{ after: new Date() }}
											numberOfMonths={1}
										/>
									</DatePopoverContent>
								</DatePopover>
							</div>
						</div>

						{/* Active Filters Summary */}
						{hasActiveFilters && (
							<div className="space-y-3">
								<h3 className="text-lg font-medium">Filtros Activos</h3>
								<div className="flex flex-wrap gap-2">
									{statusFilter !== 'all' && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full">
											Estado: {statusFilter}
											<button
												onClick={() => onStatusFilterChange('all')}
												className="ml-1 hover:text-blue-600 dark:hover:text-blue-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{branchFilter !== 'all' && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full">
											Sede: {branchFilter}
											<button
												onClick={() => onBranchFilterChange('all')}
												className="ml-1 hover:text-green-600 dark:hover:text-green-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{(dateRange?.from || dateRange?.to) && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded-full">
											Rango:{' '}
											{dateRange?.from && dateRange?.to
												? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
												: dateRange?.from
												? `Desde ${format(dateRange.from, 'dd/MM/yyyy')}`
												: `Hasta ${format(dateRange.to!, 'dd/MM/yyyy')}`}
											<button
												onClick={() => onDateRangeChange(undefined)}
												className="ml-1 hover:text-purple-600 dark:hover:text-purple-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{selectedOrigins && selectedOrigins.length > 0 && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm rounded-full">
											Procedencia: {selectedOrigins.length} seleccionada{selectedOrigins.length > 1 ? 's' : ''}
											<button
												onClick={() => onOriginFilterChange && onOriginFilterChange([])}
												className="ml-1 hover:text-indigo-600 dark:hover:text-indigo-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{showPdfReadyOnly && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-sm rounded-full">
											PDF Disponibles
											<button
												onClick={onPdfFilterToggle}
												className="ml-1 hover:text-orange-600 dark:hover:text-orange-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{citologyPositiveFilter && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full">
											Citología Positiva
											<button
												onClick={onCitologyPositiveFilterToggle}
												className="ml-1 hover:text-green-600 dark:hover:text-green-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{citologyNegativeFilter && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-full">
											Citología Negativa
											<button
												onClick={onCitologyNegativeFilterToggle}
												className="ml-1 hover:text-red-600 dark:hover:text-red-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{pendingCasesFilter !== 'all' && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm rounded-full">
											Casos: {pendingCasesFilter === 'pagados' ? 'Pagados' : 'Incompletos'}
											<button
												onClick={() => onPendingCasesFilterChange('all')}
												className="ml-1 hover:text-amber-600 dark:hover:text-amber-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{pdfStatusFilter !== 'all' && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm rounded-full">
											PDF: {pdfStatusFilter === 'pendientes' ? 'Pendientes' : 'Faltantes'}
											<button
												onClick={() => onPdfStatusFilterChange('all')}
												className="ml-1 hover:text-emerald-600 dark:hover:text-emerald-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{examTypeFilter !== 'all' && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm rounded-full">
											Tipo:{' '}
											{examTypeFilter === 'biopsia'
												? 'Biopsia'
												: examTypeFilter === 'citologia'
												? 'Citología'
												: 'Inmunohistoquímica'}
											<button
												onClick={() => onExamTypeFilterChange('all')}
												className="ml-1 hover:text-indigo-600 dark:hover:text-indigo-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}

									{documentStatusFilter !== 'all' && (
										<span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 text-sm rounded-full">
											Doc:{' '}
											{documentStatusFilter === 'faltante'
												? 'Faltante'
												: documentStatusFilter === 'pendiente'
												? 'Pendiente'
												: documentStatusFilter === 'aprobado'
												? 'Aprobado'
												: 'Rechazado'}
											<button
												onClick={() => onDocumentStatusFilterChange('all')}
												className="ml-1 hover:text-cyan-600 dark:hover:text-cyan-200"
											>
												<X className="w-3 h-3" />
											</button>
										</span>
									)}
								</div>
							</div>
						)}
					</TabsContent>

					<TabsContent value="role-specific" className="space-y-6 mt-6">
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Filtro Citología Positiva */}
								<Card
									className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
										citologyPositiveFilter
											? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20'
											: 'hover:ring-1 hover:ring-green-300'
									}`}
									onClick={() => {
										if (!citologyPositiveFilter) {
											onCitologyPositiveFilterToggle()
											// Si el filtro negativo está activo, desactivarlo
											if (citologyNegativeFilter) {
												onCitologyNegativeFilterToggle()
											}
										}
									}}
								>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-lg">
											<CheckCircle
												className={`w-5 h-5 ${citologyPositiveFilter ? 'text-green-600' : 'text-gray-400'}`}
											/>
											Citología Positiva
										</CardTitle>
										<CardDescription>Filtra casos con resultado positivo en citología</CardDescription>
									</CardHeader>
									<CardContent className="pt-0">
										<div className="flex items-center justify-between">
											<span className="text-sm text-muted-foreground">
												{citologyPositiveFilter ? 'Filtro activo' : 'Hacer clic para activar'}
											</span>
											{citologyPositiveFilter && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
										</div>
									</CardContent>
								</Card>

								{/* Filtro Citología Negativa */}
								<Card
									className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
										citologyNegativeFilter
											? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20'
											: 'hover:ring-1 hover:ring-red-300'
									}`}
									onClick={() => {
										if (!citologyNegativeFilter) {
											onCitologyNegativeFilterToggle()
											// Si el filtro positivo está activo, desactivarlo
											if (citologyPositiveFilter) {
												onCitologyPositiveFilterToggle()
											}
										}
									}}
								>
									<CardHeader className="pb-3">
										<CardTitle className="flex items-center gap-2 text-lg">
											<XCircle className={`w-5 h-5 ${citologyNegativeFilter ? 'text-red-600' : 'text-gray-400'}`} />
											Citología Negativa
										</CardTitle>
										<CardDescription>Filtra casos con resultado negativo en citología</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="flex items-center justify-between">
											<span className="text-sm text-muted-foreground">
												{citologyNegativeFilter ? 'Filtro activo' : 'Hacer clic para activar'}
											</span>
											{citologyNegativeFilter && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
										</div>
									</CardContent>
								</Card>
							</div>
						</div>
					</TabsContent>

					{/* Action Buttons */}
					<div className="flex justify-between pt-4 border-t mt-6">
						<Button onClick={onClearAllFilters} variant="outline" disabled={!hasActiveFilters}>
							<X className="w-4 h-4 mr-2" />
							Limpiar Todos los Filtros
						</Button>

						<Button
							onClick={() => {
								onApplyFilters()
								onOpenChange(false)
							}}
							className="px-6"
						>
							Aplicar Filtros
						</Button>
					</div>
				</Tabs>
			</DialogContent>
		</Dialog>
	)
}

export default FiltersModal
