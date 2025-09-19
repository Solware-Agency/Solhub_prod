/*
  # Sync phone from auth metadata into profiles at user creation

  Changes:
  - Ensure profiles.phone column exists (numeric)
  - Update handle_new_user() to insert phone from auth.users.raw_user_meta_data
*/

-- Ensure column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone numeric;

-- Recreate function to include phone on insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role, estado, phone)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'owner'
      ELSE 'employee'
    END,
    CASE
      WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'aprobado'
      ELSE 'pendiente'
    END,
    -- Extract numeric phone from metadata, cast to numeric if present
    CASE 
      WHEN (NEW.raw_user_meta_data ->> 'phone') IS NULL OR TRIM(NEW.raw_user_meta_data ->> 'phone') = '' THEN NULL
      ELSE CAST(regexp_replace(NEW.raw_user_meta_data ->> 'phone', '\D', '', 'g') AS numeric)
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger remains the same; no need to recreate unless missing
-- This migration assumes the trigger on auth.users already exists:
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


