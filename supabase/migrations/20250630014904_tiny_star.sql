/*
  # Add display_name to profiles table

  1. Changes
    - Add `display_name` column to profiles table
    - This allows users to set a display name different from their email

  2. Notes
    - The display_name is optional and can be null
    - This will be used for UI personalization
*/

-- Add display_name column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Add comment to document the column
COMMENT ON COLUMN profiles.display_name IS 'User display name for UI personalization';