-- =====================================================
-- Migración: Agregar columna consulta a medical_records_clean
-- Fecha: 2025-01-27
-- Descripción: Agrega campo consulta (especialidad médica) 
--               para el laboratorio SPT
-- =====================================================

-- Agregar columna consulta (nullable, solo para lab SPT)
ALTER TABLE medical_records_clean
ADD COLUMN consulta text;

-- Agregar comentario para documentación
COMMENT ON COLUMN medical_records_clean.consulta IS 
  'Especialidad médica de consulta. Solo requerido para laboratorio SPT.';

