// Supabase Edge Function: polizas-reminder
// Envía recordatorios de pago de pólizas al asegurado: 30, 14, 7 días antes, "vence hoy" y "póliza vencida" (post = día siguiente al vencimiento).
// Sin flags: la decisión se hace solo por fecha (next_payment_date vs hoy en timezone del lab).
// Usa Resend. Protección: cabecera x-polizas-reminder-secret === secret POLIZAS_REMINDER_SECRET.
// Modo prueba: POST JSON {"test":true} envía un solo correo a POLIZAS_REMINDER_TEST_EMAIL con datos de una póliza (ventana real o primera activa) y 4 PDFs Inntegras.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type, x-polizas-reminder-secret',
	'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const SECRET_HEADER = 'x-polizas-reminder-secret'

/** PDFs informativos solo para correos de pólizas Inntegras (Storage público). */
const INNTEGRAS_PDF_ASSETS: { filename: string; url: string }[] = [
	{
		filename: 'FORMAS DE PAGO VENEZUELA.pdf',
		url: 'https://sbqepjsxnqtldyvlntqk.supabase.co/storage/v1/object/public/emails-files/inntegras/FORMAS%20DE%20PAGO%20VENEZUELA.pdf',
	},
	{
		filename: 'NUEVA IMAGEN PAMM 2.0.pdf',
		url: 'https://sbqepjsxnqtldyvlntqk.supabase.co/storage/v1/object/public/emails-files/inntegras/NUEVA%20IMAGEN%20PAMM%202.0.pdf',
	},
	{
		filename: 'PROCESOS PARA ORDEN DE SERVICIOS MEDICOS PAMM 2.0.pdf',
		url: 'https://sbqepjsxnqtldyvlntqk.supabase.co/storage/v1/object/public/emails-files/inntegras/PROCESOS%20PARA%20ORDEN%20DE%20SERVICIOS%20MEDICOS%20PAMM%202.0.pdf',
	},
	{
		filename: 'RED SEGURA DE CLINICAS MERCANTIL.pdf',
		url: 'https://sbqepjsxnqtldyvlntqk.supabase.co/storage/v1/object/public/emails-files/inntegras/RED%20SEGURA%20DE%20CLINICAS%20MERCANTIL.pdf',
	},
]

