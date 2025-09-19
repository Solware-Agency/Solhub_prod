import { type FormValues } from '../form-schema'

// --- Helper: Map payments array to flat columns for Supabase ---
export const mapPaymentsToColumns = (payments: FormValues['payments']) => {
	// Siempre crea hasta 4 pares, rellenando null si no hay tantos métodos
	const columns: Record<string, string | number | null> = {}
	
	// Initialize all payment fields as null
	for (let i = 0; i < 4; i++) {
		columns[`payment_method_${i + 1}`] = null
		columns[`payment_amount_${i + 1}`] = null
		columns[`payment_reference_${i + 1}`] = null
	}
	
	// Fill in the values that exist
	if (payments && payments.length > 0) {
		for (let i = 0; i < Math.min(payments.length, 4); i++) {
			const payment = payments[i]
			if (payment) {
				columns[`payment_method_${i + 1}`] = payment.method || null
				columns[`payment_amount_${i + 1}`] = payment.amount ?? null
				columns[`payment_reference_${i + 1}`] = payment.reference || null
			}
		}
	}
	
	return columns
}