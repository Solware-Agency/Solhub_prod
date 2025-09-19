-- Update the role check constraint to include 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text, 'admin'::text, 'doctor'::text]));

-- Create a function to update Jesus to admin role
CREATE OR REPLACE FUNCTION update_jesus_to_admin()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET role = 'admin'
  WHERE email = 'jesus@email.com';
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_jesus_to_admin();

-- Drop the function after use
DROP FUNCTION update_jesus_to_admin();