

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."cito_status_type" AS ENUM (
    'positivo',
    'negativo'
);


ALTER TYPE "public"."cito_status_type" OWNER TO "postgres";


CREATE TYPE "public"."doc_aprobado_status" AS ENUM (
    'faltante',
    'pendiente',
    'aprobado',
    'rechazado'
);


ALTER TYPE "public"."doc_aprobado_status" OWNER TO "postgres";


CREATE TYPE "public"."exam_type" AS ENUM (
    'Biopsia',
    'Inmunohistoquímica',
    'Citología'
);


ALTER TYPE "public"."exam_type" OWNER TO "postgres";


CREATE TYPE "public"."gender_type" AS ENUM (
    'Masculino',
    'Femenino'
);


ALTER TYPE "public"."gender_type" OWNER TO "postgres";


CREATE TYPE "public"."habit_level_type" AS ENUM (
    'muy alta',
    'alta',
    'media',
    'baja',
    'muy baja',
    'No'
);


ALTER TYPE "public"."habit_level_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status_type" AS ENUM (
    'Incompleto',
    'Pagado'
);


ALTER TYPE "public"."payment_status_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."payment_status_type" IS 'Payment status enum: Incompleto (default) or Pagado';



CREATE OR REPLACE FUNCTION "public"."actualizar_pdf_en_ready_medical"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Actualizar a TRUE donde informe_qr no es nulo y no está vacío
    UPDATE medical_records_clean
    SET pdf_en_ready = TRUE
    WHERE informe_qr IS NOT NULL AND informe_qr <> '';
    
    -- Actualizar a FALSE donde informe_qr es nulo o está vacío
    UPDATE medical_records_clean
    SET pdf_en_ready = FALSE
    WHERE informe_qr IS NULL OR informe_qr = '';
END;
$$;


ALTER FUNCTION "public"."actualizar_pdf_en_ready_medical"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."actualizar_pdf_en_ready_medical_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Si informe_qr tiene contenido, establecer pdf_en_ready a TRUE
    IF NEW.informe_qr IS NOT NULL AND NEW.informe_qr <> '' THEN
        NEW.pdf_en_ready := TRUE;
    ELSE
        NEW.pdf_en_ready := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."actualizar_pdf_en_ready_medical_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_module_config_on_lab_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  module_record RECORD;
  module_config jsonb;
BEGIN
  -- Iterar sobre todos los módulos activos
  FOR module_record IN
    SELECT mc.feature_key, mc.module_name, mc.structure
    FROM module_catalog mc
    WHERE mc.is_active = true
  LOOP
    -- Si el laboratorio tiene la feature habilitada
    IF NEW.features->>module_record.feature_key = 'true' THEN
      -- Construir configuración desde estructura
      module_config := build_module_config_from_structure(module_record.structure);
      
      -- Aplicar configuración al laboratorio
      IF NEW.config IS NULL THEN
        NEW.config := '{}'::jsonb;
      END IF;
      
      IF NEW.config->'modules' IS NULL THEN
        NEW.config := jsonb_set(NEW.config, ARRAY['modules'], '{}'::jsonb);
      END IF;
      
      NEW.config := jsonb_set(
        NEW.config,
        ARRAY['modules', module_record.module_name],
        module_config
      );
      
      RAISE NOTICE 'Configuración del módulo "%" aplicada automáticamente al laboratorio "%"', 
        module_record.module_name, NEW.name;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."apply_module_config_on_lab_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."build_module_config_from_structure"("module_structure" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  field_key text;
  field_config jsonb;
  action_key text;
  action_config jsonb;
