/*
  # Make handle_new_user robust when reading phone from metadata

  - Avoids signup 500 by guarding numeric cast
*/

-- Ensure column still exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone numeric;

-- Safer function: swallow bad/long/non-numeric input and store NULL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_phone_text text;
  v_phone_numeric numeric;
BEGIN
  v_phone_text := regexp_replace(coalesce(NEW.raw_user_meta_data ->> 'phone', ''), '\D', '', 'g');

  IF v_phone_text IS NULL OR v_phone_text = '' THEN
    v_phone_numeric := NULL;
  ELSIF length(v_phone_text) > 18 THEN
    -- too long to be a phone; skip
    v_phone_numeric := NULL;
  ELSE
    BEGIN
      v_phone_numeric := v_phone_text::numeric;
    EXCEPTION WHEN others THEN
      v_phone_numeric := NULL;
    END;
  END IF;

  INSERT INTO profiles (id, email, role, estado, phone)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'owner' ELSE 'employee' END,
    CASE WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'aprobado' ELSE 'pendiente' END,
    v_phone_numeric
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


