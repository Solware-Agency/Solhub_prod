-- =====================================================
-- Cron: marcar pólizas como overdue cuando next_payment_date ya pasó
-- Igual que labs (process_payment_overdue_and_inactive) pero para polizas.
-- No inactivamos la póliza (activo lo gestiona el negocio); solo payment_status.
-- =====================================================

-- 1. FUNCIÓN: Marcar payment_status = 'overdue' cuando next_payment_date < hoy
CREATE OR REPLACE FUNCTION process_polizas_payment_overdue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.polizas
  SET payment_status = 'overdue', updated_at = now()
  WHERE activo = true
    AND next_payment_date IS NOT NULL
    AND next_payment_date < current_date
    AND (payment_status IS NULL OR payment_status = 'current');

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE 'polizas overdue: % pólizas marcadas como overdue', updated_count;
END;
$$;

COMMENT ON FUNCTION process_polizas_payment_overdue() IS
'Actualiza payment_status a overdue en pólizas activas cuya next_payment_date ya pasó. Ejecutar diariamente.';

-- 2. CRON: ejecutar todos los días a las 00:10 UTC (después del de labs 00:05)
DO $$
BEGIN
  PERFORM cron.schedule(
    'polizas-overdue-daily',
    '10 0 * * *',
    'SELECT process_polizas_payment_overdue();'
  );
  RAISE NOTICE 'Cron polizas-overdue-daily programado (00:10 UTC)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'pg_cron no disponible o job ya existe. Programar manualmente si es necesario.';
END $$;
