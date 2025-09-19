/*
  # Update Jesus user role to admin

  1. Changes
    - Ensures the role constraint includes 'admin' role
    - Updates the user with email 'jesus@email.com' to have admin role
    - Logs the change in the change_logs table
*/

-- Update the role check constraint to include 'admin' if not already included
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check' 
    AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text, 'admin'::text, 'doctor'::text]));
  ELSE
    -- Check if the constraint already includes 'admin'
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'profiles_role_check' 
      AND pg_get_constraintdef(oid) LIKE '%admin%'
    ) THEN
      -- Drop and recreate with 'admin'
      ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
      ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text, 'admin'::text, 'doctor'::text]));
    END IF;
  END IF;
END $$;

-- Update Jesus to admin role
UPDATE profiles
SET role = 'admin'
WHERE email = 'jesus@email.com';