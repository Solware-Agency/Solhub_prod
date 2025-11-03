/*
  # Agregar soporte para laboratory_id en registro de usuarios

  - Actualiza handle_new_user() para leer laboratory_id de raw_user_meta_data
  - Asigna laboratory_id al perfil cuando se crea
  - Mantiene compatibilidad hacia atrás (laboratory_id puede ser NULL)
  
  ¿Cómo funciona?
  1. Usuario se registra con código → Frontend valida código
  2. Frontend llama a signUp() con laboratory_id en metadata
  3. Supabase crea usuario en auth.users con metadata
  4. Trigger handle_new_user() se ejecuta automáticamente
  5. Trigger lee laboratory_id de NEW.raw_user_meta_data->>'laboratory_id'
  6. Trigger asigna laboratory_id al perfil en profiles
*/

-- Actualizar función handle_new_user() para incluir laboratory_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario explicativo
COMMENT ON FUNCTION public.handle_new_user() IS 
'Crea automáticamente un perfil cuando se registra un nuevo usuario. 
Lee laboratory_id de raw_user_meta_data si está disponible (cuando el usuario se registra con código).
Si laboratory_id es NULL, el usuario no pertenece a ningún laboratorio (caso especial).';

