/** Tipos de documento (V/E/J/C como cédulas; P = pasaporte; S/C = sin cédula) */
export type AseguradoDocumentTipo = 'V' | 'E' | 'J' | 'C' | 'P' | 'S/C'

const LEGACY_PASAPORTE_PREFIX = 'pasaporte-'

export const ASEGURADO_DOCUMENT_TIPO_OPTIONS: { value: AseguradoDocumentTipo; label: string }[] = [
	{ value: 'V', label: 'V' },
	{ value: 'E', label: 'E' },
	{ value: 'J', label: 'J' },
	{ value: 'C', label: 'C' },
	{ value: 'P', label: 'P' },
	{ value: 'S/C', label: 'S/C' },
]

export function parseDocumentId(documentId: string): { tipo: AseguradoDocumentTipo; numero: string } {
	const trimmed = (documentId ?? '').trim()
	if (trimmed === 'S/C') {
		return { tipo: 'S/C', numero: '' }
	}
	const lower = trimmed.toLowerCase()
	if (lower.startsWith(LEGACY_PASAPORTE_PREFIX)) {
		const rest = trimmed.slice(LEGACY_PASAPORTE_PREFIX.length)
		return { tipo: 'P', numero: rest.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() }
	}
	if (/^P-/i.test(trimmed)) {
		return { tipo: 'P', numero: trimmed.slice(2).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() }
	}
	if (trimmed.startsWith('E-')) {
		return { tipo: 'E', numero: trimmed.slice(2).replace(/\D/g, '') }
	}
	if (trimmed.startsWith('C-')) {
		return { tipo: 'C', numero: trimmed.slice(2).replace(/\D/g, '') }
	}
	if (trimmed.startsWith('V-')) {
		return { tipo: 'V', numero: trimmed.slice(2).replace(/\D/g, '') }
	}
	if (trimmed.startsWith('J-')) {
		return { tipo: 'J', numero: trimmed.slice(2).replace(/\D/g, '') }
	}
	return { tipo: 'V', numero: trimmed.replace(/\D/g, '') }
}

export function buildDocumentId(tipo: AseguradoDocumentTipo, numero: string): string {
	if (tipo === 'S/C') return 'S/C'
	if (tipo === 'P') {
		const n = numero.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
		if (!n) return ''
		return `P-${n}`
	}
	const n = numero.replace(/\D/g, '')
	if (!n) return ''
	if (tipo === 'J' && n.length === 9) return `J-${n.slice(0, 8)}-${n.slice(8)}`
	return `${tipo}-${n}`
}

/** Normaliza el número al cambiar el tipo en el formulario */
export function normalizeDocumentNumeroForTipo(
	tipo: AseguradoDocumentTipo,
	prevNumero: string,
): string {
	if (tipo === 'S/C') return ''
	if (tipo === 'P') return prevNumero.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
	return prevNumero.replace(/\D/g, '')
}
