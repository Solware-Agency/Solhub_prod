-- =====================================================
-- FUSIONAR DUPLICADOS: casos del paciente sin prefijo al con prefijo
-- =====================================================
-- Para pares (cedula "5013721" y "V-5013721" en el mismo lab): misma persona,
-- nombre escrito al revés. Se mantiene el paciente con prefijo (V-5013721),
-- se reasignan TODOS los casos del paciente sin prefijo a él y se elimina
-- el duplicado sin prefijo.
--
-- Ejecutar si la consolidación 20250129100001 se corrió antes de tener
-- la lógica "prefijo con casos", o como refuerzo para ese caso.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  id_prefixed UUID;
BEGIN
  FOR r IN
    SELECT
      p1.id AS id_sin_prefijo,
      p1.cedula AS cedula_numero,
      p1.laboratory_id AS laboratory_id
    FROM patients p1
    WHERE p1.cedula IS NOT NULL
      AND p1.cedula ~ '^[0-9]+$'
      AND EXISTS (
        SELECT 1 FROM patients p2
        WHERE p2.laboratory_id = p1.laboratory_id
          AND p2.cedula = 'V-' || p1.cedula
          AND p2.id != p1.id
      )
  LOOP
    SELECT p2.id INTO id_prefixed
    FROM patients p2
    WHERE p2.laboratory_id = r.laboratory_id
      AND p2.cedula = 'V-' || r.cedula_numero
      AND p2.id != r.id_sin_prefijo
    LIMIT 1;

    IF id_prefixed IS NULL THEN
      CONTINUE;
    END IF;

    -- Reasignar todos los casos del paciente sin prefijo al con prefijo
    UPDATE medical_records_clean
    SET patient_id = id_prefixed
    WHERE patient_id = r.id_sin_prefijo;

    DELETE FROM identificaciones
    WHERE paciente_id = r.id_sin_prefijo;

    DELETE FROM responsabilidades
    WHERE paciente_id_responsable = r.id_sin_prefijo OR paciente_id_dependiente = r.id_sin_prefijo;

    DELETE FROM patients
    WHERE id = r.id_sin_prefijo;

    RAISE NOTICE 'Fusionado: cedula % lab % -> casos al paciente V-%; eliminado id %',
      r.cedula_numero, r.laboratory_id, r.cedula_numero, r.id_sin_prefijo;
  END LOOP;
END $$;
