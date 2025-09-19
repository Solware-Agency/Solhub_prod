/*
  # Fix RLS policies for medical records

  1. Changes
    - Drop the overly permissive "Allow public access to medical records clean" policy
    - Ensure the branch-based filtering policy works correctly
    - Add explicit policy for owners to have full access

  2. Security
    - Removes public access to medical records
    - Maintains branch-based access control for employees
    - Preserves owner access to all records
*/

-- Drop the overly permissive policy that's allowing access to all records
DROP POLICY IF EXISTS "Allow public access to medical records clean" ON medical_records_clean;

-- Ensure the branch filtering policy exists and works correctly
DROP POLICY IF EXISTS "Filter records by branch for employees" ON medical_records_clean;

-- Create policy for branch-based filtering
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

-- Add explicit policy for owners to have full access to medical records
CREATE POLICY "Owners have full access to medical records" 
  ON medical_records_clean
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Add policy for employees to insert records (only for their assigned branch)
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