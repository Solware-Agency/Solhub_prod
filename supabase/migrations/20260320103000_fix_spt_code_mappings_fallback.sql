-- =====================================================
-- Fix: SPT custom code generator should accept config.codeMappings
-- Fecha: 2026-03-20
-- Descripción:
--   - Actualiza generate_spt_custom_code para usar como fuente principal
--     config.codeMappings (ruta usada actualmente por el dashboard/config).
--   - Mantiene compatibilidad con ruta legacy:
--     config.codeFormat.typeMappings.examTypes
--   - Mantiene soporte de consultaTypes (legacy) cuando no se envía exam_type.
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_spt_custom_code(
  exam_type_input text,
  consulta_input text,
  case_date_input timestamptz,
  laboratory_id_input uuid,
  laboratory_config jsonb
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  type_code text;
  yyyy smallint;
  mm smallint;
  year_suffix text;
  month_letter text;
  next_counter int;
  exam_mappings jsonb;
  consulta_mappings jsonb;
BEGIN
  -- Prioridad 1: ruta actual usada por config/dashboard
  exam_mappings := laboratory_config->'codeMappings';

  -- Fallback: ruta legacy usada por función histórica
  IF exam_mappings IS NULL OR exam_mappings = '{}'::jsonb THEN
    exam_mappings := laboratory_config->'codeFormat'->'typeMappings'->'examTypes';
  END IF;

  -- Solo aplica para fallback por consulta (legacy)
  consulta_mappings := laboratory_config->'codeFormat'->'typeMappings'->'consultaTypes';

  IF exam_mappings IS NULL OR exam_mappings = '{}'::jsonb THEN
    RAISE EXCEPTION
      'No hay mappings configurados. Esperado: config.codeMappings o config.codeFormat.typeMappings.examTypes para laboratorio %',
      laboratory_id_input;
  END IF;

  -- Determinar código de tipo (prioridad: exam_type > consulta)
  IF exam_type_input IS NOT NULL AND btrim(exam_type_input) <> '' THEN
    type_code := exam_mappings->>exam_type_input;
    IF type_code IS NULL THEN
      RAISE EXCEPTION
        'No hay código configurado para exam_type: "%". Verifica config.codeMappings (o legacy config.codeFormat.typeMappings.examTypes)',
        exam_type_input;
    END IF;
  ELSIF consulta_input IS NOT NULL AND btrim(consulta_input) <> '' THEN
    type_code := consulta_mappings->>consulta_input;
    IF type_code IS NULL THEN
      RAISE EXCEPTION
        'No hay código configurado para consulta: "%". Verifica config.codeFormat.typeMappings.consultaTypes',
        consulta_input;
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
    hashtext(format('%s-%s-%s-%s', type_code, year_suffix, month_letter, laboratory_id_input))
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
  FROM public.medical_records_clean
  WHERE substring(code, 1, length(type_code)) = type_code
    AND substring(code, length(type_code) + 5, 1) = month_letter
    AND substring(code, length(type_code) + 6, 2) = year_suffix
    AND laboratory_id = laboratory_id_input;

  -- Formato SPT: [CÓDIGO][contador:4d][mes:letra][año:2d]
  RETURN format(
    '%s%s%s%s',
    type_code,
    lpad(next_counter::text, 4, '0'),
    month_letter,
    year_suffix
  );
END;
$function$;

COMMENT ON FUNCTION public.generate_spt_custom_code(text, text, timestamptz, uuid, jsonb)
IS 'Genera códigos SPT. Prioriza config.codeMappings y mantiene compatibilidad con config.codeFormat.typeMappings.examTypes.';
