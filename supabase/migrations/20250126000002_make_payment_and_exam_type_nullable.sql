-- =====================================================
-- Migración: Hacer campos de pago y exam_type NULL permitido
-- Fecha: 2025-01-26
-- Descripción: Permite que laboratorios sin módulo de pagos 
--               tengan NULL en campos de pago y exam_type
-- =====================================================

-- 1. Hacer total_amount NULL permitido
-- Primero eliminamos el CHECK constraint existente
ALTER TABLE medical_records_clean
DROP CONSTRAINT IF EXISTS medical_records_clean_total_amount_check;

-- Luego hacemos la columna NULL permitido
ALTER TABLE medical_records_clean
ALTER COLUMN total_amount DROP NOT NULL;

-- Agregar nuevo CHECK constraint que permite NULL o valores > 0
ALTER TABLE medical_records_clean
ADD CONSTRAINT medical_records_clean_total_amount_check 
CHECK (total_amount IS NULL OR total_amount > 0);

-- 2. Hacer exam_type NULL permitido
ALTER TABLE medical_records_clean
ALTER COLUMN exam_type DROP NOT NULL;

-- 3. Agregar comentarios para documentación
COMMENT ON COLUMN medical_records_clean.total_amount IS 
  'Monto total del caso. NULL si el laboratorio no usa módulo de pagos.';

COMMENT ON COLUMN medical_records_clean.exam_type IS 
  'Tipo de examen. NULL permitido. Debe estar en config.examTypes del laboratorio.';



