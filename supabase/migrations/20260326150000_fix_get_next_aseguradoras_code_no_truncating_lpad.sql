-- Bug: LPAD(next_value::text, 3, '0') trunca cuando next_value >= 1000
-- (ej. 1881 → "188" → código P188, duplicado).
-- Los códigos deben ser prefix || número completo (P1881, A42, etc.).

CREATE OR REPLACE FUNCTION public.get_next_aseguradoras_code(lab_id UUID, entity_name TEXT, prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_value INTEGER;
BEGIN
  IF lab_id IS NULL THEN
    RAISE EXCEPTION 'laboratory_id requerido para generar codigo';
  END IF;

  LOOP
    UPDATE public.aseguradoras_code_counters
      SET last_value = last_value + 1,
          updated_at = NOW()
      WHERE laboratory_id = lab_id
        AND entity = entity_name
      RETURNING last_value INTO next_value;

    IF FOUND THEN
      EXIT;
    END IF;

    BEGIN
      INSERT INTO public.aseguradoras_code_counters (laboratory_id, entity, last_value)
      VALUES (lab_id, entity_name, 1)
      ON CONFLICT (laboratory_id, entity) DO NOTHING
      RETURNING last_value INTO next_value;

      IF FOUND THEN
        EXIT;
      END IF;
    EXCEPTION WHEN unique_violation THEN
    END;
  END LOOP;

  RETURN prefix || next_value::TEXT;
END;
$$;
