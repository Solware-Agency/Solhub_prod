-- =====================================================
-- Pólizas: añadir 5 columnas de cobro (misma lógica que laboratories)
-- y rellenarlas desde columnas actuales. Sin flags; crons/edge usan solo estas.
-- =====================================================

-- 1. Añadir columnas (una por sentencia para evitar problemas con CHECK)
ALTER TABLE public.polizas ADD COLUMN IF NOT EXISTS next_payment_date date;
ALTER TABLE public.polizas ADD COLUMN IF NOT EXISTS renewal_day_of_month integer;
ALTER TABLE public.polizas ADD COLUMN IF NOT EXISTS payment_frequency text;
ALTER TABLE public.polizas ADD COLUMN IF NOT EXISTS billing_amount numeric;
ALTER TABLE public.polizas ADD COLUMN IF NOT EXISTS payment_status text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'polizas_renewal_day_check') THEN
    ALTER TABLE public.polizas ADD CONSTRAINT polizas_renewal_day_check
      CHECK (renewal_day_of_month IS NULL OR (renewal_day_of_month >= 1 AND renewal_day_of_month <= 31));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'polizas_payment_frequency_check') THEN
    ALTER TABLE public.polizas ADD CONSTRAINT polizas_payment_frequency_check
      CHECK (payment_frequency IS NULL OR payment_frequency IN ('monthly', 'quarterly', 'semiannual', 'yearly'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'polizas_payment_status_check') THEN
    ALTER TABLE public.polizas ADD CONSTRAINT polizas_payment_status_check
      CHECK (payment_status IS NULL OR payment_status IN ('current', 'overdue'));
  END IF;
END $$;

COMMENT ON COLUMN public.polizas.next_payment_date IS 'Fecha de referencia para recordatorios (30/14/7 días, vence hoy, post). Usado por Edge Function polizas-reminder.';
COMMENT ON COLUMN public.polizas.renewal_day_of_month IS 'Día del mes de renovación (1-31). No se modifica al marcar como pagado.';
COMMENT ON COLUMN public.polizas.payment_frequency IS 'Período: monthly, quarterly, semiannual, yearly. Usado para calcular próxima fecha al renovar.';
COMMENT ON COLUMN public.polizas.billing_amount IS 'Monto a cobrar por período (ej. prima en USD).';
COMMENT ON COLUMN public.polizas.payment_status IS 'current = al día; overdue = vencida.';

-- 2. Backfill desde columnas actuales
UPDATE public.polizas
SET
  next_payment_date = COALESCE(fecha_prox_vencimiento, fecha_vencimiento),
  renewal_day_of_month = dia_vencimiento,
  payment_frequency = CASE
    WHEN modalidad_pago = 'Mensual' THEN 'monthly'
    WHEN modalidad_pago = 'Trimestral' THEN 'quarterly'
    WHEN modalidad_pago = 'Semestral' THEN 'semiannual'
    WHEN modalidad_pago = 'Anual' THEN 'yearly'
    ELSE 'monthly'
  END,
  billing_amount = suma_asegurada,
  payment_status = CASE
    WHEN estatus_pago = 'Pagado' THEN 'current'
    WHEN estatus_pago = 'En mora' THEN 'overdue'
    WHEN COALESCE(fecha_prox_vencimiento, fecha_vencimiento) < current_date THEN 'overdue'
    ELSE 'current'
  END
WHERE next_payment_date IS NULL
   OR renewal_day_of_month IS NULL
   OR payment_frequency IS NULL
   OR payment_status IS NULL;

-- Índice para el cron/edge function (filtrar por activo y next_payment_date)
CREATE INDEX IF NOT EXISTS idx_polizas_activo_next_payment_date
  ON public.polizas (laboratory_id, next_payment_date)
  WHERE activo = true AND next_payment_date IS NOT NULL;
