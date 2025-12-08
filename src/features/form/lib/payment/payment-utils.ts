import { type FormValues } from '../form-schema'
import { parseDecimalNumber } from '@shared/utils/number-utils'

type Payment = FormValues['payments'][0]

// List of payment methods that are in bolívares (VES)
const BOLIVARES_METHODS = ['punto de venta', 'pago móvil', 'pago movil', 'bs en efectivo', 'transferencia']

/**
 * Checks if a payment method is in bolívares (VES)
 */
export const isBolivaresMethod = (method: string | undefined): boolean => {
	if (!method) return false
	const normalized = method.toLowerCase().trim()
	return BOLIVARES_METHODS.includes(normalized)
}

/**
 * Calculates payment details including conversion from VES to USD
 * @param payments Array of payment objects
 * @param totalAmount Total amount in USD
 * @param exchangeRate Current exchange rate (VES/USD)
 * @returns Payment status information
 */
export const calculatePaymentDetails = (
	payments: Payment[],
	totalAmount: number | string | undefined,
	exchangeRate: number | undefined,
) => {
	const totalAmountValue = totalAmount ? parseDecimalNumber(totalAmount) : 0

	// If total amount is 0, don't show payment status (let validation handle it)
	if (totalAmountValue === 0) {
		return {
			paymentStatus: null,
			isPaymentComplete: false,
			missingAmount: 0,
		}
	}

	const currentTotalPaid = payments.reduce((acc, payment) => {
		const amount = payment.amount ? parseDecimalNumber(payment.amount) : 0
		if (!payment.method || !amount) return acc

		// Check if payment is in bolívares and convert to USD if needed
		if (isBolivaresMethod(payment.method)) {
			if (exchangeRate && exchangeRate > 0) {
				// Convert VES to USD using exchange rate
				return acc + amount / exchangeRate
			}
			return acc
		} else {
			// Payment is already in USD
			return acc + amount
		}
	}, 0)

	let paymentStatus: 'Incompleto' | 'Pagado' | null = null
	let isPaymentComplete = false
	let missingAmount = 0

	if (totalAmountValue > 0) {
		// Round total paid to 2 decimals to avoid floating point issues
		const finalTotalPaid = parseFloat(currentTotalPaid.toFixed(2))
		missingAmount = parseFloat((totalAmountValue - finalTotalPaid).toFixed(2))

		// Consider payment complete if difference is less than 1 cent
		isPaymentComplete = finalTotalPaid >= totalAmountValue

		if (isPaymentComplete) {
			paymentStatus = 'Pagado'
			missingAmount = 0
		} else if (missingAmount > 0) {
			// If missing less than 1 cent, don't show anything
			paymentStatus = 'Incompleto'
		}
	}

	return { paymentStatus, isPaymentComplete, missingAmount }
}

// Function to calculate payment details from medical record payment fields
export const calculatePaymentDetailsFromRecord = (record: {
	total_amount: number
	payment_method_1?: string | null
	payment_amount_1?: number | null
	payment_method_2?: string | null
	payment_amount_2?: number | null
	payment_method_3?: string | null
	payment_amount_3?: number | null
	payment_method_4?: string | null
	payment_amount_4?: number | null
	exchange_rate?: number | null
}) => {
	const totalAmount = record.total_amount || 0
	const exchangeRate = record.exchange_rate || undefined

	// If total amount is 0, consider payment complete
    if (totalAmount === 0) {
			return {
				paymentStatus: 'Pagado',
				isPaymentComplete: true,
				missingAmount: 0,
			}
		}

	// Convert medical record payment fields to payments array format
	const payments = []

	for (let i = 1; i <= 4; i++) {
		const method = record[`payment_method_${i}` as keyof typeof record] as string | null
		const amount = record[`payment_amount_${i}` as keyof typeof record] as number | null

		if (method && amount && amount > 0) {
			payments.push({
				method,
				amount,
				reference: '', // Reference not needed for calculation
			})
		}
	}

	return calculatePaymentDetails(payments, totalAmount, exchangeRate)
}

/**
 * Validates if the total payments (with VES converted to USD) match the total amount
 * @param payments Array of payment objects
 * @param totalAmount Total amount in USD
 * @param exchangeRate Current exchange rate (VES/USD)
 * @returns Whether the payments are valid
 */
export const validatePaymentTotal = (
	payments: Payment[],
	totalAmount: number,
	exchangeRate: number | undefined,
): boolean => {
	if (totalAmount <= 0) return true

	const { isPaymentComplete } = calculatePaymentDetails(payments, totalAmount, exchangeRate)
	return isPaymentComplete
}

/**
 * Calculates the total amount paid in USD (converting VES payments)
 * @param payments Array of payment objects
 * @param exchangeRate Current exchange rate (VES/USD)
 * @returns Total amount paid in USD
 */
export const calculateTotalPaidUSD = (payments: Payment[], exchangeRate: number | undefined): number => {
	let totalUSD = 0
	
	payments.forEach(payment => {
		const amount = payment.amount ? parseDecimalNumber(payment.amount) : 0
		if (!payment.method || !amount) return

		if (isBolivaresMethod(payment.method)) {
			if (exchangeRate && exchangeRate > 0) {
				// Convertir Bs a USD usando la tasa
				const usdAmount = amount / exchangeRate
				totalUSD += usdAmount
			} else {
				// Si no hay tasa de cambio válida, no podemos convertir
				// No sumamos nada para evitar cálculos incorrectos
				// Esto mostrará el pago como incompleto hasta que se actualice la tasa
			}
		} else {
			// Pago en USD, sumar directamente
			totalUSD += amount
		}
	})
	
	return totalUSD
}

/**
 * Validates form payments for registration (specific for form validation)
 * @param payments Array of payment objects from form
 * @param totalAmount Total amount in USD
 * @param exchangeRate Current exchange rate (VES/USD)
 * @returns Validation result with details
 */
export const validateFormPayments = (
	payments: Payment[],
	totalAmount: number,
	exchangeRate: number | undefined,
): { isValid: boolean; totalPaidUSD: number; errorMessage?: string } => {
	// Filter out empty payments
	const validPayments = payments.filter((payment) => payment.method && payment.amount && payment.amount > 0)

	if (validPayments.length === 0) {
		return { isValid: true, totalPaidUSD: 0 }
	}

	// Calculate total paid in USD (converting VES payments)
	const totalPaidUSD = calculateTotalPaidUSD(validPayments, exchangeRate)

	// Check if total paid exceeds total amount (with tolerance for floating point precision)
	// Allow for small differences (less than 1 cent) due to currency conversion precision
	const tolerance = 0.01 // Allow up to 1 cent difference for floating point precision
	const difference = totalPaidUSD - totalAmount

	if (difference > tolerance) {
		const errorMessage = `El total de pagos (${totalPaidUSD.toFixed(
			2,
		)} USD) excede el monto total del caso (${totalAmount.toFixed(2)} USD) por $${difference.toFixed(2)} USD`
		return { isValid: false, totalPaidUSD, errorMessage }
	}

	return { isValid: true, totalPaidUSD }
}