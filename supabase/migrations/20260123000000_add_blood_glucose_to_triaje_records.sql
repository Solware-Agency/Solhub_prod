/*
  # Agregar campo blood_glucose (glicemia) a triaje_records

  1. Changes
    - Add `blood_glucose` column to `triaje_records` table (numeric, nullable)
    - Add CHECK constraint for valid values (0-1000 mg/dL)
    - Add comment for documentation
    - Field is optional (not required)

  2. Purpose
    - Store blood glucose (glicemia) measurements in triage records
    - Values in mg/dL (milligrams per deciliter)
    - Normal range: 70-100 mg/dL (fasting), up to 140 mg/dL (postprandial)
    - Allow values up to 1000 mg/dL to accommodate extreme cases

  3. Migration Strategy
    - Existing records will have NULL blood_glucose (backward compatible)
    - New triage records can include blood glucose measurement
    - Field is optional and not required for triage completion
*/

-- Agregar columna blood_glucose a triaje_records
ALTER TABLE triaje_records 
ADD COLUMN IF NOT EXISTS blood_glucose numeric(5,2) NULL;

-- Agregar constraint para validar valores razonables (0-1000 mg/dL)
ALTER TABLE triaje_records
DROP CONSTRAINT IF EXISTS triaje_records_blood_glucose_check;

ALTER TABLE triaje_records
ADD CONSTRAINT triaje_records_blood_glucose_check 
CHECK (
  blood_glucose IS NULL 
  OR (blood_glucose >= 0 AND blood_glucose <= 1000)
);

-- Comentario para documentación
COMMENT ON COLUMN triaje_records.blood_glucose IS 
'Glicemia (glucosa en sangre) medida en mg/dL. Campo opcional. Rango normal: 70-100 mg/dL (ayunas), hasta 140 mg/dL (postprandial). Se permite hasta 1000 mg/dL para casos extremos.';

-- Verificación
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'triaje_records' 
      AND column_name = 'blood_glucose'
  ) THEN
    RAISE EXCEPTION 'Error: La columna blood_glucose no se agregó correctamente a triaje_records';
  END IF;
  
  RAISE NOTICE '✅ Migración completada: Columna blood_glucose agregada a triaje_records';
END $$;
