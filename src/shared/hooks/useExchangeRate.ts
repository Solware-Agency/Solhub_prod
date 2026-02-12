import { useQuery } from '@tanstack/react-query'

const baseUrl = 'https://ve.dolarapi.com'
const fullUrl = `${baseUrl}/v1/dolares/oficial`

export const useExchangeRate = () => {
	return useQuery({
		queryKey: ['exchangeRate'],
		queryFn: async () => {
			const response = await fetch(fullUrl)
			if (!response.ok) throw new Error('Network response was not ok')
			const data = await response.json()
			return data.promedio
		},
		staleTime: 1000 * 60 * 30, // 30 min
	})
}
