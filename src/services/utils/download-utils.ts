import { DOWNLOAD_PDF_FUNCTION_URL } from '@/services/supabase/config/config'

/**
 * Determina si estamos en un entorno de producción
 */
export function isProduction(): boolean {
	// Verificar si estamos en Vercel (producción)
	if (typeof window !== 'undefined') {
		const hostname = window.location.hostname
		return !hostname.includes('localhost') && !hostname.includes('127.0.0.1') && !hostname.includes('vercel.app')
	}

	// Fallback para SSR
	return process.env.NODE_ENV === 'production'
}

/**
 * Genera la URL de descarga apropiada según el entorno.
 * En producción usa la Edge Function download-pdf (Supabase).
 */
export function getDownloadUrl(
	caseId: string,
	token: string | null,
	directUrl: string | null,
	preview?: boolean,
): string {
	if (isProduction() && token && directUrl && DOWNLOAD_PDF_FUNCTION_URL) {
		const params = new URLSearchParams({ caseId, token })
		if (preview) params.set('preview', 'true')
		return `${DOWNLOAD_PDF_FUNCTION_URL}?${params.toString()}`
	}

	// En desarrollo o si no hay Edge Function, usar la URL directa
	return directUrl || ''
}

/**
 * Indica si la URL de descarga es la Edge Function (requiere header Authorization con anon key).
 */
export function isEdgeFunctionDownloadUrl(url: string): boolean {
	return Boolean(url && url.includes('/functions/v1/download-pdf'))
}

/**
 * Verifica si una URL es válida para descarga
 */
export function isValidDownloadUrl(url: string): boolean {
	return Boolean(url && url.length > 0 && (url.startsWith('http') || url.startsWith('/api/')))
}
