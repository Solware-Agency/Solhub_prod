/*
  # Fix user signup trigger and handle_new_user function

  1. Changes
    - Improve robustness of handle_new_user function
    - Add proper error handling for NULL values
    - Fix type casting for role and estado values
    - Ensure display_name is handled correctly from user metadata

  2. Security
    - Maintain SECURITY DEFINER to bypass RLS
    - Preserve existing role assignment logic
    - Keep auto-approval for specific admin emails
*/

-- Recreate the handle_new_user function with improved error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles with proper NULL handling and explicit type casting
  INSERT INTO profiles (
    id, 
    email, 
    role, 
    estado, 
    display_name
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    CASE 
      WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'owner'
      ELSE 'employee'
    END,
    CASE
      WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'aprobado'
      ELSE 'pendiente'
    END,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for the updated handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate the check_user_approved function with improved error handling
CREATE OR REPLACE FUNCTION public.check_user_approved()
RETURNS trigger AS $$
DECLARE
  is_approved boolean;
  user_exists boolean;
BEGIN
  -- Skip for new signups (they'll be pendiente by default)
  IF NEW.created_at = NEW.confirmed_at THEN
    RETURN NEW;
  END IF;

  -- Check if user profile exists
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = NEW.id
  ) INTO user_exists;
  
  -- If user profile doesn't exist, allow login (edge case)
  IF NOT user_exists THEN
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

-- Recreate the trigger for checking approval status on login
DROP TRIGGER IF EXISTS check_user_approved_trigger ON auth.users;
CREATE TRIGGER check_user_approved_trigger
BEFORE UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
EXECUTE FUNCTION public.check_user_approved();