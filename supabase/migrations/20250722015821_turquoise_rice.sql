/*
  # Add attachment_url field to medical_records_clean table

  1. New Fields
    - `attachment_url` (text, nullable) - URL or path to uploaded file attachment
    - `inmunohistoquimica` (text, nullable) - Immunohistochemistry technique description
    - `positivo` (text, nullable) - Positive antibodies
    - `negativo` (text, nullable) - Negative antibodies  
    - `ki67` (text, nullable) - Ki67 value
    - `conclusion_diagnostica` (text, nullable) - Diagnostic conclusion
    - `generated_by` (uuid, nullable) - User who generated the case
    - `generated_by_display_name` (text, nullable) - Display name of user who generated
    - `generated_at` (timestamptz, nullable) - When the case was generated

  2. Security
    - No changes to RLS policies needed as these are just additional data fields
*/

-- Add new fields to medical_records_clean table
ALTER TABLE medical_records_clean 
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS inmunohistoquimica text,
ADD COLUMN IF NOT EXISTS positivo text,
ADD COLUMN IF NOT EXISTS negativo text,
ADD COLUMN IF NOT EXISTS ki67 text,
ADD COLUMN IF NOT EXISTS conclusion_diagnostica text,
ADD COLUMN IF NOT EXISTS generated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS generated_by_display_name text,
ADD COLUMN IF NOT EXISTS generated_at timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN medical_records_clean.attachment_url IS 'URL or path to uploaded file attachment';
COMMENT ON COLUMN medical_records_clean.inmunohistoquimica IS 'Immunohistochemistry technique description';
COMMENT ON COLUMN medical_records_clean.positivo IS 'Positive antibodies for immunohistochemistry';
COMMENT ON COLUMN medical_records_clean.negativo IS 'Negative antibodies for immunohistochemistry';
COMMENT ON COLUMN medical_records_clean.ki67 IS 'Ki67 proliferation index value';
COMMENT ON COLUMN medical_records_clean.conclusion_diagnostica IS 'Diagnostic conclusion for immunohistochemistry';
COMMENT ON COLUMN medical_records_clean.generated_by IS 'User ID who generated the case';
COMMENT ON COLUMN medical_records_clean.generated_by_display_name IS 'Display name of the user who generated the case';
COMMENT ON COLUMN medical_records_clean.generated_at IS 'When the case was generated';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_generated_by ON medical_records_clean(generated_by);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_attachment_url ON medical_records_clean(attachment_url);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_conclusion_diagnostica ON medical_records_clean(conclusion_diagnostica);