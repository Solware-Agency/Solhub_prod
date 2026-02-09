-- Eliminar triggers duplicados en medical_records_clean (1 trigger por función)
-- Ref: Tarea Odoo "Triggers duplicados medical_records"

-- 1. Código: dejar solo trg_set_medical_record_code; quitar trigger_set_medical_record_code
DROP TRIGGER IF EXISTS trigger_set_medical_record_code ON medical_records_clean;

-- 2. doc_aprobado: dejar solo enforce_doc_aprobado_transition_trigger; quitar trg_doc_aprobado_transition
DROP TRIGGER IF EXISTS trg_doc_aprobado_transition ON medical_records_clean;
