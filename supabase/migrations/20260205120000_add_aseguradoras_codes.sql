CREATE TABLE IF NOT EXISTS aseguradoras_code_counters (
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  entity TEXT NOT NULL CHECK (entity IN ('asegurados', 'aseguradoras', 'polizas')),
  last_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (laboratory_id, entity)
);

CREATE OR REPLACE FUNCTION get_next_aseguradoras_code(lab_id UUID, entity_name TEXT, prefix TEXT)
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
    UPDATE aseguradoras_code_counters
      SET last_value = last_value + 1,
          updated_at = NOW()
      WHERE laboratory_id = lab_id
        AND entity = entity_name
      RETURNING last_value INTO next_value;

    IF FOUND THEN
      EXIT;
    END IF;

    BEGIN
      INSERT INTO aseguradoras_code_counters (laboratory_id, entity, last_value)
      VALUES (lab_id, entity_name, 1)
      ON CONFLICT (laboratory_id, entity) DO NOTHING
      RETURNING last_value INTO next_value;

      IF FOUND THEN
        EXIT;
      END IF;
    EXCEPTION WHEN unique_violation THEN
      -- Retry loop
    END;
  END LOOP;

  RETURN prefix || LPAD(next_value::TEXT, 3, '0');
END;
$$;

ALTER TABLE asegurados ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE aseguradoras ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS codigo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS asegurados_codigo_unique_per_lab
  ON asegurados (laboratory_id, codigo)
  WHERE codigo IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS aseguradoras_codigo_unique_per_lab
  ON aseguradoras (laboratory_id, codigo)
  WHERE codigo IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS polizas_codigo_unique_per_lab
  ON polizas (laboratory_id, codigo)
  WHERE codigo IS NOT NULL;

CREATE OR REPLACE FUNCTION set_asegurados_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.laboratory_id IS NULL THEN
    SELECT laboratory_id INTO NEW.laboratory_id FROM profiles WHERE id = auth.uid();
  END IF;

  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := get_next_aseguradoras_code(NEW.laboratory_id, 'asegurados', 'A');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION set_aseguradoras_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.laboratory_id IS NULL THEN
    SELECT laboratory_id INTO NEW.laboratory_id FROM profiles WHERE id = auth.uid();
  END IF;

  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := get_next_aseguradoras_code(NEW.laboratory_id, 'aseguradoras', 'C');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION set_polizas_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.laboratory_id IS NULL THEN
    SELECT laboratory_id INTO NEW.laboratory_id FROM profiles WHERE id = auth.uid();
  END IF;

  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := get_next_aseguradoras_code(NEW.laboratory_id, 'polizas', 'P');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_asegurados_codigo ON asegurados;
CREATE TRIGGER trg_set_asegurados_codigo
BEFORE INSERT ON asegurados
FOR EACH ROW
EXECUTE FUNCTION set_asegurados_codigo();

DROP TRIGGER IF EXISTS trg_set_aseguradoras_codigo ON aseguradoras;
CREATE TRIGGER trg_set_aseguradoras_codigo
BEFORE INSERT ON aseguradoras
FOR EACH ROW
EXECUTE FUNCTION set_aseguradoras_codigo();

DROP TRIGGER IF EXISTS trg_set_polizas_codigo ON polizas;
CREATE TRIGGER trg_set_polizas_codigo
BEFORE INSERT ON polizas
FOR EACH ROW
EXECUTE FUNCTION set_polizas_codigo();

DO $$
DECLARE
  lab UUID;
  rec RECORD;
BEGIN
  FOR lab IN SELECT DISTINCT laboratory_id FROM asegurados WHERE codigo IS NULL LOOP
    FOR rec IN
      SELECT id FROM asegurados
      WHERE laboratory_id = lab AND codigo IS NULL
      ORDER BY created_at NULLS LAST, id
    LOOP
      UPDATE asegurados
        SET codigo = get_next_aseguradoras_code(lab, 'asegurados', 'A')
        WHERE id = rec.id;
    END LOOP;
  END LOOP;

  FOR lab IN SELECT DISTINCT laboratory_id FROM aseguradoras WHERE codigo IS NULL LOOP
    FOR rec IN
      SELECT id FROM aseguradoras
      WHERE laboratory_id = lab AND codigo IS NULL
      ORDER BY created_at NULLS LAST, id
    LOOP
      UPDATE aseguradoras
        SET codigo = get_next_aseguradoras_code(lab, 'aseguradoras', 'C')
        WHERE id = rec.id;
    END LOOP;
  END LOOP;

  FOR lab IN SELECT DISTINCT laboratory_id FROM polizas WHERE codigo IS NULL LOOP
    FOR rec IN
      SELECT id FROM polizas
      WHERE laboratory_id = lab AND codigo IS NULL
      ORDER BY created_at NULLS LAST, id
    LOOP
      UPDATE polizas
        SET codigo = get_next_aseguradoras_code(lab, 'polizas', 'P')
        WHERE id = rec.id;
    END LOOP;
  END LOOP;
END;
$$;
