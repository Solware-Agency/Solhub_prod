-- =====================================================
-- Regla al marcar "pagado": la próxima fecha avanza 1 período
-- (desde la fecha actual de vencimiento, no "próximo día X desde hoy").
-- Ej: next_payment_date = 08/04/2026 → al marcar pagado → 08/05/2026.
-- renewal_day_of_month no se modifica.
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
  v_next_payment_date date;
  v_payment_frequency text;
  v_renewal_day integer;
BEGIN
  SELECT l.next_payment_date, l.payment_frequency, l.renewal_day_of_month
  INTO v_next_payment_date, v_payment_frequency, v_renewal_day
  FROM public.laboratories l
  WHERE l.id = p_lab_id
  LIMIT 1;

  IF NOT FOUND THEN
    next_payment_date := NULL;
    renewal_day_of_month_new := NULL;
    RETURN;
  END IF;

  -- Si ya tiene próxima fecha: avanzar 1 período desde esa fecha.
  IF v_next_payment_date IS NOT NULL THEN
    IF v_payment_frequency = 'weekly' THEN
      next_payment_date := (v_next_payment_date + interval '1 week')::date;
    ELSIF v_payment_frequency = 'yearly' THEN
      next_payment_date := (v_next_payment_date + interval '1 year')::date;
    ELSE
      -- monthly o cualquier otro
      next_payment_date := (v_next_payment_date + interval '1 month')::date;
    END IF;
    renewal_day_of_month_new := NULL;
    RETURN;
  END IF;

  -- Fallback: sin fecha actual, usar próximo día fijo desde hoy.
  IF v_renewal_day IS NOT NULL THEN
    next_payment_date := public.get_next_payment_date(v_renewal_day, current_date);
  ELSE
    next_payment_date := NULL;
  END IF;
  renewal_day_of_month_new := NULL;
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_next_payment_date_on_mark_paid(uuid) IS
'Al marcar "pagado": devuelve (next_payment_date, renewal_day_of_month_new). next_payment_date = fecha actual de vencimiento + 1 período (mes/semana/año según payment_frequency). Si no hay fecha actual, usa próximo día de renovación desde hoy. renewal_day_of_month_new = NULL. Si el admin marca como pagado otra vez por error, se sumará otro período.';
