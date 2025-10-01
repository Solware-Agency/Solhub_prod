import React, { useState, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPatients } from '@lib/patients-service'
import { Input } from '@shared/components/ui/input'
import PatientsList from './PatientsList'
import { supabase } from '@lib/supabase/config'

const PatientsPage: React.FC = React.memo(() => {
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const queryClient = useQueryClient()

	// Suscripción a cambios en tiempo real para la tabla patients
	useEffect(() => {
		const subscription = supabase
			.channel('patients_changes')
			.on(
				'postgres_changes',
				{
					event: '*', // Escuchar INSERT, UPDATE y DELETE
					schema: 'public',
					table: 'patients',
				},
				() => {
					// Invalidar la caché para forzar una nueva consulta
					queryClient.invalidateQueries({ queryKey: ['patients'] })
				},
			)
			.subscribe()

		// Limpiar la suscripción cuando el componente se desmonte
		return () => {
			subscription.unsubscribe()
		}
	}, [queryClient])

	// Fetch patients with pagination and search
	const {
		data: patientsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['patients', currentPage, searchTerm],
		queryFn: () => getPatients(currentPage, 50, searchTerm),
		staleTime: 1000 * 60 * 5, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	})

	// Handle search - reset to page 1 when searching
	const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value)
		setCurrentPage(1) // Reset to first page when searching
	}, [])

	// Handle page change
	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page)
	}, [])

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
				<p className="text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
					Gestiona la información de los pacientes registrados en el sistema
				</p>
			</div>

			{/* Barra de búsqueda y estadísticas */}
			<div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="relative max-w-md flex-1">
					<Input
						type="text"
						placeholder="Buscar por nombre, cédula o teléfono"
						value={searchTerm}
						onChange={handleSearchChange}
					/>
				</div>
			</div>

			{/* Resultados */}
			<PatientsList
				patientsData={patientsData?.data ?? []}
				isLoading={isLoading}
				error={error}
				currentPage={currentPage}
				totalPages={patientsData?.totalPages ?? 0}
				onPageChange={handlePageChange}
			/>
		</div>
	)
})

PatientsPage.displayName = 'PatientsPage'

export default PatientsPage
