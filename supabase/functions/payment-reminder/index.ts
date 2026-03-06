// Supabase Edge Function: payment-reminder
// Envía recordatorios de pago a owners: 15 días, 7 días, 1 día antes y "vence hoy".
// Usa Resend directamente (no llama a send-email). Invocar por cron (pg_cron + pg_net) o manualmente.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type ReminderType = "15_days" | "7_days" | "1_day" | "due_today";

function getReminderSubject(type: ReminderType): string {
  switch (type) {
    case "15_days":
      return "Recordatorio de pago – 15 días";
    case "7_days":
      return "Recordatorio de pago – 1 semana";
    case "1_day":
      return "Recordatorio de pago – mañana vence";
    case "due_today":
      return "Recordatorio de pago – vence hoy";
    default:
      return "Recordatorio de pago";
  }
}

function getReminderMessage(
  type: ReminderType,
  labName: string,
  nextPaymentDate: string,
  billingAmount: number | null
): string {
  const amountStr =
    billingAmount != null
      ? `\nMonto a pagar: ${billingAmount.toLocaleString("es")}`
      : "";
  switch (type) {
    case "15_days":
      return `Le recordamos que la próxima fecha de pago de su laboratorio **${labName}** es el **${nextPaymentDate}** (en 15 días).${amountStr}\n\nPor favor, realice el pago a tiempo para mantener su servicio activo.`;
    case "7_days":
      return `Le recordamos que la próxima fecha de pago de su laboratorio **${labName}** es el **${nextPaymentDate}** (en 7 días).${amountStr}\n\nPor favor, realice el pago a tiempo para mantener su servicio activo.`;
    case "1_day":
      return `Le recordamos que la próxima fecha de pago de su laboratorio **${labName}** es **mañana** (${nextPaymentDate}).${amountStr}\n\nPor favor, realice el pago para evitar interrupciones.`;
    case "due_today":
      return `**Importante:** La fecha de pago de su laboratorio **${labName}** es **hoy** (${nextPaymentDate}).${amountStr}\n\nTiene hasta 24 horas para regularizar el pago; después de ese plazo el laboratorio quedará inactivo.`;
    default:
      return `Recordatorio de pago para ${labName}. Próxima fecha: ${nextPaymentDate}.${amountStr}`;
  }
}

function buildReminderHtml(
  ownerName: string,
  subject: string,
  messagePlain: string,
  labName: string
): string {
  const bodyHtml = escapeHtml(messagePlain).replace(/\n/g, "<br>");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <p style="margin: 0; opacity: 0.9; font-size: 16px;">${escapeHtml(subject)}</p>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #eee; border-top: none;">
    <p style="color: #333; font-size: 16px; line-height: 1.6;">Estimado/a <strong style="color: #667eea;">${escapeHtml(ownerName)}</strong>,</p>
    <div style="color: #666; font-size: 16px; line-height: 1.8;">${bodyHtml}</div>
    <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">Saludos cordiales,<br><strong>${escapeHtml(labName)}</strong></p>
  </div>
</body>
</html>
  `.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Configuración incompleta (SUPABASE_URL / SERVICE_ROLE_KEY)" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);

  // Fecha de hoy en UTC (YYYY-MM-DD) para comparar con next_payment_date
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayStr = today.toISOString().slice(0, 10);

  const in15 = new Date(today);
  in15.setUTCDate(in15.getUTCDate() + 15);
  const in15Str = in15.toISOString().slice(0, 10);

  const in7 = new Date(today);
  in7.setUTCDate(in7.getUTCDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);

  const in1 = new Date(today);
  in1.setUTCDate(in1.getUTCDate() + 1);
  const in1Str = in1.toISOString().slice(0, 10);

  const { data: labs } = await sb
    .from("laboratories")
    .select("id, name, next_payment_date, billing_amount, status")
    .not("next_payment_date", "is", null)
    .eq("status", "active");

  if (!labs || labs.length === 0) {
    return new Response(
      JSON.stringify({ success: true, sent: 0, message: "No hay laboratorios con próxima fecha de pago" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
  const fromName = Deno.env.get("RESEND_FROM_NAME") || "Solhub";
  if (!resendKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "RESEND_API_KEY no configurado. Añade el secret en Edge Function Secrets.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const resend = new Resend(resendKey);
  const results: { labId: string; labName: string; type: ReminderType; emailsSent: number }[] = [];

  for (const lab of labs) {
    const next = (lab as { next_payment_date: string }).next_payment_date;
    const nextDate = next ? next.slice(0, 10) : null;
    if (!nextDate) continue;

    let type: ReminderType | null = null;
    if (nextDate === in15Str) type = "15_days";
    else if (nextDate === in7Str) type = "7_days";
    else if (nextDate === in1Str) type = "1_day";
    else if (nextDate === todayStr) type = "due_today";

    if (!type) continue;

    const labName = (lab as { name: string }).name;
    const { data: owners } = await sb
      .from("profiles")
      .select("id, email, display_name")
      .eq("laboratory_id", lab.id)
      .eq("role", "owner");

    if (!owners || owners.length === 0) {
      results.push({
        labId: lab.id,
        labName,
        type,
        emailsSent: 0,
      });
      continue;
    }

    const subject = getReminderSubject(type);
    const message = getReminderMessage(
      type,
      labName,
      nextDate,
      (lab as { billing_amount: number | null }).billing_amount ?? null
    );
    const messagePlain = message.replace(/\*\*([^*]+)\*\*/g, "$1");
    const fullSubject = `${labName} – ${subject}`;

    let emailsSent = 0;
    for (const owner of owners) {
      const email = (owner as { email?: string }).email;
      if (!email || !email.trim()) continue;

      const ownerName = (owner as { display_name?: string }).display_name || labName;
      const html = buildReminderHtml(ownerName, subject, messagePlain, labName);

      try {
        const { data, error } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [email.trim()],
          subject: fullSubject,
          html,
        });
        if (!error && data?.id) emailsSent += 1;
      } catch (_e) {
        // log and continue
      }
    }

    results.push({
      labId: lab.id,
      labName,
      type,
      emailsSent,
    });
  }

  const totalSent = results.reduce((s, r) => s + r.emailsSent, 0);

  return new Response(
    JSON.stringify({
      success: true,
      sent: totalSent,
      reminders: results,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
