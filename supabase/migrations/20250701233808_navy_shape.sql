/*
  # Remove doctor role and update constraints

  1. Changes
    - Remove 'doctor' role from constraint
    - Update any users with 'doctor' role to 'admin' role
    - Ensure Jesus user has 'admin' role

  2. Security
    - Maintains existing RLS policies
*/

-- Update the role check constraint to remove 'doctor'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text, 'admin'::text]));

-- Update any users with 'doctor' role to 'admin' role
UPDATE profiles
SET role = 'admin'
WHERE role = 'doctor';

-- Ensure Jesus has admin role
UPDATE profiles
SET role = 'admin'
WHERE email = 'jesus@email.com';