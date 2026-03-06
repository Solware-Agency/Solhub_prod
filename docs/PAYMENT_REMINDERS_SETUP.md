# Recordatorios de pago (laboratorios)

## Resumen

- **Tabla `laboratories`**: se añadieron `next_payment_date`, `payment_frequency`, `billing_amount`, `payment_status`.
- **Recordatorios por email**: la Edge Function **payment-reminder** envía los correos **ella misma** con Resend (no usa `send-email`). Ventanas: 15 días, 7 días, 1 día antes y **el día que vence** (“vence hoy”).
- **Ventana de 24 h**: si no pagan el día del vencimiento, tienen 24 h en estado “retraso” (`payment_status = 'overdue'`); después el laboratorio pasa a `status = 'inactive'` y nadie puede usarlo.
- **Banner en el sistema**: el owner ve un aviso grande según los días restantes o “en retraso”; si el lab está inactivo, se muestra pantalla de bloqueo.

## Qué debes hacer por tu cuenta

### 1. Aplicar migraciones

```bash
pnpm supabase db push
# o
supabase db push
```

### 2. Desplegar la Edge Function `payment-reminder`

```bash
supabase functions deploy payment-reminder
```

La función envía los correos con **Resend** (no llama a `send-email`). Configura en Edge Function Secrets:

- **RESEND_API_KEY** (obligatorio): tu API key de Resend.
- **RESEND_FROM_EMAIL** (opcional): remitente, p. ej. `notificaciones@tudominio.com`. Por defecto `onboarding@resend.dev`.
- **RESEND_FROM_NAME** (opcional): nombre del remitente. Por defecto `Solhub`.

### 3. (Obligatorio para recordatorios por email) Secrets en Vault

El cron que llama a `payment-reminder` necesita la URL del proyecto y una clave. En el **SQL Editor** de Supabase (o con un cliente SQL), ejecuta **una vez** (sustituye los valores):

```sql
-- Sustituye TU_PROJECT_REF por el ref de tu proyecto (ej: abcdefghijklmnop)
-- y TU_ANON_KEY por tu anon/public key (Settings > API)
SELECT vault.create_secret('https://TU_PROJECT_REF.supabase.co', 'project_url');
SELECT vault.create_secret('TU_ANON_KEY', 'anon_key');
```

Para ver si ya existen:

```sql
SELECT name FROM vault.secrets;
```

### 4. Comprobar extensiones

- **pg_cron**: suele estar habilitado en proyectos Supabase.
- **pg_net**: necesario para que el cron haga HTTP a la Edge Function. En Dashboard: Database > Extensions > `pg_net` → Enable.

Si el cron de `payment-reminder` no se creó en la migración (por falta de vault o pg_net), puedes programarlo a mano después de crear los secrets:

```sql
SELECT cron.schedule(
  'payment-reminder-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/payment-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### 5. Configurar fechas y montos por laboratorio

Hasta que tengas una pantalla de “Configuración de pago”, puedes setear los datos por SQL:

```sql
UPDATE laboratories
SET
  next_payment_date = '2026-04-10',
  payment_frequency = 'monthly',
  billing_amount = 150.00,
  payment_status = 'current'
WHERE id = 'UUID_DEL_LABORATORIO';
```

Cuando el cliente pague, actualiza `next_payment_date` (por ejemplo al siguiente mes) y, si estaba inactivo, `status = 'active'` y `payment_status = 'current'`.

## Horarios (UTC)

- **00:05 UTC**: proceso overdue/inactive (marca “retraso” e inactiva labs pasada la ventana de 24 h).
- **08:00 UTC**: envío de emails de recordatorio (15, 7, 1 día y “vence hoy”).

Puedes cambiar las expresiones cron en `supabase/migrations/20260305180100_payment_reminder_cron_and_overdue.sql` si quieres otros horarios.
