// Edge Function: polizas-payment-email
// Tras marcar pago: envía correo al asegurado y a la aseguradora (todos los correos válidos en sus registros).
// Adjunto: descarga URL pública del comprobante en bucket aseguradora-recibos (anti-SSRF).
// Requiere JWT de usuario del laboratorio. Secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

function escapeHtml(s: string | null | undefined): string {
	const str = s == null ? '' : String(s)
	return str
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseEmailsFromField(raw: string | null | undefined): string[] {
	if (!raw || !String(raw).trim()) return []
	const parts = String(raw)
		.split(/[,;\n]+/)
		.map((s) => s.trim())
		.filter(Boolean)
	const out: string[] = []
	for (const p of parts) {
		if (EMAIL_RE.test(p)) out.push(p.toLowerCase())
	}
	return out
}

function uniqueEmails(lists: string[][]): string[] {
	const set = new Set<string>()
	for (const list of lists) {
		for (const e of list) set.add(e.toLowerCase())
	}
	return [...set]
}

function uint8ToBase64(bytes: Uint8Array): string {
	const chunk = 0x8000
	let binary = ''
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
	}
	return btoa(binary)
}

function isAllowedReceiptUrl(urlStr: string, supabaseUrl: string): boolean {
	try {
		const u = new URL(urlStr)
		const base = new URL(supabaseUrl)
		if (u.hostname !== base.hostname) return false
		return u.pathname.includes('/storage/v1/object/public/aseguradora-recibos/')
	} catch {
		return false
	}
}

