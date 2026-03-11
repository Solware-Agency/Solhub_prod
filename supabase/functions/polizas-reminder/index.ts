// Supabase Edge Function: polizas-reminder
// Envía recordatorios de pago de pólizas al asegurado: 30, 14, 7 días antes, "vence hoy" y "póliza vencida" (post = día siguiente al vencimiento).
// Sin flags: la decisión se hace solo por fecha (next_payment_date vs hoy en timezone del lab).
// Usa Resend. Invocar por cron (pg_cron + pg_net) o manualmente.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

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
): string {
	const bodyHtml = escapeHtml(messagePlain).replace(/\n/g, '<br>')
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
    <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">Saludos cordiales,<br><strong>${escapeHtml(labName)}</strong></p>
  </div>
</body>
</html>
  `.trim()
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

	// Pólizas activas con next_payment_date definido (laboratory se obtiene por laboratory_id si hace falta)
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

	// Laboratorios (timezone, nombre) por laboratory_id
	const labIds = [...new Set(polizasList.map((p) => p.laboratory_id))]
	const { data: labs } = await sb.from('laboratories').select('id, name, config').in('id', labIds)
	const labMap = new Map<string, { name: string; timezone: string }>()
	if (labs) {
		for (const l of labs as { id: string; name: string; config?: { timezone?: string } }[]) {
			labMap.set(l.id, { name: l.name ?? 'SolHub', timezone: l.config?.timezone ?? DEFAULT_TZ })
		}
	}

	// Emails de asegurados
	const aseguradoIds = [...new Set(polizasList.map((p) => p.asegurado_id))]
	const { data: asegurados } = await sb.from('asegurados').select('id, email, full_name').in('id', aseguradoIds)
	const aseguradoMap = new Map<string, { email: string; full_name: string | null }>()
	if (asegurados) {
		for (const a of asegurados as { id: string; email: string | null; full_name: string | null }[]) {
			aseguradoMap.set(a.id, { email: a.email ?? '', full_name: a.full_name ?? null })
		}
	}

	for (const pol of polizasList) {
		const nextDate = pol.next_payment_date?.slice(0, 10) ?? null
		if (!nextDate) continue

		const lab = labMap.get(pol.laboratory_id)
		const labName = lab?.name ?? 'SolHub'
		const tz = lab?.timezone ?? DEFAULT_TZ
		const todayInTz = getTodayInTimezone(tz)
		const in30 = addCalendarDays(todayInTz, 30)
		const in14 = addCalendarDays(todayInTz, 14)
		const in7 = addCalendarDays(todayInTz, 7)
		const yesterday = addCalendarDays(todayInTz, -1)

		// Orden: vence hoy > post (ayer) > 7 > 14 > 30 → un solo tipo por póliza por día
		let type: PolizaReminderType | null = null
		if (nextDate === todayInTz) type = 'due_today'
		else if (nextDate === yesterday) type = 'post'
		else if (nextDate === in7) type = '7_days'
		else if (nextDate === in14) type = '14_days'
		else if (nextDate === in30) type = '30_days'

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

		let emailSent = false
		try {
			const { data, error } = await resend.emails.send({
				from: `${fromName} <${fromEmail}>`,
				to: [email],
				subject: fullSubject,
				html,
			})
			if (!error && data?.id) emailSent = true
		} catch (_e) {
			// continue
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
