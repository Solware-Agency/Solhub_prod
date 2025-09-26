import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Endpoint para verificar configuración SMTP
router.get('/test-smtp', (req, res) => {
  const config = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    hasPassword: !!process.env.SMTP_PASS,
    senderName: process.env.SMTP_SENDER_NAME,
    senderEmail: process.env.SMTP_SENDER_EMAIL
  };

  res.json({
    success: true,
    config: config,
    message: 'Configuración SMTP cargada'
  });
});

// Endpoint para enviar email
router.post('/send-email', async (req, res) => {
  try {
    const { patientEmail, patientName, caseCode, pdfUrl } = req.body;

    // Validar datos requeridos
    if (!patientEmail || !patientName || !pdfUrl) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos: patientEmail, patientName, pdfUrl'
      });
    }

    // Verificar que las variables de entorno estén configuradas
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({
        success: false,
        error: 'Configuración SMTP incompleta. Verifica las variables de entorno.'
      });
    }

    // Configurar el transporter SMTP usando la configuración de GoDaddy
    // Probamos primero con SSL (puerto 465)
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // smtpout.secureserver.net
      port: 465, // Puerto SSL
      secure: true, // true para SSL
      auth: {
        user: process.env.SMTP_USER, // ventas@solware.agency
        pass: process.env.SMTP_PASS, // tu password
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      debug: true, // Para ver más detalles del error
      logger: true
    });

    try {
      // Verificar la configuración SSL
      await transporter.verify();
      console.log('✅ SMTP configurado correctamente con SSL');
    } catch (sslError) {
      console.log('❌ SSL falló, probando con TLS...');

      // Si SSL falla, probamos con TLS (puerto 587)
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, // smtpout.secureserver.net
        port: 587, // Puerto TLS
        secure: false, // false para TLS
        auth: {
          user: process.env.SMTP_USER, // ventas@solware.agency
          pass: process.env.SMTP_PASS, // tu password
        },
        tls: {
          rejectUnauthorized: false
        },
        debug: true,
        logger: true
      });

      await transporter.verify();
      console.log('✅ SMTP configurado correctamente con TLS');
    }


    // Configurar el email
    const mailOptions = {
      from: `"${process.env.SMTP_SENDER_NAME || 'Solware Agency'}" <${process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER}>`,
      to: patientEmail,
      subject: `Informe Médico - Caso ${caseCode || 'N/A'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🏥 ${process.env.SMTP_SENDER_NAME || 'Solware Agency'}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Su informe médico está listo</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Estimado/a <strong style="color: #667eea;">${patientName}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Le informamos que su informe médico del <strong>Caso ${caseCode || 'N/A'}</strong> está listo para descarga.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${pdfUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
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
              Si tiene alguna pregunta, no dude en contactarnos.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Saludos cordiales,<br>
              <strong>Equipo de ${process.env.SMTP_SENDER_NAME || 'Solware Agency'}</strong>
            </p>
          </div>
        </div>
      `,
    };

    // Enviar el email
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email enviado exitosamente:', info.messageId);

    res.json({
      success: true,
      message: 'Email enviado exitosamente',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar el email',
      details: error.message
    });
  }
});

export default router;
