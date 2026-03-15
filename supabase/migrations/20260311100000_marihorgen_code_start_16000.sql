-- =====================================================
-- Marihorgen/LM: códigos de caso numéricos desde 16000
-- =====================================================
-- Para laboratorios marihorgen y lm, los nuevos casos tendrán código
-- 16000, 16001, 16002, ... (independiente del tipo de examen).
-- Los casos de Inmunohistoquímica siguen mostrando owner_display_code
-- en la UI (código manual); el code interno será igualmente 16000+.
-- =====================================================

-- 1. Crear función generate_medical_record_code_flexible (si no existe o reemplazar)
--    El trigger set_medical_record_code() la invoca; sin ella el INSERT fallaría.
CREATE OR REPLACE FUNCTION public.generate_medical_record_code_flexible(
  exam_type_input text,
  case_date_input timestamptz,
  laboratory_id_input uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lab_slug text;
  next_code int;
  lock_key bigint;
BEGIN
  IF laboratory_id_input IS NULL THEN
    RAISE EXCEPTION 'laboratory_id es requerido para generar código';
  END IF;

  SELECT slug INTO lab_slug
  FROM public.laboratories
  WHERE id = laboratory_id_input;

  -- Marihorgen y LM: secuencia numérica desde 16000
  IF lab_slug IN ('marihorgen', 'lm') THEN
    lock_key := hashtext(('mrcode_marihorgen|' || laboratory_id_input::text)::text);
    PERFORM pg_advisory_xact_lock(lock_key);

    SELECT COALESCE(MAX((code)::int), 15999) + 1 INTO next_code
    FROM public.medical_records_clean
    WHERE laboratory_id = laboratory_id_input
      AND code ~ '^[0-9]+$'
      AND (code)::int >= 16000;

    IF next_code IS NULL OR next_code < 16000 THEN
      next_code := 16000;
    END IF;

    RETURN next_code::text;
  END IF;

  -- Resto de laboratorios: formato legacy (Conspat/SPT según config)
  RETURN generate_medical_record_code_from_table(
    exam_type_input,
    case_date_input,
    laboratory_id_input
  );
END;
$$;

COMMENT ON FUNCTION public.generate_medical_record_code_flexible(text, timestamptz, uuid) IS
'Genera código de caso: Marihorgen/LM = numérico desde 16000; otros labs = formato legacy por laboratorio.';

-- 2. Configuración en laboratories (documentación y posible uso futuro)
UPDATE public.laboratories
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{codeStart}',
  '16000'::jsonb
)
WHERE slug IN ('marihorgen', 'lm');
