-- Soft delete para pólizas: activo = true se muestra, activo = false se oculta en listados (datos se conservan en Supabase)
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN polizas.activo IS 'true = visible en listados; false = "eliminada" desde la UI, datos conservados';
