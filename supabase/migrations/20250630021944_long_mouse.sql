/*
  # Add display_name column to profiles table

  1. Changes
    - Add `display_name` column to profiles table
    - This allows users to set a custom display name for UI personalization

  2. Notes
    - The display name is optional
    - It will be shown in the UI instead of email when available
    - This improves user experience and personalization
*/

-- Add display_name column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Add comment to document the column
COMMENT ON COLUMN profiles.display_name IS 'User display name for UI personalization';