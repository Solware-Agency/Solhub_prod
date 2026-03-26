// Edge Function: download-pdf — valida caseId+token y devuelve el PDF
// Reemplaza api/download-pdf.js (Vercel)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function isValidToken(token: string | null, caseId: string | null): boolean {
  return !!(token && caseId && token.length > 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Método no permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");
  const token = url.searchParams.get("token");
  const preview = url.searchParams.get("preview") === "true";

  if (!caseId || !token) {
    return new Response(
      JSON.stringify({ error: "Parámetros faltantes: caseId y token son requeridos" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isValidToken(token, caseId)) {
    return new Response(
      JSON.stringify({ error: "Token inválido o expirado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Error de configuración del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  const { data, error: fetchError } = await sb
    .from("medical_records_clean")
    .select("informepdf_url, code, token, patients(nombre)")
    .eq("id", caseId)
    .single();

  if (fetchError || !data) {
    return new Response(
      JSON.stringify({
        error: "Error al buscar el documento en la base de datos",
        details: fetchError?.message ?? "No encontrado",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if ((data as { token?: string }).token !== token) {
    return new Response(
      JSON.stringify({ error: "Token no coincide" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rawInformepdfUrl = (data as { informepdf_url?: string }).informepdf_url;
  if (!rawInformepdfUrl) {
    return new Response(
      JSON.stringify({ error: "Documento PDF no encontrado para este caso" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Normaliza dobles slashes en la path (preserva https://)
  const informepdfUrl = rawInformepdfUrl.replace(/([^:])\/\/+/g, "$1/");

  const pdfRes = await fetch(informepdfUrl);
  if (!pdfRes.ok) {
    return new Response(
      JSON.stringify({ error: "Error al obtener el archivo PDF desde el servidor" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const blob = await pdfRes.blob();
  const buffer = await blob.arrayBuffer();

  const code = (data as { code?: string }).code || caseId;
  const patients = (data as { patients?: { nombre?: string } }).patients;
  const patientName = patients?.nombre || "Paciente";
  const sanitizedName = patientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .trim();
  const fileName = `${code}-${sanitizedName}.pdf`;
  const disposition = preview ? "inline" : "attachment";

  return new Response(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
});
