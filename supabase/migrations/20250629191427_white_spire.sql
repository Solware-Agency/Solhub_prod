/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The "Owners can read all profiles" policy causes infinite recursion
    - It queries the profiles table from within a policy applied to the same table

  2. Solution
    - Create a secure function to check user roles without triggering RLS
    - Update the problematic policy to use this function
    - Add policy for owners to update all profiles

  3. Security
    - Function uses SECURITY DEFINER to bypass RLS safely
    - Maintains proper access control for owner operations
*/

-- Create a secure function to check if a user is an owner
CREATE OR REPLACE FUNCTION is_owner_role(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Owners can read all profiles" ON profiles;

-- Create a new policy that uses the secure function
CREATE POLICY "Owners can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_owner_role(auth.uid()));

-- Add policy for owners to update all profiles
CREATE POLICY "Owners can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_owner_role(auth.uid()))
  WITH CHECK (is_owner_role(auth.uid()));