/*
  # Add branch assignment to user profiles

  1. Changes
    - Add `assigned_branch` column to `profiles` table
    - This allows restricting users to only see cases from their assigned branch

  2. Security
    - Update RLS policies to filter cases by branch for non-owner users
*/

-- Add assigned_branch column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_branch text;

-- Create a function to filter medical records by branch for employees
CREATE OR REPLACE FUNCTION filter_records_by_branch()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is an owner, they can see all records
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'owner'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- If the user is an employee, they can only see records from their assigned branch
  -- If no branch is assigned, they can see all records (backward compatibility)
  RETURN (
    SELECT 
      CASE 
        WHEN p.assigned_branch IS NULL THEN TRUE
        ELSE NEW.branch = p.assigned_branch
      END
    FROM profiles p
    WHERE p.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policy for medical_records_clean to filter by branch
CREATE POLICY IF NOT EXISTS "Filter records by branch for employees" 
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
            OR assigned_branch = branch -- Only see records from assigned branch
          )
      )
    )
  );