function safeFilename(name: string | null | undefined, fallback: string): string {
	const n = (name ?? '').trim().replace(/[/\\?%*:|"<>]/g, '_').slice(0, 200)
	return n || fallback
}

interface Body {
	poliza_id?: string
	fecha_pago?: string
	monto?: number
	metodo_pago?: string | null
	referencia?: string | null
	notas?: string | null
	documento_pago_url?: string | null
	attachment_filename?: string | null
}

Deno.serve(async (req: Request) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders })
	}

	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const authHeader = req.headers.get('Authorization') ?? ''
	if (!authHeader.startsWith('Bearer ')) {
		return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	if (!authHeader.replace(/^Bearer\s+/i, '').trim()) {
		return new Response(JSON.stringify({ success: false, error: 'Token faltante' }), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	let body: Body
	try {
		body = (await req.json()) as Body
	} catch {
		return new Response(JSON.stringify({ success: false, error: 'JSON inválido' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const polizaId = body.poliza_id?.trim()
	if (!polizaId) {
		return new Response(JSON.stringify({ success: false, error: 'poliza_id requerido' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const fechaPago = body.fecha_pago?.trim()
	const monto = body.monto
	if (!fechaPago || monto == null || Number.isNaN(Number(monto))) {
		return new Response(JSON.stringify({ success: false, error: 'fecha_pago y monto son requeridos' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
	const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
	const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
	if (!supabaseUrl || !anonKey || !serviceKey) {
		return new Response(JSON.stringify({ success: false, error: 'Configuración del servidor incompleta' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const userClient = createClient(supabaseUrl, anonKey, {
		global: { headers: { Authorization: authHeader } },
	})
	const { data: userData, error: authErr } = await userClient.auth.getUser()
	const user = userData?.user
	if (authErr || !user) {
		return new Response(JSON.stringify({ success: false, error: 'Sesión inválida' }), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const admin = createClient(supabaseUrl, serviceKey)
	const { data: profile, error: profErr } = await admin
		.from('profiles')
		.select('laboratory_id')
		.eq('id', user.id)
		.maybeSingle()

	if (profErr || !profile?.laboratory_id) {
		return new Response(JSON.stringify({ success: false, error: 'Perfil no encontrado' }), {
			status: 403,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const labId = profile.laboratory_id as string

	const { data: poliza, error: polErr } = await admin
		.from('polizas')
		.select(
			'id, laboratory_id, numero_poliza, asegurado:asegurados(email, full_name), aseguradora:aseguradoras(email, nombre)',
		)
		.eq('id', polizaId)
		.eq('laboratory_id', labId)
		.maybeSingle()

	if (polErr || !poliza) {
		return new Response(JSON.stringify({ success: false, error: 'Póliza no encontrada' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const row = poliza as {
		numero_poliza: string
		asegurado: { email: string | null; full_name: string | null } | null
		aseguradora: { email: string | null; nombre: string | null } | null
	}

	const asegEmails = parseEmailsFromField(row.asegurado?.email ?? null)
	const aseguradoraEmails = parseEmailsFromField(row.aseguradora?.email ?? null)
	const recipients = uniqueEmails([asegEmails, aseguradoraEmails])

	if (recipients.length === 0) {
		return new Response(
			JSON.stringify({
				success: true,
				emailSent: false,
				reason: 'no_email',
				message:
					'No hay correos registrados para el asegurado ni la aseguradora. Añade al menos un correo para enviar el comprobante.',
			}),
			{ status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
		)
	}

	const resendKey = Deno.env.get('RESEND_API_KEY')
	if (!resendKey) {
		return new Response(
			JSON.stringify({
				success: false,
				error: 'RESEND_API_KEY no configurado en la Edge Function',
			}),
			{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
		)
	}

	const { data: lab } = await admin.from('laboratories').select('name').eq('id', labId).maybeSingle()
	const labName = (lab as { name?: string } | null)?.name ?? 'Laboratorio'

	const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'
	const fromName = Deno.env.get('RESEND_FROM_NAME') || labName

	const aseguradoName = row.asegurado?.full_name?.trim() || 'Asegurado/a'
	const numeroPoliza = row.numero_poliza
	const montoStr = Number(monto).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
	const metodo = body.metodo_pago?.trim() || '—'
	const ref = body.referencia?.trim() || '—'
	const notas = body.notas?.trim() || '—'

	const subject = `${labName} – Comprobante de pago · Póliza ${numeroPoliza}`

	const detailRows = [
		['Póliza', numeroPoliza],
		['Fecha de pago', fechaPago],
		['Monto', montoStr],
		['Método', metodo],
		['Referencia', ref],
		['Notas', notas],
	]
	const detailsHtml = detailRows
		.map(
			([k, v]) =>
				`<tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:600;color:#444;">${escapeHtml(k)}</td><td style="padding:8px 12px;border:1px solid #eee;color:#333;">${escapeHtml(v)}</td></tr>`,
		)
		.join('')

	const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
    <p style="margin: 0; font-size: 18px; font-weight: 600;">Pago registrado</p>
    <p style="margin: 8px 0 0; opacity: 0.95; font-size: 14px;">${escapeHtml(numeroPoliza)}</p>
  </div>
  <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="color:#333;font-size:16px;">Estimado/a <strong>${escapeHtml(aseguradoName)}</strong>,</p>
    <p style="color:#555;font-size:15px;line-height:1.6;">Le confirmamos que hemos registrado un pago asociado a su póliza. A continuación el detalle:</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">${detailsHtml}</table>
    <p style="color:#666;font-size:14px;">Si adjuntamos un comprobante, lo encontrará en este correo como archivo adjunto.</p>
    <p style="color:#999;font-size:13px;margin-top:24px;">Saludos cordiales,<br><strong>${escapeHtml(labName)}</strong></p>
  </div>
</body>
</html>`.trim()

	const attachments: { filename: string; content: string }[] = []
	const docUrl = body.documento_pago_url?.trim() || ''
	if (docUrl) {
		if (!isAllowedReceiptUrl(docUrl, supabaseUrl)) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'URL de comprobante no permitida',
				}),
				{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
			)
		}
		try {
			const r = await fetch(docUrl)
			if (!r.ok) {
				throw new Error(`HTTP ${r.status}`)
			}
			const buf = new Uint8Array(await r.arrayBuffer())
			if (buf.byteLength > MAX_ATTACHMENT_BYTES) {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'El comprobante supera el tamaño máximo permitido (25 MB)',
					}),
					{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
				)
			}
			let fname = safeFilename(body.attachment_filename, 'comprobante')
			try {
				const pathLast = decodeURIComponent(new URL(docUrl).pathname.split('/').pop() || '')
				if (pathLast && !body.attachment_filename?.trim()) {
					const cleaned = pathLast.replace(/^\d+_/, '')
					fname = safeFilename(cleaned, 'comprobante')
				}
			} catch {
				/* keep fname */
			}
			attachments.push({ filename: fname, content: uint8ToBase64(buf) })
		} catch (e) {
			console.error('polizas-payment-email fetch attachment:', e)
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No se pudo descargar el comprobante para adjuntarlo',
				}),
				{ status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
			)
		}
	}

	const resend = new Resend(resendKey)

	try {
		const { data, error } = await resend.emails.send({
			from: `${fromName} <${fromEmail}>`,
			to: recipients,
			subject,
			html,
			...(attachments.length > 0 ? { attachments } : {}),
		})

		if (error) {
			console.error('Resend error:', error)
			return new Response(
				JSON.stringify({
					success: false,
					error: error.message || 'Error al enviar el correo',
				}),
				{ status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
			)
		}

		return new Response(
			JSON.stringify({
				success: true,
				emailSent: true,
				recipients,
				messageId: data?.id ?? null,
			}),
			{ status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
		)
	} catch (e) {
		console.error('polizas-payment-email:', e)
		return new Response(
			JSON.stringify({
				success: false,
				error: e instanceof Error ? e.message : 'Error al enviar el correo',
			}),
			{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
		)
	}
})
