/*
  # Fix: Make medical record code unique per laboratory
  
  - Cambia constraint de code UNIQUE a (code, laboratory_id) UNIQUE
  - Actualiza función generate_medical_record_code_from_table para filtrar por laboratory_id
  - Actualiza trigger para pasar laboratory_id a la función
  
  Esto permite que cada laboratorio tenga sus propios códigos independientes:
  - Conspat puede tener: 125001K, 125002K, 125003K
  - Solhub Demo puede tener: 125001K, 125002K, 125003K (sin conflicto)
*/

-- 1. Eliminar constraint antigua (code UNIQUE global)
ALTER TABLE medical_records_clean 
DROP CONSTRAINT IF EXISTS medical_records_clean_code_key;

-- 2. Crear nueva constraint única por (code, laboratory_id)
ALTER TABLE medical_records_clean 
ADD CONSTRAINT medical_records_clean_code_laboratory_unique 
UNIQUE (code, laboratory_id);

-- 3. Actualizar función para recibir y filtrar por laboratory_id
CREATE OR REPLACE FUNCTION generate_medical_record_code_from_table(
  exam_type_input text,
  case_date_input timestamptz,
  laboratory_id_input uuid  -- NUEVO PARÁMETRO
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  case_type_num smallint;
  yyyy smallint;
  mm smallint;
  year_since_2000 text;
  month_letter text;
  next_counter int;
BEGIN
  -- Validar que laboratory_id esté presente
  IF laboratory_id_input IS NULL THEN
    RAISE EXCEPTION 'laboratory_id es requerido para generar código';
  END IF;

  -- Map exam type (acepta variantes con/sin acentos y mayúsculas)
  CASE
    WHEN lower(replace(replace(exam_type_input, 'í', 'i'), 'ó', 'o')) LIKE 'citolog%' THEN case_type_num := 1;
    WHEN lower(exam_type_input) = 'biopsia' THEN case_type_num := 2;
    WHEN lower(replace(exam_type_input, 'í', 'i')) LIKE 'inmunohistoquim%' THEN case_type_num := 3;
    ELSE
      RAISE EXCEPTION 'Unknown exam type: %', exam_type_input USING errcode = '22023';
  END CASE;

  yyyy := extract(year FROM case_date_input)::smallint;
  mm := extract(month FROM case_date_input)::smallint;

  year_since_2000 := lpad((yyyy - 2000)::text, 2, '0');
  month_letter := substr('ABCDEFGHIJKL', mm, 1);

  -- Lock lógico por (tipo, año, mes, laboratory_id) para evitar carreras
  PERFORM pg_advisory_xact_lock(hashtext(concat('mrcode|', case_type_num, '|', yyyy, '|', mm, '|', laboratory_id_input::text)));

  -- Buscar el máximo contador existente FILTRANDO POR laboratory_id
  SELECT coalesce(max((substr(code, 4, 3))::int), 0)
    INTO next_counter
  FROM medical_records_clean
  WHERE length(code) = 7
    AND substr(code, 1, 1) = case_type_num::text
    AND substr(code, 2, 2) = year_since_2000
    AND substr(code, 7, 1) = month_letter
    AND laboratory_id = laboratory_id_input;  -- FILTRO CRÍTICO

  next_counter := next_counter + 1;

  RETURN concat(
    case_type_num::text,
    year_since_2000,
    lpad(next_counter::text, 3, '0'),
    month_letter
  );
END;
$$;

-- 4. Actualizar trigger para pasar laboratory_id
CREATE OR REPLACE FUNCTION set_medical_record_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  case_ts timestamptz;
BEGIN
  -- Validar que laboratory_id esté presente
  IF NEW.laboratory_id IS NULL THEN
    RAISE EXCEPTION 'laboratory_id es requerido para generar código';
  END IF;

  -- Determinar fecha del caso; si no viene, usar now()
  BEGIN
    case_ts := coalesce(NEW.date::timestamptz, now());
  EXCEPTION WHEN OTHERS THEN
    case_ts := now();
  END;

  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_medical_record_code_from_table(
      NEW.exam_type, 
      case_ts,
      NEW.laboratory_id  -- Pasar laboratory_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- No exponer la función públicamente (la usa el trigger)
REVOKE ALL ON FUNCTION generate_medical_record_code_from_table(text, timestamptz, uuid) FROM public;

-- Comentario para documentar el cambio
COMMENT ON CONSTRAINT medical_records_clean_code_laboratory_unique 
ON medical_records_clean IS 'Código único por laboratorio: (code, laboratory_id) permite que diferentes laboratorios tengan el mismo código';

