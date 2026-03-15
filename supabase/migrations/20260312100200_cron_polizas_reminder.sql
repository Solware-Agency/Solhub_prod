-- =====================================================
-- Cron: invocar Edge Function polizas-reminder todos los días (recordatorios de pólizas)
-- Misma infraestructura que payment-reminder: vault secrets project_url y anon_key.
-- Se ejecuta a las 08:15 UTC (después de payment-reminder a las 08:00).
-- =====================================================

DO $$
BEGIN
  PERFORM cron.schedule(
    'polizas-reminder-daily',
    '15 8 * * *',
    $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/polizas-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $cron$
  );
  RAISE NOTICE 'Cron polizas-reminder-daily programado (08:15 UTC). Requiere vault secrets project_url y anon_key.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'No se pudo programar polizas-reminder (pg_net/vault?). Crear secrets y ejecutar manualmente. Ver comentarios en esta migración.';
END $$;