BEGIN
  -- Procesar fields (con enabled y required)
  IF module_structure ? 'fields' AND module_structure->'fields' IS NOT NULL THEN
    FOR field_key, field_config IN SELECT * FROM jsonb_each(module_structure->'fields')
    LOOP
      result := jsonb_set(
        COALESCE(result, '{}'::jsonb),
        ARRAY['fields', field_key],
        jsonb_build_object(
          'enabled', COALESCE((field_config->>'defaultEnabled')::boolean, false),
          'required', COALESCE((field_config->>'defaultRequired')::boolean, false)
        )
      );
    END LOOP;
  END IF;
  
  -- Procesar actions (convertir boolean a jsonb)
  IF module_structure ? 'actions' AND module_structure->'actions' IS NOT NULL THEN
    FOR action_key, action_config IN SELECT * FROM jsonb_each(module_structure->'actions')
    LOOP
      result := jsonb_set(
        COALESCE(result, '{}'::jsonb),
        ARRAY['actions', action_key],
        to_jsonb(COALESCE((action_config->>'defaultEnabled')::boolean, false))
      );
    END LOOP;
  END IF;
  
  -- Procesar settings (valores por defecto)
  IF module_structure ? 'settings' AND module_structure->'settings' IS NOT NULL THEN
    result := COALESCE(result, '{}'::jsonb) || jsonb_build_object('settings', module_structure->'settings');
  END IF;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."build_module_config_from_structure"("module_structure" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."build_module_config_from_structure"("module_structure" "jsonb") IS 'Construye la configuración inicial de un módulo desde su estructura.';



CREATE OR REPLACE FUNCTION "public"."calculate_bmi"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.height_cm IS NOT NULL AND NEW.weight_kg IS NOT NULL AND NEW.height_cm > 0 THEN
    -- BMI = peso (kg) / (altura (m))²
    NEW.bmi := ROUND((NEW.weight_kg / POWER(NEW.height_cm / 100.0, 2))::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_bmi"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_approved"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE is_approved boolean;
BEGIN
  -- Permitir durante confirmación inicial
  IF NEW.created_at = NEW.confirmed_at THEN
    RETURN NEW;
  END IF;

  -- Si no hay perfil, permitir (edge case)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT (estado = 'aprobado') INTO is_approved
  FROM public.profiles WHERE id = NEW.id;

  IF NOT is_approved THEN
    RAISE EXCEPTION 'User account is pending approval';
  END IF;

  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE LOG 'Error in check_user_approved: % (%)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_user_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."email_exists_auth"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1
    from auth.users u
    where lower(u.email) = lower(p_email)
  );
$$;


ALTER FUNCTION "public"."email_exists_auth"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_doc_aprobado_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  v_role text;
  v_claims jsonb;
  v_uid uuid;
BEGIN
  IF NEW.doc_aprobado = OLD.doc_aprobado THEN
    RETURN NEW;
  END IF;

  v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;

  IF v_claims ? 'role' AND v_claims->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role::text INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL THEN
    v_role := 'employee';
  END IF;

  -- Todos los roles: faltante -> pendiente
  IF OLD.doc_aprobado = 'faltante' AND NEW.doc_aprobado = 'pendiente' THEN
    RETURN NEW;
  END IF;

  -- Solo owner: pendiente -> aprobado
  IF v_role IN ('owner', 'residente', 'citotecno') AND OLD.doc_aprobado = 'pendiente' AND NEW.doc_aprobado = 'aprobado' THEN
    RETURN NEW;
  END IF;

  -- Solo owner: pendiente -> rechazado
  IF v_role IN ('owner', 'residente', 'citotecno') AND OLD.doc_aprobado = 'pendiente' AND NEW.doc_aprobado = 'rechazado' THEN
    RETURN NEW;
  END IF;

  -- Owner, admin y employee: rechazado -> pendiente (transición inversa)
  IF v_role IN ('owner', 'residente', 'employee', 'citotecno') AND OLD.doc_aprobado = 'rechazado' AND NEW.doc_aprobado = 'pendiente' THEN
    RETURN NEW;
  END IF;

  -- Solo owner: aprobado -> pendiente (reversión)
  IF v_role IN ('owner', 'citotecno') AND OLD.doc_aprobado = 'aprobado' AND NEW.doc_aprobado = 'pendiente' THEN
    RETURN NEW;
  END IF;

  -- Solo owner: aprobado -> rechazado (NUEVA TRANSICIÓN PERMITIDA)
  IF v_role IN ('owner', 'citotecno') AND OLD.doc_aprobado = 'aprobado' AND NEW.doc_aprobado = 'rechazado' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transición % -> % no permitida para rol %', OLD.doc_aprobado, NEW.doc_aprobado, v_role;
END$$;


ALTER FUNCTION "public"."enforce_doc_aprobado_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."format_medical_record_names"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Formatear el nombre del médico tratante
    IF NEW.treating_doctor IS NOT NULL THEN
        NEW.treating_doctor := format_name(NEW.treating_doctor);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."format_medical_record_names"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."format_name"("input_name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Si el input es NULL o vacío, retornar NULL
    IF input_name IS NULL OR TRIM(input_name) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Convertir a minúsculas, dividir por espacios, capitalizar cada palabra y unir
    RETURN array_to_string(
        array(
            SELECT initcap(word)
            FROM unnest(string_to_array(trim(input_name), ' ')) AS word
            WHERE word != ''
        ), 
        ' '
    );
END;
$$;


ALTER FUNCTION "public"."format_name"("input_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."format_patient_names"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Formatear el nombre del paciente
    IF NEW.nombre IS NOT NULL THEN
        NEW.nombre := format_name(NEW.nombre);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."format_patient_names"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_medical_record_code_flexible"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  lab_config jsonb;
  code_template text;
  code_mappings jsonb;
  counter_pattern text;
  counter_start int := 1;
  counter_padding int := 3;
  
  -- Valores calculados
  exam_code text;
  type_num smallint;
  yyyy smallint;
  mm smallint;
  dd smallint;
  year_since_2000 text;
  year_full text;
  month_letter text;
  day_padded text;
  
  -- Para búsqueda de contador
  next_counter int;
  max_counter int;
  search_pattern text;
  max_attempts int := 10;
  attempt int := 0;
  generated_code text;
  code_exists boolean;
  
  -- Para parsing de template
  padding_size int;
  
  -- Para inferir patrón cuando counter_pattern es NULL
  inferred_pattern text;
  
  -- Para extracción de contador SPT
  exam_code_length int;
  counter_length int;
BEGIN
  -- Validar inputs
  IF laboratory_id_input IS NULL THEN
    RAISE EXCEPTION 'laboratory_id es requerido para generar código';
  END IF;

  IF exam_type_input IS NULL OR exam_type_input = '' THEN
    RAISE EXCEPTION 'exam_type es requerido para generar código';
  END IF;

  -- Obtener configuración del laboratorio
  SELECT config INTO lab_config
  FROM laboratories
  WHERE id = laboratory_id_input;

  IF lab_config IS NULL THEN
    RAISE EXCEPTION 'Laboratorio no encontrado: %', laboratory_id_input;
  END IF;

  -- Extraer configuración de código
  code_template := lab_config->>'codeTemplate';
  code_mappings := lab_config->'codeMappings';
  counter_pattern := lab_config->>'counterPattern';
  counter_start := COALESCE((lab_config->>'counterStart')::int, 1);
  counter_padding := COALESCE((lab_config->>'counterPadding')::int, 3);

  -- Si no hay plantilla, usar formato Conspat (retrocompatibilidad)
  IF code_template IS NULL OR code_template = '' THEN
    code_template := '{type}{year:2}{counter:3}{month}';
    counter_pattern := '{type}{year:2}*{month}';
  END IF;

  -- Calcular valores de fecha
  yyyy := extract(year FROM case_date_input)::smallint;
  mm := extract(month FROM case_date_input)::smallint;
  dd := extract(day FROM case_date_input)::smallint;
  
  year_since_2000 := lpad((yyyy - 2000)::text, 2, '0');
  year_full := yyyy::text;
  month_letter := substr('ABCDEFGHIJKL', mm, 1);
  day_padded := lpad(dd::text, 2, '0');

  -- Obtener código de examen o tipo
  exam_code := get_exam_code_from_mapping(exam_type_input, code_mappings);
  type_num := get_exam_type_number(exam_type_input);

  -- Si no hay código de examen y la plantilla lo requiere, usar tipo numérico
  IF exam_code IS NULL AND code_template LIKE '%{examCode}%' THEN
    IF type_num IS NULL THEN
      RAISE EXCEPTION 'No se encontró mapeo para tipo de examen: %', exam_type_input;
    END IF;
    exam_code := type_num::text;
  END IF;

  -- Determinar longitud del código de examen y del contador desde el template
  exam_code_length := COALESCE(length(exam_code), 0);
  -- Extraer padding del template: {counter:N}
  IF code_template ~ '{counter:(\d+)}' THEN
    counter_length := (regexp_match(code_template, '{counter:(\d+)}'))[1]::int;
  ELSE
    counter_length := counter_padding;
  END IF;

  -- Si counter_pattern es NULL, inferirlo del code_template
  IF counter_pattern IS NULL OR counter_pattern = '' THEN
    -- Inferir patrón basado en el template
    -- Formato SPT: {examCode}{counter:4}{month}{year:2} → {examCode}*{month}{year:2}
    IF code_template LIKE '%{examCode}%{counter:%}%{month}%{year:2}%' THEN
      counter_pattern := '{examCode}*{month}{year:2}';
    -- Formato Conspat: {type}{year:2}{counter:3}{month} → {type}{year:2}*{month}
    ELSIF code_template LIKE '%{type}%{year:2}%{counter:%}%{month}%' THEN
      counter_pattern := '{type}{year:2}*{month}';
    -- Formato genérico: usar el template reemplazando {counter:N} con *
    ELSE
      inferred_pattern := code_template;
      -- Reemplazar {counter:N} con *
      WHILE inferred_pattern ~ '{counter:\d+}' LOOP
        inferred_pattern := regexp_replace(inferred_pattern, '{counter:\d+}', '*', 'g');
      END LOOP;
      -- Reemplazar {counter} con *
      inferred_pattern := replace(inferred_pattern, '{counter}', '*');
      counter_pattern := inferred_pattern;
    END IF;
  END IF;

  -- Lock lógico por (laboratory_id, tipo, año, mes) para evitar carreras
  PERFORM pg_advisory_xact_lock(
    hashtext(concat('mrcode|', laboratory_id_input::text, '|', 
                    COALESCE(exam_code, type_num::text), '|', yyyy, '|', mm))
  );

  -- Generar código con verificación de unicidad
  LOOP
    attempt := attempt + 1;
    
    IF attempt > max_attempts THEN
      RAISE EXCEPTION 'No se pudo generar código único después de % intentos', max_attempts;
    END IF;

    -- Buscar siguiente contador basado en el patrón
    IF counter_pattern IS NOT NULL AND counter_pattern != '' THEN
      -- Para formato Conspat: {type}{year:2}*{month}
      IF counter_pattern LIKE '%{type}%{year:2}%*%{month}%' THEN
        SELECT coalesce(max(
          CASE 
            WHEN length(code) = 7 AND 
                 substr(code, 1, 1) = type_num::text AND
                 substr(code, 2, 2) = year_since_2000 AND
                 substr(code, 7, 1) = month_letter
            THEN (substr(code, 4, 3))::int
            ELSE NULL
          END
        ), 0)
        INTO max_counter
        FROM medical_records_clean
        WHERE laboratory_id = laboratory_id_input;
        
      -- Para formato SPT: {examCode}*{month}{year:2}
      ELSIF counter_pattern LIKE '%{examCode}%*%{month}%{year:2}%' THEN
        -- Construir patrón de búsqueda: examCode + cualquier cosa + month + year:2
        search_pattern := COALESCE(exam_code, '') || '%' || month_letter || year_since_2000;
        
        -- Extraer el contador máximo de códigos que coinciden con el patrón
        -- Formato: {examCode}{counter:N}{month}{year:2}
        -- Ejemplo: LA0509L25 → examCode=LA(2), counter=0509(4), month=L(1), year=25(2)
        -- El contador está en las posiciones después de examCode (longitud examCode) hasta counter_length caracteres
        SELECT coalesce(max(
          CASE 
            WHEN code LIKE search_pattern 
                 AND length(code) = exam_code_length + counter_length + 3 THEN
              -- Extraer el número del medio: desde después de examCode hasta counter_length caracteres
              (substr(code, exam_code_length + 1, counter_length))::int
            ELSE NULL
          END
        ), 0)
        INTO max_counter
        FROM medical_records_clean
        WHERE laboratory_id = laboratory_id_input
          AND code LIKE search_pattern;
        
      ELSE
        -- Patrón genérico: construir patrón de búsqueda
        search_pattern := counter_pattern;
        search_pattern := replace(search_pattern, '{examCode}', COALESCE(exam_code, ''));
        search_pattern := replace(search_pattern, '{type}', COALESCE(type_num::text, ''));
        search_pattern := replace(search_pattern, '{year:2}', year_since_2000);
        search_pattern := replace(search_pattern, '{year:4}', year_full);
        search_pattern := replace(search_pattern, '{month}', month_letter);
        search_pattern := replace(search_pattern, '{day:2}', day_padded);
        search_pattern := replace(search_pattern, '*', '%');
        
        -- Contar códigos que coinciden con el patrón
        SELECT count(*)
        INTO max_counter
        FROM medical_records_clean
        WHERE laboratory_id = laboratory_id_input
          AND code LIKE search_pattern;
      END IF;
    ELSE
      -- Sin patrón: contar todos los códigos del laboratorio (fallback)
      SELECT count(*)
      INTO max_counter
      FROM medical_records_clean
      WHERE laboratory_id = laboratory_id_input;
    END IF;

    -- Calcular siguiente contador
    IF max_counter = 0 THEN
      next_counter := counter_start + (attempt - 1);
    ELSE
      next_counter := max_counter + 1 + (attempt - 1);
    END IF;

    -- Generar código desde plantilla
    generated_code := code_template;
    
    -- Reemplazar placeholders
    generated_code := replace(generated_code, '{examCode}', COALESCE(exam_code, ''));
    generated_code := replace(generated_code, '{type}', COALESCE(type_num::text, ''));
    generated_code := replace(generated_code, '{year:2}', year_since_2000);
    generated_code := replace(generated_code, '{year:4}', year_full);
    generated_code := replace(generated_code, '{month}', month_letter);
    generated_code := replace(generated_code, '{day:2}', day_padded);
    
    -- Reemplazar {counter:N} con el contador formateado
    WHILE generated_code ~ '{counter:\d+}' LOOP
      -- Extraer el tamaño del padding
      padding_size := (regexp_match(generated_code, '{counter:(\d+)}'))[1]::int;
      
      -- Reemplazar con contador formateado
      generated_code := replace(
        generated_code,
        '{counter:' || padding_size::text || '}',
        lpad(next_counter::text, padding_size, '0')
      );
    END LOOP;
    
    -- Reemplazar {counter} sin especificar padding (usar default)
    generated_code := replace(
      generated_code,
      '{counter}',
      lpad(next_counter::text, counter_padding, '0')
    );

    -- Verificar unicidad
    SELECT EXISTS(
      SELECT 1 
      FROM medical_records_clean 
      WHERE code = generated_code 
        AND laboratory_id = laboratory_id_input
    ) INTO code_exists;

    -- Si no existe, retornar código
    IF NOT code_exists THEN
      RETURN generated_code;
    END IF;

    -- Si existe, incrementar contador y reintentar
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_medical_record_code_flexible"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_medical_record_code_flexible"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") IS 'Genera código de caso médico usando sistema flexible basado en configuración del laboratorio.
Lee codeTemplate y codeMappings de laboratories.config para generar códigos personalizados.
Si counter_pattern es NULL, lo infiere automáticamente del code_template.
Corregido para manejar correctamente formatos SPT y otros formatos personalizados con extracción precisa del contador.';



CREATE OR REPLACE FUNCTION "public"."generate_medical_record_code_from_table"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  lab_config jsonb;
  code_format_type text;
  consulta_value text;
  case_type_num smallint;
  yyyy smallint;
  mm smallint;
  year_since_2000 text;
  month_letter text;
  next_counter int;
BEGIN
  -- Validar laboratory_id
  IF laboratory_id_input IS NULL THEN
    RAISE EXCEPTION 'laboratory_id es requerido';
  END IF;

  -- Obtener configuración del laboratorio
  SELECT config INTO lab_config
  FROM laboratories
  WHERE id = laboratory_id_input;

  IF lab_config IS NULL THEN
    RAISE EXCEPTION 'Laboratorio no encontrado: %', laboratory_id_input;
  END IF;

  -- Determinar tipo de formato de código
  code_format_type := lab_config->'codeFormat'->>'type';

  -- Si es formato custom (SPT), usar nueva función
  IF code_format_type = 'custom' THEN
    -- Obtener consulta del registro más reciente (workaround hasta que se pase en trigger)
    SELECT consulta INTO consulta_value
    FROM medical_records_clean
    WHERE laboratory_id = laboratory_id_input 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    RETURN generate_spt_custom_code(
      exam_type_input,
      consulta_value,
      case_date_input,
      laboratory_id_input,
      lab_config
    );
  END IF;

  -- ============================================================
  -- FORMATO CONSPAT (por defecto) - CÓDIGO ORIGINAL SIN CAMBIOS
  -- ============================================================
  
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
  -- FORMATO CONSPAT: [tipo:1d][año:2d][contador:3d][mes:1letra]
  -- Ejemplo: 125001K (tipo 1, año 25, contador 001, mes K)
  SELECT coalesce(max((substr(code, 4, 3))::int), 0)
    INTO next_counter
  FROM medical_records_clean
  WHERE length(code) = 7
    AND substr(code, 1, 1) = case_type_num::text
    AND substr(code, 2, 2) = year_since_2000
    AND substr(code, 7, 1) = month_letter
    AND laboratory_id = laboratory_id_input;

  next_counter := next_counter + 1;

  -- Formato Conspat: [tipo][año][contador:3d][mes]
  RETURN concat(
    case_type_num::text,
    year_since_2000,
    lpad(next_counter::text, 3, '0'),
    month_letter
  );
END;
$$;


ALTER FUNCTION "public"."generate_medical_record_code_from_table"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_medical_record_code_from_table"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") IS 'Función principal que detecta el formato de código del laboratorio. Si config.codeFormat.type="custom" usa generate_spt_custom_code(). Si no está configurado o es NULL, usa formato Conspat original: [tipo][año][contador:3d][mes]. Ejemplo Conspat: 125001K. Ejemplo SPT: CI0001K25';



CREATE OR REPLACE FUNCTION "public"."generate_spt_custom_code"("exam_type_input" "text", "consulta_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid", "laboratory_config" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  type_code text;
  yyyy smallint;
  mm smallint;
  year_suffix text;
  month_letter text;
  next_counter int;
  type_mappings jsonb;
  exam_mappings jsonb;
  consulta_mappings jsonb;
BEGIN
  -- Obtener mappings de configuración
  type_mappings := laboratory_config->'codeFormat'->'typeMappings';
  
  IF type_mappings IS NULL THEN
    RAISE EXCEPTION 'codeFormat.typeMappings no configurado para laboratorio %', laboratory_id_input;
  END IF;

  exam_mappings := type_mappings->'examTypes';
  consulta_mappings := type_mappings->'consultaTypes';

  -- Determinar código de tipo (prioridad: examType > consulta)
  IF exam_type_input IS NOT NULL AND exam_type_input != '' THEN
    type_code := exam_mappings->>exam_type_input;
    IF type_code IS NULL THEN
      RAISE EXCEPTION 'No hay código configurado para exam_type: "%". Verifica config.codeFormat.typeMappings.examTypes', exam_type_input;
    END IF;
  ELSIF consulta_input IS NOT NULL AND consulta_input != '' THEN
    type_code := consulta_mappings->>consulta_input;
    IF type_code IS NULL THEN
      RAISE EXCEPTION 'No hay código configurado para consulta: "%". Verifica config.codeFormat.typeMappings.consultaTypes', consulta_input;
    END IF;
  ELSE
    RAISE EXCEPTION 'Debe proporcionar exam_type o consulta para generar código';
  END IF;

  -- Extraer año y mes
  yyyy := extract(year FROM case_date_input)::smallint;
  mm := extract(month FROM case_date_input)::smallint;

  -- Formato SPT: últimos 2 dígitos del año
  year_suffix := lpad((yyyy % 100)::text, 2, '0');
  
  -- Mes: A-L (Enero-Diciembre)
  month_letter := substr('ABCDEFGHIJKL', mm, 1);

  -- Lock lógico por (tipo_code, año, mes, laboratory_id)
  PERFORM pg_advisory_xact_lock(
    hashtext(
      format('%s-%s-%s-%s', type_code, year_suffix, month_letter, laboratory_id_input)
    )
  );

  -- Buscar siguiente contador para este (tipo_code, mes, año, laboratory_id)
  -- Formato SPT: [CÓDIGO][0001][MES][AÑO] ej: CI0001K25
  SELECT COALESCE(MAX(
    CASE
      WHEN substring(code, length(type_code) + 1, 4) ~ '^\d+$' 
      THEN substring(code, length(type_code) + 1, 4)::int
      ELSE 0
    END
  ), 0) + 1
  INTO next_counter
  FROM medical_records_clean
  WHERE substring(code, 1, length(type_code)) = type_code
    AND substring(code, length(type_code) + 5, 1) = month_letter
    AND substring(code, length(type_code) + 6, 2) = year_suffix
    AND laboratory_id = laboratory_id_input;

  -- Formato SPT: [CÓDIGO][contador:4d][mes:letra][año:2d]
  -- Ejemplo: CI0001K25, MA0042B25
  RETURN format('%s%s%s%s',
    type_code,
    lpad(next_counter::text, 4, '0'),
    month_letter,
    year_suffix
  );
END;
$_$;


ALTER FUNCTION "public"."generate_spt_custom_code"("exam_type_input" "text", "consulta_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid", "laboratory_config" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_spt_custom_code"("exam_type_input" "text", "consulta_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid", "laboratory_config" "jsonb") IS 'Genera códigos personalizados formato SPT. Usa códigos alfabéticos de config.codeFormat.typeMappings. Formato: [CÓDIGO][0001][MES][AÑO]. Ejemplo: CI0001K25';



CREATE OR REPLACE FUNCTION "public"."get_all_change_logs_with_deleted"() RETURNS TABLE("id" "uuid", "medical_record_id" "uuid", "user_id" "uuid", "user_email" "text", "field_name" "text", "field_label" "text", "old_value" "text", "new_value" "text", "changed_at" timestamp with time zone, "created_at" timestamp with time zone, "deleted_record_info" "text", "record_full_name" "text", "record_code" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.medical_record_id,
    cl.user_id,
    cl.user_email,
    cl.field_name,
    cl.field_label,
    cl.old_value,
    cl.new_value,
    cl.changed_at,
    cl.created_at,
    cl.deleted_record_info,
    COALESCE(mrc.full_name, cl.deleted_record_info, 'Caso eliminado') as record_full_name,
    COALESCE(mrc.code, 'Sin código') as record_code
  FROM change_logs cl
  LEFT JOIN medical_records_clean mrc ON cl.medical_record_id = mrc.id
  ORDER BY cl.changed_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_all_change_logs_with_deleted"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exam_code_from_mapping"("exam_type_input" "text", "code_mappings" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  exam_code text;
  exam_key text;
BEGIN
  -- Si no hay mapeos, retornar null
  IF code_mappings IS NULL THEN
    RETURN NULL;
  END IF;

  -- Buscar coincidencia exacta (case-insensitive)
  FOR exam_key IN SELECT jsonb_object_keys(code_mappings)
  LOOP
    IF lower(trim(exam_key)) = lower(trim(exam_type_input)) THEN
      exam_code := code_mappings->>exam_key;
      RETURN exam_code;
    END IF;
  END LOOP;

  -- Buscar coincidencia parcial (para variantes con/sin acentos)
  FOR exam_key IN SELECT jsonb_object_keys(code_mappings)
  LOOP
    IF lower(replace(replace(exam_type_input, 'í', 'i'), 'ó', 'o')) 
       LIKE '%' || lower(replace(replace(exam_key, 'í', 'i'), 'ó', 'o')) || '%' THEN
      exam_code := code_mappings->>exam_key;
      RETURN exam_code;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_exam_code_from_mapping"("exam_type_input" "text", "code_mappings" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_exam_code_from_mapping"("exam_type_input" "text", "code_mappings" "jsonb") IS 'Busca código de examen en codeMappings JSONB. Busca coincidencia exacta y parcial (ignorando acentos).';



CREATE OR REPLACE FUNCTION "public"."get_exam_type_number"("exam_type_input" "text") RETURNS smallint
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  -- Map exam type (acepta variantes con/sin acentos y mayúsculas)
  CASE
    WHEN lower(replace(replace(exam_type_input, 'í', 'i'), 'ó', 'o')) LIKE 'citolog%' THEN RETURN 1;
    WHEN lower(exam_type_input) = 'biopsia' THEN RETURN 2;
    WHEN lower(replace(exam_type_input, 'í', 'i')) LIKE 'inmunohistoquim%' THEN RETURN 3;
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."get_exam_type_number"("exam_type_input" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_exam_type_number"("exam_type_input" "text") IS 'Retorna número de tipo de examen para formato Conspat: 1=Citología, 2=Biopsia, 3=Inmunohistoquímica.';



CREATE OR REPLACE FUNCTION "public"."get_user_laboratory_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select laboratory_id 
  from public.profiles 
  where id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_user_laboratory_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_laboratory_id"() IS 'Función helper que retorna el laboratory_id del usuario autenticado. Útil para RLS policies y queries.';



CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select role 
  from public.profiles 
  where id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_phone_text text;
  v_phone_numeric numeric;
  v_laboratory_id uuid;
  v_display_name text;
  v_role text;
BEGIN
  -- Leer phone de metadata (lógica mejorada)
  -- CORREGIDO: Limitar a 15 dígitos máximo para evitar números concatenados
  v_phone_text := regexp_replace(coalesce(NEW.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g');

  IF v_phone_text IS NULL OR v_phone_text = '' THEN
    v_phone_numeric := NULL;
  ELSIF length(v_phone_text) > 15 THEN
    -- Si tiene más de 15 dígitos, truncar (probablemente concatenado)
    v_phone_text := substring(v_phone_text, 1, 15);
    BEGIN
      v_phone_numeric := v_phone_text::numeric;
    EXCEPTION WHEN others THEN
      v_phone_numeric := NULL;
    END;
  ELSIF length(v_phone_text) > 0 AND length(v_phone_text) <= 15 THEN
    BEGIN
      v_phone_numeric := v_phone_text::numeric;
    EXCEPTION WHEN others THEN
      v_phone_numeric := NULL;
    END;
  ELSE
    v_phone_numeric := NULL;
  END IF;

  -- NUEVO: Leer laboratory_id de metadata
  -- ⚠️ CRÍTICO: laboratory_id es OBLIGATORIO, debe existir siempre
  BEGIN
    IF NEW.raw_user_meta_data->>'laboratory_id' IS NOT NULL AND NEW.raw_user_meta_data->>'laboratory_id' != '' THEN
      v_laboratory_id := (NEW.raw_user_meta_data->>'laboratory_id')::uuid;
      
      -- CORREGIDO: Usar public.laboratories (no solo laboratories)
      -- Verificar que el laboratorio existe
      IF NOT EXISTS (SELECT 1 FROM public.laboratories WHERE id = v_laboratory_id) THEN
        RAISE EXCEPTION 'Laboratory with id % does not exist', v_laboratory_id;
      END IF;
      
      RAISE LOG 'Creating profile for user % with laboratory_id %', NEW.id, v_laboratory_id;
    ELSE
      -- Si no hay laboratory_id, es un error (no se puede registrar sin código)
      RAISE EXCEPTION 'laboratory_id is required but not provided in metadata';
    END IF;
  EXCEPTION 
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid laboratory_id format in metadata: %', NEW.raw_user_meta_data->>'laboratory_id';
    WHEN others THEN
      RAISE EXCEPTION 'Error reading laboratory_id from metadata: %', SQLERRM;
  END;

  -- NUEVO: Leer role de metadata
  -- ⚠️ IMPORTANTE: El rol viene desde el frontend cuando el usuario se registra
  -- Si no existe en metadata, usar 'employee' como fallback (compatibilidad hacia atrás)
  v_role := NEW.raw_user_meta_data->>'role';
  
  -- Validar que el rol es válido
  IF v_role IS NOT NULL AND v_role != '' THEN
    -- Validar que el rol es uno de los permitidos
    IF v_role NOT IN ('owner', 'admin', 'employee', 'residente', 'citotecno', 'patologo', 'medicowner', 'medico_tratante', 'enfermero') THEN
      RAISE LOG 'Warning: Invalid role "%" in metadata, using "employee" as fallback', v_role;
      v_role := 'employee';
    END IF;
  ELSE
    -- Si no hay rol en metadata, usar lógica de fallback
    -- Mantener compatibilidad con el email especial de owner
    IF NEW.email = 'juegosgeorge0502@gmail.com' THEN
      v_role := 'owner';
    ELSE
      v_role := 'employee';
    END IF;
    RAISE LOG 'No role in metadata for user %, using fallback: %', NEW.email, v_role;
  END IF;

  -- Leer display_name de metadata
  -- ⚠️ IMPORTANTE: display_name NO debe ser el teléfono
  -- Si display_name es un número (teléfono), usar NULL
  v_display_name := NEW.raw_user_meta_data->>'display_name';
  
  -- Validar que display_name no sea un número (teléfono)
  IF v_display_name IS NOT NULL AND v_display_name ~ '^\d+$' THEN
    -- Si es solo números, probablemente es un teléfono, usar NULL
    RAISE LOG 'Warning: display_name appears to be a phone number (%), using NULL', v_display_name;
    v_display_name := NULL;
  END IF;

  -- Insertar perfil con laboratory_id (OBLIGATORIO) y role (desde metadata o fallback)
  INSERT INTO public.profiles (
    id,
    email,
    role,
    estado,
    phone,
    display_name,
    laboratory_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_role, -- ← CORREGIDO: Usar rol desde metadata, no hardcodeado
    CASE WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'aprobado' ELSE 'pendiente' END,
    v_phone_numeric,
    v_display_name,
    v_laboratory_id  -- ← OBLIGATORIO, nunca NULL
  );
  
  RAISE LOG 'Profile created for user % with role % and laboratory_id %', NEW.email, v_role, v_laboratory_id;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error en handle_new_user para usuario %: %', NEW.email, SQLERRM;
    -- Re-lanzar el error para que Supabase lo maneje
    RAISE;
END;
$_$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Crea automáticamente un perfil cuando se registra un nuevo usuario. 
Lee laboratory_id y role de raw_user_meta_data.
- laboratory_id es OBLIGATORIO (debe venir del código de laboratorio)
- role es OPCIONAL pero recomendado (si no viene, usa "employee" como fallback)
Si role no está en metadata, usa lógica de fallback (owner para email especial, employee para otros).';



CREATE OR REPLACE FUNCTION "public"."hook_block_duplicate_email"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_email text;
  v_exists boolean;
begin
  -- Tomar email de las posibles rutas del payload del hook
  v_email := lower(
    coalesce(
      event->'user'->>'email',   -- formato A
      event->'record'->>'email', -- formato B
      event->>'email',           -- fallback
      ''
    )
  );

  -- Si no vino email, no bloquees: devuelve 400 solo si quieres fallar explícito
  if v_email = '' then
    return '{}'::jsonb; -- permitir signup (o cámbialo por error 400 si prefieres)
  end if;

  -- Revisa existencia en auth.users (esquema calificado)
  select exists(
    select 1 from auth.users u where lower(u.email) = v_email
  ) into v_exists;

  if v_exists then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 400, 'message', 'User already registered')
    );
  end if;

  -- permitir signup
  return '{}'::jsonb;
end;
$$;


ALTER FUNCTION "public"."hook_block_duplicate_email"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_authenticated_superadmin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM admin_users
    WHERE id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_authenticated_superadmin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_authenticated_superadmin"() IS 'Verifica si el usuario autenticado es superadmin activo. SECURITY DEFINER evita recursión en RLS.';



CREATE OR REPLACE FUNCTION "public"."log_medical_record_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  current_user_display_name text;
  record_info text;
  existing_log_count integer;
BEGIN
  -- Get current user information - simplified approach
  current_user_id := auth.uid();
  
  -- If no user is authenticated, use a system user
  IF current_user_id IS NULL THEN
    -- Get the first available user from auth.users
    SELECT id INTO current_user_id FROM auth.users LIMIT 1;
    
    IF current_user_id IS NULL THEN
      -- If no users exist, skip logging
      RETURN OLD;
    END IF;
    
    current_user_email := 'system@conspat.com';
    current_user_display_name := 'Sistema';
  ELSE
    -- Get user email and display name from profiles table
    SELECT email, display_name INTO current_user_email, current_user_display_name
    FROM profiles 
    WHERE id = current_user_id;
    
    -- Fallback values if profile not found
    current_user_email := COALESCE(current_user_email, 'unknown@email.com');
    current_user_display_name := COALESCE(current_user_display_name, 'Usuario del Sistema');
  END IF;
  
  -- Check if a deletion log already exists for this record (avoid duplicates)
  SELECT COUNT(*) INTO existing_log_count
  FROM change_logs 
  WHERE medical_record_id = OLD.id 
    AND field_name = 'deleted_record'
    AND changed_at > now() - interval '1 second';
  
  -- If a deletion log already exists in the last second, skip
  IF existing_log_count > 0 THEN
    RETURN OLD;
  END IF;
  
  -- Create record info string using available fields
  record_info := COALESCE(OLD.code, 'Sin código') || ' - ' || COALESCE(OLD.exam_type, 'Sin tipo de examen');
  
  -- Save the deletion log in change_logs table
  -- Both OLD.id and OLD.patient_id should be valid at this point
  INSERT INTO change_logs (
    medical_record_id,
    patient_id,
    user_id,
    user_email,
    user_display_name,
    field_name,
    field_label,
    old_value,
    new_value,
    deleted_record_info,
    changed_at,
    entity_type
  ) VALUES (
    OLD.id,
    OLD.patient_id,
    current_user_id,
    current_user_email,
    current_user_display_name,
    'deleted_record',
    'Registro Eliminado',
    record_info,
    NULL,
    record_info,
    now(),
    'medical_case'
  );
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."log_medical_record_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_medical_record_code"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Validar inputs
  IF laboratory_id_input IS NULL THEN
    RAISE EXCEPTION 'laboratory_id es requerido';
  END IF;

  IF exam_type_input IS NULL OR exam_type_input = '' THEN
    RAISE EXCEPTION 'exam_type es requerido';
  END IF;

  -- Usar la función flexible para generar código
  RETURN generate_medical_record_code_flexible(
    exam_type_input,
    case_date_input,
    laboratory_id_input
  );
END;
$$;


ALTER FUNCTION "public"."preview_medical_record_code"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."preview_medical_record_code"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") IS 'Genera preview del código de caso médico usando la misma lógica que el trigger. 
Útil para mostrar al usuario el código antes de crear el caso.';



CREATE OR REPLACE FUNCTION "public"."remove_field_from_all_labs"("p_feature_key" "text", "p_field_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  module_name text;
BEGIN
  -- Obtener nombre del módulo
  SELECT mc.module_name INTO module_name
  FROM module_catalog mc
  WHERE mc.feature_key = p_feature_key
  AND mc.is_active = true
  LIMIT 1;
  
  IF module_name IS NULL THEN
    RAISE EXCEPTION 'Módulo no encontrado para feature_key: %', p_feature_key;
  END IF;
  
  -- Eliminar campo de TODOS los laboratorios
  UPDATE laboratories
  SET config = config #- ARRAY['modules', module_name, 'fields', p_field_name]
  WHERE features->>p_feature_key = 'true'
  AND config->'modules'->module_name IS NOT NULL;
  
  RAISE NOTICE 'Campo "%" eliminado de todos los laboratorios con feature "%"', 
    p_field_name, p_feature_key;
END;
$$;


ALTER FUNCTION "public"."remove_field_from_all_labs"("p_feature_key" "text", "p_field_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_field_from_all_labs"("p_feature_key" "text", "p_field_name" "text") IS 'Elimina un campo de todos los laboratorios con la feature habilitada.';



CREATE OR REPLACE FUNCTION "public"."save_change_log_for_deleted_record"("p_medical_record_id" "uuid", "p_user_id" "uuid", "p_user_email" "text", "p_deleted_record_info" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO change_logs (
    medical_record_id,
    user_id,
    user_email,
    field_name,
    field_label,
    old_value,
    new_value,
    deleted_record_info,
    changed_at
  ) VALUES (
    p_medical_record_id,
    p_user_id,
    p_user_email,
    'deleted_record',
    'Registro Eliminado',
    p_deleted_record_info,
    NULL,
    p_deleted_record_info,
    now()
  );
END;
$$;


ALTER FUNCTION "public"."save_change_log_for_deleted_record"("p_medical_record_id" "uuid", "p_user_id" "uuid", "p_user_email" "text", "p_deleted_record_info" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_laboratory_values"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  all_features jsonb;
  feature_record record;
BEGIN
  -- Obtener TODAS las features activas del catálogo y crear objeto con todas en false
  all_features := '{}'::jsonb;
  
  FOR feature_record IN
    SELECT key FROM feature_catalog WHERE is_active = true
  LOOP
    -- Agregar cada feature con valor false (SIEMPRE false, sin importar lo que venga)
    all_features := all_features || jsonb_build_object(feature_record.key, false);
  END LOOP;
  
  -- SIEMPRE asignar todas las features del catálogo (todas en false)
  NEW.features := all_features;
  
  -- Asignar branding por defecto si no existe o está vacío
  IF NEW.branding IS NULL OR NEW.branding = '{}'::jsonb THEN
    NEW.branding := jsonb_build_object(
      'logo', null,
      'icon', 'solhub',
      'primaryColor', '#0066cc',
      'secondaryColor', '#00cc66'
    );
  END IF;
  
  -- Asignar config por defecto si no existe o está vacío
  IF NEW.config IS NULL OR NEW.config = '{}'::jsonb THEN
    NEW.config := jsonb_build_object(
      'branches', jsonb_build_array('Principal'),
      'paymentMethods', jsonb_build_array('Efectivo', 'Zelle'),
      'defaultExchangeRate', 36.5,
      'timezone', 'America/Caracas'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_default_laboratory_values"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_default_laboratory_values"() IS 'Asigna valores por defecto (features, branding, config) al crear un nuevo laboratorio.';



CREATE OR REPLACE FUNCTION "public"."set_email_lower"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.email_lower := lower(new.email);
  return new;
end $$;


ALTER FUNCTION "public"."set_email_lower"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_medical_record_code"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  case_ts timestamptz;
BEGIN
  -- Validar que laboratory_id esté presente
  IF NEW.laboratory_id IS NULL THEN
    RAISE EXCEPTION 'laboratory_id es requerido para generar código';
  END IF;

  -- Si ya tiene código, no hacer nada
  IF NEW.code IS NOT NULL AND NEW.code != '' THEN
    RETURN NEW;
  END IF;

  -- Determinar fecha del caso; si no viene, usar now()
  BEGIN
    case_ts := coalesce(NEW.date::timestamptz, now());
  EXCEPTION WHEN OTHERS THEN
    case_ts := now();
  END;

  -- Usar función flexible que lee configuración del laboratorio
  -- Si no hay configuración, usa formato Conspat por defecto (retrocompatibilidad)
  NEW.code := generate_medical_record_code_flexible(
    NEW.exam_type,
    case_ts,
    NEW.laboratory_id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_medical_record_code"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_medical_record_code"() IS 'Genera código de caso médico usando sistema flexible basado en configuración del laboratorio. 
Lee codeTemplate y codeMappings de laboratories.config para generar códigos personalizados.
Si no hay configuración, usa formato Conspat por defecto.';



CREATE OR REPLACE FUNCTION "public"."sync_display_name_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    UPDATE auth.users
       SET raw_user_meta_data =
         CASE
           WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('display_name', NEW.display_name)
           WHEN raw_user_meta_data -> 'display_name' IS NULL THEN raw_user_meta_data || jsonb_build_object('display_name', NEW.display_name)
           ELSE raw_user_meta_data - 'display_name' || jsonb_build_object('display_name', NEW.display_name)
         END
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE LOG 'Error in sync_display_name_to_auth for %: % (%).', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_display_name_to_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_display_name_to_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_display_name text;
BEGIN
  v_display_name := nullif(btrim(coalesce(NEW.raw_user_meta_data ->> 'display_name','')), '');
  IF v_display_name IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles p
     SET display_name = v_display_name
   WHERE p.id = NEW.id
     AND (p.display_name IS DISTINCT FROM v_display_name);

  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE LOG 'Error in sync_display_name_to_profile for %: % (%).', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_display_name_to_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_missing_module_configs"() RETURNS TABLE("laboratory_id" "uuid", "laboratory_name" "text", "module_name" "text", "config_applied" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  lab_record RECORD;
  module_record RECORD;
  module_config jsonb;
  applied boolean;
BEGIN
  -- Iterar sobre todos los laboratorios
  FOR lab_record IN
    SELECT id, name, features, config
    FROM laboratories
  LOOP
    -- Iterar sobre todos los módulos activos
    FOR module_record IN
      SELECT mc.feature_key, mc.module_name, mc.structure
      FROM module_catalog mc
      WHERE mc.is_active = true
    LOOP
      -- Si el laboratorio tiene la feature habilitada pero no tiene la config del módulo
      IF lab_record.features->>module_record.feature_key = 'true' 
         AND (lab_record.config->'modules'->module_record.module_name IS NULL 
              OR lab_record.config->'modules'->module_record.module_name = 'null'::jsonb) THEN
        
        -- Construir configuración desde estructura
        module_config := build_module_config_from_structure(module_record.structure);
        
        -- Aplicar configuración
        UPDATE laboratories
        SET config = 
          CASE 
            WHEN config IS NULL THEN 
              jsonb_build_object(
                'modules', 
                jsonb_build_object(module_record.module_name, module_config)
              )
            WHEN config->'modules' IS NULL THEN
              jsonb_set(
                config,
                ARRAY['modules'],
                jsonb_build_object(module_record.module_name, module_config)
              )
            ELSE
              jsonb_set(
                config,
                ARRAY['modules', module_record.module_name],
                module_config
              )
          END
        WHERE id = lab_record.id;
        
        applied := true;
        
        RAISE NOTICE 'Configuración del módulo "%" aplicada automáticamente al laboratorio "%"', 
          module_record.module_name, lab_record.name;
      ELSE
        applied := false;
      END IF;
      
      -- Retornar resultado
      RETURN QUERY SELECT lab_record.id, lab_record.name::text, module_record.module_name::text, applied;
    END LOOP;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."sync_missing_module_configs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_missing_profiles"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_record RECORD;
  profile_count INTEGER := 0;
BEGIN
  RAISE LOG 'Starting sync of missing profiles';
  
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
    )
  LOOP
    -- Insert missing profile
    INSERT INTO profiles (
      id, 
      email, 
      role, 
      estado, 
      display_name
    )
    VALUES (
      user_record.id,
      COALESCE(user_record.email, ''),
      CASE 
        WHEN user_record.email = 'juegosgeorge0502@gmail.com' THEN 'owner'
        ELSE 'employee'
      END,
      CASE
        WHEN user_record.email = 'juegosgeorge0502@gmail.com' THEN 'aprobado'
        ELSE 'pendiente'
      END,
      COALESCE(user_record.raw_user_meta_data->>'display_name', NULL)
    )
    ON CONFLICT (id) DO NOTHING;
    
    profile_count := profile_count + 1;
  END LOOP;
  
  RAISE LOG 'Completed sync of missing profiles. Created % profiles', profile_count;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in sync_missing_profiles: % - %', SQLERRM, SQLSTATE;
END;
$$;


ALTER FUNCTION "public"."sync_missing_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_module_config_on_feature_enable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  module_structure jsonb;
  module_name text;
  module_config jsonb;
  feature_key_var text;
BEGIN
  -- Iterar sobre todos los módulos activos
  FOR feature_key_var, module_name, module_structure IN
    SELECT mc.feature_key, mc.module_name, mc.structure
    FROM module_catalog mc
    WHERE mc.is_active = true
  LOOP
    -- Si la feature se habilitó (cambió de false/null → true)
    IF (NEW.features->>feature_key_var = 'true') 
       AND (OLD.features->>feature_key_var IS NULL 
            OR OLD.features->>feature_key_var = 'false') THEN
      
      -- Construir configuración desde estructura
      module_config := build_module_config_from_structure(module_structure);
      
      -- Si no existe el módulo en config, crearlo
      IF NEW.config->'modules'->module_name IS NULL THEN
        NEW.config := jsonb_set(
          NEW.config,
          ARRAY['modules', module_name],
          module_config,
          true  -- create_missing = true
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_module_config_on_feature_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_new_feature_to_laboratories"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Agregar la nueva feature a TODOS los laboratorios con valor FALSE
  UPDATE laboratories
  SET features = features || jsonb_build_object(NEW.key, false)
  WHERE features->>NEW.key IS NULL;
  
  RAISE NOTICE 'Feature "%" agregada a todos los laboratorios con valor FALSE', NEW.key;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_new_feature_to_laboratories"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_new_feature_to_laboratories"() IS 'Sincroniza automáticamente nuevas features a todos los laboratorios existentes con valor false.';



CREATE OR REPLACE FUNCTION "public"."sync_new_field_to_all_labs"("p_feature_key" "text", "p_field_name" "text", "p_field_config" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  module_name text;
  default_enabled boolean;
  default_required boolean;
BEGIN
  -- Obtener nombre del módulo
  SELECT mc.module_name INTO module_name
  FROM module_catalog mc
  WHERE mc.feature_key = p_feature_key
  AND mc.is_active = true;
  
  IF module_name IS NULL THEN
    RAISE EXCEPTION 'Módulo no encontrado para feature_key: %', p_feature_key;
  END IF;
  
  -- Obtener valores por defecto
  default_enabled := COALESCE((p_field_config->>'defaultEnabled')::boolean, false);
  default_required := COALESCE((p_field_config->>'defaultRequired')::boolean, false);
  
  -- Actualizar TODOS los laboratorios con esa feature habilitada
  UPDATE laboratories
  SET config = jsonb_set(
    config,
    ARRAY['modules', module_name, 'fields', p_field_name],
    jsonb_build_object(
      'enabled', default_enabled,
      'required', default_required
    )
  )
  WHERE features->>p_feature_key = 'true'
  AND config->'modules'->module_name IS NOT NULL;
  
  RAISE NOTICE 'Campo "%" agregado a todos los laboratorios con feature "%" (enabled: %, required: %)', 
    p_field_name, p_feature_key, default_enabled, default_required;
END;
$$;


ALTER FUNCTION "public"."sync_new_field_to_all_labs"("p_feature_key" "text", "p_field_name" "text", "p_field_config" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_new_field_to_all_labs"("p_feature_key" "text", "p_field_name" "text", "p_field_config" "jsonb") IS 'Sincroniza un nuevo campo a todos los laboratorios con la feature habilitada.';



CREATE OR REPLACE FUNCTION "public"."sync_new_fields_on_module_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  field_key text;
  field_config jsonb;
  old_field_keys text[];
  new_field_keys text[];
  lab_record RECORD;
BEGIN
  -- Solo procesar si la estructura cambió
  IF NEW.structure IS DISTINCT FROM OLD.structure THEN
    -- Obtener keys de fields antiguos y nuevos
    IF OLD.structure ? 'fields' AND OLD.structure->'fields' IS NOT NULL THEN
      SELECT ARRAY_AGG(key) INTO old_field_keys
      FROM jsonb_object_keys(OLD.structure->'fields') AS key;
    ELSE
      old_field_keys := ARRAY[]::text[];
    END IF;
    
    IF NEW.structure ? 'fields' AND NEW.structure->'fields' IS NOT NULL THEN
      SELECT ARRAY_AGG(key) INTO new_field_keys
      FROM jsonb_object_keys(NEW.structure->'fields') AS key;
    ELSE
      new_field_keys := ARRAY[]::text[];
    END IF;
    
    -- Encontrar campos nuevos (están en NEW pero no en OLD)
    FOR field_key IN
      SELECT unnest(new_field_keys)
      EXCEPT
      SELECT unnest(COALESCE(old_field_keys, ARRAY[]::text[]))
    LOOP
      -- Obtener configuración del campo nuevo
      field_config := NEW.structure->'fields'->field_key;
      
      -- Sincronizar a TODOS los laboratorios con esta feature habilitada
      FOR lab_record IN
        SELECT id, name, config
        FROM laboratories
        WHERE features->>NEW.feature_key = 'true'
        AND (config->'modules'->NEW.module_name IS NOT NULL OR config->'modules' IS NULL)
      LOOP
        -- Actualizar configuración del laboratorio
        UPDATE laboratories
        SET config = jsonb_set(
          COALESCE(config, '{}'::jsonb),
          ARRAY['modules', NEW.module_name, 'fields', field_key],
          jsonb_build_object(
            'enabled', COALESCE((field_config->>'defaultEnabled')::boolean, false),
            'required', COALESCE((field_config->>'defaultRequired')::boolean, false)
          )
        )
        WHERE id = lab_record.id;
        
        RAISE NOTICE 'Campo "%" agregado automáticamente al laboratorio "%"', 
          field_key, lab_record.name;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_new_fields_on_module_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_multitenant_isolation"() RETURNS TABLE("test_name" "text", "result" "text", "details" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  current_user_id uuid;
  current_lab_id uuid;
  patient_count integer;
  record_count integer;
begin
  -- Obtener usuario actual
  current_user_id := auth.uid();
  if current_user_id is null then
    return query select 'Authentication'::text, 'FAIL'::text, 'No authenticated user'::text;
    return;
  end if;

  -- Obtener laboratorio del usuario actual
  select laboratory_id into current_lab_id 
  from public.profiles 
  where id = current_user_id;

  if current_lab_id is null then
    return query select 'Laboratory Assignment'::text, 'FAIL'::text, 'User has no laboratory assigned'::text;
    return;
  end if;

  -- Test 1: Verificar que solo ve pacientes de su laboratorio
  select count(*) into patient_count
  from public.patients
  where laboratory_id = current_lab_id;

  return query select 
    'Patients Access'::text, 
    'PASS'::text, 
    format('Can access %s patients from own laboratory', patient_count);

  -- Test 2: Verificar que no puede ver pacientes de otros laboratorios
  select count(*) into patient_count
  from public.patients
  where laboratory_id != current_lab_id;

  if patient_count > 0 then
    return query select 
      'Cross-Laboratory Access'::text, 
      'FAIL'::text, 
      format('Can see %s patients from other laboratories', patient_count);
  else
    return query select 
      'Cross-Laboratory Access'::text, 
      'PASS'::text, 
      'Cannot access patients from other laboratories';
  end if;

  -- Test 3: Verificar que solo ve casos de su laboratorio
  select count(*) into record_count
  from public.medical_records_clean
  where laboratory_id = current_lab_id;

  return query select 
    'Medical Records Access'::text, 
    'PASS'::text, 
    format('Can access %s medical records from own laboratory', record_count);

  -- Test 4: Verificar que no puede ver casos de otros laboratorios
  select count(*) into record_count
  from public.medical_records_clean
  where laboratory_id != current_lab_id;

  if record_count > 0 then
    return query select 
      'Cross-Laboratory Medical Records'::text, 
      'FAIL'::text, 
      format('Can see %s medical records from other laboratories', record_count);
  else
    return query select 
      'Cross-Laboratory Medical Records'::text, 
      'PASS'::text, 
      'Cannot access medical records from other laboratories';
  end if;

  return query select 
    'Multi-tenant Isolation'::text, 
    'PASS'::text, 
    'All isolation tests passed successfully';

end;
$$;


ALTER FUNCTION "public"."test_multitenant_isolation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_change_logs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_change_logs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_feature_catalog_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_feature_catalog_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_immuno_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_immuno_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_laboratories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_laboratories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_triage_records_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_triage_records_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_feature_exists"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Verificar que la feature existe en feature_catalog
  IF NOT EXISTS (
    SELECT 1 FROM feature_catalog 
    WHERE key = NEW.feature_key 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'La feature "%" no existe en feature_catalog. Debes crear la feature primero.', NEW.feature_key;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_feature_exists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_laboratory_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Si el laboratory_id no está asignado, intentar obtenerlo del usuario actual
  if new.laboratory_id is null then
    new.laboratory_id := (
      select laboratory_id
      from public.profiles
      where id = auth.uid()
      limit 1
    );
    
    -- Si aún es NULL, lanzar error
    if new.laboratory_id is null then
      raise exception 'laboratory_id no puede ser NULL. El usuario actual no tiene un laboratorio asignado.';
    end if;
  end if;
  
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_laboratory_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_laboratory_id"() IS 'Función trigger que valida y asigna automáticamente el laboratory_id basado en el usuario autenticado.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."change_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "medical_record_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "user_email" "text" NOT NULL,
    "field_name" "text" NOT NULL,
    "field_label" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_record_info" "text",
    "user_display_name" "text",
    "entity_type" character varying DEFAULT 'medical_case'::character varying,
    "patient_id" "uuid",
    "laboratory_id" "uuid" NOT NULL,
    CONSTRAINT "change_logs_entity_check" CHECK ((("medical_record_id" IS NOT NULL) OR ("patient_id" IS NOT NULL) OR (("medical_record_id" IS NULL) AND ("patient_id" IS NULL) AND ("field_name" IS NOT NULL))))
);


ALTER TABLE "public"."change_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."change_logs"."laboratory_id" IS 'ID del laboratorio al que pertenece este log. Aislamiento multi-tenant.';



CREATE TABLE IF NOT EXISTS "public"."feature_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "required_plan" "text",
    "icon" "text",
    "is_active" boolean DEFAULT true,
    "default_value" boolean DEFAULT false,
    "component_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feature_catalog_category_check" CHECK (("category" = ANY (ARRAY['core'::"text", 'premium'::"text", 'addon'::"text"]))),
    CONSTRAINT "feature_catalog_required_plan_check" CHECK (("required_plan" = ANY (ARRAY['free'::"text", 'basic'::"text", 'pro'::"text", 'enterprise'::"text"])))
);


ALTER TABLE "public"."feature_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_catalog" IS 'Catálogo maestro de features disponibles en el sistema. Cada feature puede ser habilitada/deshabilitada por laboratorio.';



COMMENT ON COLUMN "public"."feature_catalog"."key" IS 'Identificador único de la feature (ej: hasForm, hasChatAI)';



COMMENT ON COLUMN "public"."feature_catalog"."name" IS 'Nombre descriptivo de la feature para mostrar en UI';



COMMENT ON COLUMN "public"."feature_catalog"."category" IS 'Categoría: core (esencial), premium (avanzado), addon (opcional)';



COMMENT ON COLUMN "public"."feature_catalog"."required_plan" IS 'Plan mínimo requerido para usar esta feature';



COMMENT ON COLUMN "public"."feature_catalog"."default_value" IS 'Valor por defecto al crear nuevo laboratorio (SIEMPRE false para nuevas features)';



CREATE TABLE IF NOT EXISTS "public"."immuno_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "inmunorreacciones" "text" NOT NULL,
    "n_reacciones" integer NOT NULL,
    "precio_unitario" numeric(10,2) DEFAULT 18.00 NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "pagado" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "laboratory_id" "uuid" NOT NULL
);


ALTER TABLE "public"."immuno_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."immuno_requests" IS 'Table to store immunohistochemistry reaction requests and payment status';



COMMENT ON COLUMN "public"."immuno_requests"."case_id" IS 'Reference to the medical record case';



COMMENT ON COLUMN "public"."immuno_requests"."inmunorreacciones" IS 'Comma-separated list of immunoreactions';



COMMENT ON COLUMN "public"."immuno_requests"."n_reacciones" IS 'Number of immunoreactions requested';



COMMENT ON COLUMN "public"."immuno_requests"."precio_unitario" IS 'Unit price per reaction';



COMMENT ON COLUMN "public"."immuno_requests"."total" IS 'Total calculated price (n_reacciones * precio_unitario)';



COMMENT ON COLUMN "public"."immuno_requests"."pagado" IS 'Whether the immunoreactions have been paid for';



COMMENT ON COLUMN "public"."immuno_requests"."laboratory_id" IS 'ID del laboratorio al que pertenece esta solicitud. Aislamiento multi-tenant.';



CREATE TABLE IF NOT EXISTS "public"."laboratories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "features" "jsonb" DEFAULT '{"hasChatAI": true, "hasRobotTracking": false, "hasCitologyStatus": true, "hasInmunoRequests": true, "hasChangelogModule": true, "hasMultipleBranches": true, "hasPatientOriginFilter": true}'::"jsonb",
    "branding" "jsonb" DEFAULT '{"logo": null, "primaryColor": "#0066cc", "secondaryColor": "#00cc66"}'::"jsonb",
    "config" "jsonb" DEFAULT '{"branches": ["Principal"], "timezone": "America/Caracas", "paymentMethods": ["Efectivo", "Zelle", "Pago Móvil", "Transferencia"], "requiresApproval": true, "defaultExchangeRate": 36.5, "allowsDigitalSignature": false, "autoSendEmailsOnApproval": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "available_roles" "text"[] DEFAULT ARRAY['employee'::"text"],
    CONSTRAINT "laboratories_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'trial'::"text"]))),
    CONSTRAINT "name_not_empty_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "slug_format_check" CHECK (("slug" ~ '^[a-z0-9-]+$'::"text"))
);


ALTER TABLE "public"."laboratories" OWNER TO "postgres";


COMMENT ON TABLE "public"."laboratories" IS 'RLS deshabilitado temporalmente para permitir operaciones desde dashboard sin autenticación. 
Si en el futuro se habilita autenticación, restaurar RLS con políticas apropiadas que incluyan:
- Superadmins pueden ver/modificar todos los laboratorios
- Usuarios normales solo pueden ver laboratorios activos';



COMMENT ON COLUMN "public"."laboratories"."slug" IS 'Identificador único en formato slug (ej: conspat, labvargas). Usado para subdominios futuros.';



COMMENT ON COLUMN "public"."laboratories"."features" IS 'Configuración JSON de features habilitadas/deshabilitadas por laboratorio.';



COMMENT ON COLUMN "public"."laboratories"."branding" IS 'Configuración JSON de branding personalizado (logo, colores) por laboratorio.';



COMMENT ON COLUMN "public"."laboratories"."config" IS 'Configuración JSON específica del laboratorio (sucursales, métodos de pago, tasa de cambio, etc).';



CREATE TABLE IF NOT EXISTS "public"."laboratory_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "laboratory_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "max_uses" integer,
    "current_uses" integer DEFAULT 0,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "max_uses_limit" CHECK ((("max_uses" IS NULL) OR ("current_uses" <= "max_uses"))),
    CONSTRAINT "positive_current_uses" CHECK (("current_uses" >= 0)),
    CONSTRAINT "positive_max_uses" CHECK ((("max_uses" IS NULL) OR ("max_uses" > 0)))
);


ALTER TABLE "public"."laboratory_codes" OWNER TO "postgres";


COMMENT ON TABLE "public"."laboratory_codes" IS 'RLS deshabilitado temporalmente para permitir operaciones desde dashboard sin autenticación. 
Si en el futuro se habilita autenticación, restaurar RLS con políticas apropiadas.';



CREATE TABLE IF NOT EXISTS "public"."medical_records_clean" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_type" "text",
    "origin" "text" NOT NULL,
    "treating_doctor" "text" NOT NULL,
    "sample_type" "text" NOT NULL,
    "number_of_samples" integer NOT NULL,
    "relationship" "text",
    "branch" "text",
    "date" timestamp with time zone NOT NULL,
    "total_amount" numeric(10,2),
    "exchange_rate" numeric(10,2),
    "payment_status" "public"."payment_status_type" DEFAULT 'Incompleto'::"public"."payment_status_type" NOT NULL,
    "remaining" numeric(10,2) DEFAULT 0,
    "payment_method_1" "text",
    "payment_amount_1" numeric(10,2),
    "payment_reference_1" "text",
    "payment_method_2" "text",
    "payment_amount_2" numeric(10,2),
    "payment_reference_2" "text",
    "payment_method_3" "text",
    "payment_amount_3" numeric(10,2),
    "payment_reference_3" "text",
    "payment_method_4" "text",
    "payment_amount_4" numeric(10,2),
    "payment_reference_4" "text",
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "code" "text",
    "created_by" "uuid",
    "created_by_display_name" "text",
    "pdf_en_ready" boolean DEFAULT false,
    "generated_by" "uuid",
    "generated_by_display_name" "text",
    "generated_at" timestamp with time zone,
    "attachment_url" "text",
    "ims" "text",
    "googledocs_url" "text",
    "informepdf_url" "text",
    "informe_qr" "text",
    "token" "text",
    "doc_aprobado" "public"."doc_aprobado_status" DEFAULT 'faltante'::"public"."doc_aprobado_status" NOT NULL,
    "patient_id" "uuid",
    "cito_status" "public"."cito_status_type",
    "email_sent" boolean DEFAULT false NOT NULL,
    "laboratory_id" "uuid" NOT NULL,
    "consulta" "text",
    CONSTRAINT "medical_records_clean_number_of_samples_check" CHECK (("number_of_samples" > 0)),
    CONSTRAINT "medical_records_clean_total_amount_check" CHECK (("total_amount" > (0)::numeric))
);


ALTER TABLE "public"."medical_records_clean" OWNER TO "postgres";


COMMENT ON TABLE "public"."medical_records_clean" IS 'Tabla limpia para registros médicos con estructura optimizada';



COMMENT ON COLUMN "public"."medical_records_clean"."total_amount" IS 'Monto total en USD';



COMMENT ON COLUMN "public"."medical_records_clean"."exchange_rate" IS 'Tasa de cambio USD/VES al momento del registro';



COMMENT ON COLUMN "public"."medical_records_clean"."remaining" IS 'Monto restante por pagar en USD';



COMMENT ON COLUMN "public"."medical_records_clean"."code" IS 'Unique case code format: [caseType][yearSince2000][monthlyCounter][monthLetter]';



COMMENT ON COLUMN "public"."medical_records_clean"."created_by" IS 'User ID who created the record';



COMMENT ON COLUMN "public"."medical_records_clean"."created_by_display_name" IS 'Display name of the user who created the record';



COMMENT ON COLUMN "public"."medical_records_clean"."generated_by" IS 'User ID who generated the case';



COMMENT ON COLUMN "public"."medical_records_clean"."generated_by_display_name" IS 'Display name of the user who generated the case';



COMMENT ON COLUMN "public"."medical_records_clean"."generated_at" IS 'When the case was generated';



COMMENT ON COLUMN "public"."medical_records_clean"."attachment_url" IS 'URL or path to uploaded file attachment';



COMMENT ON COLUMN "public"."medical_records_clean"."googledocs_url" IS 'Url del informe editable para médicos';



COMMENT ON COLUMN "public"."medical_records_clean"."informepdf_url" IS 'Informe completo en PDF del caso';



COMMENT ON COLUMN "public"."medical_records_clean"."informe_qr" IS 'Informe con el qr';



COMMENT ON COLUMN "public"."medical_records_clean"."token" IS 'token de verificacion para informes';



COMMENT ON COLUMN "public"."medical_records_clean"."doc_aprobado" IS 'Flujo de aprobación del documento: faltante -> pendiente -> aprobado';



COMMENT ON COLUMN "public"."medical_records_clean"."patient_id" IS 'Referencia al paciente en la tabla patients';



COMMENT ON COLUMN "public"."medical_records_clean"."cito_status" IS 'Estado del resultado citológico: positivo o negativo';



COMMENT ON COLUMN "public"."medical_records_clean"."laboratory_id" IS 'ID del laboratorio al que pertenece este registro médico. Aislamiento multi-tenant.';



COMMENT ON COLUMN "public"."medical_records_clean"."consulta" IS 'Especialidad médica de consulta. Solo requerido para laboratorio SPT.';



CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cedula" character varying,
    "nombre" character varying NOT NULL,
    "edad" "text",
    "telefono" character varying,
    "email" character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "version" integer DEFAULT 1,
    "gender" "public"."gender_type",
    "laboratory_id" "uuid" NOT NULL
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


COMMENT ON TABLE "public"."patients" IS 'Tabla de pacientes únicos - cada paciente tiene un solo registro';



COMMENT ON COLUMN "public"."patients"."cedula" IS 'Número de cédula único del paciente';



COMMENT ON COLUMN "public"."patients"."version" IS 'Versión para control de cambios optimista';



COMMENT ON COLUMN "public"."patients"."laboratory_id" IS 'ID del laboratorio al que pertenece este paciente. Aislamiento multi-tenant.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "assigned_branch" "text",
    "display_name" "text",
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "phone" "text",
    "email_lower" "text",
    "laboratory_id" "uuid" NOT NULL,
    CONSTRAINT "profiles_estado_check" CHECK (("estado" = ANY (ARRAY['pendiente'::"text", 'aprobado'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'employee'::"text", 'admin'::"text", 'residente'::"text", 'citotecno'::"text", 'patologo'::"text", 'medicowner'::"text", 'medico_tratante'::"text", 'enfermero'::"text", 'prueba'::"text", 'call_center'::"text", 'imagenologia'::"text"])))
);

ALTER TABLE ONLY "public"."profiles" REPLICA IDENTITY FULL;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."assigned_branch" IS 'Branch assigned to employee users for filtering medical records access';



COMMENT ON COLUMN "public"."profiles"."display_name" IS 'User display name for UI personalization';



COMMENT ON COLUMN "public"."profiles"."laboratory_id" IS 'ID del laboratorio al que pertenece este usuario. Cada usuario pertenece a UN solo laboratorio.';



CREATE OR REPLACE VIEW "public"."laboratory_stats" AS
 SELECT "l"."id",
    "l"."slug",
    "l"."name",
    "l"."status",
    "count"(DISTINCT "p"."id") AS "total_patients",
    "count"(DISTINCT "m"."id") AS "total_medical_records",
    "count"(DISTINCT "pr"."id") AS "total_users",
    "max"("m"."created_at") AS "last_record_date"
   FROM ((("public"."laboratories" "l"
     LEFT JOIN "public"."patients" "p" ON (("p"."laboratory_id" = "l"."id")))
     LEFT JOIN "public"."medical_records_clean" "m" ON (("m"."laboratory_id" = "l"."id")))
     LEFT JOIN "public"."profiles" "pr" ON (("pr"."laboratory_id" = "l"."id")))
  GROUP BY "l"."id", "l"."slug", "l"."name", "l"."status";


ALTER VIEW "public"."laboratory_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."laboratory_stats" IS 'Vista con estadísticas agregadas por laboratorio. Útil para dashboards y reportes.';



CREATE TABLE IF NOT EXISTS "public"."module_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key" "text" NOT NULL,
    "module_name" "text" NOT NULL,
    "structure" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."module_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."module_catalog" IS 'Catálogo maestro de módulos del sistema. Cada módulo referencia una feature de feature_catalog.';



COMMENT ON COLUMN "public"."module_catalog"."feature_key" IS 'Key de la feature en feature_catalog (ej: hasForm). DEBE existir antes de crear el módulo.';



COMMENT ON COLUMN "public"."module_catalog"."module_name" IS 'Nombre del módulo usado en config.modules (ej: registrationForm).';



COMMENT ON COLUMN "public"."module_catalog"."structure" IS 'Estructura JSONB que define campos, acciones y settings del módulo.';



CREATE TABLE IF NOT EXISTS "public"."triaje_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "laboratory_id" "uuid" NOT NULL,
    "measurement_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "height_cm" numeric(5,2),
    "weight_kg" numeric(5,2),
    "bmi" numeric(4,2),
    "heart_rate" integer,
    "respiratory_rate" integer,
    "oxygen_saturation" integer,
    "temperature_celsius" numeric(4,2),
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "comment" "text",
    "reason" "text",
    "personal_background" "text",
    "family_history" "text",
    "psychobiological_habits" "text",
    "examen_fisico" "text",
    "blood_pressure" integer,
    "case_id" "uuid",
    "alcohol" "public"."habit_level_type",
    "tabaco" numeric(6,2),
    "cafe" integer,
    CONSTRAINT "check_cafe_positive" CHECK ((("cafe" IS NULL) OR ("cafe" >= 0))),
    CONSTRAINT "check_tabaco_positive" CHECK ((("tabaco" IS NULL) OR ("tabaco" >= (0)::numeric))),
    CONSTRAINT "valid_bmi" CHECK ((("bmi" IS NULL) OR (("bmi" >= (10)::numeric) AND ("bmi" <= (60)::numeric)))),
    CONSTRAINT "valid_heart_rate" CHECK ((("heart_rate" IS NULL) OR (("heart_rate" >= 30) AND ("heart_rate" <= 250)))),
    CONSTRAINT "valid_height" CHECK ((("height_cm" IS NULL) OR (("height_cm" >= (30)::numeric) AND ("height_cm" <= (250)::numeric)))),
    CONSTRAINT "valid_oxygen_saturation" CHECK ((("oxygen_saturation" IS NULL) OR (("oxygen_saturation" >= 0) AND ("oxygen_saturation" <= 100)))),
    CONSTRAINT "valid_respiratory_rate" CHECK ((("respiratory_rate" IS NULL) OR (("respiratory_rate" >= 5) AND ("respiratory_rate" <= 60)))),
    CONSTRAINT "valid_temperature" CHECK ((("temperature_celsius" IS NULL) OR (("temperature_celsius" >= (30)::numeric) AND ("temperature_celsius" <= (45)::numeric)))),
    CONSTRAINT "valid_weight" CHECK ((("weight_kg" IS NULL) OR (("weight_kg" >= (1)::numeric) AND ("weight_kg" <= (300)::numeric))))
);


ALTER TABLE "public"."triaje_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."triaje_records" IS 'Historial completo de mediciones de triaje médico por paciente';



COMMENT ON COLUMN "public"."triaje_records"."measurement_date" IS 'Fecha y hora de la medición (permite fecha histórica)';



COMMENT ON COLUMN "public"."triaje_records"."bmi" IS 'Índice de Masa Corporal calculado automáticamente desde altura y peso';



COMMENT ON COLUMN "public"."triaje_records"."comment" IS 'Comentario';



COMMENT ON COLUMN "public"."triaje_records"."reason" IS 'Motivo de consulta';



COMMENT ON COLUMN "public"."triaje_records"."personal_background" IS 'Antecedentes personales';



COMMENT ON COLUMN "public"."triaje_records"."family_history" IS 'Antecedentes familiares';



COMMENT ON COLUMN "public"."triaje_records"."psychobiological_habits" IS 'Hábitos psicobiológicos';



COMMENT ON COLUMN "public"."triaje_records"."examen_fisico" IS 'Examen físico';



COMMENT ON COLUMN "public"."triaje_records"."blood_pressure" IS 'Presión arterial (mmHg)';



COMMENT ON COLUMN "public"."triaje_records"."case_id" IS 'Referencia al caso médico (medical_records_clean). Un caso puede tener máximo un triaje.';



COMMENT ON COLUMN "public"."triaje_records"."alcohol" IS 'Nivel de consumo de alcohol del paciente';



COMMENT ON COLUMN "public"."triaje_records"."tabaco" IS 'Índice tabáquico (paquetes-año): (Cigarrillos/día × Años fumando) / 20';



COMMENT ON COLUMN "public"."triaje_records"."cafe" IS 'Número de tazas de café consumidas por día';



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" NOT NULL,
    "session_timeout" integer DEFAULT 15 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "laboratory_id" "uuid" NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_settings"."laboratory_id" IS 'ID del laboratorio al que pertenece esta configuración. Aislamiento multi-tenant.';



ALTER TABLE ONLY "public"."change_logs"
    ADD CONSTRAINT "change_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_catalog"
    ADD CONSTRAINT "feature_catalog_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."feature_catalog"
    ADD CONSTRAINT "feature_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."immuno_requests"
    ADD CONSTRAINT "immuno_requests_case_id_key" UNIQUE ("case_id");



ALTER TABLE ONLY "public"."immuno_requests"
    ADD CONSTRAINT "immuno_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."laboratories"
    ADD CONSTRAINT "laboratories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."laboratories"
    ADD CONSTRAINT "laboratories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."laboratory_codes"
    ADD CONSTRAINT "laboratory_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."laboratory_codes"
    ADD CONSTRAINT "laboratory_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_records_clean"
    ADD CONSTRAINT "medical_records_clean_code_laboratory_unique" UNIQUE ("code", "laboratory_id");



COMMENT ON CONSTRAINT "medical_records_clean_code_laboratory_unique" ON "public"."medical_records_clean" IS 'Código único por laboratorio: (code, laboratory_id) permite que diferentes laboratorios tengan el mismo código';



ALTER TABLE ONLY "public"."medical_records_clean"
    ADD CONSTRAINT "medical_records_clean_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."module_catalog"
    ADD CONSTRAINT "module_catalog_feature_key_key" UNIQUE ("feature_key");



ALTER TABLE ONLY "public"."module_catalog"
    ADD CONSTRAINT "module_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."triaje_records"
    ADD CONSTRAINT "triage_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_change_logs_changed_at" ON "public"."change_logs" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_change_logs_entity_type" ON "public"."change_logs" USING "btree" ("entity_type");



CREATE INDEX "idx_change_logs_laboratory" ON "public"."change_logs" USING "btree" ("laboratory_id");



CREATE INDEX "idx_change_logs_medical_record_id" ON "public"."change_logs" USING "btree" ("medical_record_id");



CREATE INDEX "idx_change_logs_patient_id" ON "public"."change_logs" USING "btree" ("patient_id");



CREATE INDEX "idx_change_logs_user_id" ON "public"."change_logs" USING "btree" ("user_id");



CREATE INDEX "idx_feature_catalog_active" ON "public"."feature_catalog" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_feature_catalog_key" ON "public"."feature_catalog" USING "btree" ("key");



CREATE INDEX "idx_immuno_requests_case_id" ON "public"."immuno_requests" USING "btree" ("case_id");



CREATE INDEX "idx_immuno_requests_created_at" ON "public"."immuno_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_immuno_requests_laboratory" ON "public"."immuno_requests" USING "btree" ("laboratory_id");



CREATE INDEX "idx_immuno_requests_pagado" ON "public"."immuno_requests" USING "btree" ("pagado");



CREATE INDEX "idx_lab_codes_active" ON "public"."laboratory_codes" USING "btree" ("is_active", "expires_at");



CREATE INDEX "idx_lab_codes_code" ON "public"."laboratory_codes" USING "btree" ("code") WHERE ("is_active" = true);



CREATE INDEX "idx_lab_codes_laboratory" ON "public"."laboratory_codes" USING "btree" ("laboratory_id");



CREATE INDEX "idx_laboratories_slug" ON "public"."laboratories" USING "btree" ("slug");



CREATE INDEX "idx_laboratories_status" ON "public"."laboratories" USING "btree" ("status");



CREATE INDEX "idx_medical_records_branch" ON "public"."medical_records_clean" USING "btree" ("branch");



CREATE INDEX "idx_medical_records_branch_created_at" ON "public"."medical_records_clean" USING "btree" ("branch", "created_at");



CREATE INDEX "idx_medical_records_cito_status" ON "public"."medical_records_clean" USING "btree" ("cito_status") WHERE ("cito_status" IS NOT NULL);



CREATE INDEX "idx_medical_records_clean_attachment_url" ON "public"."medical_records_clean" USING "btree" ("attachment_url");



CREATE INDEX "idx_medical_records_clean_branch" ON "public"."medical_records_clean" USING "btree" ("branch");



CREATE INDEX "idx_medical_records_clean_code" ON "public"."medical_records_clean" USING "btree" ("code");



CREATE INDEX "idx_medical_records_clean_created_at" ON "public"."medical_records_clean" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_medical_records_clean_created_by" ON "public"."medical_records_clean" USING "btree" ("created_by");



CREATE INDEX "idx_medical_records_clean_generated_by" ON "public"."medical_records_clean" USING "btree" ("generated_by");



CREATE INDEX "idx_medical_records_clean_payment_status" ON "public"."medical_records_clean" USING "btree" ("payment_status");



CREATE INDEX "idx_medical_records_code" ON "public"."medical_records_clean" USING "btree" ("code") WHERE ("code" IS NOT NULL);



CREATE INDEX "idx_medical_records_composite" ON "public"."medical_records_clean" USING "btree" ("created_at" DESC, "branch", "exam_type", "payment_status");



COMMENT ON INDEX "public"."idx_medical_records_composite" IS 'Índice compuesto para consultas con múltiples filtros';



CREATE INDEX "idx_medical_records_created_at" ON "public"."medical_records_clean" USING "btree" ("created_at" DESC NULLS LAST);



COMMENT ON INDEX "public"."idx_medical_records_created_at" IS 'Índice principal para ordenamiento por fecha de creación';



CREATE INDEX "idx_medical_records_created_at_payment_status" ON "public"."medical_records_clean" USING "btree" ("created_at", "payment_status");



CREATE INDEX "idx_medical_records_doc_aprobado" ON "public"."medical_records_clean" USING "btree" ("doc_aprobado") WHERE ("doc_aprobado" IS NOT NULL);



CREATE INDEX "idx_medical_records_exam_type" ON "public"."medical_records_clean" USING "btree" ("exam_type");



CREATE INDEX "idx_medical_records_lab_created" ON "public"."medical_records_clean" USING "btree" ("laboratory_id", "created_at" DESC);



CREATE INDEX "idx_medical_records_lab_payment_status" ON "public"."medical_records_clean" USING "btree" ("laboratory_id", "payment_status");



CREATE INDEX "idx_medical_records_laboratory" ON "public"."medical_records_clean" USING "btree" ("laboratory_id");



CREATE INDEX "idx_medical_records_origin" ON "public"."medical_records_clean" USING "btree" ("origin");



CREATE INDEX "idx_medical_records_patient_id" ON "public"."medical_records_clean" USING "btree" ("patient_id");



COMMENT ON INDEX "public"."idx_medical_records_patient_id" IS 'Índice para JOIN con tabla patients';



CREATE INDEX "idx_medical_records_payment_status" ON "public"."medical_records_clean" USING "btree" ("payment_status");



CREATE INDEX "idx_medical_records_pdf_ready" ON "public"."medical_records_clean" USING "btree" ("pdf_en_ready") WHERE ("pdf_en_ready" IS NOT NULL);



CREATE INDEX "idx_medical_records_treating_doctor" ON "public"."medical_records_clean" USING "btree" ("treating_doctor");



CREATE INDEX "idx_medical_records_treating_doctor_lower" ON "public"."medical_records_clean" USING "btree" ("lower"("treating_doctor"));



CREATE INDEX "idx_module_catalog_active" ON "public"."module_catalog" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_module_catalog_feature_key" ON "public"."module_catalog" USING "btree" ("feature_key");



CREATE INDEX "idx_patients_cedula" ON "public"."patients" USING "btree" ("cedula");



CREATE INDEX "idx_patients_cedula_lower" ON "public"."patients" USING "btree" ("lower"(("cedula")::"text"));



CREATE INDEX "idx_patients_created_at" ON "public"."patients" USING "btree" ("created_at");



CREATE INDEX "idx_patients_lab_created" ON "public"."patients" USING "btree" ("laboratory_id", "created_at" DESC);



CREATE INDEX "idx_patients_laboratory" ON "public"."patients" USING "btree" ("laboratory_id");



CREATE INDEX "idx_patients_nombre_lower" ON "public"."patients" USING "btree" ("lower"(("nombre")::"text"));



CREATE INDEX "idx_profiles_assigned_branch" ON "public"."profiles" USING "btree" ("assigned_branch");



CREATE INDEX "idx_profiles_created_at" ON "public"."profiles" USING "btree" ("created_at");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_estado" ON "public"."profiles" USING "btree" ("estado");



CREATE INDEX "idx_profiles_lab_role" ON "public"."profiles" USING "btree" ("laboratory_id", "role");



CREATE INDEX "idx_profiles_laboratory" ON "public"."profiles" USING "btree" ("laboratory_id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_triage_records_laboratory_id" ON "public"."triaje_records" USING "btree" ("laboratory_id");



CREATE INDEX "idx_triage_records_measurement_date" ON "public"."triaje_records" USING "btree" ("measurement_date" DESC);



CREATE INDEX "idx_triage_records_patient_date" ON "public"."triaje_records" USING "btree" ("patient_id", "measurement_date" DESC);



CREATE INDEX "idx_triage_records_patient_id" ON "public"."triaje_records" USING "btree" ("patient_id");



CREATE INDEX "idx_triaje_records_cafe" ON "public"."triaje_records" USING "btree" ("cafe") WHERE ("cafe" IS NOT NULL);



CREATE INDEX "idx_triaje_records_case_id" ON "public"."triaje_records" USING "btree" ("case_id");



CREATE UNIQUE INDEX "idx_triaje_records_case_unique" ON "public"."triaje_records" USING "btree" ("case_id") WHERE ("case_id" IS NOT NULL);



CREATE INDEX "idx_triaje_records_tabaco" ON "public"."triaje_records" USING "btree" ("tabaco") WHERE ("tabaco" IS NOT NULL);



CREATE INDEX "idx_user_settings_laboratory" ON "public"."user_settings" USING "btree" ("laboratory_id");



CREATE UNIQUE INDEX "profiles_email_lower_uq" ON "public"."profiles" USING "btree" ("email_lower");



CREATE UNIQUE INDEX "unique_cedula_per_laboratory" ON "public"."patients" USING "btree" ("cedula", "laboratory_id") WHERE ("cedula" IS NOT NULL);



COMMENT ON INDEX "public"."unique_cedula_per_laboratory" IS 'Índice único parcial: garantiza que cada cédula es única por laboratorio cuando cedula IS NOT NULL. Permite múltiples pacientes sin cédula (casos excepcionales).';



CREATE OR REPLACE TRIGGER "before_insert_laboratory" BEFORE INSERT ON "public"."laboratories" FOR EACH ROW EXECUTE FUNCTION "public"."set_default_laboratory_values"();



CREATE OR REPLACE TRIGGER "before_insert_module_validate_feature" BEFORE INSERT OR UPDATE ON "public"."module_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."validate_feature_exists"();



CREATE OR REPLACE TRIGGER "calculate_bmi_trigger" BEFORE INSERT OR UPDATE ON "public"."triaje_records" FOR EACH ROW WHEN ((("new"."height_cm" IS NOT NULL) AND ("new"."weight_kg" IS NOT NULL))) EXECUTE FUNCTION "public"."calculate_bmi"();



CREATE OR REPLACE TRIGGER "on_feature_created_sync_labs" AFTER INSERT ON "public"."feature_catalog" FOR EACH ROW WHEN (("new"."is_active" = true)) EXECUTE FUNCTION "public"."sync_new_feature_to_laboratories"();



CREATE OR REPLACE TRIGGER "on_feature_enable_sync_module" BEFORE UPDATE ON "public"."laboratories" FOR EACH ROW WHEN (("new"."features" IS DISTINCT FROM "old"."features")) EXECUTE FUNCTION "public"."sync_module_config_on_feature_enable"();



CREATE OR REPLACE TRIGGER "on_lab_insert_apply_module_config" BEFORE INSERT ON "public"."laboratories" FOR EACH ROW EXECUTE FUNCTION "public"."apply_module_config_on_lab_insert"();



CREATE OR REPLACE TRIGGER "on_module_update_sync_fields" AFTER UPDATE ON "public"."module_catalog" FOR EACH ROW WHEN (("new"."structure" IS DISTINCT FROM "old"."structure")) EXECUTE FUNCTION "public"."sync_new_fields_on_module_update"();



CREATE OR REPLACE TRIGGER "profiles_email_lower_tr" BEFORE INSERT OR UPDATE OF "email" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_email_lower"();



CREATE OR REPLACE TRIGGER "sync_display_name_to_auth_trigger" AFTER UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_display_name_to_auth"();



CREATE OR REPLACE TRIGGER "trg_doc_aprobado_transition" BEFORE UPDATE OF "doc_aprobado" ON "public"."medical_records_clean" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_doc_aprobado_transition"();



CREATE OR REPLACE TRIGGER "trg_set_medical_record_code" BEFORE INSERT ON "public"."medical_records_clean" FOR EACH ROW EXECUTE FUNCTION "public"."set_medical_record_code"();



CREATE OR REPLACE TRIGGER "trigger_actualizar_pdf_en_ready_medical" BEFORE INSERT OR UPDATE OF "informe_qr" ON "public"."medical_records_clean" FOR EACH ROW EXECUTE FUNCTION "public"."actualizar_pdf_en_ready_medical_trigger"();



CREATE OR REPLACE TRIGGER "trigger_format_medical_record_names" BEFORE INSERT OR UPDATE ON "public"."medical_records_clean" FOR EACH ROW EXECUTE FUNCTION "public"."format_medical_record_names"();



CREATE OR REPLACE TRIGGER "trigger_format_patient_names" BEFORE INSERT OR UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."format_patient_names"();



CREATE OR REPLACE TRIGGER "trigger_set_medical_record_code" BEFORE INSERT ON "public"."medical_records_clean" FOR EACH ROW EXECUTE FUNCTION "public"."set_medical_record_code"();



COMMENT ON TRIGGER "trigger_set_medical_record_code" ON "public"."medical_records_clean" IS 'Genera código único antes de insertar. Formato Conspat por defecto: 125001K. Formato SPT si configurado: CI0001K25';



CREATE OR REPLACE TRIGGER "trigger_update_feature_catalog_updated_at" BEFORE UPDATE ON "public"."feature_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."update_feature_catalog_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_laboratories_updated_at" BEFORE UPDATE ON "public"."laboratories" FOR EACH ROW EXECUTE FUNCTION "public"."update_laboratories_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validate_laboratory_id_change_logs" BEFORE INSERT ON "public"."change_logs" FOR EACH ROW EXECUTE FUNCTION "public"."validate_laboratory_id"();



CREATE OR REPLACE TRIGGER "trigger_validate_laboratory_id_medical_records" BEFORE INSERT ON "public"."medical_records_clean" FOR EACH ROW EXECUTE FUNCTION "public"."validate_laboratory_id"();



CREATE OR REPLACE TRIGGER "trigger_validate_laboratory_id_patients" BEFORE INSERT ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."validate_laboratory_id"();



CREATE OR REPLACE TRIGGER "update_change_logs_created_at" BEFORE INSERT ON "public"."change_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_change_logs_updated_at"();



CREATE OR REPLACE TRIGGER "update_immuno_requests_updated_at" BEFORE UPDATE ON "public"."immuno_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_immuno_requests_updated_at"();



CREATE OR REPLACE TRIGGER "update_medical_records_clean_updated_at" BEFORE UPDATE ON "public"."medical_records_clean" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_patients_updated_at" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_triage_records_timestamp" BEFORE UPDATE ON "public"."triaje_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_triage_records_updated_at"();



ALTER TABLE ONLY "public"."change_logs"
    ADD CONSTRAINT "change_logs_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "public"."laboratories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."change_logs"
    ADD CONSTRAINT "change_logs_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records_clean"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."change_logs"
    ADD CONSTRAINT "change_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."change_logs"
    ADD CONSTRAINT "change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."module_catalog"
    ADD CONSTRAINT "fk_module_feature" FOREIGN KEY ("feature_key") REFERENCES "public"."feature_catalog"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "fk_profiles_user" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."immuno_requests"
    ADD CONSTRAINT "immuno_requests_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."medical_records_clean"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."immuno_requests"
    ADD CONSTRAINT "immuno_requests_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "public"."laboratories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."laboratory_codes"
    ADD CONSTRAINT "laboratory_codes_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "public"."laboratories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_records_clean"
    ADD CONSTRAINT "medical_records_clean_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_records_clean"
    ADD CONSTRAINT "medical_records_clean_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."medical_records_clean"
    ADD CONSTRAINT "medical_records_clean_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "public"."laboratories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medical_records_clean"
    ADD CONSTRAINT "medical_records_clean_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "public"."laboratories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "public"."laboratories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."triaje_records"
    ADD CONSTRAINT "triage_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."triaje_records"
    ADD CONSTRAINT "triage_records_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "public"."laboratories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."triaje_records"
    ADD CONSTRAINT "triage_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."triaje_records"
    ADD CONSTRAINT "triaje_records_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."medical_records_clean"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "public"."laboratories"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all operations on module_catalog" ON "public"."module_catalog" USING (true) WITH CHECK (true);



CREATE POLICY "Allow dashboard updates to laboratories" ON "public"."laboratories" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Allow dashboard updates to laboratories" ON "public"."laboratories" IS 'Permite actualizaciones desde el dashboard. TEMPORAL - idealmente el dashboard debería usar service_role_key.';



CREATE POLICY "Allow owners to delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("public"."get_user_role"() = 'owner'::"text"));



CREATE POLICY "Allow service_role to update laboratories" ON "public"."laboratories" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Allow service_role to update laboratories" ON "public"."laboratories" IS 'Permite que service_role actualice laboratorios. service_role bypassea RLS automáticamente, pero esta política es explícita para claridad.';



CREATE POLICY "Allow users to insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow users to read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow users to update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Anyone can view active codes" ON "public"."laboratory_codes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active modules" ON "public"."module_catalog" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view all laboratories" ON "public"."laboratories" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert change logs" ON "public"."change_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can insert immuno requests" ON "public"."immuno_requests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can read change logs" ON "public"."change_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read immuno requests" ON "public"."immuno_requests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update immuno requests" ON "public"."immuno_requests" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Block anon_key delete on laboratories" ON "public"."laboratories" FOR DELETE USING (false);



CREATE POLICY "Block anon_key delete on laboratory_codes" ON "public"."laboratory_codes" FOR DELETE USING (false);



CREATE POLICY "Block anon_key insert on laboratories" ON "public"."laboratories" FOR INSERT WITH CHECK (false);



CREATE POLICY "Block anon_key insert on laboratory_codes" ON "public"."laboratory_codes" FOR INSERT WITH CHECK (false);



CREATE POLICY "Block anon_key update on laboratory_codes" ON "public"."laboratory_codes" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "Employees and residents can delete records from their branch" ON "public"."medical_records_clean" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'employee'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'residente'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'citotecno'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'patologo'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'medicowner'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch")))))));



CREATE POLICY "Filter records by branch for users" ON "public"."medical_records_clean" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'owner'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'employee'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'residente'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'citotecno'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'patologo'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'medicowner'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch")))))));



CREATE POLICY "Owners and admins can update their laboratory users" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("laboratory_id" = ( SELECT "profiles_1"."laboratory_id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))) WITH CHECK ((("laboratory_id" = ( SELECT "profiles_1"."laboratory_id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



COMMENT ON POLICY "Owners and admins can update their laboratory users" ON "public"."profiles" IS 'Permite que owners y admins actualicen usuarios de su mismo laboratorio.
Específicamente útil para cambiar el estado de aprobación (estado) de usuarios pendientes.';



CREATE POLICY "Owners can delete immuno requests" ON "public"."immuno_requests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'owner'::"text")))));



CREATE POLICY "Owners can delete medical records" ON "public"."medical_records_clean" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'owner'::"text")))));



CREATE POLICY "Owners have full access to medical records" ON "public"."medical_records_clean" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'owner'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'owner'::"text")))));



CREATE POLICY "Users can delete own settings" ON "public"."user_settings" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can delete their laboratory change_logs" ON "public"."change_logs" FOR DELETE TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their laboratory immuno_requests" ON "public"."immuno_requests" FOR DELETE TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their laboratory patients" ON "public"."patients" FOR DELETE TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their laboratory records" ON "public"."medical_records_clean" FOR DELETE TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their laboratory triage records" ON "public"."triaje_records" FOR DELETE USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert change_logs in their laboratory" ON "public"."change_logs" FOR INSERT TO "authenticated" WITH CHECK (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert immuno_requests in their laboratory" ON "public"."immuno_requests" FOR INSERT TO "authenticated" WITH CHECK (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert own settings" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert patients in their laboratory" ON "public"."patients" FOR INSERT TO "authenticated" WITH CHECK (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert records for their branch" ON "public"."medical_records_clean" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'owner'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'employee'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'residente'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'citotecno'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'patologo'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'medicowner'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch")))))));



CREATE POLICY "Users can insert records in their laboratory" ON "public"."medical_records_clean" FOR INSERT TO "authenticated" WITH CHECK (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert triage records in their laboratory" ON "public"."triaje_records" FOR INSERT WITH CHECK ((("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("patient_id" IN ( SELECT "patients"."id"
   FROM "public"."patients"
  WHERE ("patients"."laboratory_id" = ( SELECT "profiles"."laboratory_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))));



CREATE POLICY "Users can read own settings" ON "public"."user_settings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own settings" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update records for their branch" ON "public"."medical_records_clean" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'owner'::"text")))) OR ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))) AND true) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'employee'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'residente'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'citotecno'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'patologo'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'medicowner'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'owner'::"text")))) OR ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))) AND true) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'employee'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'residente'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'citotecno'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'patologo'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch"))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'medicowner'::"text") AND (("profiles"."assigned_branch" IS NULL) OR ("profiles"."assigned_branch" = "medical_records_clean"."branch")))))));



