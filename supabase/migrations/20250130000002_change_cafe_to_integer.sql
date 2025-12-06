-- Migration: Cambiar columna cafe de ENUM a INTEGER
-- Description: Convierte la columna cafe de habit_level a integer para guardar
--              el número de tazas de café consumidas por día

-- 1. Crear columna temporal para tazas de café
ALTER TABLE triaje_records 
ADD COLUMN IF NOT EXISTS cafe_numeric INTEGER;

-- 2. Migrar datos existentes (mapear valores cualitativos a números aproximados)
-- Esto es opcional, puedes dejarlo en NULL si prefieres empezar de cero
UPDATE triaje_records
SET cafe_numeric = CASE 
  WHEN cafe::text = 'muy alta' THEN 6
  WHEN cafe::text = 'alta' THEN 5
  WHEN cafe::text = 'media' THEN 3
  WHEN cafe::text = 'baja' THEN 2
  WHEN cafe::text = 'muy baja' THEN 1
  WHEN cafe::text = 'No' THEN 0
  ELSE NULL
END
WHERE cafe IS NOT NULL;

-- 3. Eliminar la columna vieja de tipo ENUM
ALTER TABLE triaje_records DROP COLUMN cafe;

-- 4. Renombrar la columna nueva
ALTER TABLE triaje_records RENAME COLUMN cafe_numeric TO cafe;

-- 5. Agregar comentario
COMMENT ON COLUMN triaje_records.cafe IS 'Número de tazas de café consumidas por día';

-- 6. Agregar constraint para validar valores positivos
ALTER TABLE triaje_records 
ADD CONSTRAINT check_cafe_positive 
CHECK (cafe IS NULL OR cafe >= 0);

-- 7. Agregar índice para consultas de estadísticas
CREATE INDEX IF NOT EXISTS idx_triaje_records_cafe 
ON triaje_records(cafe) 
WHERE cafe IS NOT NULL;
