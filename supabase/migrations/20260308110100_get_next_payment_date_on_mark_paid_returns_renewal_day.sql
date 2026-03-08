-- =====================================================
-- Cuando el lab estaba inactive (pagó tarde), además de next_payment_date
-- se debe actualizar renewal_day_of_month al día del mes en que pagó,
-- para que el próximo ciclo use ese día como día fijo.
-- La función pasa a devolver (next_payment_date, renewal_day_of_month_new).
-- renewal_day_of_month_new es NULL si no debe cambiarse (lab active).
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
  v_status text;
  v_payment_frequency text;
  v_renewal_day integer;
  v_next date;
  v_new_renewal_day integer := NULL;
BEGIN
  SELECT status, payment_frequency, renewal_day_of_month
  INTO v_status, v_payment_frequency, v_renewal_day
  FROM public.laboratories
  WHERE id = p_lab_id
  LIMIT 1;

  IF NOT FOUND THEN
    next_payment_date := NULL;
    renewal_day_of_month_new := NULL;
    RETURN;
  END IF;

  -- Pagó tarde (lab ya inactivo): próximo vencimiento = hoy + 1 período; día fijo = día que paga.
  IF v_status = 'inactive' THEN
    IF v_payment_frequency = 'weekly' THEN
      v_next := (current_date + interval '1 week')::date;
    ELSIF v_payment_frequency = 'yearly' THEN
      v_next := (current_date + interval '1 year')::date;
    ELSE
      v_next := (current_date + interval '1 month')::date;
    END IF;
    v_new_renewal_day := EXTRACT(DAY FROM current_date)::integer;
    v_new_renewal_day := LEAST(GREATEST(v_new_renewal_day, 1), 31);
    next_payment_date := v_next;
    renewal_day_of_month_new := v_new_renewal_day;
    RETURN;
  END IF;

  -- Al día (active): próximo día fijo de renovación; no cambiar renewal_day_of_month.
  next_payment_date := public.get_next_payment_date(v_renewal_day, current_date);
  renewal_day_of_month_new := NULL;
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_next_payment_date_on_mark_paid(uuid) IS
'Al marcar "pagado": devuelve (next_payment_date, renewal_day_of_month_new). Si el lab está inactive: next = hoy+1 período y renewal_day_of_month_new = día del mes de hoy. Si está active: next = próximo día de renovación y renewal_day_of_month_new = NULL (no cambiar). El dashboard debe hacer UPDATE con next_payment_date y renewal_day_of_month = COALESCE(renewal_day_of_month_new, renewal_day_of_month).';
