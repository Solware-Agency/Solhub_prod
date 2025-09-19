/*
  # Add biopsy case generation fields to medical_records_clean table

  1. New Fields
    - `material_remitido` (text) - Material sent for analysis
    - `informacion_clinica` (text) - Clinical information
    - `descripcion_macroscopica` (text) - Macroscopic description
    - `diagnostico` (text) - Diagnosis
    - `comentario` (text) - Additional comments

  2. Changes
    - Add nullable text columns to medical_records_clean table
    - These fields are specific to biopsy exam records
    - No changes to existing schema or data

  3. Notes
    - All fields are optional (nullable)
    - No constraints or validations added
    - Existing RLS policies will apply to these new fields
*/

-- Add biopsy case generation fields to medical_records_clean table
ALTER TABLE medical_records_clean 
ADD COLUMN IF NOT EXISTS material_remitido text,
ADD COLUMN IF NOT EXISTS informacion_clinica text,
ADD COLUMN IF NOT EXISTS descripcion_macroscopica text,
ADD COLUMN IF NOT EXISTS diagnostico text,
ADD COLUMN IF NOT EXISTS comentario text;

-- Add comments to document the columns
COMMENT ON COLUMN medical_records_clean.material_remitido IS 'Material sent for biopsy analysis';
COMMENT ON COLUMN medical_records_clean.informacion_clinica IS 'Clinical information for biopsy cases';
COMMENT ON COLUMN medical_records_clean.descripcion_macroscopica IS 'Macroscopic description of biopsy sample';
COMMENT ON COLUMN medical_records_clean.diagnostico IS 'Diagnosis for biopsy cases';
COMMENT ON COLUMN medical_records_clean.comentario IS 'Additional comments for biopsy cases';