-- Migration: Add parentesco and persona_quien_llama to triaje_records
-- Date: 2026-02-09
-- Description: Adds two new text fields to store relationship information and caller name in medical history records

-- Add parentesco column (relationship to patient)
ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS parentesco TEXT;

-- Add persona_quien_llama column (person who calls/reports)
ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS persona_quien_llama TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN triaje_records.parentesco IS 'Relación del contacto con el paciente (ej: Padre, Madre, Hijo)';
COMMENT ON COLUMN triaje_records.persona_quien_llama IS 'Nombre de la persona que realiza la llamada o reporte';
