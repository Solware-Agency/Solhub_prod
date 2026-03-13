// Script para probar la Edge Function send-email (Supabase)
// Ejecutar con: node test-email-endpoint.js
// Opcional: definir VITE_SUPABASE_URL y (para auth) BEARER_TOKEN en .env

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://sbqepjsxnqtldyvlntqk.supabase.co';
const SEND_EMAIL_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/send-email`;
const BEARER_TOKEN = process.env.BEARER_TOKEN || '';

const testEmailEndpoint = async () => {
  console.log('🧪 Probando Edge Function send-email...\n');
  console.log('URL:', SEND_EMAIL_URL);
  if (!BEARER_TOKEN) {
    console.log('⚠️  Sin BEARER_TOKEN: la función puede rechazar la petición si tiene verify_jwt: true.\n');
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (BEARER_TOKEN) headers['Authorization'] = `Bearer ${BEARER_TOKEN}`;

    const emailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        patientEmail: 'test@example.com',
        patientName: 'Paciente de Prueba',
        caseCode: 'TEST-001',
        pdfUrl: 'https://example.com/test.pdf',
      }),
    });

    const emailData = await emailResponse.json().catch(() => ({}));
    console.log('📧 Respuesta:', emailData);

    if (emailResponse.ok) {
      console.log('✅ Email enviado exitosamente (o función respondió OK).');
    } else {
      console.log('❌ Error:', emailResponse.status, emailData.error || emailData);
    }
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
};

testEmailEndpoint();
