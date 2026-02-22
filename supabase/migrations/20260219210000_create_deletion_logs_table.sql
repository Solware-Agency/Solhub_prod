-- Tabla para registrar eliminaciones de casos médicos (auditoría).
-- El frontend la usa en el historial de acciones; las migraciones multi-tenant ya referencian esta tabla.
-- Las eliminaciones también se registran en change_logs; esta tabla permite una vista dedicada y RLS por rol.

create table if not exists public.deletion_logs (
  id uuid primary key default gen_random_uuid(),
  deleted_medical_record_id uuid not null,
  deleted_patient_id uuid,
  user_id uuid not null references auth.users(id) on delete set null,
  user_email text not null,
  user_display_name text,
  deleted_record_info text not null,
  deleted_at timestamptz not null default now(),
  entity_type varchar default 'medical_case',
  laboratory_id uuid not null references public.laboratories(id) on delete cascade
);

comment on table public.deletion_logs is 'Logs de eliminación de casos médicos para auditoría. Solo owners/admins pueden ver.';
comment on column public.deletion_logs.laboratory_id is 'ID del laboratorio. Aislamiento multi-tenant.';

create index if not exists idx_deletion_logs_laboratory on public.deletion_logs(laboratory_id);
create index if not exists idx_deletion_logs_deleted_medical_record_id on public.deletion_logs(deleted_medical_record_id);
create index if not exists idx_deletion_logs_deleted_at on public.deletion_logs(deleted_at desc);

alter table public.deletion_logs enable row level security;

-- Solo owners y admins del laboratorio pueden ver deletion logs
create policy "Owners can view their laboratory deletion logs"
  on public.deletion_logs for select to authenticated
  using (
    laboratory_id = (select laboratory_id from public.profiles where id = auth.uid())
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'admin'))
  );

-- Usuarios autenticados del mismo laboratorio pueden insertar (trigger o app)
create policy "System can insert deletion logs"
  on public.deletion_logs for insert to authenticated
  with check (laboratory_id = (select laboratory_id from public.profiles where id = auth.uid()));
