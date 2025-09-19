/*
  # Add user approval system

  1. Schema Changes
    - Add `estado` column to `profiles` table with values 'pendiente' or 'aprobado'
    - Set default value to 'pendiente' for new users
    - Update existing users to 'aprobado'

  2. Security
    - Modify auth flow to check user approval status
    - Only allow login for users with estado = 'aprobado'

  3. Notes
    - This ensures new users must be approved by an owner before accessing the system
    - Even if email is verified, login is blocked until approval
*/

-- Add estado column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente';

-- Set all existing users to 'aprobado'
UPDATE profiles SET estado = 'aprobado' WHERE estado = 'pendiente';

-- Add constraint to ensure estado is either 'pendiente' or 'aprobado'
ALTER TABLE profiles ADD CONSTRAINT profiles_estado_check 
CHECK (estado IN ('pendiente', 'aprobado'));

-- Create function to check if user is approved before login
CREATE OR REPLACE FUNCTION auth.check_user_approved()
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

-- Create trigger to check approval status on login
DROP TRIGGER IF EXISTS check_user_approved_trigger ON auth.users;
CREATE TRIGGER check_user_approved_trigger
BEFORE UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
EXECUTE FUNCTION auth.check_user_approved();

-- Modify handle_new_user function to set estado to 'pendiente' by default
-- except for specific admin emails that are auto-approved
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role, estado)
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
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;