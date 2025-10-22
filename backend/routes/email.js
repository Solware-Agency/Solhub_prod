import express from "express";
import { Resend } from "resend";

const router = express.Router();

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Endpoint para verificar configuración Resend
router.get("/test-resend", (req, res) => {
  const config = {
    hasApiKey: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
    fromName: process.env.RESEND_FROM_NAME,
    apiKeyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + "..." : "No configurada"
  };

  res.json({
    success: true,
    config: config,
    message: "Configuración Resend cargada"
  });
});

// Endpoint para enviar email
router.post("/send-email", async (req, res) => {
  try {
    const { patientEmail, patientName, caseCode, pdfUrl } = req.body;

    console.log("📧 Datos recibidos:", { patientEmail, patientName, caseCode, pdfUrl: pdfUrl ? "URL presente" : "URL faltante" });

    // Validar datos requeridos
    if (!patientEmail || !patientName || !pdfUrl) {
      console.log("❌ Datos faltantes:", { patientEmail: !!patientEmail, patientName: !!patientName, pdfUrl: !!pdfUrl });
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

    // Configurar el email
    const emailData = {
      from: `${process.env.RESEND_FROM_NAME || "Solware Agency"} <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`,
      to: [patientEmail],
      subject: `Informe Médico - Caso ${caseCode || "N/A"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <div style="
        display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
        ">
            <svg width="246.000000pt" height="38.000000pt" viewBox="0 0 246.000000 311.000000" preserveAspectRatio="xMidYMid meet" className={className}>
                <g transform="translate(0.000000,311.000000) scale(0.100000,-0.100000)" fill='#fff' stroke="none">
                    <path d="M1680 3091 c-51 -21 -117 -58 -142 -79 -38 -32 -9 -102 43 -102 16 0 74 23 129 50 91 45 100 53 100 78 0 40 -26 72 -58 71 -15 0 -47 -8 -72 -18z" />
                    <path d="M1697 2931 c-88 -43 -163 -84 -167 -91 -13 -20 4 -58 235 -536 292-608 303-628 337-632 18-2 74 21 169 69 151 77 179 97 179 130 0 11 -71 163 -158 337 -87 175 -204 418 -261 542 -57 124 -110 233 -119 243 -8 9 -25 17 -36 16 -12 0 -92 -36 -179 -78z" />
                    <path d="M1146 2590 c-315 -36 -577 -159 -786 -370 -223 -224 -344 -512 -357-850 -6 -171 9 -279 63 -439 103 -310 280 -523 579 -698 l90 -53 -90 0 c-106 0 -159 -13 -180 -43 -18 -26 -20 -113 -3 -123 7 -5 359 -7 783 -5 855 3 815-1 815 67 0 74 -45 104 -157 104 l-68 0 95 48 c155 78 255 144 258 171 3 16 -33 78 -118 206 -67 101 -129 186 -137 190 -9 3 -58 -18 -115 -51 -183 -105 -326 -144 -522 -144 -125 0 -207 19 -313 71 -152 75 -282 209 -363 374 -52 105 -70 179 -70 288 0 111 19 187 75 302 109 223 272 360 497 417 70 17 102 20 222 15 194 -7 325 -47 471 -142 69 -45 89 -53 100 -36 3 5 -66 155 -153 333 -130 266 -163 325 -185 335 -64 30 -301 47 -431 33z" />
                    <path d="M2293 1730 c-45 -21 -86 -47 -91 -57 -14 -29 5 -78 43 -109 97 -81 92 -78 135 -59 54 24 66 42 73 104 7 56 -8 108 -40 143 -21 24 -24 23 -120-22z" />
                </g>
            </svg>
            <h1 style="margin: 0; font-size: 24px;">
                ${process.env.RESEND_FROM_NAME || "Solware Agency"}
            </h1>
        </div>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Su informe médico está listo</p>
    </div>

    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Estimado/a <strong style="color: #667eea;">${patientName}</strong>,
        </p>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Le informamos que su informe médico del <strong>Caso ${caseCode || "N/A"}</strong> está listo para descarga.
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
            Si tiene alguna pregunta, no dude en contactarnos.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
            Saludos cordiales,<br>
            <strong>Equipo de
                <a href="http://" target="_blank" rel="noopener noreferrer" style="color: #5877da; font-size: 14px; text-align: center; margin: 0;">
                    Solware Agency
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

    res.json({
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
});

export default router;
