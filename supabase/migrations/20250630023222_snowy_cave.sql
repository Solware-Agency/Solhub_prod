/*
  # Add created_by fields to medical_records_clean table

  1. Changes
    - Add `created_by` column to store the user ID who created the record
    - Add `created_by_display_name` column to store the display name of the creator
    - These fields help track who created each medical record

  2. Notes
    - The created_by field references auth.users(id)
    - The created_by_display_name is stored directly for performance and to avoid joins
    - This enables showing who registered each case in the UI
*/

-- Add created_by column to medical_records_clean table
ALTER TABLE medical_records_clean 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add created_by_display_name column to medical_records_clean table
ALTER TABLE medical_records_clean 
ADD COLUMN IF NOT EXISTS created_by_display_name text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_created_by 
ON medical_records_clean(created_by);

-- Add comments to document the columns
COMMENT ON COLUMN medical_records_clean.created_by IS 'User ID who created the record';
COMMENT ON COLUMN medical_records_clean.created_by_display_name IS 'Display name of the user who created the record';