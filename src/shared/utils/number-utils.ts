/**
 * Utilities for handling number formatting and parsing
 * Supports both comma and dot as decimal separators
 */

/**
 * Safely parses a string to a number, handling both comma and dot as decimal separators
 * Examples:
 * - "5606.39" → 5606.39
 * - "5606,39" → 5606.39
 * - "5.606,39" → 5606.39 (European format)
 * - "5,606.39" → 5606.39 (US format)
 * - "560639" → 560639
 * @param value String value to parse
 * @returns Parsed number or 0 if invalid
 */
export const parseDecimalNumber = (value: string | number): number => {
	if (typeof value === 'number') return value
	if (!value || typeof value !== 'string') return 0

	// Remove any whitespace
	const cleaned = value.trim()
	if (cleaned === '') return 0

	// Handle different decimal separator formats
	let normalizedValue = cleaned

	// Count occurrences of comma and dot
	const commaCount = (normalizedValue.match(/,/g) || []).length
	const dotCount = (normalizedValue.match(/\./g) || []).length

	// Find last positions
	const lastCommaIndex = normalizedValue.lastIndexOf(',')
	const lastDotIndex = normalizedValue.lastIndexOf('.')

	if (commaCount === 1 && dotCount === 0) {
		// Simple case: only comma (5606,39) - treat as decimal separator
		normalizedValue = normalizedValue.replace(',', '.')
	} else if (dotCount === 1 && commaCount === 0) {
		// Simple case: only dot (5606.39) - already correct
		// normalizedValue remains the same
	} else if (commaCount > 0 && dotCount > 0) {
		// Both present - determine which is decimal separator by position
		if (lastCommaIndex > lastDotIndex) {
			// European format: 5.606,39 - comma is decimal, dots are thousands
			normalizedValue = normalizedValue.replace(/\./g, '').replace(',', '.')
		} else {
			// US format: 5,606.39 - dot is decimal, commas are thousands
			normalizedValue = normalizedValue.replace(/,/g, '')
		}
	} else if (commaCount > 1 && dotCount === 0) {
		// Multiple commas, no dots: 5,606,789 - commas are thousands separators
		normalizedValue = normalizedValue.replace(/,/g, '')
	} else if (dotCount > 1 && commaCount === 0) {
		// Multiple dots, no commas: 5.606.789 - dots are thousands separators, treat as integer
		normalizedValue = normalizedValue.replace(/\./g, '')
	}

	const parsed = parseFloat(normalizedValue)
	return isNaN(parsed) ? 0 : parsed
}

/**
 * Formats a number for display in an input field
 * @param value Number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string
 */
export const formatNumberForInput = (value: number | string, decimals: number = 2): string => {
	const num = parseDecimalNumber(value)
	if (num === 0) return ''
	// Return without decimals if it's a whole number, otherwise with decimals
	return num % 1 === 0 ? num.toString() : num.toFixed(decimals)
}

/**
 * Formats a number for display with European format (dots for thousands, comma for decimals)
 * @param value Number to format
 * @param decimals Number of decimal places (default: 2)
 * @param showCurrency Whether to show currency symbol (default: false)
 * @returns Formatted string (e.g., "1.000,12" or "$1.000,12")
 */
export const formatNumberForDisplay = (value: number | string, decimals: number = 2, showCurrency: boolean = false): string => {
	const num = parseDecimalNumber(value)
	
	// Format with European style: dots for thousands, comma for decimals
	const formatted = num.toLocaleString('de-DE', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	})
	
	// Add currency symbol if requested
	return showCurrency ? `$${formatted}` : formatted
}

/**
 * Formats a number as currency with European format
 * @param value Number to format
 * @param currency Currency code (default: 'USD')
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "$1.000,12")
 */
export const formatCurrency = (value: number | string, decimals: number = 2): string => {
	const num = parseDecimalNumber(value)
	
	// Format with European style: dots for thousands, comma for decimals
	const formatted = num.toLocaleString('de-DE', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	})
	
	// Add currency symbol
	return `$${formatted}`
}

/**
 * Formats a number as currency with custom symbol
 * @param value Number to format
 * @param symbol Currency symbol (e.g., '$', 'Bs')
 * @param decimals Number of decimal places
 * @returns Formatted currency string
 */
export const formatCurrencyWithSymbol = (value: number | string, symbol: string = '$', decimals: number = 2): string => {
	const num = parseDecimalNumber(value)
	
	// Format with European style: dots for thousands, comma for decimals
	const formatted = num.toLocaleString('de-DE', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	})
	
	// Add currency symbol
	return `${symbol}${formatted}`
}

/**
 * Formats a number with dots as thousands separators (for integers and whole numbers)
 * @param value Number to format
 * @returns Formatted string with dots for thousands (e.g., "1.241", "12.345")
 */
export const formatNumber = (value: number | string): string => {
	const num = parseDecimalNumber(value)
	
	// Format with European style: dots for thousands, no decimals for integers
	return num.toLocaleString('de-DE', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})
}

/**
 * Validates if a string represents a valid number
 * @param value String to validate
 * @returns True if valid number
 */
