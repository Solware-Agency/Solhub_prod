/*
  # Add biopsy case fields to medical_records_clean table

  1. New Fields
    - `material_remitido` (text, nullable) - Material sent for analysis
    - `informacion_clinica` (text, nullable) - Clinical information
    - `descripcion_macroscopica` (text, nullable) - Macroscopic description
    - `diagnostico` (text, nullable) - Diagnosis
    - `comentario` (text, nullable) - Additional comments

  2. Purpose
    - These fields are used for biopsy case reports
    - They store the diagnostic information for medical records
    - Enable the functionality for biopsy records
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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_material_remitido ON medical_records_clean(material_remitido);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_diagnostico ON medical_records_clean(diagnostico);