function escapeHtml(s: string): string {
	return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

type PolizaReminderType = '30_days' | '14_days' | '7_days' | 'due_today' | 'post'

function getPolizaReminderSubject(type: PolizaReminderType): string {
	switch (type) {
		case '30_days':
			return 'Recordatorio de póliza – vence en 30 días'
		case '14_days':
			return 'Recordatorio de póliza – vence en 14 días'
		case '7_days':
			return 'Recordatorio de póliza – vence en 7 días'
		case 'due_today':
			return 'Recordatorio de póliza – vence hoy'
		case 'post':
			return 'Su póliza ha vencido'
		default:
			return 'Recordatorio de póliza'
	}
}

const DEFAULT_TZ = 'America/Caracas'

function getTodayInTimezone(tz: string): string {
	try {
		return new Date().toLocaleDateString('en-CA', { timeZone: tz })
	} catch {
		return new Date().toLocaleDateString('en-CA', { timeZone: DEFAULT_TZ })
	}
}

function addCalendarDays(dateStr: string, days: number): string {
	const [y, m, d] = dateStr.split('-').map(Number)
	const date = new Date(y, m - 1, d + days)
	const yy = date.getFullYear()
	const mm = String(date.getMonth() + 1).padStart(2, '0')
	const dd = String(date.getDate()).padStart(2, '0')
	return `${yy}-${mm}-${dd}`
}

function getReminderTypeForDate(nextDateYmd: string, tz: string): PolizaReminderType | null {
	const todayInTz = getTodayInTimezone(tz)
	const in30 = addCalendarDays(todayInTz, 30)
	const in14 = addCalendarDays(todayInTz, 14)
	const in7 = addCalendarDays(todayInTz, 7)
	const yesterday = addCalendarDays(todayInTz, -1)
	if (nextDateYmd === todayInTz) return 'due_today'
	if (nextDateYmd === yesterday) return 'post'
	if (nextDateYmd === in7) return '7_days'
	if (nextDateYmd === in14) return '14_days'
	if (nextDateYmd === in30) return '30_days'
	return null
}

function getPolizaReminderMessage(
	type: PolizaReminderType,
	labName: string,
	numeroPoliza: string,
	nextPaymentDate: string,
): string {
	if (type === 'post') {
		return `Le informamos que su póliza **${numeroPoliza}** (${labName}) **venció** el ${nextPaymentDate}.\n\nPor favor, regularice el pago para mantener su cobertura activa.`
	}
	switch (type) {
		case '30_days':
			return `Le recordamos que su póliza **${numeroPoliza}** (${labName}) vence el **${nextPaymentDate}** (en 30 días).\n\nPor favor, realice el pago a tiempo.`
		case '14_days':
			return `Le recordamos que su póliza **${numeroPoliza}** (${labName}) vence el **${nextPaymentDate}** (en 14 días).\n\nPor favor, realice el pago a tiempo.`
		case '7_days':
			return `Le recordamos que su póliza **${numeroPoliza}** (${labName}) vence el **${nextPaymentDate}** (en 7 días).\n\nPor favor, realice el pago a tiempo.`
		case 'due_today':
			return `**Importante:** Su póliza **${numeroPoliza}** (${labName}) vence **hoy** (${nextPaymentDate}).\n\nPor favor, regularice el pago para evitar la caducidad.`
		default:
			return `Recordatorio: póliza ${numeroPoliza} (${labName}). Próxima fecha: ${nextPaymentDate}.`
	}
}

function buildReminderHtml(
	aseguradoName: string,
	subject: string,
	messagePlain: string,
	labName: string,
	extraFooterHtml?: string,
): string {
	const bodyHtml = escapeHtml(messagePlain).replace(/\n/g, '<br>')
	const extra = extraFooterHtml ?? ''
	return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <p style="margin: 0; opacity: 0.9; font-size: 16px;">${escapeHtml(subject)}</p>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #eee; border-top: none;">
    <p style="color: #333; font-size: 16px; line-height: 1.6;">Estimado/a <strong style="color: #667eea;">${escapeHtml(aseguradoName)}</strong>,</p>
    <div style="color: #666; font-size: 16px; line-height: 1.8;">${bodyHtml}</div>
    ${extra}
    <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">Saludos cordiales,<br><strong>${escapeHtml(labName)}</strong></p>
  </div>
</body>
</html>
  `.trim()
}

function uint8ToBase64(bytes: Uint8Array): string {
	const chunk = 0x8000
	let binary = ''
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
	}
	return btoa(binary)
}

async function fetchInntegrasPdfAttachments(): Promise<{ filename: string; content: string }[]> {
	const out: { filename: string; content: string }[] = []
	for (const { filename, url } of INNTEGRAS_PDF_ASSETS) {
		const r = await fetch(url)
		if (!r.ok) {
			throw new Error(`No se pudo descargar ${filename}: HTTP ${r.status}`)
		}
		const buf = new Uint8Array(await r.arrayBuffer())
		out.push({ filename, content: uint8ToBase64(buf) })
	}
	return out
}

function isInntegrasSlug(slug: string | null | undefined): boolean {
	return (slug ?? '').toLowerCase() === 'inntegras'
}

Deno.serve(async (req: Request) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders })
	}

	if (req.method !== 'POST' && req.method !== 'GET') {
		return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	const expectedSecret = Deno.env.get('POLIZAS_REMINDER_SECRET')
	if (!expectedSecret) {
		return new Response(
			JSON.stringify({ success: false, error: 'POLIZAS_REMINDER_SECRET no está configurado' }),
			{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
		)
	}

	const providedSecret = req.headers.get(SECRET_HEADER) ?? ''
	if (providedSecret !== expectedSecret) {
		return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}

	let testMode = false
	if (req.method === 'POST') {
		try {
			const text = await req.text()
			if (text.trim()) {
				const body = JSON.parse(text) as { test?: boolean }
				testMode = body?.test === true
			}
		} catch {
			// cuerpo no JSON: flujo normal
		}
	}

	const supabaseUrl = Deno.env.get('SUPABASE_URL')!
	const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
	if (!supabaseUrl || !serviceRoleKey) {
		return new Response(
			JSON.stringify({ success: false, error: 'Configuración incompleta (SUPABASE_URL / SERVICE_ROLE_KEY)' }),
			{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
		)
	}

	const sb = createClient(supabaseUrl, serviceRoleKey)

	const resendKey = Deno.env.get('RESEND_API_KEY')
	const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'
	const fromName = Deno.env.get('RESEND_FROM_NAME') || 'Solhub'
	if (!resendKey) {
		return new Response(
			JSON.stringify({
				success: false,
				error: 'RESEND_API_KEY no configurado. Añade el secret en Edge Function Secrets.',
			}),
			{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
		)
	}

	const resend = new Resend(resendKey)
	const results: { polizaId: string; numeroPoliza: string; type: PolizaReminderType; emailSent: boolean }[] = []

	const { data: polizas, error: errPolizas } = await sb
		.from('polizas')
		.select('id, next_payment_date, numero_poliza, asegurado_id, laboratory_id')
		.eq('activo', true)
		.not('next_payment_date', 'is', null)

	if (errPolizas || !polizas || polizas.length === 0) {
		return new Response(
			JSON.stringify({
				success: true,
				sent: 0,
				reminders: results,
				test: testMode,
				message: errPolizas ? errPolizas.message : 'No hay pólizas para recordatorio',
			}),
			{ status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
		)
	}

	const polizasList = polizas as {
		id: string
		next_payment_date: string
		numero_poliza: string
		asegurado_id: string
		laboratory_id: string
	}[]

	const labIds = [...new Set(polizasList.map((p) => p.laboratory_id))]
	const { data: labs } = await sb.from('laboratories').select('id, name, config, slug').in('id', labIds)
	const labMap = new Map<string, { name: string; timezone: string; slug: string | null }>()
	if (labs) {
		for (const l of labs as {
			id: string
			name: string
			slug?: string | null
			config?: { timezone?: string }
		}[]) {
			labMap.set(l.id, {
				name: l.name ?? 'SolHub',
				timezone: l.config?.timezone ?? DEFAULT_TZ,
				slug: l.slug ?? null,
			})
		}
	}

	const aseguradoIds = [...new Set(polizasList.map((p) => p.asegurado_id))]
	const { data: asegurados } = await sb.from('asegurados').select('id, email, full_name').in('id', aseguradoIds)
	const aseguradoMap = new Map<string, { email: string; full_name: string | null }>()
	if (asegurados) {
		for (const a of asegurados as { id: string; email: string | null; full_name: string | null }[]) {
			aseguradoMap.set(a.id, { email: a.email ?? '', full_name: a.full_name ?? null })
		}
	}

	// ——— Modo prueba: un solo envío con 4 PDFs ———
	if (testMode) {
		const testEmail = Deno.env.get('POLIZAS_REMINDER_TEST_EMAIL')?.trim()
		if (!testEmail) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'POLIZAS_REMINDER_TEST_EMAIL no configurado (necesario para test)',
				}),
				{ status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
			)
		}

		let chosen: {
			pol: (typeof polizasList)[0]
			type: PolizaReminderType
		} | null = null

		for (const pol of polizasList) {
			const nextDate = pol.next_payment_date?.slice(0, 10) ?? null
			if (!nextDate) continue
			const lab = labMap.get(pol.laboratory_id)
			const tz = lab?.timezone ?? DEFAULT_TZ
			const type = getReminderTypeForDate(nextDate, tz)
			if (type) {
				chosen = { pol, type }
				break
			}
		}

		let usedFallback = false
		if (!chosen) {
			usedFallback = true
			chosen = {
				pol: polizasList[0],
				type: '7_days',
			}
		}

		const pol = chosen.pol
		const type = chosen.type
		const nextDate = pol.next_payment_date?.slice(0, 10) ?? ''
		const lab = labMap.get(pol.laboratory_id)
		const labName = lab?.name ?? 'SolHub'
		const asegurado = aseguradoMap.get(pol.asegurado_id)
		const aseguradoName = asegurado?.full_name || 'Asegurado'

		const subject = getPolizaReminderSubject(type)
		const message = getPolizaReminderMessage(type, labName, pol.numero_poliza, nextDate)
		let messagePlain = message.replace(/\*\*([^*]+)\*\*/g, '$1')
		if (usedFallback) {
			messagePlain +=
				'\n\n(Prueba: ninguna póliza caía en una ventana hoy; se usó la primera póliza activa con plantilla de 7 días.)'
		}
		const fullSubject = `[TEST] ${labName} – ${subject} (${pol.numero_poliza})`
		const testBanner =
			'<p style="color:#b45309;font-size:14px;margin-top:20px;padding:12px;background:#fffbeb;border-radius:8px;border:1px solid #fcd34d;">Correo de prueba (polizas-reminder). Destinatario real no recibe este envío.</p>'
		const html = buildReminderHtml(aseguradoName, subject, messagePlain, labName, testBanner)

		let attachments: { filename: string; content: string }[] = []
		try {
			attachments = await fetchInntegrasPdfAttachments()
		} catch (e) {
			return new Response(
				JSON.stringify({
					success: false,
					error: e instanceof Error ? e.message : 'Error descargando PDFs',
				}),
				{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
			)
		}

		try {
			const { data, error } = await resend.emails.send({
				from: `${fromName} <${fromEmail}>`,
				to: [testEmail],
				subject: fullSubject,
				html,
				attachments: attachments.map((a) => ({
					filename: a.filename,
					content: a.content,
				})),
			})
			if (error) {
				return new Response(JSON.stringify({ success: false, error: error.message, test: true }), {
					status: 502,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				})
			}
			return new Response(
				JSON.stringify({
					success: true,
					test: true,
					sent: 1,
					to: testEmail,
					polizaId: pol.id,
					numeroPoliza: pol.numero_poliza,
					reminderType: type,
					resendId: data?.id ?? null,
					attachmentsCount: attachments.length,
				}),
				{ status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
			)
		} catch (e) {
			return new Response(
				JSON.stringify({
					success: false,
					test: true,
					error: e instanceof Error ? e.message : 'Error enviando correo',
				}),
				{ status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
			)
		}
	}

	// ——— Producción ———
	let inntegrasAttachmentsCache: { filename: string; content: string }[] | undefined | 'err' = undefined

	async function getCachedInntegrasAttachments(): Promise<{ filename: string; content: string }[] | undefined> {
		if (inntegrasAttachmentsCache === 'err') return undefined
		if (inntegrasAttachmentsCache) return inntegrasAttachmentsCache
		try {
			inntegrasAttachmentsCache = await fetchInntegrasPdfAttachments()
			return inntegrasAttachmentsCache
		} catch {
			inntegrasAttachmentsCache = 'err'
			return undefined
		}
	}

	for (const pol of polizasList) {
		const nextDate = pol.next_payment_date?.slice(0, 10) ?? null
		if (!nextDate) continue

		const lab = labMap.get(pol.laboratory_id)
		const labName = lab?.name ?? 'SolHub'
		const tz = lab?.timezone ?? DEFAULT_TZ
		const type = getReminderTypeForDate(nextDate, tz)
		if (!type) continue

		const asegurado = aseguradoMap.get(pol.asegurado_id)
		const email = asegurado?.email?.trim()
		if (!email) {
			results.push({ polizaId: pol.id, numeroPoliza: pol.numero_poliza, type, emailSent: false })
			continue
		}

		const subject = getPolizaReminderSubject(type)
		const message = getPolizaReminderMessage(type, labName, pol.numero_poliza, nextDate)
		const messagePlain = message.replace(/\*\*([^*]+)\*\*/g, '$1')
		const fullSubject = `${labName} – ${subject} (${pol.numero_poliza})`
		const aseguradoName = asegurado.full_name || 'Asegurado'
		const html = buildReminderHtml(aseguradoName, subject, messagePlain, labName)

		const attachInntegras = isInntegrasSlug(lab?.slug)
		const attachments = attachInntegras ? await getCachedInntegrasAttachments() : undefined

		let emailSent = false
		try {
			const { data, error } = await resend.emails.send({
				from: `${fromName} <${fromEmail}>`,
				to: [email],
				subject: fullSubject,
				html,
				...(attachments?.length
					? {
							attachments: attachments.map((a) => ({
								filename: a.filename,
								content: a.content,
							})),
						}
					: {}),
			})
			if (!error && data?.id) emailSent = true
		} catch {
			// ignorar fallo de envío
		}
		results.push({ polizaId: pol.id, numeroPoliza: pol.numero_poliza, type, emailSent })
	}

	const totalSent = results.filter((r) => r.emailSent).length

	return new Response(
		JSON.stringify({
			success: true,
			sent: totalSent,
			reminders: results,
		}),
		{ status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
	)
})