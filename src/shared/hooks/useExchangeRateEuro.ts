import { useQuery } from '@tanstack/react-query'

const EURO_RATE_URL = 'https://ve.dolarapi.com/v1/euros/oficial'

/**
 * Tasa de cambio euro → Bs (BCV). Solo para el aviso de pago (recordatorio).
 * El resto del app usa useExchangeRate (dólar).
 */
export const useExchangeRateEuro = () => {
	return useQuery({
		queryKey: ['exchangeRateEuro'],
		queryFn: async () => {
			const response = await fetch(EURO_RATE_URL)
			if (!response.ok) throw new Error('Network response was not ok')
			const data = await response.json()
			return data.promedio as number
		},
		staleTime: 1000 * 60 * 30, // 30 min
	})
}
