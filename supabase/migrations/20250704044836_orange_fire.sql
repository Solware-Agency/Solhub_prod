/*
  # Fix branch filtering for admin role

  1. Changes
    - Update RLS policies to properly handle admin role
    - Ensure admins with assigned branch can see only cases from that branch
    - Ensure admins without assigned branch can see all cases
    - Maintain existing behavior for employees and owners

  2. Security
    - Maintain proper access control based on user role and branch assignment
    - Owners continue to have full access to all records
*/

-- Drop existing policies that handle branch filtering
DROP POLICY IF EXISTS "Filter records by branch for employees" ON medical_records_clean;
DROP POLICY IF EXISTS "Employees can insert records for their branch" ON medical_records_clean;
DROP POLICY IF EXISTS "Employees can update records for their branch" ON medical_records_clean;

-- Create updated policy for SELECT that handles admin role correctly
CREATE POLICY "Filter records by branch for users" 
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
    -- Admins with assigned branch can only see records from their branch
    -- Admins without assigned branch can see all records
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
          AND role = 'admin'
          AND (
            assigned_branch IS NULL -- If no branch assigned, see all
            OR assigned_branch = medical_records_clean.branch -- Only see records from assigned branch
          )
      )
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

-- Create updated policy for INSERT that handles admin role correctly
CREATE POLICY "Users can insert records for their branch" 
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
    -- Admins with assigned branch can only insert for their branch
    -- Admins without assigned branch can insert for any branch
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
          AND role = 'admin'
          AND (
            assigned_branch IS NULL -- If no branch assigned, can insert for any branch
            OR assigned_branch = branch -- Only insert for assigned branch
          )
      )
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

-- Create updated policy for UPDATE that handles admin role correctly
CREATE POLICY "Users can update records for their branch" 
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
    -- Admins with assigned branch can only update records for their branch
    -- Admins without assigned branch can update any record
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
          AND role = 'admin'
          AND (
            assigned_branch IS NULL -- If no branch assigned, can update any record
            OR assigned_branch = medical_records_clean.branch -- Only update records for assigned branch
          )
      )
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
    -- Admins with assigned branch can only update records for their branch
    -- Admins without assigned branch can update any record
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() 
          AND role = 'admin'
          AND (
            assigned_branch IS NULL -- If no branch assigned, can update any record
            OR assigned_branch = branch -- Only update records for assigned branch
          )
      )
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