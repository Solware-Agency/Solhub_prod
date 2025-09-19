/*
  # Fix infinite recursion in profiles RLS policy

  1. Problem
    - The "Owners can read all profiles" policy causes infinite recursion
    - Policy tries to read from profiles table to check if user is owner
    - This triggers the same policy, creating a loop

  2. Solution
    - Create a SECURITY DEFINER function that bypasses RLS
    - Update the policy to use this function instead of direct table access
    - This breaks the recursive loop while maintaining security

  3. Changes
    - Add `is_owner()` function with SECURITY DEFINER privileges
    - Update "Owners can read all profiles" policy to use the new function
    - Add policy for owners to update all profiles
*/

-- Create function to check if current user is owner (bypasses RLS)
CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'owner'
  );
END;
$$;

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Owners can read all profiles" ON profiles;

-- Recreate policy using the secure function
CREATE POLICY "Owners can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_owner());

-- Add policy for owners to update all profiles
CREATE POLICY "Owners can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

-- Users can insert own profile (already exists, but ensuring it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;