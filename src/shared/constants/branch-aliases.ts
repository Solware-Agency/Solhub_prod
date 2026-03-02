/**
 * Mapeo de variantes de sedes a nombre canónico (todos los laboratorios)
 * Ej: "Cafetal" y "El Cafetal" son la misma sede; "Paseo Hatillo" y "Paseo El Hatillo" también.
 */
const normalizeForCompare = (s: string) =>
	s
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')

/** Nombre canónico por variante normalizada. */
export const SPT_BRANCH_CANONICAL: Record<string, string> = {
	// Cafetal = El Cafetal
	[normalizeForCompare('Cafetal')]: 'El Cafetal',
	[normalizeForCompare('El Cafetal')]: 'El Cafetal',
	// Paseo Hatillo = Paseo El Hatillo
	[normalizeForCompare('Paseo Hatillo')]: 'Paseo El Hatillo',
	[normalizeForCompare('Paseo El Hatillo')]: 'Paseo El Hatillo',
	// Conspat: cnx/CNX (mayúsculas/minúsculas)
	[normalizeForCompare('cnx')]: 'CNX',
	[normalizeForCompare('CNX')]: 'CNX',
}

/**
 * Devuelve el nombre canónico de la sede.
 * Si no está en el mapeo, devuelve el valor original.
 */
export function getCanonicalBranchSPT(branch: string | null | undefined): string {
	if (!branch || !branch.trim()) return branch ?? ''
	const key = normalizeForCompare(branch)
	return SPT_BRANCH_CANONICAL[key] ?? branch
}

/** Mapeo inverso: nombre canónico -> variantes en BD (para filtrar) */
const CANONICAL_TO_VARIANTS: Record<string, string[]> = {
	[normalizeForCompare('El Cafetal')]: ['Cafetal', 'El Cafetal'],
	[normalizeForCompare('Paseo El Hatillo')]: ['Paseo Hatillo', 'Paseo El Hatillo'],
	[normalizeForCompare('CNX')]: ['cnx', 'CNX'],
}

/**
 * Dado un nombre canónico (ej. "Paseo El Hatillo"), devuelve las variantes que deben
 * coincidir en la BD al filtrar (ej. ["Paseo El Hatillo", "Paseo Hatillo"]).
 */
export function getBranchVariantsForFilter(canonical: string | null | undefined): string[] {
	if (!canonical || !canonical.trim()) return []
	const list = CANONICAL_TO_VARIANTS[normalizeForCompare(canonical)]
	return list ? [...list] : [canonical.trim()]
}
