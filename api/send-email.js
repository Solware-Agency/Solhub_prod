// api/send-email.js

export default async function handler(req, res) {
  // Importación dinámica dentro de la función
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { patientEmail, patientName, caseCode, pdfUrl, laboratory_id, subject, message } = req.body;

    console.log("📧 Datos recibidos:", {
      patientEmail,
      patientName,
      caseCode,
      pdfUrl: pdfUrl ? "URL presente" : "URL faltante",
      laboratory_id: laboratory_id || null,
    });

    // Validar datos requeridos
    if (!patientEmail || !patientName || !pdfUrl) {
      console.log("❌ Datos faltantes:", {
        patientEmail: !!patientEmail,
        patientName: !!patientName,
        pdfUrl: !!pdfUrl
      });
      return res.status(400).json({
        success: false,
        error: "Faltan datos requeridos: patientEmail, patientName, pdfUrl"
      });
    }

    // Verificar que las variables de entorno estén configuradas
    if (!process.env.RESEND_API_KEY) {
      console.log("❌ RESEND_API_KEY no configurada");
      return res.status(500).json({
        success: false,
        error: "Configuración Resend incompleta. Verifica la variable RESEND_API_KEY."
      });
    }

    console.log("✅ Variables de entorno configuradas correctamente");

    // Obtener branding/config del laboratorio si se envió laboratory_id
    const defaultLogoUrl = 'https://lafysstpyiejevhrlmzc.supabase.co/storage/v1/object/public/imagenes/Conspat/Logo%20Conspat%20blanco%20sin%20fondo%20(1).png';
    let labLogo = defaultLogoUrl;
    let labPhone = '+58 414-2691682';
    let labName = process.env.RESEND_FROM_NAME || 'Solware Agency';

    if (laboratory_id && process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
      try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
      const { data: lab, error: labError } = await sb
        .from('laboratories')
        .select('name, branding, config, slug')
        .eq('id', laboratory_id)
        .single();

      if (!labError && lab) {
        labName = lab.name || labName;
        const branding = lab.branding || {};
        const config = lab.config || {};

          // Logo: si viene como URL absoluta úsala; si viene como path relativo conviértela a URL absoluta
          if (branding.logo && typeof branding.logo === 'string') {
            if (branding.logo.startsWith('http')) {
              labLogo = branding.logo;
            } else if (branding.logo.startsWith('/')) {
              // Construir una URL absoluta.
              // Prioridad: FRONEND_URL env (ej. https://app.mydomain.com) -> PUBLIC_URL -> request headers -> fallback
              try {
                const frontendUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || null;
                if (frontendUrl) {
                  labLogo = frontendUrl.replace(/\/$/, '') + branding.logo;
                } else {
                  const host = req.headers['x-forwarded-host'] || req.headers.host;
                  const proto = req.headers['x-forwarded-proto'] || (req.protocol ? req.protocol : 'https');
                  if (host) {
                    labLogo = `${proto}://${host}${branding.logo}`;
                  } else {
                    labLogo = labLogo || defaultLogoUrl;
                  }
                }
              } catch (e) {
                labLogo = labLogo || defaultLogoUrl;
              }
            } else {
              labLogo = branding.logo || labLogo;
            }
          }

          // Si el logo es un SVG muchas veces no se renderiza en clientes de email.
          // Intentar localizar una variante raster (.png/.jpg) en el mismo path público.
          try {
            if (labLogo && typeof labLogo === 'string' && labLogo.match(/\.svg(\?|$)/i)) {
              const pngCandidate = labLogo.replace(/\.svg(\?*.*)?$/i, '.png$1');
              const jpgCandidate = labLogo.replace(/\.svg(\?*.*)?$/i, '.jpg$1');

              // Hacer requests HEAD para comprobar si la imagen existe (server-side)
              const tryHead = async (url) => {
                try {
                  const r = await fetch(url, { method: 'HEAD' });
                  return r && r.ok;
                } catch (e) {
                  return false;
                }
              };

              if (await tryHead(pngCandidate)) {
                labLogo = pngCandidate;
              } else if (await tryHead(jpgCandidate)) {
                labLogo = jpgCandidate;
              }
            }
          } catch (e) {
            // No bloquear el envío por este fallback
            console.warn('Error comprobando variantes de logo:', e && e.message ? e.message : e);
          }

          // Hardcode temporal: forzar logo SPT (evita tocar dashboard ahora)
          try {
            const slug = lab.slug || lab.name || '';
            if (slug && String(slug).toLowerCase().includes('spt')) {
              labLogo = 'https://sbqepjsxnqtldyvlntqk.supabase.co/storage/v1/object/public/Logos/Logo%20Salud%20para%20Todos.png';
            }
          } catch (e) {
            // no bloquear
          }

        // Resolver teléfono del laboratorio (varias rutas posibles en config/branding)
        try {
          const phoneCandidates = [
            config.contactPhone,
            config.phoneNumber,
            (branding && branding.phoneNumber) || null,
            (branding && branding.phone) || null,
            lab.phone || null,
            lab.contact_phone || null,
          ];

          const validPhone = phoneCandidates.find((p) => p && String(p).trim().length > 0);
          if (validPhone) {
            labPhone = String(validPhone).trim();
          }
        } catch (e) {
          // mantener labPhone por defecto si algo falla
          console.warn('Error resolviendo teléfono del laboratorio:', e && e.message ? e.message : e);
        }

        // Si el slug es conspat y no hay logo, mantener el URL por compatibilidad
        if ((lab.slug === 'conspat' || lab.slug === 'Conspat') && !branding.logo) {
        labLogo = defaultLogoUrl;
        }
      }
      } catch (e) {
      console.warn('No se pudo obtener laboratorio desde Supabase:', e.message || e);
      }
    }

    // Configurar el email
    // Si el frontend envió un subject, respetarlo; si no, anteponer nombre del laboratorio
    const resolvedSubject = subject
      ? `${labName} - ${subject}`
      : `${labName} - Informe Médico - Caso ${caseCode || 'N/A'}`;

    // Preparar enlace de contacto: usar WhatsApp salvo que el número sea fijo (ej. 0212 SPT)
    let phoneDigits = String(labPhone || '').replace(/\D/g, '');
    if (phoneDigits.startsWith('0')) phoneDigits = phoneDigits.replace(/^0+/, '');
    if (!phoneDigits) phoneDigits = '';

    // Detectar fijo 0212 en distintas formas: +58 212..., 0212..., 212...
    const isFixed212 = (phoneDigits.startsWith('58') && phoneDigits.slice(2, 5) === '212') || phoneDigits.startsWith('212');

    // Construir HTML del enlace de contacto: si es fijo 0212 usamos tel:, si no usamos wa.me
    const whatsappHref = `https://wa.me/${phoneDigits}?text=Hola%20${encodeURIComponent(labName)}%2C%20tengo%20una%20consulta`;
    const telHref = phoneDigits ? `tel:+${phoneDigits}` : '';
    const contactAnchorHtml = isFixed212
      ? (telHref ? `<a href="${telHref}" style="color: #5877da; font-size: 14px; text-align: center; margin: 0;">${labPhone}</a>` : `${labPhone}`)
      : `<a href="${whatsappHref}" target="_blank" rel="noopener noreferrer" style="color: #5877da; font-size: 14px; text-align: center; margin: 0;">${labPhone}</a>`;

    const emailData = {
      from: `${labName || process.env.RESEND_FROM_NAME || 'Solware Agency'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: [patientEmail],
      subject: resolvedSubject,
      html: `
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
        Le informamos que su informe médico del <strong>Caso ${caseCode || 'N/A'}</strong> está listo para descarga.
      </p>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${pdfUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 15px 30px; 
              text-decoration: none; 
              border-radius: 25px; 
              display: inline-block;
              font-weight: bold;
              font-size: 16px;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
          📄 Descargar Informe
        </a>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #666; font-size: 14px; margin: 0;">
          <strong>Nota:</strong> Este enlace es personal y seguro. Por favor, no lo comparta con terceros.
        </p>
      </div>



      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Si tiene alguna pregunta, no dude en contactarnos al
        ${contactAnchorHtml}
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

      <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
        Saludos cordiales,<br>
        <strong>Equipo de
          <a href="https://www.solware.agency/" target="_blank" rel="noopener noreferrer" style="color: #5877da; font-size: 14px; text-align: center; margin: 0;">
            ${labName}
          </a>
        </strong>
      </p>
    </div>
  </div>
      `,
    };

    // Enviar el email usando Resend
    console.log("📤 Enviando email con Resend...");
    const data = await resend.emails.send(emailData);

    console.log("✅ Email enviado exitosamente con Resend:", data.id);

    res.status(200).json({
      success: true,
      message: "Email enviado exitosamente",
      messageId: data.id,
      provider: "Resend"
    });

  } catch (error) {
    console.error("❌ Error enviando email con Resend:", error);
    res.status(500).json({
      success: false,
      error: "Error al enviar el email",
      details: error.message,
      provider: "Resend"
    });
  }
}