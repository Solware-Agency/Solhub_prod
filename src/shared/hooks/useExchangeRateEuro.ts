import { useQuery } from '@tanstack/react-query'
import { BCV_RATES_FUNCTION_URL, supabase } from '@services/supabase/config/config'

const DOLARAPI_EUR_URL = 'https://ve.dolarapi.com/v1/euros/oficial'

/**
 * Tasa de cambio euro → Bs (BCV). Solo para el aviso de pago (recordatorio).
 * El resto del app usa useExchangeRate (dólar).
 */
async function fetchEuroRateFromEdgeFunction(): Promise<number | null> {
	if (!BCV_RATES_FUNCTION_URL) return null
	const {
		data: { session },
	} = await supabase.auth.getSession()
	if (!session?.access_token) return null
	const res = await fetch(BCV_RATES_FUNCTION_URL, {
		headers: { Authorization: `Bearer ${session.access_token}` },
	})
	if (!res.ok) return null
	const data = (await res.json()) as { eur?: number }
	const eur = data?.eur
	return typeof eur === 'number' && eur > 0 ? eur : null
}

async function fetchEuroRateFromDolarApi(): Promise<number | null> {
	const res = await fetch(DOLARAPI_EUR_URL)
	if (!res.ok) return null
	const data = (await res.json()) as { promedio?: number }
	const p = data?.promedio
	return typeof p === 'number' && p > 0 ? p : null
}

export const useExchangeRateEuro = () => {
	return useQuery({
		queryKey: ['exchangeRateEuro'],
		queryFn: async () => {
			const fromEdge = await fetchEuroRateFromEdgeFunction()
			if (fromEdge != null) return fromEdge
			const fromDolarApi = await fetchEuroRateFromDolarApi()
			if (fromDolarApi != null) return fromDolarApi
			throw new Error('No se pudo obtener la tasa euro')
		},
		staleTime: 1000 * 60 * 30, // 30 min
	})
}
