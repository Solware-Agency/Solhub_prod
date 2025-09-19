// backend/routes/chat.js
import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';

const router = express.Router();

// Función para procesar y mejorar el formato markdown
function processMarkdownFormat(text) {
  if (!text) return text;

  // Convertir listas con guiones que están en una sola línea a formato markdown correcto
  // Buscar patrones como "- **Texto:** contenido - **Texto2:** contenido"

  // Dividir el texto en partes y procesar cada elemento de lista
  const parts = text.split(/- \*\*([^*]+):\*\*/);

  if (parts.length > 1) {
    let result = parts[0]; // Texto antes de la primera lista

    for (let i = 1; i < parts.length; i += 2) {
      const label = parts[i];
      const content = parts[i + 1] || '';

      // Extraer el contenido hasta el siguiente elemento o final
      const nextElementMatch = content.match(/^([^-]+?)(?= - \*\*|$)/);
      const itemContent = nextElementMatch ? nextElementMatch[1].trim() : content.trim();

      result += `- **${label}:** ${itemContent}\n`;
    }

    text = result;
  }

  // Limpiar espacios extra y asegurar formato correcto
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.replace(/\s+$/gm, '');

  return text;
}

// Variables de entorno
const FLOWISE_API_URL = process.env.FLOWISE_API_URL;
const FLOWISE_AGENTFLOW_ID = process.env.FLOWISE_AGENTFLOW_ID;
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

function normalizeRole(role) {
  const r = String(role ?? '').toLowerCase().trim();
  if (r === 'user' || r === 'assistant' || r === 'system') return r;
  if (r === 'human') return 'user';
  if (r === 'ai' || r === 'model' || r === 'bot') return 'assistant';
  return 'unknown';
}

function extractText(content) {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object' && typeof content.text === 'string') return content.text;
  if (content && typeof content === 'object' && typeof content.content === 'string') return content.content;

  // Manejar estructura con 'parts' array (desde frontend)
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          return part.text ?? part.content ?? '';
        }
        return '';
      })
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  // Manejar estructura con 'parts' array como propiedad
  if (content && typeof content === 'object' && Array.isArray(content.parts)) {
    return content.parts
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          return part.text ?? part.content ?? '';
        }
        return '';
      })
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  return '';
}

function getOrCreateSessionId(req) {
  const cookie = req.cookies.agentflow_session;
  if (cookie) return cookie;
  return `chat-${crypto.randomUUID()}`;
}

router.post('/chat', async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    const { messages } = req.body;

    // Procesar mensajes
    const rawMessages = Array.isArray(messages) ? messages : [];
    const normalized = rawMessages.map((m) => ({
      role: normalizeRole(m?.role),
      text: extractText(m?.content || m?.parts || m).trim(),
    }));
    const lastUser = [...normalized].reverse().find((m) => m.role === 'user' && m.text.length > 0) ?? null;
    const userMessage = lastUser?.text || '';

    console.log('Processed user message:', userMessage);

    if (!userMessage) {
      throw new Error('No hay mensaje de usuario con contenido');
    }

    console.log('Environment variables:', {
      FLOWISE_API_URL: FLOWISE_API_URL ? 'SET' : 'MISSING',
      FLOWISE_AGENTFLOW_ID: FLOWISE_AGENTFLOW_ID ? 'SET' : 'MISSING',
      FLOWISE_API_KEY: FLOWISE_API_KEY ? 'SET' : 'MISSING'
    });

    if (!FLOWISE_API_URL || !FLOWISE_AGENTFLOW_ID) {
      throw new Error('Config faltante: FLOWISE_API_URL / FLOWISE_AGENTFLOW_ID');
    }

    const sessionId = getOrCreateSessionId(req);

    // Llamar a Flowise - detectar si es webhook o API
    let url;
    let requestBody;
    let headers = {
      'Content-Type': 'application/json',
    };

    if (FLOWISE_API_URL.includes('/webhook/')) {
      // Es un webhook URL
      url = FLOWISE_API_URL;
      requestBody = {
        question: userMessage,
        sessionId: sessionId
      };
    } else {
      // Es una API URL estándar
      url = `${FLOWISE_API_URL}/api/v1/prediction/${FLOWISE_AGENTFLOW_ID}`;
      requestBody = {
        question: userMessage,
        sessionId: sessionId
      };
      if (FLOWISE_API_KEY) {
        headers.Authorization = `Bearer ${FLOWISE_API_KEY}`;
      }
    }

    console.log('→ Flowise request:', { url, requestBody, hasKey: Boolean(FLOWISE_API_KEY) });

    // Agregar timeout y mejor manejo de errores
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('🚨 TIMEOUT: Abortando request después de 55 segundos');
      controller.abort();
    }, 55000); // 55 segundos (menos que el límite de Vercel)

    console.log('📡 Enviando request a Flowise...');
    const requestStartTime = Date.now();

    const flowiseRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    }).finally(() => {
      clearTimeout(timeoutId);
      const requestDuration = Date.now() - requestStartTime;
      console.log(`⏱️  Request completado en: ${requestDuration}ms`);
    });

    if (!flowiseRes.ok) {
      const errBody = await flowiseRes.text().catch(() => '');
      throw new Error(`Flowise error: ${flowiseRes.status} - ${errBody?.slice(0, 300)}`);
    }

    console.log('📥 Procesando respuesta de Flowise...');
    const data = await flowiseRes.json();
    let responseText = data.text || 'No response from AgentFlow';

    // Procesar el texto para mejorar el formato markdown
    responseText = processMarkdownFormat(responseText);

    console.log('✅ Respuesta recibida:', responseText.substring(0, 100) + '...');

    // Configurar headers para streaming
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Set-Cookie': `agentflow_session=${sessionId}; Path=/; Max-Age=1209600; SameSite=Lax`,
    });

    console.log('🔄 Iniciando streaming de respuesta...');
    // Streaming de respuesta preservando formato markdown
    const chunks = responseText.split(/(\s+)/).filter(Boolean);
    let i = 0;

    function pump() {
      if (i < chunks.length) {
        const chunk = chunks[i++];
        const data = JSON.stringify({
          type: "text-delta",
          textDelta: chunk
        });
        res.write(`0:${data}\n`);
        setTimeout(pump, 30);
      } else {
        console.log('✅ Streaming completado');
        res.write('d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n');
        res.end();
      }
    }

    pump();

  } catch (err) {
    console.error('POST /api/chat ERROR', err);

    // Verificar si los headers ya fueron enviados
    if (!res.headersSent) {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
    }

    const errorMsg = `Error: ${err?.message ?? 'Error desconocido'}`;
    const data = JSON.stringify({
      type: "text-delta",
      textDelta: errorMsg
    });
    res.write(`0:${data}\n`);
    res.write('d:{"finishReason":"error","usage":{"promptTokens":0,"completionTokens":0}}\n');
    res.end();
  }
});

export default router;