-- =====================================================
-- Eliminar datos dummy del laboratorio SPT
-- Lab ID: f9c73ea1-faeb-4f09-85fd-b5a6f37f34c8
-- Criterios (casos):
--   1. Casos con comentario (comments) que contenga "prueba"
--   2. Casos cuyo paciente tenga nombre/apellido "prueba" o "dummy"
--   3. Casos con médico tratante "dr dummy" o que contenga "dummy"
-- Además: se eliminan pacientes dummy (nombre con "prueba" o "dummy") sin casos restantes.
-- =====================================================

DO $$
DECLARE
  lab_id uuid := 'f9c73ea1-faeb-4f09-85fd-b5a6f37f34c8';
  ids_to_delete uuid[];
  n_triaje integer;
  n_cases integer;
BEGIN
  -- Obtener IDs de casos que cumplen criterios dummy (solo del lab indicado)
  SELECT array_agg(mrc.id)
  INTO ids_to_delete
  FROM medical_records_clean mrc
  LEFT JOIN patients p ON p.id = mrc.patient_id
  WHERE mrc.laboratory_id = lab_id
    AND (
      (mrc.comments IS NOT NULL AND LOWER(mrc.comments) LIKE '%prueba%')
      OR (p.nombre IS NOT NULL AND (LOWER(p.nombre) LIKE '%prueba%' OR LOWER(p.nombre) LIKE '%dummy%'))
      OR (mrc.treating_doctor IS NOT NULL AND LOWER(mrc.treating_doctor) LIKE '%dummy%')
    );

  -- Si no hay registros, salir
  IF ids_to_delete IS NULL OR array_length(ids_to_delete, 1) IS NULL THEN
    RAISE NOTICE 'No se encontraron casos dummy para eliminar en el lab %.', lab_id;
    RETURN;
  END IF;

  -- Eliminar triaje_records asociados a esos casos
  DELETE FROM triaje_records
  WHERE case_id = ANY(ids_to_delete);
  GET DIAGNOSTICS n_triaje = ROW_COUNT;

  -- Eliminar los casos (medical_records_clean)
  -- change_logs.medical_record_id se pondrá NULL por ON DELETE SET NULL
  -- immuno_requests se eliminan por ON DELETE CASCADE si existen
  DELETE FROM medical_records_clean
  WHERE id = ANY(ids_to_delete);
  GET DIAGNOSTICS n_cases = ROW_COUNT;

  RAISE NOTICE 'Eliminados: % registros de triaje, % casos médicos (dummy).', n_triaje, n_cases;
END $$;

-- Eliminar pacientes dummy (nombre contiene "prueba" o "dummy") que ya no tienen casos
DO $$
DECLARE
  lab_id uuid := 'f9c73ea1-faeb-4f09-85fd-b5a6f37f34c8';
  n_patients integer;
BEGIN
  DELETE FROM patients p
  WHERE p.laboratory_id = lab_id
    AND (LOWER(p.nombre) LIKE '%prueba%' OR LOWER(p.nombre) LIKE '%dummy%')
    AND NOT EXISTS (SELECT 1 FROM medical_records_clean mrc WHERE mrc.patient_id = p.id);
  GET DIAGNOSTICS n_patients = ROW_COUNT;
  RAISE NOTICE 'Eliminados: % pacientes dummy (sin casos restantes).', n_patients;
END $$;
