-- =====================================================
-- Simplificación: next_payment_date y renewal_day_of_month
-- siempre con la misma regla al marcar "pagado".
-- - next_payment_date = próximo día fijo (renewal_day_of_month).
-- - renewal_day_of_month NUNCA se actualiza al día que pagó.
-- =====================================================

DROP FUNCTION IF EXISTS public.get_next_payment_date_on_mark_paid(uuid);

CREATE OR REPLACE FUNCTION public.get_next_payment_date_on_mark_paid(p_lab_id uuid)
RETURNS TABLE(next_payment_date date, renewal_day_of_month_new integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_renewal_day integer;
BEGIN
  SELECT renewal_day_of_month
  INTO v_renewal_day
  FROM public.laboratories
  WHERE id = p_lab_id
  LIMIT 1;

  IF NOT FOUND OR v_renewal_day IS NULL THEN
    next_payment_date := NULL;
    renewal_day_of_month_new := NULL;
    RETURN;
  END IF;

  -- Siempre: próximo día fijo de renovación. No se cambia renewal_day_of_month.
  next_payment_date := public.get_next_payment_date(v_renewal_day, current_date);
  renewal_day_of_month_new := NULL;
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_next_payment_date_on_mark_paid(uuid) IS
'Al marcar "pagado": devuelve (next_payment_date, renewal_day_of_month_new). Siempre next = próximo día de renovación según renewal_day_of_month; renewal_day_of_month_new = NULL (no cambiar el día de renovación). El dashboard debe actualizar status, payment_status, next_payment_date; renewal_day_of_month no se modifica al confirmar pago.';
