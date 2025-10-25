-- =====================================================
-- Migración: Agregar laboratory_id a todas las tablas principales
-- Fecha: 2025-10-24
-- Fase: 1.2 del plan de migración a Multi-tenant
-- Descripción: Agregar columna laboratory_id (nullable) a todas las tablas para preparar multi-tenancy
-- =====================================================

-- =====================================================
-- 1. PATIENTS
-- =====================================================

-- Agregar columna laboratory_id
alter table public.patients 
add column if not exists laboratory_id uuid references public.laboratories(id) on delete cascade;

-- Crear índice para optimización de queries
create index if not exists idx_patients_laboratory on public.patients(laboratory_id);

-- Modificar constraint de cédula única
-- En multi-tenant, la cédula debe ser única POR LABORATORIO, no globalmente
-- Un mismo paciente puede tener registros en diferentes laboratorios

-- Primero eliminar la constraint única global si existe
alter table public.patients drop constraint if exists patients_cedula_key;

-- Eliminar el constraint si ya se intentó crear (para re-intentar la migración)
alter table public.patients drop constraint if exists unique_cedula_per_laboratory;

-- SOLUCIÓN: Usar un UNIQUE INDEX parcial que solo aplique cuando cedula NO es NULL
-- Esto permite múltiples pacientes con cedula NULL (casos excepcionales/temporales)
-- pero garantiza unicidad cuando SÍ hay cédula
drop index if exists unique_cedula_per_laboratory;
create unique index unique_cedula_per_laboratory 
on public.patients (cedula, laboratory_id) 
where cedula is not null;

comment on column public.patients.laboratory_id is 
  'ID del laboratorio al que pertenece este paciente. Aislamiento multi-tenant.';

-- Comentario sobre el índice único parcial
comment on index unique_cedula_per_laboratory is 
  'Índice único parcial: garantiza que cada cédula es única por laboratorio cuando cedula IS NOT NULL. Permite múltiples pacientes sin cédula (casos excepcionales).';

-- =====================================================
-- 2. MEDICAL_RECORDS_CLEAN (Casos/Registros médicos)
-- =====================================================

-- Agregar columna laboratory_id
alter table public.medical_records_clean
add column if not exists laboratory_id uuid references public.laboratories(id) on delete cascade;

-- Crear índice para optimización
create index if not exists idx_medical_records_laboratory on public.medical_records_clean(laboratory_id);

comment on column public.medical_records_clean.laboratory_id is 
  'ID del laboratorio al que pertenece este registro médico. Aislamiento multi-tenant.';

-- =====================================================
-- 3. PROFILES (Perfiles de usuarios)
-- =====================================================

-- Agregar columna laboratory_id
alter table public.profiles
add column if not exists laboratory_id uuid references public.laboratories(id) on delete cascade;

-- Crear índice para optimización
create index if not exists idx_profiles_laboratory on public.profiles(laboratory_id);

comment on column public.profiles.laboratory_id is 
  'ID del laboratorio al que pertenece este usuario. Cada usuario pertenece a UN solo laboratorio.';

-- =====================================================
-- 4. CHANGE_LOGS (Bitácora de cambios)
-- =====================================================

-- Agregar columna laboratory_id
alter table public.change_logs
add column if not exists laboratory_id uuid references public.laboratories(id) on delete cascade;

-- Crear índice para optimización
create index if not exists idx_change_logs_laboratory on public.change_logs(laboratory_id);

comment on column public.change_logs.laboratory_id is 
  'ID del laboratorio al que pertenece este log. Aislamiento multi-tenant.';

-- =====================================================
-- 5. IMMUNO_REQUESTS (Solicitudes de inmunorreacciones)
-- =====================================================

-- Verificar que la tabla existe (es una feature opcional)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'immuno_requests') then
    -- Agregar columna laboratory_id
    alter table public.immuno_requests
    add column if not exists laboratory_id uuid references public.laboratories(id) on delete cascade;
    
    -- Crear índice
    create index if not exists idx_immuno_requests_laboratory on public.immuno_requests(laboratory_id);
    
    comment on column public.immuno_requests.laboratory_id is 
      'ID del laboratorio al que pertenece esta solicitud. Aislamiento multi-tenant.';
  end if;
end $$;

-- =====================================================
-- 6. USER_SETTINGS (Configuración de usuarios)
-- =====================================================

