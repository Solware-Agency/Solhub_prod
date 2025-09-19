-- Create function to check if user is approved before login
CREATE OR REPLACE FUNCTION public.check_user_approved()
RETURNS trigger AS $$
DECLARE
  is_approved boolean;
  user_exists boolean;
  approval_status text;
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
    RAISE LOG 'Profile not found for user %s during login, allowing access', NEW.id;
    RETURN NEW;
  END IF;

  -- Get the actual estado value
  SELECT estado INTO approval_status
  FROM public.profiles
  WHERE id = NEW.id;
  
  RAISE LOG 'User %s login attempt with approval status: %s', NEW.id, approval_status;

  -- Only block if explicitly "pendiente"
  IF approval_status = 'pendiente' THEN
    RAISE LOG 'Blocking login for user %s with pendiente status', NEW.id;
    RAISE EXCEPTION 'User account is pending approval';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the transaction
    IF SQLERRM <> 'User account is pending approval' THEN
      RAISE LOG 'Error in check_user_approved: % - %', SQLERRM, SQLSTATE;
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for checking approval status on login
DROP TRIGGER IF EXISTS check_user_approved_trigger ON auth.users;
CREATE TRIGGER check_user_approved_trigger
BEFORE UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
EXECUTE FUNCTION public.check_user_approved();

-- Update all existing profiles to ensure estado is set correctly
UPDATE profiles 
SET estado = 'aprobado' 
WHERE estado IS NULL OR (estado != 'pendiente' AND estado != 'aprobado');

-- Add index on estado for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON profiles(estado);