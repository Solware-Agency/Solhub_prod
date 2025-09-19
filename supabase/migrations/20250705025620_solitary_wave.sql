/*
  # Add generated_by field to medical_records_clean table

  1. New Fields
    - `generated_by` (uuid, nullable) - User ID who generated the biopsy case
    - `generated_by_display_name` (text, nullable) - Display name of the user who generated the case
    - `generated_at` (timestamptz, nullable) - When the case was generated

  2. Purpose
    - Track which admin/doctor generated a case (separate from who created it)
    - Enable filtering cases by the doctor who generated them
    - Support the "My Cases" feature for admin users

  3. Notes
    - These fields are specifically for tracking biopsy case generation
    - All fields are nullable to maintain compatibility with existing records
*/

-- Add generated_by fields to medical_records_clean table
ALTER TABLE medical_records_clean 
ADD COLUMN IF NOT EXISTS generated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS generated_by_display_name text,
ADD COLUMN IF NOT EXISTS generated_at timestamptz;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_generated_by ON medical_records_clean(generated_by);

-- Add comments to document the columns
COMMENT ON COLUMN medical_records_clean.generated_by IS 'User ID who generated the biopsy case';
COMMENT ON COLUMN medical_records_clean.generated_by_display_name IS 'Display name of the user who generated the case';
COMMENT ON COLUMN medical_records_clean.generated_at IS 'When the case was generated';