import { useQuery } from '@tanstack/react-query'

const baseUrl = import.meta.env.VITE_API_EXCHANGE_URL
const fullUrl = `${baseUrl}/USD`

export const useExchangeRate = () => {
	return useQuery({
		queryKey: ['exchangeRate'],
		queryFn: async () => {
			const response = await fetch(fullUrl)
			if (!response.ok) throw new Error('Network response was not ok')
			const data = await response.json()
			return data.rates.VES
		},
		staleTime: 1000 * 60 * 60, // 1 hora
	})
}
