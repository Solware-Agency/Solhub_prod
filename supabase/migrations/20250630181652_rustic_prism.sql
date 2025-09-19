/*
  # Fix branch filtering policy for medical records

  1. Changes
    - Create policy for filtering medical records by branch
    - Fix syntax error in previous migration
    - Ensure proper access control based on user role and assigned branch

  2. Security
    - Owners can see all records
    - Employees can only see records from their assigned branch
    - Employees without assigned branch can see all records (backward compatibility)
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Filter records by branch for employees" ON medical_records_clean;

-- Create policy for branch-based filtering with correct syntax
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

-- Add policy for employees to insert records (only for their assigned branch)
DROP POLICY IF EXISTS "Employees can insert records for their branch" ON medical_records_clean;
CREATE POLICY "Employees can insert records for their branch" 
  ON medical_records_clean
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owners can insert for any branch
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR
    -- Employees can only insert for their assigned branch
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
          AND role = 'employee'
          AND (
            assigned_branch IS NULL -- If no branch assigned, can insert for any branch
            OR assigned_branch = branch -- Only insert for assigned branch
          )
      )
    )
  );

-- Add policy for employees to update records (only for their assigned branch)
DROP POLICY IF EXISTS "Employees can update records for their branch" ON medical_records_clean;
CREATE POLICY "Employees can update records for their branch" 
  ON medical_records_clean
  FOR UPDATE
  TO authenticated
  USING (
    -- Owners can update any record
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR
    -- Employees can only update records for their assigned branch
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
          AND role = 'employee'
          AND (
            assigned_branch IS NULL -- If no branch assigned, can update any record
            OR assigned_branch = medical_records_clean.branch -- Only update records for assigned branch
          )
      )
    )
  )
  WITH CHECK (
    -- Owners can update any record
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
    OR
    -- Employees can only update records for their assigned branch
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
          AND role = 'employee'
          AND (
            assigned_branch IS NULL -- If no branch assigned, can update any record
            OR assigned_branch = branch -- Only update records for assigned branch
          )
      )
    )
  );