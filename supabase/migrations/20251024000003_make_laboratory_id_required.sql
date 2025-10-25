-- =====================================================
-- Migración: Hacer laboratory_id obligatorio (NOT NULL)
-- Fecha: 2025-10-24
-- Fase: 1.4 del plan de migración a Multi-tenant
-- Descripción: Convertir laboratory_id en campo obligatorio en todas las tablas
-- PRECONDICIÓN: Esta migración SOLO debe ejecutarse después de que todos los registros
--               existentes tengan un laboratory_id asignado (Fase 1.3 completada)
-- =====================================================

-- =====================================================
-- VERIFICACIÓN PRE-MIGRACIÓN
-- =====================================================

do $$
declare
  null_patients integer;
  null_medical_records integer;
  null_profiles integer;
  null_change_logs integer;
begin
  -- Verificar tablas críticas
  select count(*) into null_patients from public.patients where laboratory_id is null;
  select count(*) into null_medical_records from public.medical_records_clean where laboratory_id is null;
  select count(*) into null_profiles from public.profiles where laboratory_id is null;
  select count(*) into null_change_logs from public.change_logs where laboratory_id is null;
  
  -- Si hay registros NULL, DETENER la migración
  if null_patients > 0 or null_medical_records > 0 or null_profiles > 0 or null_change_logs > 0 then
    raise exception '❌ ERROR: Existen registros sin laboratory_id asignado. Por favor ejecute primero la migración 20251024000002_migrate_data_to_conspat.sql';
  else
    raise notice '✅ Verificación exitosa: Todos los registros tienen laboratory_id asignado';
  end if;
end $$;

-- =====================================================
-- PASOS 1-4: Hacer laboratory_id NOT NULL en tablas críticas
-- =====================================================

do $$
begin
  -- PASO 1: PATIENTS
  alter table public.patients
  alter column laboratory_id set not null;
  
  raise notice '✅ patients.laboratory_id ahora es NOT NULL';
  
  -- PASO 2: MEDICAL_RECORDS_CLEAN
  alter table public.medical_records_clean
  alter column laboratory_id set not null;
  
  raise notice '✅ medical_records_clean.laboratory_id ahora es NOT NULL';
  
  -- PASO 3: PROFILES
  alter table public.profiles
  alter column laboratory_id set not null;
  
  raise notice '✅ profiles.laboratory_id ahora es NOT NULL';
  
  -- PASO 4: CHANGE_LOGS
  alter table public.change_logs
  alter column laboratory_id set not null;
  
  raise notice '✅ change_logs.laboratory_id ahora es NOT NULL';
end $$;

-- =====================================================
-- PASO 5: Hacer laboratory_id NOT NULL en tablas opcionales
-- =====================================================

-- IMMUNO_REQUESTS (si existe)
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'immuno_requests'
  ) then
    -- Verificar que no hay NULLs
    if exists (select 1 from public.immuno_requests where laboratory_id is null) then
      raise exception '❌ ERROR: immuno_requests tiene registros sin laboratory_id';
    end if;
    
    alter table public.immuno_requests
    alter column laboratory_id set not null;
    
    raise notice '✅ immuno_requests.laboratory_id ahora es NOT NULL';
  else
    raise notice 'ℹ️ Tabla immuno_requests no existe, saltando...';
  end if;
end $$;

-- USER_SETTINGS (si existe)
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'user_settings'
  ) then
    -- Verificar que no hay NULLs
    if exists (select 1 from public.user_settings where laboratory_id is null) then
      raise exception '❌ ERROR: user_settings tiene registros sin laboratory_id';
    end if;
    
    alter table public.user_settings
    alter column laboratory_id set not null;
    
    raise notice '✅ user_settings.laboratory_id ahora es NOT NULL';
  else
    raise notice 'ℹ️ Tabla user_settings no existe, saltando...';
  end if;
end $$;

-- DELETION_LOGS (si existe)
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'deletion_logs'
  ) then
    -- Verificar que no hay NULLs
    if exists (select 1 from public.deletion_logs where laboratory_id is null) then
      raise exception '❌ ERROR: deletion_logs tiene registros sin laboratory_id';
    end if;
    
    alter table public.deletion_logs
    alter column laboratory_id set not null;
    
    raise notice '✅ deletion_logs.laboratory_id ahora es NOT NULL';
  else
    raise notice 'ℹ️ Tabla deletion_logs no existe, saltando...';
  end if;
