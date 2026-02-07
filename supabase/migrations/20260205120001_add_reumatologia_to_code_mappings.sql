-- =====================================================
-- Migración: Añadir Reumatología a codeMappings
-- Fecha: 2026-02-05
-- Descripción: Agrega el mapeo "Reumatología" -> "RE" a los laboratorios
--              que usan codeMappings (ej. SPT) para evitar el error
--              "No se encontró mapeo para tipo de examen: Reumatología"
-- =====================================================

-- Añadir Reumatología al codeMappings de todos los laboratorios que tengan codeMappings
UPDATE laboratories
SET config = jsonb_set(
  config,
  '{codeMappings}',
  COALESCE(config->'codeMappings', '{}'::jsonb) || '{"Reumatología": "RE"}'::jsonb
)
WHERE config ? 'codeMappings'
   OR (config->'codeMappings') IS NOT NULL;
