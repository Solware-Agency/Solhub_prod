import React, { useCallback, useState } from 'react'
import { RecordsSection } from '@features/cases/components/RecordsSection'
import { useQuery } from '@tanstack/react-query'
import { getCasesWithPatientInfo } from '@/services/supabase/cases/medical-cases-service'
import { mapToLegacyRecords } from '@services/utils/mappers'
import { useUserProfile } from '@shared/hooks/useUserProfile'

const CasesPage: React.FC = () => {
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPage, setItemsPerPage] = useState(50)
	// Nuevos estados para filtros del servidor
	const [serverFilters, setServerFilters] = useState<{
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
	}>({})

	// Obtener perfil del usuario para filtrar por rol
	const { profile } = useUserProfile()

	const {
		data: casesData,
		isLoading: casesLoading,
		error: casesError,
		refetch: refetchCases,
	} = useQuery({
		queryKey: ['medical-cases', searchTerm, currentPage, itemsPerPage, profile?.role, serverFilters],
		queryFn: async () => {
			// Construir filtros
			const filters: any = { ...serverFilters }

			// Solo agregar searchTerm si no está vacío
			const cleanSearchTerm = searchTerm?.trim()
			if (cleanSearchTerm) {
				filters.searchTerm = cleanSearchTerm
			}

			// Pasar el rol del usuario para filtrar en el servidor
			if (profile?.role) {
				filters.userRole = profile.role as 'owner' | 'employee' | 'residente' | 'citotecno' | 'patologo' | 'medicowner'
			}

			return getCasesWithPatientInfo(currentPage, itemsPerPage, filters)
		},
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
		enabled: !!profile, // Solo ejecutar cuando tenemos el perfil del usuario
	})

	const handleSearch = useCallback((term: string) => {
		setSearchTerm(term)
		setCurrentPage(1) // Reset a página 1 cuando se busca
	}, [])

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page)
	}, [])

	const handleItemsPerPageChange = useCallback((items: number) => {
		setItemsPerPage(items)
		setCurrentPage(1) // Reset a página 1 cuando cambia el tamaño
	}, [])

	return (
		<RecordsSection
			cases={casesData?.data ? mapToLegacyRecords(casesData.data) : []}
			isLoading={casesLoading}
			error={casesError}
			refetch={refetchCases}
			isFullscreen={isFullscreen}
			setIsFullscreen={setIsFullscreen}
			onSearch={handleSearch}
			onFiltersChange={setServerFilters}
			// Datos de paginación del servidor
			pagination={{
				currentPage,
				totalPages: casesData?.totalPages || 1,
				totalItems: casesData?.count || 0,
				itemsPerPage,
				onPageChange: handlePageChange,
				onItemsPerPageChange: handleItemsPerPageChange,
			}}
		/>
	)
}

export default CasesPage
