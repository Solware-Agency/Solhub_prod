/*
  # Enable owner to delete medical records

  1. Changes
    - Add DELETE policy to medical_records_clean table
    - Allow users with owner role to delete any record
    - Maintain audit trail through change_logs

  2. Security
    - Only owners can delete records
    - Employees and admins cannot delete records
*/

-- Add policy for owners to delete medical records
CREATE POLICY "Owners can delete medical records"
  ON medical_records_clean
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );