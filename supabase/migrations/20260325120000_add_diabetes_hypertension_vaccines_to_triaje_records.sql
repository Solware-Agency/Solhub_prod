-- Migration: Add diabetes, hypertension and vaccines fields to triaje_records
-- Date: 2026-03-25
-- Description: Adds conditional-clinical fields for diabetes and hypertension, plus vaccines text field.

ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS diabetes BOOLEAN;

ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS diabetes_tipo TEXT;

ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS diabetes_controlada BOOLEAN;

ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS diabetes_tratamiento TEXT;

ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS hipertension BOOLEAN;

ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS hipertension_tratamiento TEXT;

ALTER TABLE triaje_records
ADD COLUMN IF NOT EXISTS vacunas TEXT;

COMMENT ON COLUMN triaje_records.diabetes IS 'Indica si el paciente tiene diabetes (si/no).';
COMMENT ON COLUMN triaje_records.diabetes_tipo IS 'Tipo de diabetes en texto libre. Obligatorio cuando diabetes = true.';
COMMENT ON COLUMN triaje_records.diabetes_controlada IS 'Indica si la diabetes esta controlada. Obligatorio cuando diabetes = true.';
COMMENT ON COLUMN triaje_records.diabetes_tratamiento IS 'Tratamiento de diabetes en texto libre. Obligatorio cuando diabetes = true.';
COMMENT ON COLUMN triaje_records.hipertension IS 'Indica si el paciente tiene hipertension (si/no).';
COMMENT ON COLUMN triaje_records.hipertension_tratamiento IS 'Tratamiento de hipertension en texto libre. Obligatorio cuando hipertension = true.';
COMMENT ON COLUMN triaje_records.vacunas IS 'Registro de vacunas en texto libre.';