-- Verificar que la tabla existe
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_settings') then
    -- Agregar columna laboratory_id
    alter table public.user_settings
    add column if not exists laboratory_id uuid references public.laboratories(id) on delete cascade;
    
    -- Crear índice
    create index if not exists idx_user_settings_laboratory on public.user_settings(laboratory_id);
    
    comment on column public.user_settings.laboratory_id is 
      'ID del laboratorio al que pertenece esta configuración. Aislamiento multi-tenant.';
  end if;
end $$;

-- =====================================================
-- 7. DELETION_LOGS (Logs de eliminación)
-- =====================================================

-- Verificar que la tabla existe
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'deletion_logs') then
    -- Agregar columna laboratory_id
    alter table public.deletion_logs
    add column if not exists laboratory_id uuid references public.laboratories(id) on delete cascade;
    
    -- Crear índice
    create index if not exists idx_deletion_logs_laboratory on public.deletion_logs(laboratory_id);
    
    comment on column public.deletion_logs.laboratory_id is 
      'ID del laboratorio al que pertenece este log de eliminación. Aislamiento multi-tenant.';
  end if;
end $$;

-- =====================================================
-- Índices compuestos para queries comunes
-- =====================================================

-- Pacientes por laboratorio y fecha (query común en dashboard)
create index if not exists idx_patients_lab_created 
on public.patients(laboratory_id, created_at desc);

-- Casos por laboratorio y fecha (query más común del sistema)
create index if not exists idx_medical_records_lab_created 
on public.medical_records_clean(laboratory_id, created_at desc);

-- Casos por laboratorio y estado de pago (filtros en UI)
-- Usar payment_status que es la columna que existe en medical_records_clean
create index if not exists idx_medical_records_lab_payment_status 
on public.medical_records_clean(laboratory_id, payment_status);

-- Perfiles por laboratorio y rol (para verificaciones de permisos)
create index if not exists idx_profiles_lab_role 
on public.profiles(laboratory_id, role);

-- =====================================================
-- Verificación de integridad
-- =====================================================

-- Verificar que todas las columnas se agregaron correctamente
do $$
declare
  missing_columns text[];
begin
  -- Verificar patients
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'patients' and column_name = 'laboratory_id'
  ) then
    missing_columns := array_append(missing_columns, 'patients.laboratory_id');
  end if;
  
  -- Verificar medical_records_clean
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'medical_records_clean' and column_name = 'laboratory_id'
  ) then
    missing_columns := array_append(missing_columns, 'medical_records_clean.laboratory_id');
  end if;
  
  -- Verificar profiles
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'laboratory_id'
  ) then
    missing_columns := array_append(missing_columns, 'profiles.laboratory_id');
  end if;
  
  -- Verificar change_logs
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'change_logs' and column_name = 'laboratory_id'
  ) then
    missing_columns := array_append(missing_columns, 'change_logs.laboratory_id');
  end if;
  
  -- Si hay columnas faltantes, lanzar error
  if array_length(missing_columns, 1) > 0 then
    raise exception 'Columnas faltantes: %', array_to_string(missing_columns, ', ');
  else
    raise notice '✅ Todas las columnas laboratory_id se agregaron correctamente';
  end if;
end $$;

-- =====================================================
-- IMPORTANTE: Notas sobre la migración
-- =====================================================

-- NOTA 1: Las columnas laboratory_id son NULLABLE por ahora
--         La Fase 1.4 las hará NOT NULL después de migrar los datos

-- NOTA 2: Las RLS policies NO se modifican en esta fase
--         Seguirán funcionando igual con USING (true)
--         La Fase 1.5 actualizará las policies para filtrar por laboratory_id

-- NOTA 3: El índice único parcial unique_cedula_per_laboratory:
--         - Permite que el mismo paciente (misma cédula) exista en múltiples laboratorios
--           Ejemplo: Juan (V-12345) puede ser paciente en Conspat Y en Lab Vargas
--         - Permite múltiples pacientes con cedula NULL (casos excepcionales/temporales)
--         - Garantiza unicidad de cédula por laboratorio cuando cedula IS NOT NULL

-- NOTA 4: El CASCADE en foreign keys garantiza que si se elimina un laboratorio,
--         se eliminan todos sus datos relacionados (protección de integridad)

-- =====================================================
-- Fin de la migración
-- =====================================================

