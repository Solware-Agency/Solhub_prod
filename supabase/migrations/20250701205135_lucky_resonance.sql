/*
  # Add biopsy case fields to medical_records_clean table

  1. New Fields
    - `material_remitido` (text, nullable) - Material sent for biopsy analysis
    - `informacion_clinica` (text, nullable) - Clinical information for biopsy cases
    - `descripcion_macroscopica` (text, nullable) - Macroscopic description of biopsy sample
    - `diagnostico` (text, nullable) - Diagnosis for biopsy cases
    - `comentario` (text, nullable) - Additional comments for biopsy cases

  2. Notes
    - These fields are specifically for biopsy type records
    - All fields are nullable to maintain compatibility with existing records
    - The fields are used to generate biopsy case reports
*/

-- Add biopsy case fields to medical_records_clean table
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