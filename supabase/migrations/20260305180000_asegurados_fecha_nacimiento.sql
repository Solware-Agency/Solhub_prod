-- Añadir fecha de nacimiento opcional a asegurados (para registro de nuevo asegurado)
ALTER TABLE asegurados ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

COMMENT ON COLUMN asegurados.fecha_nacimiento IS 'Fecha de nacimiento del asegurado (opcional). No debe ser futura.';

-- Restricción: fecha no futura
ALTER TABLE asegurados DROP CONSTRAINT IF EXISTS asegurados_fecha_nacimiento_check;
ALTER TABLE asegurados ADD CONSTRAINT asegurados_fecha_nacimiento_check
  CHECK (fecha_nacimiento IS NULL OR fecha_nacimiento <= CURRENT_DATE);
