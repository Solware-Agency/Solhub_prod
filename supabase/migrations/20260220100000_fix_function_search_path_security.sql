-- Fix security advisor: Function Search Path Mutable (0011)
-- Set search_path on all public functions that don't have it to prevent search_path injection.
-- Uses public, auth so functions that reference auth.uid() etc. keep working.

DO $$
DECLARE
  r RECORD;
  func_names text[] := ARRAY[
    'validate_images_urls', 'fix_signature_mimetype', 'set_estado_spt_on_insert', 'parse_cedula',
    'audit_trigger_function', 'search_identifications_optimized', 'update_estado_spt_on_triage',
    'update_estado_spt_on_report', 'search_patients_optimized', 'is_authenticated_superadmin',
    'calculate_bmi', 'check_user_approved', 'calculate_age_from_fecha_nacimiento',
    'search_medical_cases_optimized', 'format_patient_names', 'format_medical_record_names',
    'format_name', 'parse_cedula_for_migration', 'get_user_role', 'sync_display_name_to_profile',
    'handle_new_user', 'get_exam_type_number', 'get_user_laboratory_id', 'set_email_lower',
    'save_change_log_for_deleted_record', 'sync_new_field_to_all_labs', 'sync_new_feature_to_laboratories',
    'sync_new_fields_on_module_update', 'update_feature_catalog_updated_at', 'update_laboratories_updated_at',
    'update_triage_records_updated_at', 'update_updated_at_column', 'update_immuno_requests_updated_at',
    'update_change_logs_updated_at', 'actualizar_pdf_en_ready_medical_trigger', 'actualizar_pdf_en_ready_medical',
    'apply_module_config_on_lab_insert', 'get_all_change_logs_with_deleted', 'get_exam_code_from_mapping',
    'build_module_config_from_structure', 'log_medical_record_deletion', 'remove_field_from_all_labs',
    'validate_feature_exists', 'set_default_laboratory_values', 'sync_display_name_to_auth',
    'sync_missing_module_configs', 'sync_missing_profiles', 'sync_module_config_on_feature_enable',
    'test_multitenant_isolation', 'validate_laboratory_id', 'reset_waiting_room_at_midnight',
    'set_asegurados_codigo', 'set_aseguradoras_codigo', 'set_polizas_codigo'
  ];
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, p.proname AS func_name, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = ANY(func_names)
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, auth', r.schema_name, r.func_name, r.args);
  END LOOP;
END $$;
