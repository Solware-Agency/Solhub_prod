-- =====================================================
-- Migración: Actualizar trigger para usar consulta cuando exam_type sea NULL
-- Fecha: 2026-01-17
-- Descripción: Modifica el trigger set_medical_record_code() para generar códigos
--              usando consulta si exam_type es NULL (para laboratorio SPT)
-- =====================================================

-- Actualizar trigger para usar COALESCE(exam_type, consulta)
CREATE OR REPLACE FUNCTION set_medical_record_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  case_ts timestamptz;
  exam_value text; -- Valor a usar para generar código (exam_type o consulta)
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

  -- Usar COALESCE para elegir exam_type o consulta
  -- Prioridad: exam_type si existe, sino consulta
  exam_value := COALESCE(NEW.exam_type, NEW.consulta);

  -- Validar que al menos uno esté presente
  IF exam_value IS NULL OR exam_value = '' THEN
    RAISE EXCEPTION 'exam_type o consulta es requerido para generar código';
  END IF;

  -- Usar función flexible que lee configuración del laboratorio
  -- Si no hay configuración, usa formato Conspat por defecto (retrocompatibilidad)
  NEW.code := generate_medical_record_code_flexible(
    exam_value,  -- Pasar el valor elegido
    case_ts,
    NEW.laboratory_id
  );

  RETURN NEW;
END;
$$;

-- Comentario para documentar el cambio
COMMENT ON FUNCTION set_medical_record_code() IS
'Genera código de caso médico usando sistema flexible basado en configuración del laboratorio.
Usa exam_type si está presente, sino consulta. Ambos campos deben tener al menos uno lleno.
Lee codeTemplate y codeMappings de laboratories.config para generar códigos personalizados.
Si no hay configuración, usa formato Conspat por defecto.';