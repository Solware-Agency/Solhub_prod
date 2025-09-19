/*
  # Add ims column and immuno_requests table

  1. New Column
    - Add `ims` column to `medical_records_clean` table for storing immunoreactions

  2. New Table
    - `immuno_requests`
      - `id` (uuid, primary key)
      - `case_id` (uuid, references medical_records_clean)
      - `inmunorreacciones` (text, comma-separated immunoreactions)
      - `n_reacciones` (integer, number of reactions)
      - `precio_unitario` (numeric, unit price, default 18.00)
      - `total` (numeric, calculated total)
      - `pagado` (boolean, payment status, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  3. Security
    - Enable RLS on `immuno_requests` table
    - Add policies for authenticated users
    - Add trigger for updated_at timestamp
*/

-- Add 'ims' column to medical_records_clean table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records_clean' AND column_name = 'ims'
  ) THEN
    ALTER TABLE medical_records_clean ADD COLUMN ims text;
  END IF;
END $$;

-- Create immuno_requests table
CREATE TABLE IF NOT EXISTS immuno_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  inmunorreacciones text NOT NULL,
  n_reacciones integer NOT NULL,
  precio_unitario numeric(10,2) NOT NULL DEFAULT 18.00,
  total numeric(10,2) NOT NULL,
  pagado boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'immuno_requests_case_id_fkey'
  ) THEN
    ALTER TABLE immuno_requests 
    ADD CONSTRAINT immuno_requests_case_id_fkey 
    FOREIGN KEY (case_id) REFERENCES medical_records_clean(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE immuno_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for immuno_requests
CREATE POLICY "Authenticated users can read immuno requests"
  ON immuno_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert immuno requests"
  ON immuno_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update immuno requests"
  ON immuno_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Owners can delete immuno requests"
  ON immuno_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Create function to update updated_at timestamp for immuno_requests
CREATE OR REPLACE FUNCTION update_immuno_requests_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_immuno_requests_updated_at
  BEFORE UPDATE ON immuno_requests
  FOR EACH ROW EXECUTE FUNCTION update_immuno_requests_updated_at();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_immuno_requests_case_id ON immuno_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_immuno_requests_pagado ON immuno_requests(pagado);
CREATE INDEX IF NOT EXISTS idx_immuno_requests_created_at ON immuno_requests(created_at DESC);

/*
  # Fix change_logs foreign key constraint for audit trail preservation

  1. Problem
    - change_logs table has ON DELETE CASCADE constraint
    - When medical records are deleted, all related logs are also deleted
    - This breaks the audit trail functionality

  2. Solution
    - Change the foreign key constraint to allow NULL values
    - Remove CASCADE deletion to preserve audit logs
    - Add a separate column to track deleted record information

  3. Changes
    - Modify medical_record_id to allow NULL
    - Add deleted_record_info column for tracking deleted records
    - Update foreign key constraint
*/

-- First, drop the existing foreign key constraint
ALTER TABLE change_logs 
DROP CONSTRAINT IF EXISTS change_logs_medical_record_id_fkey;

-- Make medical_record_id column nullable
ALTER TABLE change_logs 
ALTER COLUMN medical_record_id DROP NOT NULL;

-- Add a new column to store information about deleted records
ALTER TABLE change_logs 
ADD COLUMN IF NOT EXISTS deleted_record_info text;

-- Recreate the foreign key constraint without CASCADE
ALTER TABLE change_logs 
ADD CONSTRAINT change_logs_medical_record_id_fkey 
FOREIGN KEY (medical_record_id) 
REFERENCES medical_records_clean(id) 
ON DELETE SET NULL;

-- Update the function that saves change logs to handle deleted records
CREATE OR REPLACE FUNCTION save_change_log_for_deleted_record(
  p_medical_record_id uuid,
  p_user_id uuid,
  p_user_email text,
  p_deleted_record_info text
) RETURNS void AS $$
BEGIN
  INSERT INTO change_logs (
    medical_record_id,
    user_id,
    user_email,
    field_name,
    field_label,
    old_value,
    new_value,
    deleted_record_info,
    changed_at
  ) VALUES (
    p_medical_record_id,
    p_user_id,
    p_user_email,
    'deleted_record',
    'Registro Eliminado',
    p_deleted_record_info,
    NULL,
    p_deleted_record_info,
    now()
  );
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically save deletion logs
CREATE OR REPLACE FUNCTION log_medical_record_deletion()
RETURNS trigger AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  record_info text;
  existing_log_count integer;
BEGIN
  -- Get current user information
  current_user_id := auth.uid();
  
  -- If no user is authenticated, skip logging
  IF current_user_id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Get user email from profiles table
  SELECT email INTO current_user_email 
  FROM profiles 
  WHERE id = current_user_id;
  
  -- Check if a deletion log already exists for this record
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

-- Create trigger to log deletions
DROP TRIGGER IF EXISTS log_medical_record_deletion_trigger ON medical_records_clean;
CREATE TRIGGER log_medical_record_deletion_trigger
  BEFORE DELETE ON medical_records_clean
  FOR EACH ROW
  EXECUTE FUNCTION log_medical_record_deletion();

-- Update the getAllChangeLogs function to handle NULL medical_record_id
CREATE OR REPLACE FUNCTION get_all_change_logs_with_deleted()
RETURNS TABLE (
  id uuid,
  medical_record_id uuid,
  user_id uuid,
  user_email text,
  field_name text,
  field_label text,
  old_value text,
  new_value text,
  changed_at timestamptz,
  created_at timestamptz,
  deleted_record_info text,
  record_full_name text,
  record_code text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.medical_record_id,
    cl.user_id,
    cl.user_email,
    cl.field_name,
    cl.field_label,
    cl.old_value,
    cl.new_value,
    cl.changed_at,
    cl.created_at,
    cl.deleted_record_info,
    COALESCE(mrc.full_name, cl.deleted_record_info, 'Caso eliminado') as record_full_name,
    COALESCE(mrc.code, 'Sin código') as record_code
  FROM change_logs cl
  LEFT JOIN medical_records_clean mrc ON cl.medical_record_id = mrc.id
  ORDER BY cl.changed_at DESC;
END;
$$ LANGUAGE plpgsql;