-- Check if estado column exists before adding it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'estado'
  ) THEN
    ALTER TABLE profiles ADD COLUMN estado text NOT NULL DEFAULT 'pendiente';
  END IF;
END $$;

-- Set all existing users to 'aprobado'
UPDATE profiles SET estado = 'aprobado' WHERE estado = 'pendiente';

-- Check if constraint exists before adding it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_estado_check' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_estado_check 
    CHECK (estado IN ('pendiente', 'aprobado'));
  END IF;
END $$;

-- Create function in public schema to check if user is approved before login
CREATE OR REPLACE FUNCTION public.check_user_approved()
RETURNS trigger AS $$
DECLARE
  is_approved boolean;
BEGIN
  -- Skip for new signups (they'll be pendiente by default)
  IF NEW.created_at = NEW.confirmed_at THEN
    RETURN NEW;
  END IF;

  -- Check if user is approved
  SELECT (estado = 'aprobado') INTO is_approved
  FROM public.profiles
  WHERE id = NEW.id;

  -- If not approved, block the login
  IF NOT is_approved THEN
    RAISE EXCEPTION 'User account is pending approval';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists before creating it
DROP TRIGGER IF EXISTS check_user_approved_trigger ON auth.users;

-- Create trigger to check approval status on login
CREATE TRIGGER check_user_approved_trigger
BEFORE UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
EXECUTE FUNCTION public.check_user_approved();

-- Update handle_new_user function to set estado to 'pendiente' by default
-- except for specific admin emails that are auto-approved
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role, estado, display_name)
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
    NEW.raw_user_meta_data->>'display_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists before creating it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for the new handle_new_user function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();