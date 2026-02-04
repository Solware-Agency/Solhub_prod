// api/send-email-gmail.js
// API específica para enviar emails usando Gmail API (SPT)

export default async function handler(req, res) {
  const debugMessages = [];
  debugMessages.push("📧 Gmail API handler iniciado");
  
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      debug: [...debugMessages, `❌ Método no permitido: ${req.method}`]
    });
  }

  try {
    debugMessages.push("🔧 Iniciando configuración Gmail API...");
    
    // Importaciones dinámicas
    const { google } = await import('googleapis');
    debugMessages.push("✅ Google APIs importado correctamente");
    
    const { patientEmail, patientName, caseCode, pdfUrl, uploadedPdfUrl, imageUrls, laboratory_id, subject, message, cc, bcc } = req.body;

    console.log("📧 Gmail API - Datos recibidos:", {
      patientEmail,
      patientName,
      caseCode,
      pdfUrl: pdfUrl ? "URL presente" : "URL faltante",
      uploadedPdfUrl: uploadedPdfUrl ? "PDF adjunto presente" : "Sin PDF adjunto",
      imageUrls: imageUrls && imageUrls.length > 0 ? `${imageUrls.length} imágenes` : "Sin imágenes",
      laboratory_id: laboratory_id || null,
      cc: cc || [],
      bcc: bcc || [],
    });

    // Validar datos requeridos
    if (!patientEmail || !patientName) {
      return res.status(400).json({
        success: false,
        error: "Faltan datos requeridos: patientEmail, patientName"
      });
    }

    // Validar que haya contenido para enviar
    const hasContent = pdfUrl || uploadedPdfUrl || (imageUrls && imageUrls.length > 0);
    if (!hasContent) {
      return res.status(400).json({
        success: false,
        error: "Debe proporcionar al menos un PDF (caso o adjunto) o imágenes para enviar"
      });
    }

    // Verificar variables de entorno de Gmail CON DEBUG DETALLADO
    debugMessages.push("🔍 Verificando variables de Gmail...");
    
    const envDebug = {
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? `OK (${process.env.GMAIL_CLIENT_ID.substring(0, 30)}...)` : '❌ FALTA',
      GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? `OK (${process.env.GMAIL_CLIENT_SECRET.substring(0, 15)}...)` : '❌ FALTA',
      GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ? `OK (${process.env.GMAIL_REFRESH_TOKEN.substring(0, 30)}...)` : '❌ FALTA',
      GMAIL_USER_EMAIL: process.env.GMAIL_USER_EMAIL ? `OK (${process.env.GMAIL_USER_EMAIL})` : '❌ FALTA'
    };
    
    debugMessages.push(`📋 Estado variables: ${JSON.stringify(envDebug)}`);
    
    const requiredEnvVars = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'GMAIL_USER_EMAIL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return res.status(500).json({
        success: false,
        error: `Configuración Gmail incompleta. Faltan: ${missingVars.join(', ')}`,
        debug: [...debugMessages, `❌ Variables faltantes: ${missingVars.join(', ')}`, `Estado completo: ${JSON.stringify(envDebug)}`],
        envDebug
      });
    }

    debugMessages.push("✅ Todas las variables de Gmail presentes");

    // Configurar OAuth2
    debugMessages.push("🔑 Configurando OAuth2...");
    
    // Determinar la URL de callback correcta según el entorno
    const isDevelopment = process.env.DEV === 'true' || process.env.NODE_ENV === 'development';
    const redirectUri = isDevelopment 
      ? 'https://dev.app.solhub.agency/oauth2callback'
      : 'https://app.solhub.agency/oauth2callback';
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      redirectUri
    );
    
    debugMessages.push(`🔗 OAuth URI: ${redirectUri}`);

    debugMessages.push("🔄 Configurando refresh token...");
    try {
      oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });
      debugMessages.push("✅ Refresh token configurado");
    } catch (credError) {
      debugMessages.push(`❌ Error configurando credentials: ${credError.message}`);
      throw new Error(`OAuth credentials error: ${credError.message}`);
    }

    debugMessages.push("📬 Inicializando Gmail client...");
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Obtener información del laboratorio (reutilizar lógica existente)
    let labName = 'SPT - Salud para Todos';
    let labLogo = 'https://sbqepjsxnqtldyvlntqk.supabase.co/storage/v1/object/public/Logos/Logo%20Salud%20para%20Todos.png';
    let labPhone = '+58 212-4179598';
    let labSlug = 'spt';

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
          labSlug = lab.slug || labSlug;
          const branding = lab.branding || {};
          
          // Logo específico para SPT
          if (lab.slug && String(lab.slug).toLowerCase().includes('spt')) {
            labLogo = 'https://sbqepjsxnqtldyvlntqk.supabase.co/storage/v1/object/public/Logos/Logo%20Salud%20para%20Todos.png';
          }
        }
      } catch (e) {
        console.warn('No se pudo obtener laboratorio desde Supabase:', e.message || e);
      }
    }

    // Preparar enlace de contacto
    let phoneDigits = String(labPhone || '').replace(/\D/g, '');
    if (phoneDigits.startsWith('0')) phoneDigits = phoneDigits.replace(/^0+/, '');
    if (!phoneDigits) phoneDigits = '';

    const isFixed212 = (phoneDigits.startsWith('58') && phoneDigits.slice(2, 5) === '212') || phoneDigits.startsWith('212');
    const whatsappHref = `https://wa.me/${phoneDigits}?text=Hola%20${encodeURIComponent(labName)}%2C%20tengo%20una%20consulta`;
    const telHref = phoneDigits ? `tel:+${phoneDigits}` : '';
    const contactAnchorHtml = isFixed212
      ? (telHref ? `<a href="${telHref}" style="color: #5877da;">${labPhone}</a>` : `${labPhone}`)
      : `<a href="${whatsappHref}" target="_blank" rel="noopener noreferrer" style="color: #5877da;">${labPhone}</a>`;

    // Generar HTML del email
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
            Le informamos que ${pdfUrl ? 'su informe médico del' : 'la información del'} <strong>Caso ${caseCode || 'N/A'}</strong> está ${pdfUrl ? 'lista para descarga' : 'disponible'}.
          </p>

          <div style="text-align: center; margin: 40px 0;">
            ${pdfUrl ? `
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
            ` : ''}
            
            ${uploadedPdfUrl ? `
              <br><br>
              <a href="${uploadedPdfUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    display: inline-block;
                    font-weight: bold;
                    font-size: 16px;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                📎 Adjunto
              </a>
            ` : ''}
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              <strong>Nota:</strong> Este enlace es personal y seguro. Por favor, no lo comparta con terceros.
            </p>
          </div>

          ${imageUrls && imageUrls.length > 0 ? `
            <div style="margin: 30px 0;">
              <h3 style="color: #667eea; font-size: 18px; margin-bottom: 15px; text-align: center;">
                📸 Imágenes del Caso (${imageUrls.length})
              </h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                ${imageUrls.map((url, index) => `
                  <div style="text-align: center;">
                    <a href="${url}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none;">
                      <img src="${url}" alt="Imagen ${index + 1}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid #e0e0e0;" />
                      <p style="color: #667eea; font-size: 11px; margin: 6px 0 0 0; font-weight: bold;">Ver #${index + 1}</p>
                    </a>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${labSlug !== 'marihorgen' && labSlug !== 'lm' ? `
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Si tiene alguna pregunta, no dude en contactarnos al
              ${contactAnchorHtml}
            </p>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          ${labSlug === 'marihorgen' || labSlug === 'lm' ? `
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
          ` : ''}

          <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
            Saludos cordiales,<br>
            <strong>Equipo de
              <a href="https://www.solware.agency/" target="_blank" rel="noopener noreferrer" style="color: #5877da; font-size: 14px;">
                ${labName}
              </a>
            </strong>
          </p>
        </div>
      </div>
    `;

    // Preparar el email
    const resolvedSubject = subject
      ? `${labName} - ${subject}`
      : `${labName} - Informe Médico - Caso ${caseCode || 'N/A'}`;

    // Construir destinatarios
    const toEmails = [patientEmail];
    const ccEmails = (cc && Array.isArray(cc)) ? cc.filter(email => email && email.trim()) : [];
    const bccEmails = (bcc && Array.isArray(bcc)) ? bcc.filter(email => email && email.trim()) : [];

    // Crear el mensaje en formato RFC 2822 con saltos de línea estándar (\r\n)
    const utf8Subject = `=?utf-8?B?${Buffer.from(resolvedSubject).toString('base64')}?=`;
    
    let parts = [
      `From: ${labName} <${process.env.GMAIL_USER_EMAIL}>`,
      `To: ${toEmails.join(', ')}`
    ];

    if (ccEmails.length > 0) parts.push(`Cc: ${ccEmails.join(', ')}`);
    if (bccEmails.length > 0) parts.push(`Bcc: ${bccEmails.join(', ')}`);

    parts.push(`Subject: ${utf8Subject}`);
    parts.push(`Content-Type: text/html; charset=utf-8`);
    parts.push(`MIME-Version: 1.0`);
    parts.push(``); // Línea en blanco obligatoria antes del cuerpo
    parts.push(emailHtml);

    const rawMessage = parts.join('\r\n');

    // Codificar el mensaje en base64url
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Enviar el email
    debugMessages.push("📤 Preparando envío con Gmail API...");
    debugMessages.push(`📧 Destinatarios: TO=${toEmails.length}, CC=${ccEmails.length}, BCC=${bccEmails.length}`);
    debugMessages.push(`📋 Subject: ${resolvedSubject}`);
    
    try {
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      debugMessages.push(`✅ Email enviado exitosamente: ${result.data.id}`);

      res.status(200).json({
        success: true,
        message: "Email enviado exitosamente",
        messageId: result.data.id,
        provider: "Gmail API",
        debug: debugMessages
      });
    } catch (sendError) {
      debugMessages.push(`❌ Error en gmail.users.messages.send: ${sendError.message}`);
      
      // Extraer más detalles del error de Gmail
      const gmailError = sendError.response?.data?.error || sendError;
      debugMessages.push(`📋 Detalles Gmail: ${JSON.stringify(gmailError)}`);
      
      throw new Error(`Gmail API send failed: ${sendError.message} - Details: ${JSON.stringify(gmailError)}`);
    }

  } catch (error) {
    debugMessages.push(`❌ Error: ${error.message}`);
    debugMessages.push(`❌ Tipo: ${error.constructor.name}`);
    
    res.status(500).json({
      success: false,
      error: "Error al enviar el email",
      details: error.message,
      provider: "Gmail API",
      errorType: error.constructor.name,
      debug: debugMessages,
      fullError: error.toString()
    });
  }
}