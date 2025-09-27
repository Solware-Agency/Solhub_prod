// Script para probar el endpoint de email
// Ejecutar con: node test-email-endpoint.js

const testEmailEndpoint = async () => {
  const baseUrl = 'https://conspat.solhub.agency';
  
  console.log('🧪 Probando endpoints de email...\n');
  
  try {
    // 1. Probar endpoint de configuración
    console.log('1️⃣ Probando endpoint de configuración...');
    const configResponse = await fetch(`${baseUrl}/api/test-config`);
    const configData = await configResponse.json();
    
    console.log('✅ Configuración:', configData);
    console.log('');
    
    // 2. Probar endpoint de email con datos de prueba
    console.log('2️⃣ Probando endpoint de email...');
    const emailResponse = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientEmail: 'test@example.com',
        patientName: 'Paciente de Prueba',
        caseCode: 'TEST-001',
        pdfUrl: 'https://example.com/test.pdf'
      })
    });
    
    const emailData = await emailResponse.json();
    console.log('📧 Respuesta del email:', emailData);
    
    if (emailResponse.ok) {
      console.log('✅ Email enviado exitosamente!');
    } else {
      console.log('❌ Error al enviar email:', emailData.error);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
};

// Ejecutar la prueba
testEmailEndpoint();
