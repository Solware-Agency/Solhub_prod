/*
  # Triggers para actualización automática de estado_spt

  1. Changes
    - Create trigger function to set estado_spt = 'pendiente_triaje' when case is created in SPT
    - Create trigger function to set estado_spt = 'esperando_consulta' when triage is created
    - Create trigger function to set estado_spt = 'finalizado' when report is generated/sent

  2. Purpose
    - Automatically manage estado_spt workflow without manual intervention
    - Only applies to SPT laboratory (slug = 'spt')
    - Maintains data consistency automatically

  3. Triggers
    - BEFORE INSERT on medical_records_clean: Set to 'pendiente_triaje' for SPT
    - AFTER INSERT on triaje_records: Update case to 'esperando_consulta' if case_id exists
    - AFTER UPDATE on medical_records_clean: Set to 'finalizado' when informe_qr is set or email_sent = true
*/

-- =====================================================
-- 1. FUNCIÓN: Establecer estado inicial al crear caso
-- =====================================================
CREATE OR REPLACE FUNCTION set_estado_spt_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  lab_slug text;
BEGIN
  -- Obtener slug del laboratorio
  SELECT slug INTO lab_slug
  FROM laboratories
  WHERE id = NEW.laboratory_id;

  -- Solo para SPT, establecer estado inicial
  IF lab_slug = 'spt' AND NEW.estado_spt IS NULL THEN
    NEW.estado_spt := 'pendiente_triaje';
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trigger_set_estado_spt_on_insert ON medical_records_clean;
CREATE TRIGGER trigger_set_estado_spt_on_insert
  BEFORE INSERT ON medical_records_clean
  FOR EACH ROW
  EXECUTE FUNCTION set_estado_spt_on_insert();

-- =====================================================
-- 2. FUNCIÓN: Actualizar estado cuando se crea triaje
-- =====================================================
CREATE OR REPLACE FUNCTION update_estado_spt_on_triage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  lab_slug text;
BEGIN
  -- Solo procesar si hay case_id
  IF NEW.case_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener slug del laboratorio
  SELECT slug INTO lab_slug
  FROM laboratories
  WHERE id = NEW.laboratory_id;

  -- Solo para SPT, actualizar estado del caso
  IF lab_slug = 'spt' THEN
    UPDATE medical_records_clean
    SET estado_spt = 'esperando_consulta',
        updated_at = now()
    WHERE id = NEW.case_id
      AND estado_spt = 'pendiente_triaje'; -- Solo actualizar si está pendiente
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger AFTER INSERT en triaje_records
DROP TRIGGER IF EXISTS trigger_update_estado_spt_on_triage ON triaje_records;
CREATE TRIGGER trigger_update_estado_spt_on_triage
  AFTER INSERT ON triaje_records
  FOR EACH ROW
  EXECUTE FUNCTION update_estado_spt_on_triage();

-- =====================================================
-- 3. FUNCIÓN: Actualizar estado cuando se genera/envía informe
-- =====================================================
CREATE OR REPLACE FUNCTION update_estado_spt_on_report()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  lab_slug text;
BEGIN
  -- Obtener slug del laboratorio
  SELECT slug INTO lab_slug
  FROM laboratories
  WHERE id = NEW.laboratory_id;

  -- Solo para SPT
  IF lab_slug = 'spt' THEN
    -- Si se generó informe (informe_qr tiene contenido) o se envió email
    IF (
      (NEW.informe_qr IS NOT NULL AND NEW.informe_qr != '' AND (OLD.informe_qr IS NULL OR OLD.informe_qr = ''))
      OR (NEW.email_sent = true AND (OLD.email_sent = false OR OLD.email_sent IS NULL))
    ) THEN
      -- Solo actualizar si no está ya finalizado
      IF NEW.estado_spt != 'finalizado' THEN
        NEW.estado_spt := 'finalizado';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger BEFORE UPDATE en medical_records_clean
DROP TRIGGER IF EXISTS trigger_update_estado_spt_on_report ON medical_records_clean;
CREATE TRIGGER trigger_update_estado_spt_on_report
  BEFORE UPDATE ON medical_records_clean
  FOR EACH ROW
  WHEN (
    (NEW.informe_qr IS DISTINCT FROM OLD.informe_qr)
    OR (NEW.email_sent IS DISTINCT FROM OLD.email_sent)
  )
  EXECUTE FUNCTION update_estado_spt_on_report();

-- Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_set_estado_spt_on_insert'
  ) AND EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_estado_spt_on_triage'
  ) AND EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_estado_spt_on_report'
  ) THEN
    RAISE NOTICE '✅ Triggers de estado_spt creados exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudieron crear todos los triggers';
  END IF;
END $$;
