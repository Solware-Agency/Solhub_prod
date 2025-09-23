import React, { useState, useCallback, useMemo } from 'react'
import { Phone, Mail, Calendar, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import PatientHistoryModal from '@shared/components/patients/PatientHistoryModal'
import type { Patient } from '@lib/patients-service'

// Define interface for patient data (adaptado a nueva estructura)
type SortField = 'nombre' | 'cedula' | 'edad' | 'telefono' | 'email' | 'created_at'
type SortDirection = 'asc' | 'desc'

// Props interface for PatientsList - usando nueva estructura
interface PatientsListProps {
	patientsData: Patient[]
	isLoading: boolean
	error: Error | null
	currentPage: number
	totalPages: number
	onPageChange: (page: number) => void
}

// Memoized Patient Row Component for better performance
const PatientRow = React.memo(({ patient, onClick }: { patient: Patient; onClick: (patient: Patient) => void }) => (
	<tr
		key={patient.id}
		className="hover:bg-gray-200 dark:hover:bg-gray-800 bg-white dark:bg-background transition-transform cursor-pointer"
		onClick={() => onClick(patient)}
	>
		{/* Name Cell */}
		<td className="w-[20%] px-5 py-3">
			<div className="flex items-center">
				<div className="ml-3">
					<p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{patient.nombre}</p>
				</div>
			</div>
		</td>

		{/* ID Number Cell */}
		<td className="w-[15%] px-5 py-3 text-sm text-gray-900 dark:text-gray-100">{patient.cedula}</td>

		{/* Age Cell */}
		<td className="w-[20%] px-5 py-3 text-sm text-gray-900 dark:text-gray-100">
			{patient.edad ? (
				<span>{patient.edad}</span>
			) : (
				<span className="text-gray-500 dark:text-gray-400">No disponible</span>
			)}
		</td>

		{/* Phone Cell */}
		<td className="w-[15%] px-5 py-3 text-sm text-gray-900 dark:text-gray-100">
			{patient.telefono || <span className="text-gray-500 dark:text-gray-400">No disponible</span>}
		</td>

		{/* Email Cell */}
		<td className="w-[15%] px-5 py-3 text-sm text-gray-900 dark:text-gray-100 truncate">
			{patient.email || <span className="text-gray-500 dark:text-gray-400">No disponible</span>}
		</td>
	</tr>
))

PatientRow.displayName = 'PatientRow'

// Use React.memo to prevent unnecessary re-renders
const PatientsList: React.FC<PatientsListProps> = React.memo(
	({ patientsData, isLoading, error, currentPage, totalPages, onPageChange }) => {
		const [sortField, setSortField] = useState<SortField>('nombre')
		const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
		const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
		const [isModalOpen, setIsModalOpen] = useState(false)

		// Sort patients - simplificado para la nueva estructura
		const sortedPatients = useMemo(() => {
			if (!patientsData || patientsData.length === 0) return []

			return [...patientsData].sort((a: Patient, b: Patient) => {
				let aValue = a[sortField]
				let bValue = b[sortField]

				// Handle null values
				if (aValue === null || aValue === undefined) aValue = ''
				if (bValue === null || bValue === undefined) bValue = ''

				// Special handling for edad - convert to number for proper sorting
				if (sortField === 'edad') {
					const aNum = Number(aValue) || 0
					const bNum = Number(bValue) || 0
					return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
				} else {
					// String comparison for text fields
					const aStr = String(aValue).toLowerCase()
					const bStr = String(bValue).toLowerCase()

					if (sortDirection === 'asc') {
						return aStr > bStr ? 1 : -1
					} else {
						return aStr < bStr ? 1 : -1
					}
				}
			})
		}, [patientsData, sortField, sortDirection])

		// Handle sort
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

		// Handle patient selection
		const handlePatientClick = useCallback((patient: Patient) => {
			console.log('Patient clicked:', patient.nombre)
			setSelectedPatient(patient)
			setIsModalOpen(true)
		}, [])

		// Sort icon component
		const SortIcon = useCallback(
			({ field }: { field: SortField }) => {
				if (sortField !== field) {
					return <ChevronUp className="w-5 h-5 text-gray-400" />
				}
				return sortDirection === 'asc' ? (
					<ChevronUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
				) : (
					<ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
				)
			},
			[sortField, sortDirection],
		)

		// Loading state
		if (isLoading) {
			return (
				<Card className="p-6">
					<div className="flex items-center justify-center py-12">
						<div className="flex items-center gap-3">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
							<span className="text-lg text-gray-700 dark:text-gray-300">Cargando pacientes...</span>
						</div>
					</div>
				</Card>
			)
		}

		// Error state
		if (error) {
			return (
				<Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
					<div className="text-center py-12">
						<div className="text-red-500 dark:text-red-400">
							<p className="text-lg font-medium">Error al cargar los pacientes</p>
							<p className="text-sm mt-2">Verifica tu conexión a internet o contacta al administrador</p>
						</div>
					</div>
				</Card>
			)
		}

		// Render the component
		return (
			<div className="">
				{/* Patients table */}
				<Card className="overflow-hidden">
					{/* Desktop view */}
					<div className="hidden lg:block">
						<div className="max-h-[520px] overflow-auto">
							<table className="w-full">
								<thead className="bg-white dark:bg-black/80 backdrop-blur-[10px] sticky top-0 z-10 border-b">
									<tr>
										<th className="w-[20%] px-5 py-3 text-left">
											<button
												onClick={() => handleSort('nombre')}
												className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
											>
												Nombre
												<SortIcon field="nombre" />
											</button>
										</th>
										<th className="w-[15%] px-5 py-3 text-left">
											<button
												onClick={() => handleSort('cedula')}
												className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
											>
												Cédula
												<SortIcon field="cedula" />
											</button>
										</th>
										<th className="w-[20%] px-5 py-3 text-left">
											<button
												onClick={() => handleSort('edad')}
												className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
											>
												Edad
												<SortIcon field="edad" />
											</button>
										</th>
										<th className="w-[15%] px-5 py-3 text-left">
											<button
												onClick={() => handleSort('telefono')}
												className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
											>
												Teléfono
												<SortIcon field="telefono" />
											</button>
										</th>
										<th className="w-[15%] px-5 py-3 text-left">
											<button
												onClick={() => handleSort('email')}
												className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
											>
												Email
												<SortIcon field="email" />
											</button>
										</th>
									</tr>
								</thead>
								<tbody className="bg-black divide-y divide-gray-200 dark:divide-gray-700">
									{sortedPatients.length > 0 ? (
										sortedPatients.map((patient: Patient) => (
											<PatientRow key={patient.id} patient={patient} onClick={handlePatientClick} />
										))
									) : (
										<tr>
											<td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
												<p className="text-lg font-medium">No se encontraron pacientes</p>
												<p className="text-sm">Aún no hay pacientes registrados</p>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
								<div className="text-sm text-gray-700 dark:text-gray-300">
									Página {currentPage} de {totalPages}
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => onPageChange(currentPage - 1)}
										disabled={currentPage === 1}
									>
										<ChevronLeft className="w-4 h-4" />
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => onPageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
									>
										<ChevronRight className="w-4 h-4" />
									</Button>
								</div>
							</div>
						)}
					</div>

					{/* Mobile view - cards */}
					<div className="lg:hidden">
						{sortedPatients.length > 0 ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
								{sortedPatients.map((patient: Patient) => (
									<div
										key={patient.id}
										className="bg-white dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-transform duration-200 cursor-pointer"
										onClick={() => handlePatientClick(patient)}
									>
										<div className="flex items-center mb-2">
											<div className="ml-2 min-w-0">
												<p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
													{patient.nombre}
												</p>
												<p className="text-xs text-gray-500 dark:text-gray-400">Cédula: {patient.cedula}</p>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-2 text-xs">
											<div className="col-span-2">
												<div className="flex items-center">
													<Calendar className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
													<span className="text-gray-600 dark:text-gray-300 text-xs">
														{patient.edad ? `${patient.edad}` : 'Edad no disponible'}
													</span>
												</div>
											</div>

											<div>
												<div className="flex items-center">
													<Phone className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
													<span className="text-gray-600 dark:text-gray-300 text-xs truncate">
														{patient.telefono || 'No disponible'}
													</span>
												</div>
											</div>

											{patient.email && (
												<div className="col-span-2 mt-1">
													<div className="flex items-center">
														<Mail className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
														<span className="text-gray-600 dark:text-gray-300 text-xs truncate">{patient.email}</span>
													</div>
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="p-8 text-center text-gray-500 dark:text-gray-400">
								<p className="text-lg font-medium">No se encontraron pacientes</p>
								<p className="text-sm">Aún no hay pacientes registrados</p>
							</div>
						)}

						{/* Mobile Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
								<div className="text-sm text-gray-700 dark:text-gray-300">
									Página {currentPage} de {totalPages}
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => onPageChange(currentPage - 1)}
										disabled={currentPage === 1}
									>
										<ChevronLeft className="w-4 h-4" />
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => onPageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
									>
										<ChevronRight className="w-4 h-4" />
									</Button>
								</div>
							</div>
						)}
					</div>
				</Card>

				{/* Patient History Modal */}
				<PatientHistoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} patient={selectedPatient} />
			</div>
		)
	},
)

PatientsList.displayName = 'PatientsList'

export default PatientsList
