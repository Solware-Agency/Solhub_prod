-- Bug: RETURNS TABLE requiere RETURN NEXT para emitir filas. Un RETURN solo terminaba la función
-- sin filas → RPC devolvía [] → el frontend no actualizaba next_payment_date tras marcar pagado.

CREATE OR REPLACE FUNCTION public.get_next_payment_date_on_mark_paid_poliza(p_poliza_id uuid)
RETURNS TABLE(next_payment_date date)
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
  SELECT pol.next_payment_date, pol.payment_frequency, pol.renewal_day_of_month
  INTO v_next_payment_date, v_payment_frequency, v_renewal_day
  FROM public.polizas pol
  WHERE pol.id = p_poliza_id
  LIMIT 1;

  IF NOT FOUND THEN
    next_payment_date := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_next_payment_date IS NOT NULL THEN
    IF v_payment_frequency = 'yearly' THEN
      next_payment_date := (v_next_payment_date + interval '1 year')::date;
    ELSIF v_payment_frequency = 'quarterly' THEN
      next_payment_date := (v_next_payment_date + interval '3 months')::date;
    ELSIF v_payment_frequency = 'semiannual' THEN
      next_payment_date := (v_next_payment_date + interval '6 months')::date;
    ELSE
      next_payment_date := (v_next_payment_date + interval '1 month')::date;
    END IF;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_renewal_day IS NOT NULL THEN
    next_payment_date := public.get_next_payment_date(v_renewal_day, current_date);
  ELSE
    next_payment_date := NULL;
  END IF;
  RETURN NEXT;
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_next_payment_date_on_mark_paid_poliza(uuid) IS
'Al marcar póliza como pagada: devuelve la nueva next_payment_date (actual + 1 período: monthly/quarterly/semiannual/yearly). El caller debe actualizar polizas SET next_payment_date = resultado, payment_status = ''current''. renewal_day_of_month no se modifica.';
