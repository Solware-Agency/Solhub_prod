/*
  # Add fields for case generation system

  1. New Columns
    - Add immunohistochemistry-specific fields
    - Add attachment URL field for file uploads
    - Add indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Add appropriate constraints
*/

-- Add new columns for immunohistochemistry cases
DO $$
BEGIN
  -- Add inmunohistoquimica field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'inmunohistoquimica'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN inmunohistoquimica text;
  END IF;

  -- Add positivo field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'positivo'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN positivo text;
  END IF;

  -- Add negativo field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'negativo'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN negativo text;
  END IF;

  -- Add ki67 field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'ki67'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN ki67 text;
  END IF;

  -- Add conclusion_diagnostica field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'conclusion_diagnostica'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN conclusion_diagnostica text;
  END IF;

  -- Add attachment_url field for file uploads
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'attachment_url'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN attachment_url text;
  END IF;
END $$;

-- Add indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_conclusion_diagnostica 
ON medical_records_clean(conclusion_diagnostica);

CREATE INDEX IF NOT EXISTS idx_medical_records_clean_attachment_url 
ON medical_records_clean(attachment_url);

-- Add comments to document the new fields
COMMENT ON COLUMN medical_records_clean.inmunohistoquimica IS 'Immunohistochemistry technique description';
COMMENT ON COLUMN medical_records_clean.positivo IS 'Positive antibodies for immunohistochemistry';
COMMENT ON COLUMN medical_records_clean.negativo IS 'Negative antibodies for immunohistochemistry';
COMMENT ON COLUMN medical_records_clean.ki67 IS 'Ki67 value for immunohistochemistry';
COMMENT ON COLUMN medical_records_clean.conclusion_diagnostica IS 'Diagnostic conclusion for immunohistochemistry cases';
COMMENT ON COLUMN medical_records_clean.attachment_url IS 'URL or path to uploaded file attachment';