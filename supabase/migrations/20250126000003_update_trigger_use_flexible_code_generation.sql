/*
  # Update trigger to use flexible code generation system
  
  - Actualiza el trigger set_medical_record_code() para usar generate_medical_record_code_flexible()
  - Esto permite que cada laboratorio use su propio formato de código según su configuración
  - Mantiene retrocompatibilidad: si no hay configuración, usa formato Conspat por defecto
*/

-- Actualizar trigger para usar la función flexible
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

-- Comentario para documentar el cambio
COMMENT ON FUNCTION set_medical_record_code() IS 
'Genera código de caso médico usando sistema flexible basado en configuración del laboratorio. 
Lee codeTemplate y codeMappings de laboratories.config para generar códigos personalizados.
Si no hay configuración, usa formato Conspat por defecto.';

