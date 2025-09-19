/*
  # Add branch assignment to user profiles

  1. Changes
    - Add `assigned_branch` column to profiles table
    - Create RLS policy to filter medical records by assigned branch
    - Employees can only see records from their assigned branch
    - Owners can see all records regardless of branch assignment

  2. Security
    - RLS policy ensures data isolation by branch
    - Backward compatibility: users without assigned branch can see all records
*/

-- Add assigned_branch column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_branch text;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Filter records by branch for employees" ON medical_records_clean;

-- Create new RLS policy for medical_records_clean to filter by branch
CREATE POLICY "Filter records by branch for employees" 
  ON medical_records_clean
  FOR SELECT
  TO authenticated
  USING (
    -- Owners can see all records
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR
    -- Employees can only see records from their assigned branch
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
          AND role = 'employee'
          AND (
            assigned_branch IS NULL -- If no branch assigned, see all (backward compatibility)
            OR assigned_branch = medical_records_clean.branch -- Only see records from assigned branch
          )
      )
    )
  );

-- Create index on assigned_branch for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_branch ON profiles(assigned_branch);

-- Add comment to document the column
COMMENT ON COLUMN profiles.assigned_branch IS 'Branch assigned to employee users for filtering medical records access';