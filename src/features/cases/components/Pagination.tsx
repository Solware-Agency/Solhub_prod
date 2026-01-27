import React, { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
	currentPage: number
	totalPages: number
	itemsPerPage: number
	pageSizeOptions: { value: string; label: string }[]
	onItemsPerPageChange: (size: number) => void
	onGoToPage: (page: number) => void
	onNext: () => void
	onPrev: () => void
	totalItems?: number
}

const Pagination: React.FC<PaginationProps> = ({
	currentPage,
	totalPages,
	onGoToPage,
	onNext,
	onPrev,
}) => {
	const pageNumbers = useMemo(() => {
		if (totalPages <= 1) return []
		const pages: number[] = []
		const maxVisiblePages = 5
		let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
		const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
		if (endPage - startPage + 1 < maxVisiblePages) {
			startPage = Math.max(1, endPage - maxVisiblePages + 1)
		}
		for (let i = startPage; i <= endPage; i++) pages.push(i)
		return pages
	}, [currentPage, totalPages])

	// if (totalPages <= 1) return null

	return (
		<div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4">
			{/* Controles de paginación */}
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1">
					<button
						onClick={onPrev}
						disabled={currentPage === 1}
						className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
						title="Página anterior"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					{pageNumbers.map((page) => (
						<button
							key={page}
							onClick={() => onGoToPage(page)}
							className={`px-3 py-2 text-sm rounded-md transition-none ${
								page === currentPage
									? 'border-2 border-primary text-primary bg-transparent font-medium'
									: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
							}`}
						>
							{page}
						</button>
					))}
					<button
						onClick={onNext}
						disabled={currentPage === totalPages}
						className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
						title="Página siguiente"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	)
}

export default Pagination