export const isValidNumber = (value: string): boolean => {
	if (!value || value.trim() === '') return true // Empty is valid (will be 0)
	const parsed = parseDecimalNumber(value)
	return !isNaN(parsed) && isFinite(parsed)
}

/**
 * Creates an input change handler that properly parses decimal numbers
 * @param onChange Callback function to call with parsed number
 * @returns Input change handler
 */
export const createNumberInputHandler = (onChange: (value: number) => void) => {
	return (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value

		// Allow empty value for better UX
		if (inputValue === '') {
			onChange(0)
			return
		}

		// Only update if it's a valid number format
		if (isValidNumber(inputValue)) {
			const parsedValue = parseDecimalNumber(inputValue)
			onChange(parsedValue)
		}
		// If invalid, don't update the state (keeps previous valid value)
	}
}

/**
 * Detects if a payment method is in Bolívares (VES)
 * @param method Payment method string
 * @returns True if payment is in VES
 */
export const isVESPaymentMethod = (method: string | null | undefined): boolean => {
	if (!method) return false
	const vesMethods = ['Punto de venta', 'Pago móvil', 'Bs en efectivo']
	return vesMethods.includes(method)
}

/**
 * Converts VES amount to USD using exchange rate
 * @param vesAmount Amount in VES
 * @param exchangeRate Exchange rate (VES/USD)
 * @returns Amount in USD
 */
export const convertVEStoUSD = (vesAmount: number, exchangeRate: number): number => {
	if (!exchangeRate || exchangeRate <= 0) return 0
	return vesAmount / exchangeRate
}

/**
 * Converts USD amount to VES using exchange rate
 * @param usdAmount Amount in USD
 * @param exchangeRate Exchange rate (VES/USD)
 * @returns Amount in VES
 */
export const convertUSDtoVES = (usdAmount: number, exchangeRate: number): number => {
	if (!exchangeRate || exchangeRate <= 0) return 0
	return usdAmount * exchangeRate
}

/**
 * Detects and auto-corrects amounts that likely lost decimal places
 * Specifically for VES payments that are suspiciously large
 * @param amount The amount to check
 * @param paymentMethod The payment method
 * @param exchangeRate Current exchange rate for context
 * @returns Corrected amount if needed, original amount otherwise
 */
export const autoCorrectDecimalAmount = (
	amount: number,
	paymentMethod: string | null | undefined,
	exchangeRate?: number,
): { correctedAmount: number; wasCorreted: boolean; reason?: string } => {
	// Only check VES payment methods
	if (!isVESPaymentMethod(paymentMethod) || !amount || amount <= 0) {
		return { correctedAmount: amount, wasCorreted: false }
	}

	// If amount is suspiciously large for a VES payment
	// Most medical exams cost less than $150 USD
	// At rate 112 Bs/USD, that's ~16,800 Bs
	// So anything over 20,000 Bs is likely missing decimals
	if (amount > 20000) {
		const correctedAmount = amount / 100

		// Double check: corrected amount should make sense
		// (between 50 Bs and 20,000 Bs)
		if (correctedAmount >= 50 && correctedAmount <= 20000) {
			return {
				correctedAmount,
				wasCorreted: true,
				reason: `Monto original ${amount} Bs parecía muy alto, corregido a ${correctedAmount} Bs`,
			}
		}
	}

	// If we have exchange rate, do additional validation
	if (exchangeRate && exchangeRate > 0) {
		const usdEquivalent = amount / exchangeRate

		// If USD equivalent is over $200, likely wrong
		if (usdEquivalent > 200) {
			const correctedAmount = amount / 100
			const correctedUSD = correctedAmount / exchangeRate

			if (correctedUSD >= 5 && correctedUSD <= 200) {
				return {
					correctedAmount,
					wasCorreted: true,
					reason: `Monto ${amount} Bs (${usdEquivalent.toFixed(
						2,
					)} USD) parecía muy alto, corregido a ${correctedAmount} Bs (${correctedUSD.toFixed(2)} USD)`,
				}
			}
		}
	}

	return { correctedAmount: amount, wasCorreted: false }
}

/**
 * Enhanced parseDecimalNumber that also auto-corrects likely database errors
 * @param value String or number to parse
 * @param paymentMethod Payment method for context
 * @param exchangeRate Exchange rate for validation
 * @returns Parsed and potentially corrected number
 */
export const parseAndCorrectDecimalNumber = (
	value: string | number,
	paymentMethod?: string | null,
	exchangeRate?: number,
): { amount: number; wasCorreted: boolean; reason?: string } => {
	const parsed = parseDecimalNumber(value)
	const { correctedAmount, wasCorreted, reason } = autoCorrectDecimalAmount(parsed, paymentMethod, exchangeRate)

	return { amount: correctedAmount, wasCorreted, reason }
}

/**
 * Calculator-style input behavior for amount fields
 * Each digit pushes the value to the right, like a POS terminal
 */

/**
 * Adds a digit to the amount using calculator-style input
 * @param currentAmount Current amount value
 * @param digit The digit to add (0-9)
 * @returns New amount value
 */
