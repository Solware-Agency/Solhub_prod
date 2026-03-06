-- =====================================================
-- Migración: Campos de pago y recordatorios para laboratories
-- Fecha: 2026-03-05
-- Descripción: next_payment_date, payment_frequency, billing_amount, payment_status
--              para recordatorios 15/7/1 día antes, vence hoy, y estado retraso/inactivo
-- =====================================================

-- Columnas de pago en laboratories
ALTER TABLE public.laboratories
  ADD COLUMN IF NOT EXISTS next_payment_date date,
  ADD COLUMN IF NOT EXISTS payment_frequency text DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly', 'weekly', 'yearly')),
  ADD COLUMN IF NOT EXISTS billing_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'current' CHECK (payment_status IN ('current', 'overdue'));

COMMENT ON COLUMN public.laboratories.next_payment_date IS 'Próxima fecha de pago del laboratorio (recordatorios 15, 7, 1 día antes y vence hoy).';
COMMENT ON COLUMN public.laboratories.payment_frequency IS 'Frecuencia de cobro: monthly, weekly, yearly.';
COMMENT ON COLUMN public.laboratories.billing_amount IS 'Monto de cobro por período.';
COMMENT ON COLUMN public.laboratories.payment_status IS 'current = al día; overdue = en ventana de 24h tras vencimiento (retraso).';

-- Índice para cron/recordatorios por fecha
CREATE INDEX IF NOT EXISTS idx_laboratories_next_payment_date
  ON public.laboratories(next_payment_date)
  WHERE next_payment_date IS NOT NULL;

-- =====================================================
-- Fin de la migración
-- =====================================================
