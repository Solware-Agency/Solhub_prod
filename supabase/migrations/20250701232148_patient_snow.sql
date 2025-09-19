/*
  # Add doctor role to profiles table

  1. Changes
    - Add 'doctor' as a valid role in the profiles table
    - Update role check constraint to include 'doctor'
    - Add migration to support the new role

  2. Security
    - Maintain existing RLS policies
*/

-- Update the role check constraint to include 'doctor'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text, 'admin'::text, 'doctor'::text]));

-- Create a function to update Jesus to doctor role
CREATE OR REPLACE FUNCTION update_jesus_to_doctor()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET role = 'doctor'
  WHERE email = 'jesus@email.com';
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_jesus_to_doctor();

-- Drop the function after use
DROP FUNCTION update_jesus_to_doctor();