// Edge Function: generate-pdf — proxy a n8n con JWT
// Reemplaza llamada directa desde frontend a VITE_GENERATE_PDF_WEBHOOK

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ success: false, error: "Authorization Bearer requerido" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const defaultWebhookUrl = Deno.env.get("GENERATE_PDF_WEBHOOK_URL");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Body JSON inválido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await sb.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: "Token inválido o expirado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const caseId = body.caseId as string | undefined;
  if (!caseId) {
    return new Response(
      JSON.stringify({ success: false, error: "caseId requerido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: row, error: caseError } = await sb
    .from("medical_records_clean")
    .select("id, laboratory_id")
    .eq("id", caseId)
    .single();

  if (caseError || !row) {
    return new Response(
      JSON.stringify({ success: false, error: "Caso no encontrado o sin acceso" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const laboratoryId = (row as { laboratory_id?: string }).laboratory_id;
  let webhookUrlToUse: string | null = null;

  if (laboratoryId) {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) {
      const sbAdmin = createClient(supabaseUrl, serviceKey);
      const { data: lab } = await sbAdmin
        .from("laboratories")
        .select("config")
        .eq("id", laboratoryId)
        .single();
      const labRow = lab as { config?: { webhooks?: { generatePdf?: string } } } | null;
      const labWebhook = labRow?.config?.webhooks?.generatePdf;
      if (labWebhook && typeof labWebhook === "string" && labWebhook.trim().length > 0) {
        webhookUrlToUse = labWebhook.trim();
      }
    }
  }

  if (!webhookUrlToUse) webhookUrlToUse = defaultWebhookUrl ?? null;
  if (!webhookUrlToUse) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "URL del webhook de generación de PDF no configurada. Configura GENERATE_PDF_WEBHOOK_URL o laboratories.config.webhooks.generatePdf para este laboratorio.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const n8nSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (n8nSecret) headers["X-Webhook-Secret"] = n8nSecret;

  const webhookRes = await fetch(webhookUrlToUse, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await webhookRes.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!webhookRes.ok) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Webhook error: ${webhookRes.status}`,
        details: json,
      }),
      {
        status: webhookRes.status >= 400 && webhookRes.status < 600 ? webhookRes.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
