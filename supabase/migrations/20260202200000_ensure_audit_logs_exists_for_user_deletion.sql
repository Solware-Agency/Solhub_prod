/*
  Ensure public.audit_logs exists so DELETE from auth.users (Admin API) does not fail.
  When deleting a user, PostgreSQL applies ON DELETE SET NULL for audit_logs.changed_by → auth.users.
  If audit_logs does not exist in an environment, that step fails with "relation audit_logs does not exist".
  This migration creates the table IF NOT EXISTS and ensures the FK has ON DELETE SET NULL.
*/

-- Create table only if it does not exist (idempotent)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_data jsonb,
  new_data jsonb,
  laboratory_id uuid REFERENCES public.laboratories(id),
  ip_address text,
  user_agent text,
  action_id uuid,
  metadata jsonb
);

-- Add FK to auth.users with ON DELETE SET NULL (so user deletion does not fail)
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_changed_by_fkey;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_changed_by_fkey
  FOREIGN KEY (changed_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Indexes (only create if not exist)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_laboratory ON public.audit_logs (laboratory_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON public.audit_logs (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON public.audit_logs (changed_by);

COMMENT ON CONSTRAINT audit_logs_changed_by_fkey ON public.audit_logs IS
  'Foreign key to auth.users. When a user is deleted (Dashboard or Admin API), changed_by is set to NULL so deletion succeeds.';
