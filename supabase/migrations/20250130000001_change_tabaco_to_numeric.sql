-- Migration: Cambiar columna tabaco de ENUM a NUMERIC para almacenar índice tabáquico
-- Description: Convierte la columna tabaco de habit_level a numeric(6,2) para guardar
--              el índice tabáquico calculado (paquetes-año)

-- 1. Crear columna temporal para el índice tabáquico
ALTER TABLE triaje_records 
ADD COLUMN IF NOT EXISTS tabaco_numeric NUMERIC(6,2);

-- 2. Migrar datos existentes (mapear valores cualitativos a números aproximados)
-- Esto es opcional, puedes dejarlo en NULL si prefieres empezar de cero
UPDATE triaje_records
SET tabaco_numeric = CASE 
  WHEN tabaco::text = 'muy alta' THEN 45.0
  WHEN tabaco::text = 'alta' THEN 35.0
  WHEN tabaco::text = 'media' THEN 25.0
  WHEN tabaco::text = 'baja' THEN 15.0
  WHEN tabaco::text = 'muy baja' THEN 5.0
  WHEN tabaco::text = 'No' THEN 0.0
  ELSE NULL
END
WHERE tabaco IS NOT NULL;

-- 3. Eliminar la columna vieja de tipo ENUM
ALTER TABLE triaje_records DROP COLUMN tabaco;

-- 4. Renombrar la columna nueva
ALTER TABLE triaje_records RENAME COLUMN tabaco_numeric TO tabaco;

-- 5. Agregar comentario
COMMENT ON COLUMN triaje_records.tabaco IS 'Índice tabáquico (paquetes-año): (Cigarrillos/día × Años fumando) / 20';

-- 6. Agregar constraint para validar valores positivos
ALTER TABLE triaje_records 
ADD CONSTRAINT check_tabaco_positive 
CHECK (tabaco IS NULL OR tabaco >= 0);

-- 7. Agregar índice para consultas de estadísticas
CREATE INDEX IF NOT EXISTS idx_triaje_records_tabaco 
ON triaje_records(tabaco) 
WHERE tabaco IS NOT NULL;
