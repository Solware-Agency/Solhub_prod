/*
  # Cambiar blood_pressure de integer a text para aceptar formato "123/123"

  1. Changes
    - Change `blood_pressure` column type from integer to text
    - Preserve existing data by converting integers to text
    - Remove any existing CHECK constraints on blood_pressure
    - Add comment for documentation

  2. Purpose
    - Allow storing blood pressure in format "systolic/diastolic" (e.g., "120/80")
    - Maintain backward compatibility with existing integer values
    - Support both formats: "123/123" (string) and "123" (number as text)

  3. Migration Strategy
    - Convert existing integer values to text
    - Remove type constraints that only allow integers
    - Allow NULL values (field is optional)
*/

-- Convertir valores existentes de integer a text
UPDATE triaje_records 
SET blood_pressure = blood_pressure::text 
WHERE blood_pressure IS NOT NULL;

-- Cambiar el tipo de la columna de integer a text
ALTER TABLE triaje_records 
ALTER COLUMN blood_pressure TYPE text USING blood_pressure::text;

-- Eliminar constraints existentes que puedan estar validando como integer
ALTER TABLE triaje_records
DROP CONSTRAINT IF EXISTS triaje_records_blood_pressure_check;

-- Comentario para documentación
COMMENT ON COLUMN triaje_records.blood_pressure IS 
'Presión arterial en formato "sistólica/diastólica" (ej: "120/80") o solo número como texto. Campo opcional. Se acepta formato "123/123" o "123".';

-- Verificación
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'triaje_records' 
      AND column_name = 'blood_pressure'
      AND data_type = 'text'
  ) THEN
    RAISE EXCEPTION 'La columna blood_pressure no se cambió correctamente a text';
  END IF;
END $$;
