/*
  # Add diagnostic fields to medical_records_clean table

  1. New Columns
    - `material_remitido` (text) - Material sent for analysis
    - `informacion_clinica` (text) - Clinical information
    - `descripcion_macroscopica` (text) - Macroscopic description
    - `diagnostico` (text) - Diagnosis
    - `comentario` (text) - Additional comments

  2. Purpose
    - These fields are used for biopsy case reports
    - They store the diagnostic information for medical records
    - Enable the "Generar Caso" functionality for biopsy records
*/

-- Add diagnostic fields to medical_records_clean table
ALTER TABLE medical_records_clean 
ADD COLUMN IF NOT EXISTS material_remitido text,
ADD COLUMN IF NOT EXISTS informacion_clinica text,
ADD COLUMN IF NOT EXISTS descripcion_macroscopica text,
ADD COLUMN IF NOT EXISTS diagnostico text,
ADD COLUMN IF NOT EXISTS comentario text;

-- Add comments to document the fields
COMMENT ON COLUMN medical_records_clean.material_remitido IS 'Material sent for analysis in biopsy cases';
COMMENT ON COLUMN medical_records_clean.informacion_clinica IS 'Clinical information for biopsy cases';
COMMENT ON COLUMN medical_records_clean.descripcion_macroscopica IS 'Macroscopic description of the sample for biopsy cases';
COMMENT ON COLUMN medical_records_clean.diagnostico IS 'Diagnosis for biopsy cases';
COMMENT ON COLUMN medical_records_clean.comentario IS 'Additional comments for biopsy cases';