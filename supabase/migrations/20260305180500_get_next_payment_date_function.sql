-- =====================================================
-- Función: próxima fecha de pago según renewal_day_of_month
-- Si el día es mayor que los días del mes (ej. 31 en abril, 30/31 en febrero),
-- se usa el último día de ese mes.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_next_payment_date(
  p_renewal_day_of_month integer,
  p_from_date date DEFAULT current_date
)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_month_first date;
  last_day_of_month date;
  days_in_month integer;
  day_to_use integer;
BEGIN
  IF p_renewal_day_of_month IS NULL OR p_renewal_day_of_month < 1 OR p_renewal_day_of_month > 31 THEN
    RETURN NULL;
  END IF;

  -- Primer día del mes siguiente a p_from_date
  next_month_first := (date_trunc('month', p_from_date)::date + interval '1 month')::date;

  -- Último día de ese mes (respeta 28/29 feb, 30 abr/jun/sep/nov, 31 resto)
  last_day_of_month := (next_month_first + interval '1 month' - interval '1 day')::date;
  days_in_month := EXTRACT(DAY FROM last_day_of_month)::integer;

  -- Día a usar: el menor entre renewal_day y los días que tiene el mes
  day_to_use := LEAST(p_renewal_day_of_month, days_in_month);

  RETURN next_month_first + (day_to_use - 1) * interval '1 day';
END;
$$;

COMMENT ON FUNCTION public.get_next_payment_date(integer, date) IS
'Calcula la próxima fecha de pago: mes siguiente a p_from_date, día = renewal_day_of_month. Si el día excede los días del mes (ej. 31 en abril, 30/31 en febrero), usa el último día del mes. Usado al marcar "pagado" en el dashboard admin.';
