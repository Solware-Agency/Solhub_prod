import React, { useState, useCallback, useMemo } from 'react'
import { Phone, Mail, Calendar, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import PatientHistoryModal from './PatientHistoryModal'
import type { Patient } from '@/services/supabase/patients/patients-service'
import { getResponsableByDependiente } from '@/services/supabase/patients/responsabilidades-service'
import { useQuery } from '@tanstack/react-query'

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


// Use React.memo to prevent unnecessary re-renders
const PatientsList: React.FC<PatientsListProps> = React.memo(
	({ patientsData, isLoading, error, currentPage, totalPages, onPageChange }) => {
		const [sortField, setSortField] = useState<SortField>('nombre')
		const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
		const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
		const [isModalOpen, setIsModalOpen] = useState(false)

		// Helper function to extract numeric age value from text
		const extractAgeValue = useCallback((edad: string | null | undefined): number => {
			if (!edad || edad.trim() === '') return -1 // Put empty ages at the end
			
			const edadStr = String(edad).trim().toUpperCase()
			
			// Extract number from string (handles "25", "25 AÑOS", "10 MESES", etc.)
			const match = edadStr.match(/(\d+)/)
			if (!match) return -1
			
			const number = parseInt(match[1], 10)
			if (isNaN(number)) return -1
			
			// Convert months to years for proper comparison (1 year = 12 months)
			// This ensures "12 MESES" (1 year) is less than "2 AÑOS" (2 years)
			if (edadStr.includes('MES') || edadStr.includes('MESES')) {
				return number / 12 // Convert months to years (decimal)
			}
			
			return number
		}, [])

		// Sort patients - simplificado para la nueva estructura
		const sortedPatients = useMemo(() => {
			if (!patientsData || patientsData.length === 0) return []

			return [...patientsData].sort((a: Patient, b: Patient) => {
				let aValue = a[sortField]
				let bValue = b[sortField]

				// Special handling for edad - convert to number for proper sorting
				if (sortField === 'edad') {
					const aNum = extractAgeValue(aValue)
					const bNum = extractAgeValue(bValue)
					
					// Handle empty values (they go to the end)
					if (aNum === -1 && bNum === -1) return 0
					if (aNum === -1) return 1 // a goes after b
					if (bNum === -1) return -1 // b goes after a
					
					return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
				} else {
					// Handle null values for other fields
					if (aValue === null || aValue === undefined) aValue = ''
					if (bValue === null || bValue === undefined) bValue = ''
					
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
		}, [patientsData, sortField, sortDirection, extractAgeValue])

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
				{/* Patients cards - responsive for all screen sizes */}
				<Card className="overflow-hidden">
					{/* Sort filters header */}
					<div className="bg-white dark:bg-black/80 backdrop-blur-[10px] border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 md:px-6 py-3">
						<div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
							<button
								onClick={() => handleSort('nombre')}
								className="flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
							>
								Nombre
								<SortIcon field="nombre" />
							</button>
							<button
								onClick={() => handleSort('cedula')}
								className="flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
							>
								Cédula
								<SortIcon field="cedula" />
							</button>
							<button
								onClick={() => handleSort('edad')}
								className="flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
							>
								Edad
								<SortIcon field="edad" />
							</button>
							<button
								onClick={() => handleSort('telefono')}
								className="flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
							>
								Teléfono
								<SortIcon field="telefono" />
							</button>
							<button
								onClick={() => handleSort('email')}
								className="flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
							>
								Email
								<SortIcon field="email" />
							</button>
						</div>
					</div>

					{/* Cards grid - responsive */}
					<div className="max-h-[450px] sm:max-h-[500px] md:max-h-[550px] overflow-auto">
						{sortedPatients.length > 0 ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4">
								{sortedPatients.map((patient: Patient) => (
									<PatientCard
										key={patient.id}
										patient={patient}
										onClick={() => handlePatientClick(patient)}
									/>
								))}
							</div>
						) : (
							<div className="p-8 text-center text-gray-500 dark:text-gray-400">
								<p className="text-lg font-medium">No se encontraron pacientes</p>
								<p className="text-sm">Aún no hay pacientes registrados</p>
							</div>
						)}
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
				</Card>

				{/* Patient History Modal */}
				<PatientHistoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} patient={selectedPatient} />
			</div>
		)
	},
)

PatientsList.displayName = 'PatientsList'

// Componente para mostrar la tarjeta de paciente con información del responsable
interface PatientCardProps {
	patient: Patient
	onClick: () => void
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick }) => {
	// Verificar si el paciente es un representado (menor o animal)
	const isRepresentado = (patient as any).tipo_paciente === 'menor' || (patient as any).tipo_paciente === 'animal'

	// Obtener información del responsable si es representado
	const { data: responsableData } = useQuery({
		queryKey: ['patient-responsable', patient.id],
		queryFn: async () => {
			if (!isRepresentado) return null
			try {
				const responsable = await getResponsableByDependiente(patient.id)
				return responsable
			} catch (error) {
				console.error('Error obteniendo responsable:', error)
				return null
			}
		},
		enabled: isRepresentado,
		staleTime: 1000 * 60 * 5, // 5 minutes
	})

	return (
		<div
			className="bg-white dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer"
			onClick={onClick}
		>
			<div className="mb-3">
				<p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
					{patient.nombre}
				</p>
				{isRepresentado && responsableData?.responsable ? (
					<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
						Representado por: {responsableData.responsable.nombre}
					</p>
				) : (
					<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
						Cédula: {patient.cedula || 'No disponible'}
					</p>
				)}
			</div>

			<div className="space-y-2">
				{patient.edad && (
					<div className="flex items-center text-xs sm:text-sm">
						<Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-2 flex-shrink-0" />
						<span className="text-gray-600 dark:text-gray-300">
							{patient.edad}
						</span>
					</div>
				)}

				{patient.telefono && (
					<div className="flex items-center text-xs sm:text-sm">
						<Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-2 flex-shrink-0" />
						<span className="text-gray-600 dark:text-gray-300 truncate">
							{patient.telefono}
						</span>
					</div>
				)}

				{patient.email && (
					<div className="flex items-center text-xs sm:text-sm">
						<Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-2 flex-shrink-0" />
						<span className="text-gray-600 dark:text-gray-300 truncate">
							{patient.email}
						</span>
					</div>
				)}
			</div>
		</div>
	)
}

export default PatientsList
