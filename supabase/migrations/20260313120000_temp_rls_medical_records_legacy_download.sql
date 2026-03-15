-- =====================================================
-- TEMPORAL: Permitir lectura en medical_records_clean para API legacy de descarga PDF
-- =====================================================
-- Fecha: 2025-03-13
-- Motivo: En producción el front aún usa app.solhub.agency/api/download-pdf (sin JWT).
--         Esa API consulta Supabase con anon key y sin usuario → RLS devuelve 0 filas → error.
-- IMPORTANTE: Esta política DEBE eliminarse el LUNES cuando se despliegue el front
--             que usa la Edge Function download-pdf de Supabase.
-- Ver: docs/RLS_REVERT_LUNES.md
-- =====================================================

CREATE POLICY "TEMP_allow_read_medical_records_legacy_download"
  ON public.medical_records_clean
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON POLICY "TEMP_allow_read_medical_records_legacy_download" ON public.medical_records_clean IS
  'TEMPORAL: Permite que la API legacy /api/download-pdf lea el caso por caseId+token. ELIMINAR el lunes tras deploy del front con Edge Function.';
