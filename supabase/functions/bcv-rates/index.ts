// Supabase Edge Function: bcv-rates
// Proxy seguro para tasas BCV (USD y EUR). Solo usuarios autenticados pueden llamarla.
// Llama a la API BCV en producción (BCV_API_URL + BCV_API_KEY); fallback a dolarapi si falla.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const DOLARAPI_USD = 'https://ve.dolarapi.com/v1/dolares/oficial'
const DOLARAPI_EUR = 'https://ve.dolarapi.com/v1/euros/oficial'

type BcvResponse = {
	error?: boolean
	data?: {
		dolar?: { value?: number }
		euro?: { value?: number }
	}
}

async function fetchFromOwnApi(baseUrl: string, apiKey: string): Promise<{ usd: number | null; eur: number | null }> {
	const url = baseUrl.replace(/\/$/, '') + '/get_bcv_exchange_rates'
	const res = await fetch(url, {
		headers: { 'x-api-key': apiKey },
	})
	if (!res.ok) return { usd: null, eur: null }
	const body = (await res.json()) as BcvResponse
	const data = body?.data
	if (!data) return { usd: null, eur: null }
	const usd = typeof data.dolar?.value === 'number' && data.dolar.value > 0 ? data.dolar.value : null
	const eur = typeof data.euro?.value === 'number' && data.euro.value > 0 ? data.euro.value : null
	return { usd, eur }
}

async function fetchFromDolarApi(): Promise<{ usd: number | null; eur: number | null }> {
	const [usdRes, eurRes] = await Promise.all([fetch(DOLARAPI_USD), fetch(DOLARAPI_EUR)])
	let usd: number | null = null
	let eur: number | null = null
	if (usdRes.ok) {
		const d = (await usdRes.json()) as { promedio?: number }
		if (typeof d?.promedio === 'number' && d.promedio > 0) usd = d.promedio
	}
	if (eurRes.ok) {
		const d = (await eurRes.json()) as { promedio?: number }
		if (typeof d?.promedio === 'number' && d.promedio > 0) eur = d.promedio
	}
	return { usd, eur }
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders })
	}

	if (req.method !== 'GET') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	try {
		const bcvUrl = Deno.env.get('BCV_API_URL') ?? ''
		const bcvKey = Deno.env.get('BCV_API_KEY') ?? ''

		let usd: number | null = null
		let eur: number | null = null

		if (bcvUrl && bcvKey) {
			const result = await fetchFromOwnApi(bcvUrl, bcvKey)
			usd = result.usd
			eur = result.eur
		}

		if (usd == null || eur == null) {
			const fallback = await fetchFromDolarApi()
			if (usd == null) usd = fallback.usd
			if (eur == null) eur = fallback.eur
		}

		return new Response(JSON.stringify({ usd: usd ?? 0, eur: eur ?? 0 }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	} catch (e) {
		console.error('bcv-rates error:', e)
		return new Response(
			JSON.stringify({ error: 'Failed to fetch rates', usd: 0, eur: 0 }),
			{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
		)
	}
})
