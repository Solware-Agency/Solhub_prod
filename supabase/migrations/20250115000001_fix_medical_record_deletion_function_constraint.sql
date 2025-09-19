-- Fix the log_medical_record_deletion function to comply with change_logs_entity_check constraint
-- The constraint requires either medical_record_id OR patient_id to be NOT NULL
-- Since we're deleting the medical record, we need to use patient_id

CREATE OR REPLACE FUNCTION public.log_medical_record_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_user_id uuid;
  current_user_email text;
  current_user_display_name text;
  record_info text;
  existing_log_count integer;
BEGIN
  -- Get current user information
  current_user_id := auth.uid();
  
  -- If no user is authenticated, skip logging
  IF current_user_id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Get user email and display name from profiles table
  SELECT email, display_name INTO current_user_email, current_user_display_name
  FROM profiles 
  WHERE id = current_user_id;
  
  -- Check if a deletion log already exists for this record (avoid duplicates)
  SELECT COUNT(*) INTO existing_log_count
  FROM change_logs 
  WHERE patient_id = OLD.patient_id 
    AND field_name = 'deleted_record'
    AND changed_at > now() - interval '1 second';
  
  -- If a deletion log already exists in the last second, skip
  IF existing_log_count > 0 THEN
    RETURN OLD;
  END IF;
  
  -- Create record info string using available fields
  record_info := COALESCE(OLD.code, 'Sin código') || ' - ' || COALESCE(OLD.exam_type, 'Sin tipo de examen');
  
  -- Save the deletion log using patient_id (required by constraint)
  -- Note: We use patient_id instead of medical_record_id since the record is being deleted
  INSERT INTO change_logs (
    patient_id,
    user_id,
    user_email,
    user_display_name,
    field_name,
    field_label,
    old_value,
    new_value,
    deleted_record_info,
    changed_at,
    entity_type
  ) VALUES (
    OLD.patient_id,
    current_user_id,
    COALESCE(current_user_email, 'unknown@email.com'),
    current_user_display_name,
    'deleted_record',
    'Registro Eliminado',
    record_info,
    NULL,
    record_info,
    now(),
    'medical_case'
  );
  
  RETURN OLD;
END;
$function$;
