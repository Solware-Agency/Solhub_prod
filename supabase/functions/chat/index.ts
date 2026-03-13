// Edge Function: chat — proxy a Flowise con JWT
// Reemplaza backend/routes/chat.js (Express)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizeRole(role: unknown): string {
  const r = String(role ?? "").toLowerCase().trim();
  if (r === "user" || r === "assistant" || r === "system") return r;
  if (r === "human") return "user";
  if (r === "ai" || r === "model" || r === "bot") return "assistant";
  return "unknown";
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (content && typeof content === "object" && "text" in content && typeof (content as { text: string }).text === "string")
    return (content as { text: string }).text;
  if (content && typeof content === "object" && "content" in content && typeof (content as { content: string }).content === "string")
    return (content as { content: string }).content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const p = part as { text?: string; content?: string };
          return p.text ?? p.content ?? "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  if (content && typeof content === "object" && Array.isArray((content as { parts?: unknown[] }).parts)) {
    return (content as { parts: unknown[] }).parts
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const p = part as { text?: string; content?: string };
          return p.text ?? p.content ?? "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  return "";
}

function processMarkdownFormat(text: string): string {
  if (!text) return text;
  const parts = text.split(/- \*\*([^*]+):\*\*/);
  if (parts.length > 1) {
    let result = parts[0];
    for (let i = 1; i < parts.length; i += 2) {
      const label = parts[i];
      const content = parts[i + 1] || "";
      const nextElementMatch = content.match(/^([^-]+?)(?= - \*\*|$)/);
      const itemContent = nextElementMatch ? nextElementMatch[1].trim() : content.trim();
      result += `- **${label}:** ${itemContent}\n`;
    }
    text = result;
  }
  text = text.replace(/\n\s*\n/g, "\n\n").replace(/\s+$/gm, "");
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authorization Bearer requerido" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await sb.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Token inválido o expirado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: { messages?: unknown[] };
  try {
    body = (await req.json()) as { messages?: unknown[] };
  } catch {
    return new Response(
      JSON.stringify({ error: "Body JSON inválido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const normalized = rawMessages.map((m: unknown) => {
    const msg = m as { role?: unknown; content?: unknown; parts?: unknown };
    return {
      role: normalizeRole(msg?.role),
      text: extractText(msg?.content ?? msg?.parts ?? msg).trim(),
    };
  });
  const lastUser = [...normalized].reverse().find((m) => m.role === "user" && m.text.length > 0) ?? null;
  const userMessage = lastUser?.text ?? "";

  if (!userMessage) {
    return new Response(
      JSON.stringify({ error: "No hay mensaje de usuario con contenido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const flowiseUrl = Deno.env.get("FLOWISE_API_URL");
  const flowiseFlowId = Deno.env.get("FLOWISE_AGENTFLOW_ID");
  const flowiseKey = Deno.env.get("FLOWISE_API_KEY");

  if (!flowiseUrl || !flowiseFlowId) {
    return new Response(
      JSON.stringify({ error: "Config Flowise faltante" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sessionId = `chat-${crypto.randomUUID()}`;
  let url: string;
  const requestBody: { question: string; sessionId: string } = {
    question: userMessage,
    sessionId,
  };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (flowiseUrl.includes("/webhook/")) {
    url = flowiseUrl;
  } else {
    url = `${flowiseUrl}/api/v1/prediction/${flowiseFlowId}`;
    if (flowiseKey) headers["Authorization"] = `Bearer ${flowiseKey}`;
  }

  const flowiseRes = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!flowiseRes.ok) {
    const errBody = await flowiseRes.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Flowise error: ${flowiseRes.status} - ${errBody.slice(0, 300)}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = (await flowiseRes.json()) as { text?: string };
  let responseText = data.text ?? "No response from AgentFlow";
  responseText = processMarkdownFormat(responseText);

  const chunks = responseText.split(/(\s+)/).filter(Boolean);
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const line = `0:${JSON.stringify({ type: "text-delta", textDelta: chunk })}\n`;
        controller.enqueue(encoder.encode(line));
      }
      controller.enqueue(encoder.encode('d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
