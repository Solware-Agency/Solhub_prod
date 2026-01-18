/**
 * Utilidades para registro de cambios en change_logs
 * 
 * Funciones para:
 * - Normalizar valores antes de comparar
 * - Detectar cambios reales (evitar falsos positivos)
 * - Generar session_id para agrupar cambios
 */

/**
 * Normaliza valores para comparación precisa
 * - null, undefined, '' → null
 * - Trim espacios en blanco
 * - Convierte a string para comparación consistente
 * 
 * @param value - Valor a normalizar (cualquier tipo)
 * @returns Valor normalizado como string o null
 */
export function normalizeValue(value: any): string | null {
	if (value === null || value === undefined) return null
	const str = String(value).trim()
	return str === '' ? null : str
}

/**
 * Verifica si hay un cambio real entre dos valores
 * Compara valores normalizados para evitar falsos positivos
 * 
 * @param oldValue - Valor anterior
 * @param newValue - Valor nuevo
 * @returns true si hay un cambio real, false si son equivalentes
 * 
 * @example
 * hasRealChange(null, '') // false (ambos son null después de normalizar)
 * hasRealChange('  ', '') // false (ambos son null después de normalizar)
 * hasRealChange('Juan', 'Juan Carlos') // true (valores diferentes)
 */
export function hasRealChange(oldValue: any, newValue: any): boolean {
	const normalizedOld = normalizeValue(oldValue)
	const normalizedNew = normalizeValue(newValue)
	
	// No hay cambio si ambos son null después de normalizar
	if (normalizedOld === null && normalizedNew === null) return false
	
	// Hay cambio si son diferentes
	return normalizedOld !== normalizedNew
}

/**
 * Genera un session_id único para agrupar cambios de la misma sesión de edición
 * 
 * IMPORTANTE: Se genera por submit, no por abrir modal
 * Esto mitiga el riesgo de sesiones largas (usuario edita durante 10 minutos)
 * 
 * @returns UUID string para agrupar cambios
 */
export function generateChangeSessionId(): string {
	return crypto.randomUUID()
}

/**
 * Formatea valores para almacenamiento en change_logs
 * Convierte valores a string de forma segura, manteniendo null para valores vacíos
 * 
 * @param value - Valor a formatear
 * @returns String formateado o null si está vacío
 */
export function formatValueForLog(value: any): string | null {
	const normalized = normalizeValue(value)
	return normalized
}
