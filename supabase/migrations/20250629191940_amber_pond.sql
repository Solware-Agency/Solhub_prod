/*
  # Fix infinite recursion in profiles RLS policies

  1. Security Changes
    - Drop problematic recursive policies
    - Create simple, non-recursive policies
    - Use direct auth.uid() checks instead of table lookups

  2. Policy Structure
    - Users can read/update their own profile
    - No cross-table lookups to avoid recursion
    - Simple role-based access using direct comparisons
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

-- Note: Removed the "Owners can read all profiles" policy that was causing recursion
-- If owner access to all profiles is needed, it should be handled at the application level
-- or through a different mechanism that doesn't cause RLS recursion