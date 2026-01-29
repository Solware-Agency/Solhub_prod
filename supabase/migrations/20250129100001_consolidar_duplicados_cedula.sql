-- =====================================================
-- CONSOLIDAR DUPLICADOS Y HOMOLOGAR CÉDULAS (prefijo obligatorio)
-- =====================================================
-- 1) CONSOLIDAR: Cuando en un mismo lab hay dos pacientes para el mismo número
--    (uno "16704702" y otro "V-16704702"), se mantiene el que TIENE CASOS,
--    se elimina el que no tiene casos y se pone cedula "V-xxx" al que queda.
-- 2) HOMOLOGAR: A continuación se actualizan TODOS los pacientes que aún
--    tengan cedula solo numérica, añadiendo el prefijo "V-". Así no queda
--    ningún paciente sin prefijo.
--
-- REGLA: En patients e identificaciones no puede haber dos pacientes con la
-- misma cédula en un mismo laboratorio. La cédula debe ser siempre TIPO-NUMERO.
-- =====================================================

DO $$
DECLARE
  r RECORD;
  id_prefixed UUID;
  casos_prefixed BIGINT;
  casos_numeric BIGINT;
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
    -- Id del paciente que tiene la cédula con prefijo (V-xxx)
    SELECT p2.id INTO id_prefixed
    FROM patients p2
    WHERE p2.laboratory_id = r.laboratory_id
      AND p2.cedula = 'V-' || r.cedula_numero
      AND p2.id != r.id_sin_prefijo
    LIMIT 1;

    IF id_prefixed IS NULL THEN
      CONTINUE;
    END IF;

    -- Contar casos médicos de cada uno
    SELECT COUNT(*) INTO casos_prefixed
    FROM medical_records_clean
    WHERE patient_id = id_prefixed;

    SELECT COUNT(*) INTO casos_numeric
    FROM medical_records_clean
    WHERE patient_id = r.id_sin_prefijo;

    IF casos_prefixed > 0 THEN
      -- El que tiene prefijo tiene casos: mantenerlo y fusionar el numérico en él.
      -- Reasignar todos los casos del paciente "solo número" al que tiene prefijo.
      UPDATE medical_records_clean
      SET patient_id = id_prefixed
      WHERE patient_id = r.id_sin_prefijo;

      -- Eliminar identificaciones del numérico (el prefijo ya tiene la suya)
      DELETE FROM identificaciones
      WHERE paciente_id = r.id_sin_prefijo;

      -- Quitar responsabilidades donde el numérico es responsable o dependiente
      -- (el prefijo puede ya tener las suyas; evitar duplicar relaciones)
      DELETE FROM responsabilidades
      WHERE paciente_id_responsable = r.id_sin_prefijo OR paciente_id_dependiente = r.id_sin_prefijo;

      -- Borrar el paciente que solo tenía número (ya sin casos ni relaciones)
      DELETE FROM patients
      WHERE id = r.id_sin_prefijo;

      RAISE NOTICE 'Consolidado (prefijo con casos): lab % cedula % -> mantenido id %, eliminado id %',
        r.laboratory_id, 'V-' || r.cedula_numero, id_prefixed, r.id_sin_prefijo;
      CONTINUE;
    END IF;

    -- El que tiene prefijo NO tiene casos: borrar prefijo y homologar el numérico.
    DELETE FROM identificaciones
    WHERE paciente_id = id_prefixed;

    DELETE FROM responsabilidades
    WHERE paciente_id_responsable = id_prefixed OR paciente_id_dependiente = id_prefixed;

    DELETE FROM patients
    WHERE id = id_prefixed;

    UPDATE patients
    SET cedula = 'V-' || cedula
    WHERE id = r.id_sin_prefijo;

    RAISE NOTICE 'Consolidado (numérico con casos): lab % cedula % -> mantenido id %, eliminado id %',
      r.laboratory_id, 'V-' || r.cedula_numero, r.id_sin_prefijo, id_prefixed;
  END LOOP;
END $$;

-- =====================================================
-- Añadir prefijo a los pacientes que aún tengan cedula solo numérica,
-- SOLO cuando no exista ya otro paciente en el mismo lab con "V-"||cedula
-- (evita duplicate key en pares que la consolidación no pudo tocar)
-- =====================================================
UPDATE patients p1
SET cedula = 'V-' || p1.cedula
WHERE p1.cedula IS NOT NULL
  AND p1.cedula != ''
  AND p1.cedula ~ '^[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM patients p2
    WHERE p2.laboratory_id = p1.laboratory_id
      AND p2.cedula = 'V-' || p1.cedula
      AND p2.id != p1.id
  );