end $$;

-- =====================================================
-- PASO 6: Crear función para validar laboratory_id en INSERTs
-- =====================================================

-- Esta función se usará en triggers para garantizar que siempre se asigne un laboratory_id
create or replace function public.validate_laboratory_id()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Si el laboratory_id no está asignado, intentar obtenerlo del usuario actual
  if new.laboratory_id is null then
    new.laboratory_id := (
      select laboratory_id
      from public.profiles
      where id = auth.uid()
      limit 1
    );
    
    -- Si aún es NULL, lanzar error
    if new.laboratory_id is null then
      raise exception 'laboratory_id no puede ser NULL. El usuario actual no tiene un laboratorio asignado.';
    end if;
  end if;
  
  return new;
end;
$$;

comment on function public.validate_laboratory_id() is 
  'Función trigger que valida y asigna automáticamente el laboratory_id basado en el usuario autenticado.';

-- =====================================================
-- PASO 7: Aplicar trigger a tablas críticas
-- =====================================================

-- Trigger para PATIENTS
drop trigger if exists trigger_validate_laboratory_id_patients on public.patients;
create trigger trigger_validate_laboratory_id_patients
  before insert on public.patients
  for each row
  execute function public.validate_laboratory_id();

-- Trigger para MEDICAL_RECORDS_CLEAN
drop trigger if exists trigger_validate_laboratory_id_medical_records on public.medical_records_clean;
create trigger trigger_validate_laboratory_id_medical_records
  before insert on public.medical_records_clean
  for each row
  execute function public.validate_laboratory_id();

-- Trigger para CHANGE_LOGS
drop trigger if exists trigger_validate_laboratory_id_change_logs on public.change_logs;
create trigger trigger_validate_laboratory_id_change_logs
  before insert on public.change_logs
  for each row
  execute function public.validate_laboratory_id();

-- =====================================================
-- PASO 8: Verificación POST-MIGRACIÓN
-- =====================================================

do $$
declare
  constraints_ok boolean := true;
begin
  -- Verificar que las columnas son NOT NULL
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'patients'
    and column_name = 'laboratory_id'
    and is_nullable = 'YES'
  ) then
    raise exception '❌ ERROR: patients.laboratory_id no es NOT NULL';
  end if;
  
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'medical_records_clean'
    and column_name = 'laboratory_id'
    and is_nullable = 'YES'
  ) then
    raise exception '❌ ERROR: medical_records_clean.laboratory_id no es NOT NULL';
  end if;
  
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'laboratory_id'
    and is_nullable = 'YES'
  ) then
    raise exception '❌ ERROR: profiles.laboratory_id no es NOT NULL';
  end if;
  
  raise notice '✅ Verificación exitosa: Todas las columnas laboratory_id son NOT NULL';
end $$;

-- =====================================================
-- PASO 9: Resumen
-- =====================================================

do $$
begin
  raise notice '================================================';
  raise notice '🎉 FASE 1.4 COMPLETADA EXITOSAMENTE';
  raise notice '================================================';
  raise notice 'laboratory_id ahora es obligatorio en:';
  raise notice '  ✅ patients';
  raise notice '  ✅ medical_records_clean';
  raise notice '  ✅ profiles';
  raise notice '  ✅ change_logs';
  raise notice '  ✅ immuno_requests (si existe)';
  raise notice '  ✅ user_settings (si existe)';
  raise notice '  ✅ deletion_logs (si existe)';
  raise notice '================================================';
  raise notice 'Próximo paso: Fase 1.5 - Actualizar RLS policies';
  raise notice '================================================';
end $$;

-- =====================================================
-- IMPORTANTE: Notas sobre la migración
-- =====================================================

-- NOTA 1: Los triggers validate_laboratory_id garantizan que TODO nuevo registro
--         tendrá automáticamente el laboratory_id del usuario que lo crea
--         Esto previene errores de inserción

-- NOTA 2: Si un INSERT intenta crear un registro sin laboratory_id y el usuario
--         actual no tiene laboratorio asignado, se lanzará un error claro

-- NOTA 3: Esta migración es IRREVERSIBLE sin un rollback manual
--         Una vez que laboratory_id es NOT NULL, todos los INSERTs deben incluirlo

-- NOTA 4: El frontend AÚN NO necesita cambios porque los triggers se encargan
--         de asignar automáticamente el laboratory_id

-- =====================================================
-- Fin de la migración
-- =====================================================

