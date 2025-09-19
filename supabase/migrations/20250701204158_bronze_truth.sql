/*
  # Add biopsy case fields to medical_records_clean table

  1. New Fields
    - `material_remitido` (text, nullable)
    - `informacion_clinica` (text, nullable)
    - `descripcion_macroscopica` (text, nullable)
    - `diagnostico` (text, nullable)
    - `comentario` (text, nullable)

  2. Notes
    - These fields are used for biopsy case generation
    - Only applicable to records with exam_type = 'biopsia'
    - All fields are optional in the database schema but required in the application
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