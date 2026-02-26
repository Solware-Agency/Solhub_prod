import React, { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPatients, getPatientsCountByBranch, setPatientActive } from '@/services/supabase/patients/patients-service'
import { Input } from '@shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select'
import { Button } from '@shared/components/ui/button'
import { X } from 'lucide-react'
import PatientsList from '../../patients/components/PatientsList'
import { supabase } from '@/services/supabase/config/config'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import type { Patient } from '@/services/supabase/patients/patients-service'

const PatientsPage: React.FC = React.memo(() => {
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [selectedBranch, setSelectedBranch] = useState<string>('all')
	const [sortField, setSortField] = useState<'nombre' | 'cedula' | 'edad' | 'telefono' | 'email' | 'created_at'>('nombre')
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
	const queryClient = useQueryClient()
	const { laboratory } = useLaboratory()

	// Obtener branches del laboratorio actual
	const branches = laboratory?.config?.branches || []

	// Fetch patients count by branch
	const { data: patientsCountByBranch } = useQuery({
		queryKey: ['patientsCountByBranch'],
		queryFn: getPatientsCountByBranch,
		staleTime: 1000 * 60 * 5, // 5 minutes
	})

	// Suscripción a cambios en tiempo real para la tabla patients
	useEffect(() => {
		const channel = supabase
			.channel('patients_changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'patients',
				},
				() => {
					queryClient.invalidateQueries({ queryKey: ['patients'] })
					queryClient.invalidateQueries({ queryKey: ['patientsCountByBranch'] })
				},
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [queryClient])

	// Fetch patients with pagination and search
	const {
		data: patientsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['patients', currentPage, searchTerm, selectedBranch, sortField, sortDirection],
		queryFn: () => getPatients(currentPage, 50, searchTerm, selectedBranch === 'all' ? undefined : selectedBranch, sortField, sortDirection),
		staleTime: 1000 * 60 * 5, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	})

	// Handle search - reset to page 1 when searching
	const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value)
		setCurrentPage(1) // Reset to first page when searching
	}, [])

	// Handle laboratory filter change
	const handleBranchChange = useCallback((value: string) => {
		setSelectedBranch(value)
		setCurrentPage(1) // Reset to first page when filtering
	}, [])

	// Handle page change
	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page)
	}, [])

	// Handle sort change
	const handleSortChange = useCallback((field: 'nombre' | 'cedula' | 'edad' | 'telefono' | 'email' | 'created_at', direction: 'asc' | 'desc') => {
		setSortField(field)
		setSortDirection(direction)
		setCurrentPage(1) // Reset to first page when sorting
	}, [])

	// Handle clear filters
	const handleClearFilters = useCallback(() => {
		setSearchTerm('')
		setSelectedBranch('all')
		setCurrentPage(1)
	}, [])

	// Soft delete: desactivar paciente (oculta de la lista, datos se mantienen)
	const deletePatientMutation = useMutation({
		mutationFn: (patientId: string) => setPatientActive(patientId, false),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['patients'] })
			queryClient.invalidateQueries({ queryKey: ['patientsCountByBranch'] })
		},
	})

	const handleDeletePatient = useCallback(
		(patient: Patient) => {
			deletePatientMutation.mutate(patient.id)
		},
		[deletePatientMutation],
	)

	// Check if any filter is active
	const hasActiveFilters = searchTerm !== '' || selectedBranch !== 'all'

	// Calculate total patients count for "Todas las sedes"
	const totalPatientsCount = patientsCountByBranch ? Object.values(patientsCountByBranch).reduce((sum, count) => sum + count, 0) : 0

	return (
		<div>
			{/* Título y descripción arriba */}
			<div className="mb-4 sm:mb-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold">Pacientes</h1>
						<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
					</div>
				</div>
			</div>

			{/* Barra de búsqueda y filtros */}
			<div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
				<div className="relative max-w-md flex-1">
					<Input
						type="text"
						placeholder="Buscar por nombre, cédula o teléfono"
						value={searchTerm}
						onChange={handleSearchChange}
					/>
				</div>
				
				{/* Filtro por sede */}
				<div className="w-full sm:w-auto sm:min-w-[280px]">
					<Select value={selectedBranch} onValueChange={handleBranchChange}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Filtrar por sede" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								Todas las sedes ({totalPatientsCount} pacientes)
							</SelectItem>
							{branches.map((branch: string) => (
								<SelectItem key={branch} value={branch}>
									{branch} ({patientsCountByBranch?.[branch] || 0} pacientes)
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Botón para limpiar filtros */}
				{hasActiveFilters && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleClearFilters}
						className="w-full sm:w-auto gap-2"
					>
						<X className="w-4 h-4" />
						Limpiar filtros
					</Button>
				)}
			</div>

			{/* Resultados */}
			<PatientsList
				patientsData={patientsData?.data ?? []}
				isLoading={isLoading}
				error={error}
				currentPage={currentPage}
				totalPages={patientsData?.totalPages ?? 0}
				onPageChange={handlePageChange}
				sortField={sortField}
				sortDirection={sortDirection}
				onSortChange={handleSortChange}
				onDeletePatient={handleDeletePatient}
				isDeleting={deletePatientMutation.isPending}
			/>
		</div>
	)
})

PatientsPage.displayName = 'PatientsPage'

export default PatientsPage
