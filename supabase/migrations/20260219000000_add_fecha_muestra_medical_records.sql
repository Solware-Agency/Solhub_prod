-- Añadir columna fecha_muestra a medical_records_clean (Marihorgen)
-- Fecha de la muestra. Solo visible/editable para marihorgen en modal de caso.
ALTER TABLE medical_records_clean
ADD COLUMN IF NOT EXISTS fecha_muestra DATE;

COMMENT ON COLUMN medical_records_clean.fecha_muestra IS
  'Fecha de la muestra. Solo Marihorgen. Editable en modal de caso.';
