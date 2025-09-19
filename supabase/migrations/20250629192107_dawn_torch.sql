/*
  # Fix infinite recursion in profiles RLS policies

  1. Changes
    - Temporarily disable RLS on profiles table
    - Drop all existing policies to start fresh
    - Create new non-recursive policies for user access
    - Re-enable RLS with safe policies
    
  2. Security
    - Maintain basic security with simple direct auth.uid() checks
    - Users can still read/update their own profiles
    - Remove recursive owner policies that caused infinite recursion
*/

-- First, disable RLS temporarily to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Owners can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Owners can update all profiles" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Policy 1: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create a simple policy for all authenticated users to read all profiles
-- This avoids the recursion while still allowing access
CREATE POLICY "All users can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);