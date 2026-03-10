# Recordatorios de pólizas (Inntegras) – Implementación aplicada

Este documento describe lo que se implementó y qué debes hacer tú si aplicas los cambios en otro entorno o necesitas verificar la configuración.

## 1. Lo que ya está aplicado en el proyecto Supabase vinculado

- **Migraciones aplicadas vía MCP** (base de datos del proyecto Forms conspat):
  1. **polizas_add_payment_columns_and_backfill**: Añade a `polizas` las 5 columnas (`next_payment_date`, `renewal_day_of_month`, `payment_frequency`, `billing_amount`, `payment_status`), constraints, backfill desde columnas actuales e índice.
  2. **get_next_payment_date_on_mark_paid_poliza**: Función RPC que, dado un `poliza_id`, devuelve la nueva `next_payment_date` (actual + 1 período según `payment_frequency`). El front debe hacer además `payment_status = 'current'`.
  3. **cron_polizas_reminder**: Cron diario a las **08:15 UTC** que invoca la Edge Function `polizas-reminder`.
  4. **polizas_overdue_cron**: Función `process_polizas_payment_overdue()` + cron **00:10 UTC** que marca `payment_status = 'overdue'` en pólizas activas cuya `next_payment_date` ya pasó.

- **Edge Function desplegada**: `polizas-reminder` (ventanas 30, 14, 7 días, vence hoy, post = día siguiente al vencimiento; sin flags; envía al email del asegurado).

## 2. Archivos creados o modificados en el repo

| Archivo | Descripción |
|--------|-------------|
| `supabase/migrations/20260312100000_polizas_add_payment_columns_and_backfill.sql` | Migración: 5 columnas + backfill + índice |
| `supabase/migrations/20260312100100_get_next_payment_date_on_mark_paid_poliza.sql` | Función `get_next_payment_date_on_mark_paid_poliza(p_poliza_id)` |
| `supabase/migrations/20260312100200_cron_polizas_reminder.sql` | Cron que llama a `polizas-reminder` a las 08:15 UTC |
| `supabase/migrations/20260312100300_polizas_overdue_cron.sql` | Función `process_polizas_payment_overdue` + cron 00:10 UTC para marcar pólizas vencidas como `overdue` |
| `supabase/functions/polizas-reminder/index.ts` | Edge Function de recordatorios por email (Resend) |

## 3. Qué debes hacer tú

### 3.1 Secrets de la Edge Function

La función `polizas-reminder` usa los **mismos secrets** que `payment-reminder`:

- **RESEND_API_KEY**: clave de Resend (ya debería estar si envías emails de labs).
- **RESEND_FROM_EMAIL** / **RESEND_FROM_NAME** (opcionales): remitente del correo.

Configuración en Supabase: **Project → Edge Functions → polizas-reminder → Secrets**.

### 3.2 Cron (pg_net + Vault)

El cron usa los mismos secrets del Vault que el de labs:

- **project_url**: URL del proyecto (ej. `https://sbqepjsxnqtldyvlntqk.supabase.co`).
- **anon_key**: clave anon (o service_role si prefieres) para el header `Authorization`.

Si el cron de `payment-reminder` ya funciona, el de `polizas-reminder` debería funcionar igual (misma configuración). Si en tu proyecto no tienes `pg_cron`/`pg_net` o los secrets, el cron no se habrá creado y verás un WARNING en la migración; en ese caso puedes invocar la función a mano (GET/POST a la URL de la función con el token en `Authorization`).

### 3.3 Front / dashboard: “Marcar como pagado” en pólizas

Cuando el usuario marque una póliza como pagada:

1. Llamar a la RPC:
   ```ts
   const { data, error } = await supabase.rpc('get_next_payment_date_on_mark_paid_poliza', {
     p_poliza_id: polizaId,
   })
   ```
2. Si `data` tiene al menos una fila y `data[0].next_payment_date` no es null:
   - Hacer `UPDATE` en `polizas`:
     - `next_payment_date = data[0].next_payment_date`
     - `payment_status = 'current'`
     - (opcional) actualizar también columnas legacy como `fecha_prox_vencimiento` y `estatus_pago` para la transición.
3. Mostrar advertencia tipo: “Si marcas como pagado otra vez por error, se sumará otro período (ej. un mes) a la próxima fecha.”

### 3.4 Emails de asegurados

Los recordatorios se envían al **email del asegurado** (`asegurados.email`). Si el asegurado no tiene email, no se envía correo (la función lo omite y no falla). Conviene que en el front, al crear/editar asegurados, el email sea obligatorio o muy visible si quieres que reciban recordatorios.

### 3.5 Timezone del laboratorio

La “fecha de hoy” para las ventanas (30/14/7/hoy/post) se calcula con la timezone del **laboratorio** (`laboratories.config.timezone`). Si no está definida, se usa `America/Caracas`. Asegúrate de que los labs de Inntegras tengan `config.timezone` si quieren otra zona.

## 4. Ventanas de recordatorio (resumen)

| Situación respecto a `next_payment_date` | Acción del cron ese día |
|------------------------------------------|--------------------------|
| = hoy + 30 días | Envía “Vence en 30 días” |
| = hoy + 14 días | Envía “Vence en 14 días” |
| = hoy + 7 días | Envía “Vence en 7 días” |
| = hoy | Envía “Vence hoy” |
| = ayer | Envía “Póliza vencida” (post, una sola vez) |
| Otra fecha | No envía |

Sin flags: la decisión es solo por la fecha del día y `next_payment_date`.

## 5. Probar la Edge Function a mano

Desde el dashboard de Supabase o con `curl`:

```bash
curl -X POST "https://TU_PROJECT_REF.supabase.co/functions/v1/polizas-reminder" \
  -H "Authorization: Bearer TU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Respuesta esperada: `{ "success": true, "sent": N, "reminders": [...] }`.

## 6. Sincronizar migraciones en otro entorno

Si en otro proyecto (staging, otro Supabase) quieres aplicar lo mismo desde el repo:

```bash
supabase link --project-ref TU_REF
supabase db push
```

Luego despliega la Edge Function (por ejemplo con `supabase functions deploy polizas-reminder`) y configura los secrets y el cron (o invocación manual) como arriba.
