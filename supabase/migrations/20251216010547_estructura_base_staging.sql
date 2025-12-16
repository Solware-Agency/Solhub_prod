set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_phone_text text;
  v_phone_numeric numeric;
  v_laboratory_id uuid;
  v_display_name text;
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
      
      -- Verificar que el laboratorio existe
      IF NOT EXISTS (SELECT 1 FROM laboratories WHERE id = v_laboratory_id) THEN
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

  -- Insertar perfil con laboratory_id (si existe)
  INSERT INTO profiles (
    id,
    email,
    role,
    estado,
    phone,
    display_name,
    laboratory_id  -- ← NUEVO
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'owner' ELSE 'employee' END,
    CASE WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'aprobado' ELSE 'pendiente' END,
    v_phone_numeric,
    v_display_name,
    v_laboratory_id  -- ← NUEVO: Puede ser NULL si no se proporcionó código
  );
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_medical_record_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_user_id uuid;
  current_user_email text;
  current_user_display_name text;
  record_info text;
  existing_log_count integer;
BEGIN
  -- Get current user information
  current_user_id := auth.uid();
  
  -- If no user is authenticated, skip logging
  IF current_user_id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Get user email and display name from profiles table
  SELECT email, display_name INTO current_user_email, current_user_display_name
  FROM profiles 
  WHERE id = current_user_id;
  
  -- Check if a deletion log already exists for this record (avoid duplicates)
  SELECT COUNT(*) INTO existing_log_count
  FROM change_logs 
  WHERE patient_id = OLD.patient_id 
    AND field_name = 'deleted_record'
    AND changed_at > now() - interval '1 second';
  
  -- If a deletion log already exists in the last second, skip
  IF existing_log_count > 0 THEN
    RETURN OLD;
  END IF;
  
  -- Create record info string using available fields
  record_info := COALESCE(OLD.code, 'Sin código') || ' - ' || COALESCE(OLD.exam_type, 'Sin tipo de examen');
  
  -- Save the deletion log using patient_id (required by constraint)
  -- Note: We use patient_id instead of medical_record_id since the record is being deleted
  INSERT INTO change_logs (
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
    OLD.patient_id,
    current_user_id,
    COALESCE(current_user_email, 'unknown@email.com'),
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
$function$
;


