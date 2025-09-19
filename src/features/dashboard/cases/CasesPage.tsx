import React, { useCallback, useState } from 'react'
import { RecordsSection } from '@features/form/components/RecordsSection'
import { useQuery } from '@tanstack/react-query'
import { getAllCasesWithPatientInfo } from '@lib/medical-cases-service'
import { mapToLegacyRecords } from '@lib/mappers'

const CasesPage: React.FC = () => {
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')

	const {
		data: casesData,
		isLoading: casesLoading,
		error: casesError,
		refetch: refetchCases,
	} = useQuery({
		queryKey: ['medical-cases', searchTerm],
		queryFn: () => getAllCasesWithPatientInfo({ searchTerm }),
		staleTime: 1000 * 60 * 5,
		refetchOnWindowFocus: false,
	})

	const handleSearch = useCallback((term: string) => {
		setSearchTerm(term)
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
		/>
	)
}

export default CasesPage
