/*
  # Add owner update policy for profiles

  1. Security Changes
    - Add policy allowing owners to update all profiles
    - This enables owners to manage branch assignments for employees

  2. Policy Details
    - Policy name: "Owners can update all profiles"
    - Allows UPDATE operations on profiles table
    - Only applies to authenticated users with 'owner' role
    - Enables owners to modify any profile record
*/

-- Add policy for owners to update all profiles
CREATE POLICY "Owners can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );