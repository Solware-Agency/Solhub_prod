-- =====================================================
-- Día fijo de renovación por laboratorio
-- Fecha: 2026-03-05
-- Para calcular next_payment_date al marcar "pagado" (ej. siempre el día 10).
-- =====================================================

ALTER TABLE public.laboratories
  ADD COLUMN IF NOT EXISTS renewal_day_of_month integer
  CHECK (renewal_day_of_month >= 1 AND renewal_day_of_month <= 31);

COMMENT ON COLUMN public.laboratories.renewal_day_of_month IS
'Día del mes en que vence el pago (1-31). Ej: 10 = siempre el 10 de cada mes. Usado al marcar "pagado" para calcular el próximo next_payment_date.';
