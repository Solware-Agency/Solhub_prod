-- =====================================================
-- Consistencia identificaciones ↔ patients.cedula
-- =====================================================
-- Evita vincular (tipo, numero) a un paciente que tiene
-- otra cédula en su ficha (patients.cedula).
-- Regla: si patients.cedula no es null/vacío, debe coincidir
-- con tipo_documento || '-' || numero (comparación normalizada).
-- =====================================================

CREATE OR REPLACE FUNCTION check_identificacion_patient_cedula_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  p_cedula TEXT;
  expected_cedula TEXT;
BEGIN
  -- Solo validar para tipos de documento que se almacenan en patients.cedula (V, E, J, C)
  IF NEW.tipo_documento NOT IN ('V', 'E', 'J', 'C') THEN
    RETURN NEW;
  END IF;

  SELECT cedula INTO p_cedula
  FROM patients
  WHERE id = NEW.paciente_id
  LIMIT 1;

  -- Si el paciente no tiene cédula en su ficha, permitir cualquier (tipo, numero)
  IF p_cedula IS NULL OR trim(p_cedula) = '' OR trim(p_cedula) = 'S/C' THEN
    RETURN NEW;
  END IF;

  expected_cedula := trim(NEW.tipo_documento) || '-' || trim(NEW.numero);

  -- Comparación case-insensitive para evitar rechazar por mayúsculas/minúsculas
  IF lower(trim(p_cedula)) != lower(expected_cedula) THEN
    RAISE EXCEPTION
      'identificaciones_cedula_mismatch: No se puede vincular la identificación % al paciente. En su ficha (patients) la cédula es "%". Debe coincidir con tipo y número (%). Edite primero la cédula del paciente o asocie esta identificación al paciente correcto.',
      NEW.id,
      p_cedula,
      expected_cedula;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_identificacion_patient_cedula_consistency() IS
  'Trigger: asegura que (tipo_documento, numero) en identificaciones coincida con patients.cedula del paciente vinculado. Evita confusión entre personas.';

DROP TRIGGER IF EXISTS trigger_check_identificacion_patient_cedula ON identificaciones;

CREATE TRIGGER trigger_check_identificacion_patient_cedula
  BEFORE INSERT OR UPDATE OF paciente_id, tipo_documento, numero
  ON identificaciones
  FOR EACH ROW
  EXECUTE FUNCTION check_identificacion_patient_cedula_consistency();
