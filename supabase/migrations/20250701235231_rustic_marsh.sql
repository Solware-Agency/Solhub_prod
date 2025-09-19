/*
  # Add admin role to profiles table

  1. Changes
    - Add 'admin' as a valid role in the profiles table
    - Update role check constraint to include 'admin'
    - This allows assigning the admin role to users

  2. Security
    - Maintains existing RLS policies
    - Admin users will have special permissions in the application
*/

-- Update the role check constraint to include 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text, 'admin'::text]));

-- Create index on role for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);