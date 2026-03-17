import { useQuery } from '@tanstack/react-query'
import { BCV_RATES_FUNCTION_URL, supabase } from '@services/supabase/config/config'

const DOLARAPI_URL = 'https://ve.dolarapi.com/v1/dolares/oficial'

async function fetchRateFromEdgeFunction(): Promise<number | null> {
	if (!BCV_RATES_FUNCTION_URL) return null
	const {
		data: { session },
	} = await supabase.auth.getSession()
	if (!session?.access_token) return null
	const res = await fetch(BCV_RATES_FUNCTION_URL, {
		headers: { Authorization: `Bearer ${session.access_token}` },
	})
	if (!res.ok) return null
	const data = (await res.json()) as { usd?: number }
	const usd = data?.usd
	return typeof usd === 'number' && usd > 0 ? usd : null
}

async function fetchRateFromDolarApi(): Promise<number | null> {
	const res = await fetch(DOLARAPI_URL)
	if (!res.ok) return null
	const data = (await res.json()) as { promedio?: number }
	const p = data?.promedio
	return typeof p === 'number' && p > 0 ? p : null
}

export const useExchangeRate = () => {
	return useQuery({
		queryKey: ['exchangeRate'],
		queryFn: async () => {
			const fromEdge = await fetchRateFromEdgeFunction()
			if (fromEdge != null) return fromEdge
			const fromDolarApi = await fetchRateFromDolarApi()
			if (fromDolarApi != null) return fromDolarApi
			throw new Error('No se pudo obtener la tasa de cambio')
		},
		staleTime: 1000 * 60 * 30, // 30 min
	})
}
