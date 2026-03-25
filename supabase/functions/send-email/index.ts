// Supabase Edge Function: send-email
// Reemplaza api/send-email.js + api/send-email-gmail.js (Resend + Gmail por lab)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";
import { google } from "npm:googleapis@149";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(s: string | null | undefined): string {
  const str = s == null ? "" : String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Base64 (UTF-8) para headers RFC 2047 y base64url para Gmail raw
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function toBase64Url(str: string): string {
  return toBase64(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface Body {
  laboratory_id?: string;
  patientEmail?: string;
  patientName?: string;
  caseCode?: string;
  pdfUrl?: string;
  uploadedPdfUrl?: string;
  uploadedPdfUrls?: string[];
  imageUrls?: string[];
  subject?: string;
  message?: string;
  cc?: string[];
  bcc?: string[];
}

interface LabRow {
  name?: string;
  slug?: string;
  branding?: { logo?: string; phoneNumber?: string; phone?: string };
  config?: { contactPhone?: string; phoneNumber?: string };
}

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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Body JSON inválido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const {
    laboratory_id,
    patientEmail,
    patientName,
    caseCode,
    pdfUrl,
    uploadedPdfUrl,
    uploadedPdfUrls,
    imageUrls,
    subject,
    cc,
    bcc,
  } = body;

  const uploadedPdfList =
    Array.isArray(uploadedPdfUrls) && uploadedPdfUrls.length > 0
      ? uploadedPdfUrls
      : uploadedPdfUrl
        ? [uploadedPdfUrl]
        : [];

  const uploadedPdfsHtml = uploadedPdfList
    .map((url, i) => {
      const safe = escapeHtml(url);
      const label = uploadedPdfList.length > 1 ? "Adjunto " + (i + 1) : "Adjunto";
      return `<br><br><a href="${safe}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">📎 ${label}</a>`;
    })
    .join("");

  if (!patientEmail || !patientName) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Faltan datos requeridos: patientEmail, patientName",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const hasContent =
    pdfUrl || uploadedPdfList.length > 0 || (imageUrls && imageUrls.length > 0);
  if (!hasContent) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Debe proporcionar al menos un PDF (caso o adjunto) o imágenes para enviar",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");
  const sb = createClient(supabaseUrl, supabaseKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });

  let labName = "Solware Agency";
  let labSlug: string | null = null;
  let labLogo =
    "https://lafysstpyiejevhrlmzc.supabase.co/storage/v1/object/public/imagenes/Conspat/Logo%20Conspat%20blanco%20sin%20fondo%20(1).png";
  let labPhone = "+58 414-2691682";

  if (laboratory_id) {
    const { data: lab, error: labError } = await sb
      .from("laboratories")
      .select("name, branding, config, slug")
      .eq("id", laboratory_id)
      .single();

    if (labError || !lab) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se pudo obtener el laboratorio. Verifica que laboratory_id sea correcto y que la solicitud incluya el header Authorization.",
          details: labError?.message ?? "Laboratorio no encontrado",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const row = lab as LabRow;
    labName = row.name || labName;
    labSlug = row.slug ?? null;
    const branding = row.branding || {};
    const config = row.config || {};
    if (branding.logo && branding.logo.startsWith("http")) {
      labLogo = branding.logo;
    }
    if (row.slug && String(row.slug).toLowerCase().includes("spt")) {
      labLogo =
        "https://sbqepjsxnqtldyvlntqk.supabase.co/storage/v1/object/public/Logos/Logo%20Salud%20para%20Todos.png";
    }
    if (
      row.slug &&
      (String(row.slug).toLowerCase() === "marihorgen" || String(row.slug).toLowerCase() === "lm")
    ) {
      labLogo =
        "https://sbqepjsxnqtldyvlntqk.supabase.co/storage/v1/object/public/Logos/logo_marihorgen.png";
    }
    const phoneCandidates = [
      config.contactPhone,
      config.phoneNumber,
      branding.phoneNumber,
      branding.phone,
    ];
    const validPhone = phoneCandidates.find((p) => p && String(p).trim().length > 0);
    if (validPhone) labPhone = String(validPhone).trim();
  }

  const resolvedSubject = subject
    ? `${labName} - ${subject}`
    : `${labName} - Informe Médico - Caso ${caseCode || "N/A"}`;

  let phoneDigits = String(labPhone || "").replace(/\D/g, "");
  if (phoneDigits.startsWith("0")) phoneDigits = phoneDigits.replace(/^0+/, "");
  const isFixed212 =
    (phoneDigits.startsWith("58") && phoneDigits.slice(2, 5) === "212") ||
    phoneDigits.startsWith("212");
  const whatsappHref = `https://wa.me/${phoneDigits}?text=Hola%20${encodeURIComponent(labName)}%2C%20tengo%20una%20consulta`;
  const telHref = phoneDigits ? `tel:+${phoneDigits}` : "";
  const contactAnchorHtml = isFixed212
    ? telHref
      ? `<a href="${telHref}" style="color: #5877da; font-size: 14px;">${labPhone}</a>`
      : labPhone
    : `<a href="${whatsappHref}" target="_blank" rel="noopener noreferrer" style="color: #5877da; font-size: 14px;">${labPhone}</a>`;

  const imageUrlsHtml =
    imageUrls && imageUrls.length > 0
      ? `
        <div style="margin: 30px 0;">
          <h3 style="color: #667eea; font-size: 18px; margin-bottom: 15px; text-align: center;">
            Adjuntos (${imageUrls.length})
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            ${imageUrls
              .map(
                (url, index) => `
              <div style="text-align: center;">
                <a href="${url}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none;">
                  <img src="${url}" alt="Adjunto ${index + 1}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid #e0e0e0;" />
                  <p style="color: #667eea; font-size: 11px; margin: 6px 0 0 0; font-weight: bold;">Ver #${index + 1}</p>
                </a>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
      : "";

  const marihorgenDisclaimer =
    labSlug === "marihorgen" || labSlug === "lm"
      ? `
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="color: #856404; font-size: 13px; line-height: 1.8; margin: 0; font-weight: bold;">
            ESTE INFORME HA SIDO ENVIADO DE FORMA ELECTRÓNICA A SOLICITUD DEL PACIENTE Y SU MÉDICO TRATANTE. LA VERACIDAD DE SU CONTENIDO REPOSA EN EL MATERIAL DE ARCHIVO DEL LABORATORIO (LÁMINAS HISTOLÓGICAS Y/O BLOQUES DE INCLUSIÓN EN PARAFINA); SI DESEA COMPROBAR LA VERACIDAD DEL CONTENIDO PUEDE COMUNICARSE CON EL MÉDICO ANATOMOPATÓLOGO FIRMANTE, A TRAVÉS DE LOS NÚMEROS TELEFÓNICOS Y/O DEL CORREO ELECTRÓNICO, QUIEN CONSERVA EN ARCHIVO LA MUESTRA REMITIDA PARA PROCESAMIENTO Y ESTUDIO HISTOLÓGICO.
          </p>
          <p style="color: #856404; font-size: 12px; line-height: 1.6; margin: 10px 0 0 0; font-style: italic;">
            *(El tiempo máximo de archivo del material procesado es de cinco (05) años. Pasado ese tiempo se procede a descartar la muestra archivada en láminas y bloques de inclusión en parafina.)
          </p>
          <p style="color: #856404; font-size: 13px; line-height: 1.8; margin: 15px 0 0 0; font-weight: bold;">
            SI USTED HA RECIBIDO UN INFORME SIN EL FORMATO LEGAL DEL LABORATORIO (QUE INCLUYE MARCA DE AGUA, LOGO, REGISTRO DE INFORMACIÓN FISCAL, DIRECCIÓN FISCAL, CORREO ELECTRÓNICO, TELÉFONOS Y FIRMA DIGITAL), DENUNCIE AL EMISOR POR PLAGIO Y NO SEA UNA VICTIMA DE TERCEROS QUE PUDIERAN COMPROMETER SU SALUD O LA DE SU FAMILIAR.
          </p>
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #f0c36d;">
            <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
              Dra. Marihorgen Pérez<br>
              <span style="font-weight: normal;">Médico Anatomopatólogo</span>
            </p>
            <p style="color: #856404; font-size: 13px; margin: 8px 0 0 0;">
              0412-9637455 • 0424-1222491 • 0414-2331990 • 0212-4179598
            </p>
          </div>
        </div>
      `
      : "";

  const contactParagraph =
    labSlug !== "marihorgen" && labSlug !== "lm"
      ? `
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Si tiene alguna pregunta, no dude en contactarnos al ${contactAnchorHtml}
        </p>
      `
      : "";

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <img src="${labLogo}" alt="${labName}" style="height: 80px; width: auto; display: block; margin: 0 auto 15px auto;" />
              <p style="margin: 0; opacity: 0.9; font-size: 16px;">Su informe médico está listo</p>
            </td>
          </tr>
        </table>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Estimado/a <strong style="color: #667eea;">${patientName}</strong>,
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Le informamos que ${pdfUrl ? "su informe médico del" : "la información del"} <strong>Caso ${caseCode || "N/A"}</strong> está ${pdfUrl ? "lista para descarga" : "disponible"}.
        </p>
        <div style="text-align: center; margin: 40px 0;">
          ${pdfUrl ? `<a href="${pdfUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">📄 Descargar Informe</a>` : ""}
          ${uploadedPdfsHtml}
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>Nota:</strong> Este enlace es personal y seguro. Por favor, no lo comparta con terceros.
          </p>
        </div>
        ${imageUrlsHtml}
        ${contactParagraph}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        ${marihorgenDisclaimer}
        <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
          Saludos cordiales,<br>
          <strong>Equipo de <a href="https://www.solware.agency/" target="_blank" rel="noopener noreferrer" style="color: #5877da;">${labName}</a></strong>
        </p>
      </div>
    </div>
  `;

  const usesGmail =
    labSlug &&
    (labSlug.toLowerCase().includes("spt") ||
      labSlug.toLowerCase() === "marihorgen" ||
      labSlug.toLowerCase() === "lm");

  if (usesGmail) {
    const labSlugNorm = String(labSlug || "spt").toLowerCase();
    let envPrefix = "";
    if (labSlugNorm === "marihorgen" || labSlugNorm === "lm") {
      envPrefix = "MARIHORGEN_";
    } else if (labSlugNorm !== "spt") {
      envPrefix = `${labSlug!.toUpperCase()}_`;
    }
    // Soporte para typo MARTHOGEN en secrets
    const getEnv = (key: string): string => {
      const v = Deno.env.get(`${envPrefix}${key}`) || Deno.env.get(key);
      if (v) return v;
      if (envPrefix === "MARIHORGEN_") {
        return Deno.env.get(`MARTHOGEN_${key}`) || "";
      }
      return "";
    };
    const clientId = getEnv("GMAIL_CLIENT_ID");
    const clientSecret = getEnv("GMAIL_CLIENT_SECRET");
    const refreshToken = getEnv("GMAIL_REFRESH_TOKEN");
    const userEmail = getEnv("GMAIL_USER_EMAIL");

    if (!clientId || !clientSecret || !refreshToken || !userEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Configuración Gmail incompleta para ${labName}. Verifica los secrets GMAIL_* o MARIHORGEN_GMAIL_* en Edge Function Secrets.`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    try {
      const redirectUri = "https://app.solhub.agency/oauth2callback";
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const toEmails = [patientEmail];
      const ccEmails = (cc && Array.isArray(cc)) ? cc.filter((e) => e && e.trim()) : [];
      const bccEmails = (bcc && Array.isArray(bcc)) ? bcc.filter((e) => e && e.trim()) : [];

      const utf8Subject = `=?utf-8?B?${toBase64(resolvedSubject)}?=`;
      const utf8FromName = `=?utf-8?B?${toBase64(labName)}?=`;

      const messageParts = [
        `From: ${utf8FromName} <${userEmail}>`,
        `To: ${toEmails.join(", ")}`,
        ...(ccEmails.length > 0 ? [`Cc: ${ccEmails.join(", ")}`] : []),
        ...(bccEmails.length > 0 ? [`Bcc: ${bccEmails.join(", ")}`] : []),
        `Subject: ${utf8Subject}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        emailHtml,
      ];
      const rawMessage = messageParts.join("\r\n");
      const encodedMessage = toBase64Url(rawMessage);

      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encodedMessage },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email enviado exitosamente",
          messageId: result.data.id,
          provider: "Gmail API",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Gmail API error:", err);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al enviar el email",
          details: message,
          provider: "Gmail API",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Configuración Resend incompleta. Verifica RESEND_API_KEY en Edge Function Secrets.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const resend = new Resend(resendKey);
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
  const fromName = Deno.env.get("RESEND_FROM_NAME") || labName;

  try {
    const data = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [patientEmail],
      ...(cc && cc.length > 0 && { cc }),
      ...(bcc && bcc.length > 0 && { bcc }),
      subject: resolvedSubject,
      html: emailHtml,
    });

    if (data.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error de Resend",
          details: (data.error as { message?: string }).message || String(data.error),
          provider: "Resend",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email enviado exitosamente",
        messageId: data.data?.id,
        provider: "Resend",
        debug: data.data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Resend error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al enviar el email",
        details: message,
        provider: "Resend",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