export const addDigitToAmount = (currentAmount: number, digit: string): number => {
	// Convert current amount to cents (multiply by 100)
	const currentCents = Math.round(currentAmount * 100)

	// Parse the digit
	const digitValue = parseInt(digit, 10)
	if (isNaN(digitValue) || digitValue < 0 || digitValue > 9) {
		return currentAmount // Invalid digit, return unchanged
	}

	// Shift current value left and add new digit
	const newCents = currentCents * 10 + digitValue

	// Convert back to decimal (divide by 100)
	return newCents / 100
}

/**
 * Removes the last digit from the amount using calculator-style input
 * @param currentAmount Current amount value
 * @returns New amount value
 */
export const removeLastDigitFromAmount = (currentAmount: number): number => {
	// Convert to cents
	const currentCents = Math.round(currentAmount * 100)

	// Remove last digit by dividing by 10 and flooring
	const newCents = Math.floor(currentCents / 10)

	// Convert back to decimal
	return newCents / 100
}

/**
 * Formats amount for calculator-style display
 * Always shows 2 decimal places with comma as decimal separator
 * @param amount Amount to format
 * @returns Formatted string (e.g., "10,50")
 */
export const formatCalculatorAmount = (amount: number): string => {
	return amount.toFixed(2).replace('.', ',')
}

/**
 * Creates a calculator-style input handler for amount fields
 * @param currentValue Current amount value
 * @param onChange Callback when value changes
 * @returns Object with event handlers and formatted display value
 */
export const createCalculatorInputHandler = (currentValue: number, onChange: (newValue: number) => void) => {
	const displayValue = formatCalculatorAmount(currentValue)

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		const key = e.key

		// Handle digits 0-9
		if (/^[0-9]$/.test(key)) {
			e.preventDefault()
			const newValue = addDigitToAmount(currentValue, key)
			onChange(newValue)
			return
		}

		// Handle backspace
		if (key === 'Backspace') {
			e.preventDefault()
			const newValue = removeLastDigitFromAmount(currentValue)
			onChange(newValue)
			return
		}

		// Handle escape to reset to 0
		if (key === 'Escape') {
			e.preventDefault()
			onChange(0)
			return
		}

		// For Ctrl+V (paste), let it through to handlePaste
		if (e.ctrlKey && key === 'v') {
			// Don't preventDefault, let paste work
			return
		}

		// Allow tab, enter, arrow keys for navigation
		if (['Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
			// Let these keys work normally for navigation
			return
		}

		// Block other keys to maintain calculator behavior
		e.preventDefault()
	}

	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault()
		const pasteText = e.clipboardData.getData('text')
		console.log('🍄 Pegando:', pasteText) // Debug

		const pastedNumber = parseDecimalNumber(pasteText)
		console.log('🍄 Parseado:', pastedNumber) // Debug

		if (!isNaN(pastedNumber) && isFinite(pastedNumber) && pastedNumber >= 0) {
			console.log('🍄 Aplicando:', pastedNumber) // Debug
			onChange(pastedNumber)
		}
	}

	const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
		// Select all text on focus for easy replacement
		e.target.select()
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// This should not be called normally due to our controlled input
		// But we'll handle it just in case
		const inputValue = e.target.value
		console.log('🍄 handleChange:', inputValue, 'vs', displayValue) // Debug

		// Only process if significantly different (to avoid loops)
		if (inputValue !== displayValue && inputValue !== '') {
			const parsed = parseDecimalNumber(inputValue)
			if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
				console.log('🍄 Change aplicando:', parsed) // Debug
				onChange(parsed)
			}
		}
	}

	return {
		displayValue,
		handleKeyDown,
		handlePaste,
		handleFocus,
		handleChange,
	}
}

/**
 * Enhanced version that also shows currency symbol and conversion
 * @param currentValue Current amount value
 * @param onChange Callback when value changes
 * @param paymentMethod Payment method for currency detection
 * @param exchangeRate Exchange rate for conversion
 * @returns Extended handler with currency info
 */
export const createCalculatorInputHandlerWithCurrency = (
	currentValue: number,
	onChange: (newValue: number) => void,
	paymentMethod?: string | null,
	exchangeRate?: number,
) => {
	const baseHandler = createCalculatorInputHandler(currentValue, onChange)

	const isVES = isVESPaymentMethod(paymentMethod)
	const currencySymbol = isVES ? 'Bs' : '$'
	const placeholder = `0,00 ${currencySymbol}`

	// Calculate conversion text (both directions) when we have exchange rate
	let conversionText = ''
	if (exchangeRate && currentValue > 0) {
		if (isVES) {
			const usdAmount = convertVEStoUSD(currentValue, exchangeRate)
			conversionText = `≈ $${usdAmount.toFixed(2)} USD`
		} else {
			const vesAmount = convertUSDtoVES(currentValue, exchangeRate)
			conversionText = `≈ ${vesAmount.toFixed(2)} Bs`
		}
	}

	return {
		...baseHandler,
		currencySymbol,
		placeholder,
		conversionText,
		isVES,
	}
}
