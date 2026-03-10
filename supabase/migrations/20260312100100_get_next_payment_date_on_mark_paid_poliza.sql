-- =====================================================
-- Pólizas: al marcar como pagado, próxima fecha = actual + 1 período.
-- renewal_day_of_month no se modifica. Misma lógica que labs.
-- =====================================================

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
    RETURN;
  END IF;

  -- Si ya tiene próxima fecha: avanzar 1 período según payment_frequency.
  IF v_next_payment_date IS NOT NULL THEN
    IF v_payment_frequency = 'yearly' THEN
      next_payment_date := (v_next_payment_date + interval '1 year')::date;
    ELSIF v_payment_frequency = 'quarterly' THEN
      next_payment_date := (v_next_payment_date + interval '3 months')::date;
    ELSIF v_payment_frequency = 'semiannual' THEN
      next_payment_date := (v_next_payment_date + interval '6 months')::date;
    ELSE
      -- monthly o cualquier otro
      next_payment_date := (v_next_payment_date + interval '1 month')::date;
    END IF;
    RETURN;
  END IF;

  -- Fallback: sin fecha actual, usar día de renovación desde hoy (si existe get_next_payment_date para polizas podríamos reutilizarla; laboratories ya tiene una).
  IF v_renewal_day IS NOT NULL THEN
    next_payment_date := public.get_next_payment_date(v_renewal_day, current_date);
  ELSE
    next_payment_date := NULL;
  END IF;
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_next_payment_date_on_mark_paid_poliza(uuid) IS
'Al marcar póliza como pagada: devuelve la nueva next_payment_date (actual + 1 período: monthly/quarterly/semiannual/yearly). El caller debe actualizar polizas SET next_payment_date = resultado, payment_status = ''current''. renewal_day_of_month no se modifica.';
