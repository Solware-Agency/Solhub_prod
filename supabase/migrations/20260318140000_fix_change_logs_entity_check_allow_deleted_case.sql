-- Fix: al eliminar un caso, la FK change_logs.medical_record_id usa ON DELETE SET NULL.
-- El check change_logs_entity_check exigía al menos un ID no nulo, por eso fallaba al poner
-- medical_record_id = NULL en filas que solo tenían ese ID (entity_type = 'medical_case').
-- Solución: permitir que entity_type = 'medical_case' tenga medical_record_id NULL
-- (se conserva el historial del caso ya eliminado).

ALTER TABLE public.change_logs DROP CONSTRAINT IF EXISTS change_logs_entity_check;

ALTER TABLE public.change_logs
  ADD CONSTRAINT change_logs_entity_check CHECK (
    medical_record_id IS NOT NULL
    OR patient_id IS NOT NULL
    OR poliza_id IS NOT NULL
    OR asegurado_id IS NOT NULL
    OR aseguradora_id IS NOT NULL
    OR pago_poliza_id IS NOT NULL
    OR entity_type = 'profile'
    OR entity_type = 'medical_case'
  );

COMMENT ON CONSTRAINT change_logs_entity_check ON public.change_logs IS
  'Al menos una entidad referenciada o entity_type profile/medical_case. medical_case permite medical_record_id NULL para logs de casos eliminados (ON DELETE SET NULL).';
