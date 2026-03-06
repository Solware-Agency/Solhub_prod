-- =====================================================
-- Cron: recordatorios de pago (payment-reminder) + overdue/inactive
-- Fecha: 2026-03-05
-- =====================================================

-- 1. FUNCIÓN: Marcar "overdue" y luego "inactive" según next_payment_date
--    - Overdue: next_payment_date ya pasó pero < 24h (ventana de gracia)
--    - Inactive: next_payment_date pasó hace más de 24h
CREATE OR REPLACE FUNCTION process_payment_overdue_and_inactive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  overdue_updated integer;
  inactive_updated integer;
BEGIN
  -- Marcar como "overdue" los labs cuya fecha de pago es ayer (están en ventana 24h)
  UPDATE public.laboratories
  SET payment_status = 'overdue', updated_at = now()
  WHERE status = 'active'
    AND next_payment_date IS NOT NULL
    AND next_payment_date = current_date - interval '1 day'
    AND (payment_status IS NULL OR payment_status = 'current');

  GET DIAGNOSTICS overdue_updated = ROW_COUNT;

  -- Inactivar labs cuya fecha de pago pasó hace más de 1 día
  UPDATE public.laboratories
  SET status = 'inactive', updated_at = now()
  WHERE status = 'active'
    AND next_payment_date IS NOT NULL
    AND next_payment_date < current_date - interval '1 day';

  GET DIAGNOSTICS inactive_updated = ROW_COUNT;

  RAISE NOTICE 'payment overdue/inactive: % marcados overdue, % inactivados', overdue_updated, inactive_updated;
END;
$$;

COMMENT ON FUNCTION process_payment_overdue_and_inactive() IS
'Actualiza payment_status a overdue (ventana 24h) y status a inactive (pasadas 24h). Ejecutar diariamente.';

-- 2. CRON: ejecutar proceso overdue/inactive todos los días a las 00:05
DO $$
BEGIN
  PERFORM cron.schedule(
    'payment-overdue-and-inactive-daily',
    '5 0 * * *',
    'SELECT process_payment_overdue_and_inactive();'
  );
  RAISE NOTICE 'Cron payment-overdue-and-inactive-daily programado (00:05 UTC)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'pg_cron no disponible o job ya existe. Programar manualmente si es necesario.';
END $$;

-- 3. CRON: invocar Edge Function payment-reminder todos los días a las 08:00 UTC
--    Requiere: pg_net habilitado y secrets en Vault: project_url, anon_key (o service_role_key)
--    Crear secrets en Dashboard > SQL o:
--      SELECT vault.create_secret('https://TU_REF.supabase.co', 'project_url');
--      SELECT vault.create_secret('TU_ANON_KEY', 'anon_key');
DO $$
BEGIN
  PERFORM cron.schedule(
    'payment-reminder-daily',
    '0 8 * * *',
    $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/payment-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $cron$
  );
  RAISE NOTICE 'Cron payment-reminder-daily programado (08:00 UTC). Requiere vault secrets project_url y anon_key.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'No se pudo programar payment-reminder (pg_net/vault?). Crear secrets y ejecutar: SELECT cron.schedule(...) manualmente. Ver comentarios en esta migración.';
END $$;

-- =====================================================
-- Fin
-- =====================================================
