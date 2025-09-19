/*
  # Add biopsy case columns to medical_records_clean table

  1. New Columns
    - `material_remitido` (text) - Description of submitted material for biopsy cases
    - `informacion_clinica` (text) - Clinical information for biopsy cases  
    - `descripcion_macroscopica` (text) - Macroscopic description for biopsy cases
    - `diagnostico` (text) - Diagnosis for biopsy cases
    - `comentario` (text) - Additional comments for biopsy cases

  2. Changes
    - All new columns are nullable to maintain compatibility with existing records
    - These columns are specifically for biopsy cases but can be used by other exam types if needed

  3. Notes
    - This migration adds support for the biopsy case generation functionality
    - Existing records will have NULL values for these new columns
    - The application will handle NULL values appropriately
*/

-- Add biopsy-related columns to medical_records_clean table
DO $$
BEGIN
  -- Add material_remitido column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'material_remitido'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN material_remitido text;
  END IF;

  -- Add informacion_clinica column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'informacion_clinica'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN informacion_clinica text;
  END IF;

  -- Add descripcion_macroscopica column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'descripcion_macroscopica'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN descripcion_macroscopica text;
  END IF;

  -- Add diagnostico column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'diagnostico'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN diagnostico text;
  END IF;

  -- Add comentario column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'comentario'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN comentario text;
  END IF;
END $$;

-- Add indexes for better query performance on the new columns
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_material_remitido ON medical_records_clean USING btree (material_remitido);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_diagnostico ON medical_records_clean USING btree (diagnostico);