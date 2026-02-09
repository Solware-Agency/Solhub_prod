-- Soft delete para asegurados: activo = true se muestra, activo = false se oculta en listados (datos se mantienen en Supabase)
ALTER TABLE asegurados ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN asegurados.activo IS 'true = visible en listados; false = "eliminado" desde la UI, datos conservados';
