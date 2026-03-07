-- =====================================================
-- Cron overdue/inactive: ejecutar a 00:05 Caracas (04:05 UTC)
-- Antes: 00:05 UTC = 20:05 del día anterior en Caracas.
-- Ahora: 04:05 UTC = 00:05 Caracas (misma fecha en Venezuela).
-- =====================================================

DO $$
BEGIN
  PERFORM cron.unschedule('payment-overdue-and-inactive-daily');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Job puede no existir si esta migración corre antes que la que lo crea
END $$;

SELECT cron.schedule(
  'payment-overdue-and-inactive-daily',
  '5 4 * * *',
  'SELECT process_payment_overdue_and_inactive();'
);
