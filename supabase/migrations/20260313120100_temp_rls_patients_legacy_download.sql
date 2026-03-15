-- =====================================================
-- TEMPORAL: Permitir lectura en patients para API legacy de descarga PDF (join)
-- =====================================================
-- Fecha: 2025-03-13
-- Motivo: La API legacy hace .select("..., patients(nombre)"). Sin política para anon en
--         patients, el join devuelve 0 filas → "Cannot coerce to single JSON object".
-- IMPORTANTE: Eliminar el LUNES junto con TEMP_allow_read_medical_records_legacy_download.
-- Ver: docs/RLS_REVERT_LUNES.md
-- =====================================================

CREATE POLICY "TEMP_allow_read_patients_legacy_download"
  ON public.patients
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON POLICY "TEMP_allow_read_patients_legacy_download" ON public.patients IS
  'TEMPORAL: Permite join patients en consulta de API legacy download-pdf. ELIMINAR el lunes.';
