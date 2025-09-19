// Script de diagnóstico para el chatbot
import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Función para probar la conexión a Flowise
async function testFlowiseConnection() {
  console.log('🔍 Iniciando diagnóstico del chatbot...\n');

  // Variables de entorno
  const FLOWISE_API_URL = process.env.FLOWISE_API_URL || process.env.VITE_FLOWISE_API_URL;
  const FLOWISE_AGENTFLOW_ID = process.env.FLOWISE_AGENTFLOW_ID || process.env.VITE_FLOWISE_AGENTFLOW_ID;
  const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY || process.env.VITE_FLOWISE_API_KEY;

  console.log('📋 Variables de entorno:');
  console.log(`  FLOWISE_API_URL: ${FLOWISE_API_URL ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  FLOWISE_AGENTFLOW_ID: ${FLOWISE_AGENTFLOW_ID ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  FLOWISE_API_KEY: ${FLOWISE_API_KEY ? '✅ SET' : '❌ MISSING'}\n`);

  if (!FLOWISE_API_URL || !FLOWISE_AGENTFLOW_ID) {
    console.log('❌ Error: Variables de entorno faltantes');
    return;
  }

  // Construir URL
  let url;
  let requestBody;
  let headers = {
    'Content-Type': 'application/json',
  };

  if (FLOWISE_API_URL.includes('/webhook/')) {
    url = FLOWISE_API_URL;
    requestBody = {
      question: "Hola, ¿cómo estás?",
      sessionId: `test-${crypto.randomUUID()}`
    };
  } else {
    url = `${FLOWISE_API_URL}/api/v1/prediction/${FLOWISE_AGENTFLOW_ID}`;
    requestBody = {
      question: "Hola, ¿cómo estás?",
      sessionId: `test-${crypto.randomUUID()}`
    };
    if (FLOWISE_API_KEY) {
      headers.Authorization = `Bearer ${FLOWISE_API_KEY}`;
    }
  }

  console.log('🌐 URL de Flowise:', url);
  console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
  console.log('🔑 Headers:', JSON.stringify(headers, null, 2));
  console.log('\n⏱️  Iniciando prueba de conexión...\n');

  const startTime = Date.now();

  try {
    // Timeout más largo para diagnóstico
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

    console.log('📡 Enviando request a Flowise...');

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  Tiempo de respuesta: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa:');
    console.log('📄 Data:', JSON.stringify(data, null, 2));

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  Tiempo hasta error: ${duration}ms`);
    console.log('❌ Error:', error.message);

    if (error.name === 'AbortError') {
      console.log('🚨 TIMEOUT: La conexión tardó más de 10 segundos');
    }
  }
}

// Ejecutar diagnóstico
testFlowiseConnection().catch(console.error);
