# Edge Functions – SolHub

Funciones desplegadas en Supabase que reemplazan endpoints de Vercel/Express.

## Despliegue

Desde la raíz del proyecto:

```bash
supabase functions deploy generate-doc
supabase functions deploy generate-pdf
supabase functions deploy download-pdf
supabase functions deploy chat
```

## Secrets en Supabase

Configurar en **Project Settings → Edge Functions → Secrets** (o con `supabase secrets set`):

| Secret | Uso | Ya lo tienes |
|--------|-----|----------------|
| `SUPABASE_URL` | URL del proyecto | ✅ |
| `SUPABASE_ANON_KEY` | Cliente con RLS | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo `download-pdf` (lectura BD) | ✅ |
| `FLOWISE_API_URL` | Chat | ✅ |
| `FLOWISE_AGENTFLOW_ID` | Chat | ✅ |
| `FLOWISE_API_KEY` | Chat | ✅ |
| **`GENERATE_DOC_WEBHOOK_URL`** | URL por defecto del webhook n8n para generar doc (se usa si el lab no tiene `config.webhooks.generateDoc`) | ❌ **Añadir** |
| **`GENERATE_PDF_WEBHOOK_URL`** | URL por defecto del webhook n8n para generar PDF (se usa si el lab no tiene `config.webhooks.generatePdf`) | ❌ **Añadir** |
| `N8N_WEBHOOK_SECRET` | (Opcional) Header que n8n valida para aceptar la petición | Opcional |

**Comportamiento:** Las funciones `generate-doc` y `generate-pdf` leen la config del laboratorio del caso (`laboratories.config.webhooks.generateDoc` / `generatePdf`). Si el lab tiene esa URL configurada, se usa; si no, se usa el secret correspondiente. Así cada lab puede tener su propio webhook n8n.

Valores sugeridos para los dos secrets (URL por defecto cuando el lab no define la suya):

- `GENERATE_DOC_WEBHOOK_URL` = `https://solwareagencia.app.n8n.cloud/webhook/7c840100-fd50-4598-9c48-c7ce60f82506`
- `GENERATE_PDF_WEBHOOK_URL` = `https://solwareagencia.app.n8n.cloud/webhook/36596a3a-0aeb-4ee1-887f-854324cc785b`

## verify_jwt por función

- **generate-doc**, **generate-pdf**, **chat**: deben tener **verify_jwt: true** (por defecto). El frontend envía `Authorization: Bearer <session.access_token>`.
- **download-pdf**: debe tener **verify_jwt: false** para que el cliente pueda llamarla con la anon key y los query params `caseId` y `token` (sin sesión de usuario).

En el dashboard de Supabase: **Edge Functions → download-pdf → Settings → Verify JWT** = Off.

Por CLI, al desplegar:

```bash
supabase functions deploy download-pdf --no-verify-jwt
```

Las demás se despliegan con verify JWT activado (por defecto).
