/*
  # Fix audit_logs foreign key constraint to allow user deletion

  1. Changes
    - Update audit_logs_changed_by_fkey to use ON DELETE SET NULL
    - This allows deleting users while preserving audit trail
    - The changed_by column is nullable, so this is safe
*/

-- Drop the existing constraint
ALTER TABLE audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_changed_by_fkey;

-- Recreate the constraint with ON DELETE SET NULL
ALTER TABLE audit_logs 
ADD CONSTRAINT audit_logs_changed_by_fkey 
FOREIGN KEY (changed_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Add comment
COMMENT ON CONSTRAINT audit_logs_changed_by_fkey ON audit_logs IS 
'Foreign key to auth.users. When a user is deleted, changed_by is set to NULL to preserve audit trail.';
