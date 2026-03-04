/*
  Fix triaje_records.created_by FK so DELETE from auth.users (Admin API) does not fail.
  When deleting a user, PostgreSQL was blocking due to triaje_records_created_by_fkey.
  This migration sets ON DELETE SET NULL so created_by is set to NULL when the user is deleted.
*/

-- Drop existing FK (constraint name may be triage_records_* or triaje_records_* depending on history)
ALTER TABLE public.triaje_records
  DROP CONSTRAINT IF EXISTS triage_records_created_by_fkey;

ALTER TABLE public.triaje_records
  DROP CONSTRAINT IF EXISTS triaje_records_created_by_fkey;

-- Re-add FK with ON DELETE SET NULL (preserve triage records, clear creator reference)
ALTER TABLE public.triaje_records
  ADD CONSTRAINT triaje_records_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT triaje_records_created_by_fkey ON public.triaje_records IS
  'Foreign key to auth.users. When a user is deleted (Dashboard or Admin API), created_by is set to NULL so deletion succeeds.';
