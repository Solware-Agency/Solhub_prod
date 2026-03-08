-- Migration: Add alergias and observaciones to triaje_records
-- Date: 2026-03-04
-- Description: Adds two optional text fields for allergies and additional observations/comments in triage records

ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS alergias TEXT;

ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS observaciones TEXT;

COMMENT ON COLUMN triaje_records.alergias IS 'Alergias conocidas del paciente. Campo opcional.';
COMMENT ON COLUMN triaje_records.observaciones IS 'Observaciones o comentarios adicionales del triaje. Campo opcional.';
