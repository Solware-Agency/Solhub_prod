/**
 * Utilidades para la descarga de PDFs
 */

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
 * Genera la URL de descarga apropiada según el entorno
 */
export function getDownloadUrl(caseId: string, token: string | null, directUrl: string | null): string {
	// Si estamos en producción y tenemos token, usar el endpoint de descarga
	if (isProduction() && token && directUrl) {
		return `/api/download-pdf?caseId=${caseId}&token=${token}`
	}

	// En desarrollo o si no hay token, usar la URL directa
	return directUrl || ''
}

/**
 * Verifica si una URL es válida para descarga
 */
export function isValidDownloadUrl(url: string): boolean {
	return Boolean(url && url.length > 0 && (url.startsWith('http') || url.startsWith('/api/')))
}
