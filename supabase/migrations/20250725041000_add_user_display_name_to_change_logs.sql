/*
  # Add user_display_name to change_logs and update deletion log function

  1. Changes
    - Add column user_display_name to change_logs
    - Update log_medical_record_deletion() to store user_display_name
    - Keep backward compatibility (no breaking changes to policies)
*/

-- Add the new column to store the user's display name
ALTER TABLE change_logs 
ADD COLUMN IF NOT EXISTS user_display_name text;

-- Update the deletion trigger function to also capture display name
CREATE OR REPLACE FUNCTION log_medical_record_deletion()
RETURNS trigger AS $$
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
  WHERE medical_record_id = OLD.id 
    AND field_name = 'deleted_record'
    AND changed_at > now() - interval '1 second';
  
  -- If a deletion log already exists in the last second, skip
  IF existing_log_count > 0 THEN
    RETURN OLD;
  END IF;
  
  -- Create record info string
  record_info := COALESCE(OLD.code, 'Sin código') || ' - ' || COALESCE(OLD.full_name, 'Sin nombre');
  
  -- Save the deletion log
  INSERT INTO change_logs (
    medical_record_id,
    user_id,
    user_email,
    user_display_name,
    field_name,
    field_label,
    old_value,
    new_value,
    deleted_record_info,
    changed_at
  ) VALUES (
    OLD.id,
    current_user_id,
    COALESCE(current_user_email, 'unknown@email.com'),
    current_user_display_name,
    'deleted_record',
    'Registro Eliminado',
    record_info,
    NULL,
    record_info,
    now()
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