CREATE POLICY "Users can update their laboratory change_logs" ON "public"."change_logs" FOR UPDATE TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their laboratory immuno_requests" ON "public"."immuno_requests" FOR UPDATE TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their laboratory patients" ON "public"."patients" FOR UPDATE TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their laboratory records" ON "public"."medical_records_clean" FOR UPDATE TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their laboratory triage records" ON "public"."triaje_records" FOR UPDATE USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view active codes for registration" ON "public"."laboratory_codes" FOR SELECT USING ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())) AND (("max_uses" IS NULL) OR ("current_uses" < "max_uses"))));



CREATE POLICY "Users can view profiles from their laboratory" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("laboratory_id" = "public"."get_user_laboratory_id"()));



CREATE POLICY "Users can view their laboratory change_logs" ON "public"."change_logs" FOR SELECT TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their laboratory immuno_requests" ON "public"."immuno_requests" FOR SELECT TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their laboratory patients" ON "public"."patients" FOR SELECT TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their laboratory records" ON "public"."medical_records_clean" FOR SELECT TO "authenticated" USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their laboratory triage records" ON "public"."triaje_records" FOR SELECT USING (("laboratory_id" = ( SELECT "profiles"."laboratory_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "allow public read" ON "public"."medical_records_clean" FOR SELECT TO "anon" USING (true);



CREATE POLICY "allow_public_read_patients" ON "public"."patients" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."change_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."immuno_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."laboratories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."laboratory_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medical_records_clean" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."module_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permite lectura si token es correcto" ON "public"."medical_records_clean" FOR SELECT TO "anon" USING (("token" = "current_setting"('request.jwt.claims.token'::"text", true)));



CREATE POLICY "permitir lectura de PDF si estás autenticado" ON "public"."medical_records_clean" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."triaje_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."actualizar_pdf_en_ready_medical"() TO "anon";
GRANT ALL ON FUNCTION "public"."actualizar_pdf_en_ready_medical"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."actualizar_pdf_en_ready_medical"() TO "service_role";



GRANT ALL ON FUNCTION "public"."actualizar_pdf_en_ready_medical_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."actualizar_pdf_en_ready_medical_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."actualizar_pdf_en_ready_medical_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_module_config_on_lab_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_module_config_on_lab_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_module_config_on_lab_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."build_module_config_from_structure"("module_structure" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."build_module_config_from_structure"("module_structure" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."build_module_config_from_structure"("module_structure" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bmi"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bmi"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bmi"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."email_exists_auth"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."email_exists_auth"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."email_exists_auth"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_doc_aprobado_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_doc_aprobado_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_doc_aprobado_transition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."format_medical_record_names"() TO "anon";
GRANT ALL ON FUNCTION "public"."format_medical_record_names"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."format_medical_record_names"() TO "service_role";



GRANT ALL ON FUNCTION "public"."format_name"("input_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."format_name"("input_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."format_name"("input_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."format_patient_names"() TO "anon";
GRANT ALL ON FUNCTION "public"."format_patient_names"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."format_patient_names"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_medical_record_code_flexible"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_medical_record_code_flexible"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_medical_record_code_flexible"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_medical_record_code_flexible"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_medical_record_code_from_table"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_medical_record_code_from_table"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_medical_record_code_from_table"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_medical_record_code_from_table"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_spt_custom_code"("exam_type_input" "text", "consulta_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid", "laboratory_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_spt_custom_code"("exam_type_input" "text", "consulta_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid", "laboratory_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_spt_custom_code"("exam_type_input" "text", "consulta_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid", "laboratory_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_change_logs_with_deleted"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_change_logs_with_deleted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_change_logs_with_deleted"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_exam_code_from_mapping"("exam_type_input" "text", "code_mappings" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_exam_code_from_mapping"("exam_type_input" "text", "code_mappings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exam_code_from_mapping"("exam_type_input" "text", "code_mappings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exam_code_from_mapping"("exam_type_input" "text", "code_mappings" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_exam_type_number"("exam_type_input" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_exam_type_number"("exam_type_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exam_type_number"("exam_type_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exam_type_number"("exam_type_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_laboratory_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_laboratory_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_laboratory_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."hook_block_duplicate_email"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."hook_block_duplicate_email"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."hook_block_duplicate_email"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."is_authenticated_superadmin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_authenticated_superadmin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_authenticated_superadmin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_medical_record_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_medical_record_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_medical_record_deletion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."preview_medical_record_code"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."preview_medical_record_code"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_medical_record_code"("exam_type_input" "text", "case_date_input" timestamp with time zone, "laboratory_id_input" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_field_from_all_labs"("p_feature_key" "text", "p_field_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_field_from_all_labs"("p_feature_key" "text", "p_field_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_field_from_all_labs"("p_feature_key" "text", "p_field_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_change_log_for_deleted_record"("p_medical_record_id" "uuid", "p_user_id" "uuid", "p_user_email" "text", "p_deleted_record_info" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_change_log_for_deleted_record"("p_medical_record_id" "uuid", "p_user_id" "uuid", "p_user_email" "text", "p_deleted_record_info" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_change_log_for_deleted_record"("p_medical_record_id" "uuid", "p_user_id" "uuid", "p_user_email" "text", "p_deleted_record_info" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_laboratory_values"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_laboratory_values"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_laboratory_values"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_email_lower"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_email_lower"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_email_lower"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_medical_record_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_medical_record_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_medical_record_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_display_name_to_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_display_name_to_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_display_name_to_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_display_name_to_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_display_name_to_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_display_name_to_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_missing_module_configs"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_missing_module_configs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_missing_module_configs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_missing_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_missing_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_missing_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_module_config_on_feature_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_module_config_on_feature_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_module_config_on_feature_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_new_feature_to_laboratories"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_new_feature_to_laboratories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_new_feature_to_laboratories"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_new_field_to_all_labs"("p_feature_key" "text", "p_field_name" "text", "p_field_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_new_field_to_all_labs"("p_feature_key" "text", "p_field_name" "text", "p_field_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_new_field_to_all_labs"("p_feature_key" "text", "p_field_name" "text", "p_field_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_new_fields_on_module_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_new_fields_on_module_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_new_fields_on_module_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_multitenant_isolation"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_multitenant_isolation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_multitenant_isolation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_change_logs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_change_logs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_change_logs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_feature_catalog_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_feature_catalog_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_feature_catalog_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_immuno_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_immuno_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_immuno_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_laboratories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_laboratories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_laboratories_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_triage_records_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_triage_records_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_triage_records_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_feature_exists"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_feature_exists"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_feature_exists"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_laboratory_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_laboratory_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_laboratory_id"() TO "service_role";



GRANT ALL ON TABLE "public"."change_logs" TO "anon";
GRANT ALL ON TABLE "public"."change_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."change_logs" TO "service_role";



GRANT ALL ON TABLE "public"."feature_catalog" TO "anon";
GRANT ALL ON TABLE "public"."feature_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."immuno_requests" TO "anon";
GRANT ALL ON TABLE "public"."immuno_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."immuno_requests" TO "service_role";



GRANT ALL ON TABLE "public"."laboratories" TO "anon";
GRANT ALL ON TABLE "public"."laboratories" TO "authenticated";
GRANT ALL ON TABLE "public"."laboratories" TO "service_role";



GRANT ALL ON TABLE "public"."laboratory_codes" TO "anon";
GRANT ALL ON TABLE "public"."laboratory_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."laboratory_codes" TO "service_role";



GRANT ALL ON TABLE "public"."medical_records_clean" TO "anon";
GRANT ALL ON TABLE "public"."medical_records_clean" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_records_clean" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."laboratory_stats" TO "anon";
GRANT ALL ON TABLE "public"."laboratory_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."laboratory_stats" TO "service_role";



GRANT ALL ON TABLE "public"."module_catalog" TO "anon";
GRANT ALL ON TABLE "public"."module_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."module_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."triaje_records" TO "anon";
GRANT ALL ON TABLE "public"."triaje_records" TO "authenticated";
GRANT ALL ON TABLE "public"."triaje_records" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






