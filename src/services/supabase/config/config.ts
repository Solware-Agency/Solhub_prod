import { createClient } from '@supabase/supabase-js'
import type { Database } from '@shared/types/types'

// Validate required environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Verificar que las variables estén definidas
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
	console.error('❌ Variables de Supabase no configuradas correctamente')
	console.error('SUPABASE_URL:', SUPABASE_URL)
	console.error('SUPABASE_PUBLISHABLE_KEY:', SUPABASE_PUBLISHABLE_KEY ? 'Definida' : 'No definida')
}

console.log('🔗 Conectando a Supabase con tabla medical_records_clean')

// Get the correct redirect URL based on environment
const getRedirectUrl = () => {
	if (typeof window === 'undefined') return 'http://localhost:5173'

	// Always use the current origin to ensure consistency
	return window.location.origin
}

export const REDIRECT_URL = getRedirectUrl()

// Create Supabase client with PKCE flow type
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
		flowType: 'pkce',
		storage: {
			getItem: (key: string) => {
				return localStorage.getItem(key)
			},
			setItem: (key: string, value: string) => {
				localStorage.setItem(key, value)
			},
			removeItem: (key: string) => {
				localStorage.removeItem(key)
			},
		},
	},
	db: {
		schema: 'public',
	},
	realtime: {
		params: {
			eventsPerSecond: 10,
		},
	},
	global: {
		headers: {
			'Content-Type': 'application/json',
		},
	},
})

// Verificar conexión con medical_records_clean tras aplicar políticas RLS
setTimeout(async () => {
	const { data: { session } } = await supabase.auth.getSession()
	
	if (session) {
		supabase
			.from('medical_records_clean')
			.select('count', { count: 'exact', head: true })
			.then(({ error }) => {
				if (error) {
					console.warn('⚠️ No se pudo verificar conexión con medical_records_clean:', error.message || error)
				} else {
					console.log('✅ Conexión con tabla medical_records_clean verificada')
				}
			})
	}
}, 1000)

// Verificar conexión de realtime
console.log('📡 [Realtime] Inicializando realtime...')
console.log('📡 [Realtime] Estado de conexión:', supabase.realtime.isConnected())