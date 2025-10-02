import React, { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Card } from '@shared/components/ui/card'
import { Checkbox } from '@shared/components/ui/checkbox'
import { Label } from '@shared/components/ui/label'
import { Input } from '@shared/components/ui/input'
import type { MedicalCaseWithPatient } from '@lib/medical-cases-service'

interface PatientOriginFilterPanelProps {
	cases: MedicalCaseWithPatient[]
	onFilterChange: (selectedOrigins: string[]) => void
	className?: string
	filters?: boolean
}

const PatientOriginFilterPanel: React.FC<PatientOriginFilterPanelProps> = ({
	cases,
	onFilterChange,
	className,
}) => {
	const [selectedOrigins, setSelectedOrigins] = useState<string[]>([])
	const [searchTerm, setSearchTerm] = useState('')

	// Extract unique origins from cases
	const uniqueOrigins = useMemo(() => {
		if (!cases || cases.length === 0) return []

		// Get all unique origin values
		const originsSet = new Set<string>()
		cases.forEach((caseItem) => {
			if (caseItem.origin && caseItem.origin.trim()) {
				originsSet.add(caseItem.origin.trim())
			}
		})

		// Convert to array and sort alphabetically
		return Array.from(originsSet).sort((a, b) => a.localeCompare(b))
	}, [cases])

	// Filter origins based on search term
	const filteredOrigins = useMemo(() => {
		if (!searchTerm) return uniqueOrigins

		return uniqueOrigins.filter((origin) => origin.toLowerCase().includes(searchTerm.toLowerCase()))
	}, [uniqueOrigins, searchTerm])

	// Handle origin selection
	const handleOriginToggle = (origin: string) => {
		setSelectedOrigins((prev) => {
			if (prev.includes(origin)) {
				return prev.filter((o) => o !== origin)
			} else {
				return [...prev, origin]
			}
		})
	}

	// Update parent component when selection changes
	useEffect(() => {
		onFilterChange(selectedOrigins)
	}, [selectedOrigins, onFilterChange])

	return (
		<Card className={`p-3 sm:p-4 ${className}`}>

			<div className="relative mb-4">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
				<Input
					placeholder="Buscar procedencia"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="pl-10"
				/>
			</div>

			<div className="max-h-[200px] overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded-md">
				{filteredOrigins.length > 0 ? (
					<div className="space-y-1 p-2">
						{filteredOrigins.map((origin) => (
							<div
								key={origin}
								className="flex items-center space-x-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 rounded-md transition-none text-sm"
							>
								<Checkbox
									id={`origin-${origin}`}
									checked={selectedOrigins.includes(origin)}
									onCheckedChange={() => handleOriginToggle(origin)}
								/>
								<Label htmlFor={`origin-${origin}`} className="flex-1 cursor-pointer text-sm">
									{origin}
								</Label>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-4 text-gray-500 dark:text-gray-400">
						{searchTerm ? 'No se encontraron procedencias con ese nombre' : 'No hay procedencias disponibles'}
					</div>
				)}
			</div>

			{selectedOrigins.length > 0 && (
				<div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Procedencias seleccionadas:</span>
						<span className="text-sm font-bold text-primary">{selectedOrigins.length}</span>
					</div>
					<div className="mt-2 flex flex-wrap gap-1 sm:gap-2">
						{selectedOrigins.map((origin) => (
							<div
								key={`selected-${origin}`}
								className="bg-primary/10 text-primary text-xs px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1"
							>
								<span className="max-w-[120px] sm:max-w-none truncate">{origin}</span>
								<button onClick={() => handleOriginToggle(origin)} className="hover:text-primary/80">
									<X className="h-3 w-3" />
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</Card>
	)
}

export default PatientOriginFilterPanel
