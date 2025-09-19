/*
  # Add admin role to profiles table

  1. Changes
    - Update the role check constraint to include 'admin' as a valid role
    - Create index on role column for better performance

  2. Security
    - Maintains existing RLS policies
*/

-- Update the role check constraint to include 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text, 'admin'::text]));

-- Create index on role for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);