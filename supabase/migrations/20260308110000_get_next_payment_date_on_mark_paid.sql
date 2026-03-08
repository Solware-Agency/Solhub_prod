-- =====================================================
-- Función: próxima fecha al "marcar como pagado" (enfoque profesional)
-- - Si el lab está INACTIVO (pagó tarde, pasaron las 24h): próximo vencimiento = hoy + 1 período.
-- - Si está al día (current o overdue dentro de la 24h): próximo día fijo de renovación.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_next_payment_date_on_mark_paid(p_lab_id uuid)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_payment_frequency text;
  v_renewal_day integer;
BEGIN
  SELECT status, payment_frequency, renewal_day_of_month
  INTO v_status, v_payment_frequency, v_renewal_day
  FROM public.laboratories
  WHERE id = p_lab_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Pagó tarde (lab ya inactivo): el período empieza desde el día que paga.
  IF v_status = 'inactive' THEN
    IF v_payment_frequency = 'weekly' THEN
      RETURN (current_date + interval '1 week')::date;
    ELSIF v_payment_frequency = 'yearly' THEN
      RETURN (current_date + interval '1 year')::date;
    ELSE
      -- monthly o cualquier otro
      RETURN (current_date + interval '1 month')::date;
    END IF;
  END IF;

  -- Al día (active + current) o en gracia (overdue pero aún active): próximo día fijo de renovación.
  RETURN public.get_next_payment_date(v_renewal_day, current_date);
END;
$$;

COMMENT ON FUNCTION public.get_next_payment_date_on_mark_paid(uuid) IS
'Al marcar "pagado": si el lab está inactive, devuelve current_date + 1 período (mes/semana/año). Si está active (al día o en gracia), devuelve el próximo día de renovación. Usar en el dashboard admin al hacer "Marcar como pagado".';
