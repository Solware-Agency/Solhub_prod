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

supabase
	.from('medical_records_clean')
	.select('count', { count: 'exact', head: true })
	.then(({ error }) => {
		if (error) {
			console.error('❌ Error de conexión con tabla medical_records_clean:', error)
			console.log('💡 Ejecuta las migraciones para crear la tabla medical_records_clean')
		} else {
			console.log('✅ Conexión con tabla medical_records_clean establecida correctamente')
		}
	})
	.then(
		() => {},
		(err: any) => {
			console.error('❌ Error inesperado conectando con tabla medical_records_clean:', err)
		},
	)

// Verificar conexión de realtime
console.log('📡 [Realtime] Inicializando realtime...')
console.log('📡 [Realtime] Estado de conexión:', supabase.realtime.isConnected())