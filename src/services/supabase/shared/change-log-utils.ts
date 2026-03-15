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

/** Métodos de pago que se registran en bolívares (Bs). El resto se considera en dólares (USD). */
const PAYMENT_METHODS_IN_BOLIVARES = ['Punto de venta', 'Pago móvil', 'Bs en efectivo']

/** Normaliza texto para comparación: minúsculas, sin acentos, trim. */
function normalizeForCompare(s: string): string {
	return s
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/\u0300/g, '') // quitar acentos (ó -> o, etc.)
}

/**
 * Devuelve la etiqueta de moneda según el método de pago (para historial de acciones).
 * Comparación insensible a mayúsculas y acentos (p. ej. "Pago Móvil" o "Pago movil" → Bs).
 * @param method - Nombre del método de pago (ej. "Transferencia", "Pago móvil")
 * @returns "Bs" o "USD"
 */
export function getCurrencyLabelForPaymentMethod(method: string | null | undefined): 'Bs' | 'USD' {
	if (!method || typeof method !== 'string') return 'USD'
	const normalized = normalizeForCompare(method)
	const isBs = PAYMENT_METHODS_IN_BOLIVARES.some((m) => normalizeForCompare(m) === normalized)
	return isBs ? 'Bs' : 'USD'
}

/**
 * Formatea un monto para el historial de acciones incluyendo la moneda (USD o Bs).
 * Usar para campos payment_amount_1..4 (el método de pago determina la moneda).
 * @param amount - Monto (número o string)
 * @param method - Método de pago asociado (para saber si es Bs o USD)
 * @returns Ej: "100 USD", "50 Bs" o null si amount está vacío
 */
export function formatAmountForLog(amount: any, method: string | null | undefined): string | null {
	const normalized = normalizeValue(amount)
	if (normalized === null) return null
	const currency = getCurrencyLabelForPaymentMethod(method)
	return `${normalized} ${currency}`
}
