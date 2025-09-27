import express from 'express';
import { Resend } from 'resend';

const router = express.Router();

// Endpoint para verificar configuración Resend
router.get('/test-resend', (req, res) => {
  const config = {
    hasApiKey: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
    fromName: process.env.RESEND_FROM_NAME
  };

  res.json({
    success: true,
    config: config,
    message: 'Configuración Resend cargada'
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
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Configuración Resend incompleta. Verifica la variable RESEND_API_KEY.'
      });
    }

    // Inicializar Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Configurar el email
    const emailData = {
      from: `${process.env.RESEND_FROM_NAME || 'Solware Agency'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: [patientEmail],
      subject: `Informe Médico - Caso ${caseCode || 'N/A'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🏥 ${process.env.RESEND_FROM_NAME || 'Solware Agency'}</h1>
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
              <strong>Equipo de ${process.env.RESEND_FROM_NAME || 'Solware Agency'}</strong>
            </p>
          </div>
        </div>
      `,
    };

    // Enviar el email usando Resend
    const data = await resend.emails.send(emailData);

    console.log('✅ Email enviado exitosamente con Resend:', data.id);

    res.json({
      success: true,
      message: 'Email enviado exitosamente',
      messageId: data.id,
      provider: 'Resend'
    });

  } catch (error) {
    console.error('❌ Error enviando email con Resend:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar el email',
      details: error.message,
      provider: 'Resend'
    });
  }
});

export default router;