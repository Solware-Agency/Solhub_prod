-- Reprogramar cron polizas-reminder para enviar x-polizas-reminder-secret (igual que POLIZAS_REMINDER_SECRET de la Edge Function).
--
-- Antes de aplicar esta migración (o justo después), crea el secret en Vault con el MISMO valor que POLIZAS_REMINDER_SECRET:
--   SELECT vault.create_secret('TU_SECRETO_LARGO', 'polizas_reminder_secret');
--
-- Si no existe polizas_reminder_secret, el header llegará vacío y la función responderá 401.

DO $$
BEGIN
  PERFORM cron.unschedule('polizas-reminder-daily');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'cron.unschedule polizas-reminder-daily omitido o falló: %', SQLERRM;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'polizas-reminder-daily',
    '00 12 * * *',
    $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/polizas-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key'),
        'x-polizas-reminder-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'polizas_reminder_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $cron$
  );
  RAISE NOTICE 'Cron polizas-reminder-daily reprogramado con cabecera x-polizas-reminder-secret. Vault: polizas_reminder_secret.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'No se pudo reprogramar polizas-reminder: %', SQLERRM;
END $$;
