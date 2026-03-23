-- Denormaliza is_active del paciente en medical_records_clean para:
-- 1) COUNT exacto en una sola tabla (sin JOIN patients en la agregación de PostgREST).
-- 2) Índice parcial (laboratory_id, created_at) solo filas con paciente activo.
--
-- Mantiene consistencia vía triggers al cambiar patients.is_active o medical_records.patient_id.

ALTER TABLE public.medical_records_clean
  ADD COLUMN IF NOT EXISTS patient_is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.medical_records_clean.patient_is_active IS
  'Espejo de patients.is_active para el patient_id del caso; evita JOIN en conteos/listados pesados.';

-- Backfill
UPDATE public.medical_records_clean m
SET patient_is_active = COALESCE(p.is_active, true)
FROM public.patients p
WHERE p.id = m.patient_id;

UPDATE public.medical_records_clean
SET patient_is_active = false
WHERE patient_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id);

CREATE OR REPLACE FUNCTION public.medical_records_set_patient_is_active_biu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.patient_id IS DISTINCT FROM NEW.patient_id) THEN
    IF NEW.patient_id IS NULL THEN
      NEW.patient_is_active := true;
    ELSE
      SELECT COALESCE(p.is_active, true)
      INTO NEW.patient_is_active
      FROM public.patients p
      WHERE p.id = NEW.patient_id;

      IF NOT FOUND THEN
        NEW.patient_is_active := false;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_medical_records_patient_is_active_biu ON public.medical_records_clean;
CREATE TRIGGER tr_medical_records_patient_is_active_biu
  BEFORE INSERT OR UPDATE OF patient_id ON public.medical_records_clean
  FOR EACH ROW
  EXECUTE FUNCTION public.medical_records_set_patient_is_active_biu();

CREATE OR REPLACE FUNCTION public.patients_propagate_is_active_to_medical_cases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    UPDATE public.medical_records_clean
    SET patient_is_active = NEW.is_active
    WHERE patient_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_patients_propagate_is_active_to_cases ON public.patients;
CREATE TRIGGER tr_patients_propagate_is_active_to_cases
  AFTER UPDATE OF is_active ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.patients_propagate_is_active_to_medical_cases();

CREATE INDEX IF NOT EXISTS idx_medical_records_lab_active_created
  ON public.medical_records_clean (laboratory_id, created_at DESC)
  WHERE patient_is_active = true;

ANALYZE public.medical_records_clean;
