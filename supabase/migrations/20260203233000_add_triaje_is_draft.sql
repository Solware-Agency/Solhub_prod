-- Add is_draft flag to triaje_records for draft saves
ALTER TABLE public.triaje_records
ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.triaje_records.is_draft IS
'Indica si el registro es un borrador (true) o un triaje final (false).';
