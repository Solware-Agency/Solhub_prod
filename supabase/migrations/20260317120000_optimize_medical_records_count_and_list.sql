-- =====================================================================
-- Optimización: statement timeout en listado de casos (medical_records_clean)
-- =====================================================================
-- Mejora el rendimiento del COUNT y del SELECT paginado que usa PostgREST
-- cuando la página de casos hace getCasesWithPatientInfo con count: 'exact'.
--
-- Causa del timeout: la consulta hace
--   - SELECT ... FROM medical_records_clean ... JOIN patients ... LIMIT/OFFSET
--   - COUNT(*) sobre el mismo conjunto (mismo JOIN + filtros)
-- Con muchos registros por laboratorio, el COUNT y el ordenamiento se vuelven lentos.
--
-- Índices que se añaden/aseguran:
-- 1) (laboratory_id, patient_id) → acelera el JOIN con patients en el COUNT.
-- 2) (laboratory_id, created_at DESC) → ya existe; se documenta.
-- 3) Índices adicionales para filtros frecuentes (si no existen).
-- =====================================================================

-- Índice compuesto para la consulta típica: filtro por lab + JOIN con patients
-- Usado por: listado de casos (WHERE laboratory_id = ? AND patients.is_active = true)
-- Nota: idx_medical_records_lab_created ya existe en 20251024000001 para (laboratory_id, created_at).
CREATE INDEX IF NOT EXISTS idx_medical_records_lab_patient_id
  ON public.medical_records_clean (laboratory_id, patient_id);

-- Índice para filtro por branch (muy usado en la UI)
CREATE INDEX IF NOT EXISTS idx_medical_records_lab_branch
  ON public.medical_records_clean (laboratory_id, branch);

-- Actualizar estadísticas para que el planificador use los nuevos índices
ANALYZE public.medical_records_clean;
ANALYZE public.patients;

COMMENT ON INDEX idx_medical_records_lab_patient_id IS
  'Optimiza listado y COUNT de casos: filtro por laboratory_id y JOIN con patients (is_active)';
COMMENT ON INDEX idx_medical_records_lab_branch IS
  'Optimiza filtro por sede (branch) dentro de un laboratorio';
