export const normalizePhoneDigits = (value: string | number | null | undefined): string => {
	if (value === null || value === undefined) return ''
	return String(value).replace(/\D/g, '')
}

export const formatPhoneForDisplay = (value: string | number | null | undefined): string => {
	const digits = normalizePhoneDigits(value)
	if (!digits) return 'Sin teléfono'

	// Venezuela heuristics
	// +58 + 3 (area) + 7 (line) => length 12
	if (digits.startsWith('58') && digits.length === 12) {
		const cc = '+58'
		const area = digits.slice(2, 5)
		const line = digits.slice(5)
		return `${cc} (${area}) ${line.slice(0, 3)}-${line.slice(3)}`
	}

	// Local VE 0 + 3 + 7 => length 11
	if (digits.length === 11 && digits.startsWith('0')) {
		const area = digits.slice(1, 4)
		const line = digits.slice(4)
		return `0${area}-${line}`
	}

	// 10 digits (US-like)
	if (digits.length === 10) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
	}

	// 7 digits (local)
	if (digits.length === 7) {
		return `${digits.slice(0, 3)}-${digits.slice(3)}`
	}

	// Fallback: group in chunks of 3-4
	return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

export const formatPhoneForWhatsApp = (value: string | number | null | undefined): string => {
  const digits = normalizePhoneDigits(value)
  if (!digits) return ''

  // 1. Caso Venezuela Internacional (Ya tiene el 58)
  // Entrada: "58-412-123.45.67" -> Salida: "584121234567"
  if (digits.startsWith('58') && digits.length === 12) {
    return digits
  }

  // 2. Caso Venezuela Local (Empieza con 0, ej: 0414...)
  // WhatsApp no acepta el "0" inicial junto al código de país.
  // Entrada: "0414-1234567" -> Salida: "584141234567"
  if (digits.length === 11 && digits.startsWith('0')) {
    return `58${digits.slice(1)}`
  }

  // 3. Caso USA / 10 dígitos (Sin código de país)
  // Si tiene 10 dígitos, asumimos que falta el código de país. 
  // (Aquí puedes cambiar '1' por el código que más uses, ej: '57' para Colombia)
  if (digits.length === 10) {
    return `1${digits}`
  }

  // 4. Caso local de 7 dígitos (Sin código de área ni país)
  // Aquí es más difícil adivinar, pero podemos asumir Venezuela (212) + 58
  if (digits.length === 7) {
    return `58212${digits}`
  }

  // Fallback: Si no cumple nada, solo devolvemos los dígitos limpios
  return digits
}