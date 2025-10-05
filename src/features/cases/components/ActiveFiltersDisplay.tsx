import React from 'react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'

interface ActiveFiltersDisplayProps {
	// Filtros básicos
	statusFilter: string
	branchFilter: string
	dateRange: DateRange | undefined
	showPdfReadyOnly: boolean
	selectedDoctors: string[]
	selectedOrigins?: string[]

	// Filtros de citología
	citologyPositiveFilter: boolean
	citologyNegativeFilter: boolean

	// Nuevos filtros
	pendingCasesFilter: string
	pdfStatusFilter: string
	examTypeFilter: string
	documentStatusFilter: string
}

const ActiveFiltersDisplay: React.FC<ActiveFiltersDisplayProps> = ({
	statusFilter,
	branchFilter,
	dateRange,
	showPdfReadyOnly,
	selectedDoctors,
	selectedOrigins,
	citologyPositiveFilter,
	citologyNegativeFilter,
	pendingCasesFilter,
	pdfStatusFilter,
	examTypeFilter,
	documentStatusFilter,
}) => {
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

	if (!hasActiveFilters) {
		return null
	}

	return (
		<div className="mb-4">
			<div className="flex flex-wrap gap-2">
				{statusFilter !== 'all' && (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full">
						Estado: {statusFilter}
					</span>
				)}

				{branchFilter !== 'all' && (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full">
						Sede: {branchFilter}
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
					</span>
				)}

				{selectedDoctors.length > 0 && (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 text-sm rounded-full">
						Médicos: {selectedDoctors.length} seleccionado{selectedDoctors.length > 1 ? 's' : ''}
					</span>
				)}

				{selectedOrigins && selectedOrigins.length > 0 && (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm rounded-full">
						Procedencia: {selectedOrigins.length} seleccionada{selectedOrigins.length > 1 ? 's' : ''}
					</span>
				)}

				{showPdfReadyOnly && (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-sm rounded-full">
						PDF Disponibles
					</span>
				)}

				{citologyPositiveFilter && (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full">
						Citología Positiva
					</span>
				)}

				{citologyNegativeFilter && (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-full">
						Citología Negativa
					</span>
				)}

				{pendingCasesFilter !== 'all' && (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm rounded-full">
						Casos: {pendingCasesFilter === 'pagados' ? 'Pagados' : 'Incompletos'}
					</span>
				)}

				{pdfStatusFilter !== 'all' && (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm rounded-full">
						PDF: {pdfStatusFilter === 'pendientes' ? 'Pendientes' : 'Faltantes'}
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
					</span>
				)}
			</div>
		</div>
	)
}

export default ActiveFiltersDisplay
