import React, { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Card } from '@shared/components/ui/card'
import { Checkbox } from '@shared/components/ui/checkbox'
import { Label } from '@shared/components/ui/label'
import { Input } from '@shared/components/ui/input'
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service'

interface PatientOriginFilterPanelProps {
	cases: MedicalCaseWithPatient[]
	onFilterChange: (selectedOrigins: string[]) => void
	className?: string
	filters?: boolean
}

const PatientOriginFilterPanel: React.FC<PatientOriginFilterPanelProps> = ({ cases, onFilterChange, className }) => {
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

			<div className="max-h-50 overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded-md">
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
		</Card>
	)
}

export default PatientOriginFilterPanel
