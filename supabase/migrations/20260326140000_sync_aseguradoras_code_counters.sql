-- El trigger asigna codigo con get_next_aseguradoras_code(last_value + 1).
-- Si hubo importación o alta manual, last_value puede quedar muy por debajo del
-- mayor P### / A### / C### existente → cada INSERT intenta un codigo ya usado (23505).

UPDATE public.aseguradoras_code_counters c
SET last_value = GREATEST(
  c.last_value,
  COALESCE(
    (
      SELECT MAX(
        CASE
          WHEN p.codigo ~ '^P[0-9]+$' THEN (SUBSTRING(p.codigo FROM 2))::integer
        END
      )
      FROM public.polizas p
      WHERE p.laboratory_id = c.laboratory_id
    ),
    0
  )
)
WHERE c.entity = 'polizas';

UPDATE public.aseguradoras_code_counters c
SET last_value = GREATEST(
  c.last_value,
  COALESCE(
    (
      SELECT MAX(
        CASE
          WHEN a.codigo ~ '^A[0-9]+$' THEN (SUBSTRING(a.codigo FROM 2))::integer
        END
      )
      FROM public.asegurados a
      WHERE a.laboratory_id = c.laboratory_id
    ),
    0
  )
)
WHERE c.entity = 'asegurados';

UPDATE public.aseguradoras_code_counters c
SET last_value = GREATEST(
  c.last_value,
  COALESCE(
    (
      SELECT MAX(
        CASE
          WHEN x.codigo ~ '^C[0-9]+$' THEN (SUBSTRING(x.codigo FROM 2))::integer
        END
      )
      FROM public.aseguradoras x
      WHERE x.laboratory_id = c.laboratory_id
    ),
    0
  )
)
WHERE c.entity = 'aseguradoras';
