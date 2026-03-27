import { supabase, POLIZAS_PAYMENT_EMAIL_FUNCTION_URL } from '../config/config'

export type PolizaPaymentEmailResult =
	| { success: true; emailSent: true; recipients?: string[]; messageId?: string | null }
	| { success: true; emailSent: false; reason: 'no_email'; message: string }
	| { success: false; error: string }

export interface PolizaPaymentEmailPayload {
	poliza_id: string
	fecha_pago: string
	monto: number
	metodo_pago?: string | null
	referencia?: string | null
	notas?: string | null
	documento_pago_url?: string | null
	attachment_filename?: string | null
}

/**
 * Envía correo con detalle del pago y adjunto del comprobante (Edge Function polizas-payment-email).
 * Destinatarios: correos válidos del asegurado y de la aseguradora (deduplicados).
 */
export async function sendPolizaPaymentEmail(payload: PolizaPaymentEmailPayload): Promise<PolizaPaymentEmailResult> {
	if (!POLIZAS_PAYMENT_EMAIL_FUNCTION_URL) {
		return { success: false, error: 'URL de función de correo no configurada' }
	}

	const {
		data: { session },
	} = await supabase.auth.getSession()
	if (!session?.access_token) {
		return { success: false, error: 'No hay sesión activa' }
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${session.access_token}`,
	}

	const response = await fetch(POLIZAS_PAYMENT_EMAIL_FUNCTION_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload),
	})

	let result: Record<string, unknown>
	try {
		result = (await response.json()) as Record<string, unknown>
	} catch {
		return { success: false, error: `Respuesta inválida del servidor (${response.status})` }
	}

	if (!response.ok) {
		const err = typeof result.error === 'string' ? result.error : 'Error al enviar el correo'
		return { success: false, error: err }
	}

	if (result.emailSent === false && result.reason === 'no_email' && typeof result.message === 'string') {
		return { success: true, emailSent: false, reason: 'no_email', message: result.message }
	}

	if (result.success === true && result.emailSent === true) {
		const recipients = Array.isArray(result.recipients)
			? (result.recipients as string[]).filter((e) => typeof e === 'string')
			: undefined
		const messageId = typeof result.messageId === 'string' || result.messageId === null ? (result.messageId as string | null) : null
		return { success: true, emailSent: true, recipients, messageId }
	}

	if (result.success === true) {
		return { success: true, emailSent: true }
	}

	return { success: false, error: typeof result.error === 'string' ? result.error : 'Error desconocido' }
}
