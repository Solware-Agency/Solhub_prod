/*
  # Refine admin access to medical records

  1. Changes
    - Modify existing policies to ensure admins can view all records
    - Ensure admins with assigned branch can only see records from that branch
    - Ensure admins without assigned branch can see all records

  2. Security
    - Maintain proper access control based on user role
    - Preserve branch-based filtering for employees
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Filter records by branch for users" ON medical_records_clean;

-- Create updated policy that handles admin role correctly
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