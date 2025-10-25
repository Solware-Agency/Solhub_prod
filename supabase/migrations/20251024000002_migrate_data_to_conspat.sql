-- =====================================================
-- Migración: Migrar datos existentes al laboratorio Conspat
-- Fecha: 2025-10-24
-- Fase: 1.3 del plan de migración a Multi-tenant
-- Descripción: Crear laboratorio Conspat y asignar todos los registros existentes
-- =====================================================

-- =====================================================
-- PASO 1: Crear laboratorio Conspat
-- =====================================================

-- Insertar laboratorio Conspat con configuración completa
insert into public.laboratories (
  slug,
  name,
  status,
  features,
  branding,
  config
) 
values (
  'conspat',
  'Conspat',
  'active',
  '{
    "hasInmunoRequests": true,
    "hasChangelogModule": true,
    "hasChatAI": true,
    "hasMultipleBranches": true,
    "hasCitologyStatus": true,
    "hasPatientOriginFilter": true,
    "hasRobotTracking": false
  }'::jsonb,
  '{
    "logo": "/logos/conspat.png",
    "primaryColor": "#0066cc",
    "secondaryColor": "#00cc66"
  }'::jsonb,
  '{
    "branches": ["Principal", "Sucursal 2"],
    "paymentMethods": ["Efectivo", "Zelle", "Pago Móvil", "Transferencia", "Punto de Venta"],
    "defaultExchangeRate": 36.5,
    "timezone": "America/Caracas",
    "autoSendEmailsOnApproval": true,
    "requiresApproval": true,
    "allowsDigitalSignature": false
  }'::jsonb
)
on conflict (slug) do nothing; -- Si ya existe, no hacer nada

-- Obtener el ID del laboratorio Conspat y guardarlo en una variable
do $$
declare
  conspat_lab_id uuid;
  patients_count integer;
  medical_records_count integer;
  profiles_count integer;
  change_logs_count integer;
  immuno_requests_count integer;
  user_settings_count integer;
  deletion_logs_count integer;
begin
  -- Obtener ID de Conspat
  select id into conspat_lab_id
  from public.laboratories
  where slug = 'conspat';
  
  if conspat_lab_id is null then
    raise exception '❌ Error: No se pudo crear o encontrar el laboratorio Conspat';
  end if;
  
  raise notice '✅ Laboratorio Conspat encontrado con ID: %', conspat_lab_id;
  
  -- =====================================================
  -- PASO 2: Asignar PATIENTS a Conspat
  -- =====================================================
  
  -- Actualizar solo los registros que tienen laboratory_id NULL
  update public.patients
  set laboratory_id = conspat_lab_id
  where laboratory_id is null;
  
  get diagnostics patients_count = row_count;
  raise notice '✅ Pacientes migrados a Conspat: %', patients_count;
  
  -- =====================================================
  -- PASO 3: Asignar MEDICAL_RECORDS_CLEAN a Conspat
  -- =====================================================
  
  update public.medical_records_clean
  set laboratory_id = conspat_lab_id
  where laboratory_id is null;
  
  get diagnostics medical_records_count = row_count;
  raise notice '✅ Registros médicos migrados a Conspat: %', medical_records_count;
  
  -- =====================================================
  -- PASO 4: Asignar PROFILES a Conspat
  -- =====================================================
  
  update public.profiles
  set laboratory_id = conspat_lab_id
  where laboratory_id is null;
  
  get diagnostics profiles_count = row_count;
  raise notice '✅ Perfiles de usuario migrados a Conspat: %', profiles_count;
  
  -- =====================================================
  -- PASO 5: Asignar CHANGE_LOGS a Conspat
  -- =====================================================
  
  update public.change_logs
  set laboratory_id = conspat_lab_id
  where laboratory_id is null;
  
  get diagnostics change_logs_count = row_count;
  raise notice '✅ Logs de cambios migrados a Conspat: %', change_logs_count;
  
  -- =====================================================
  -- PASO 6: Asignar IMMUNO_REQUESTS a Conspat (si existe)
  -- =====================================================
  
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'immuno_requests') then
    update public.immuno_requests
    set laboratory_id = conspat_lab_id
    where laboratory_id is null;
    
    get diagnostics immuno_requests_count = row_count;
    raise notice '✅ Solicitudes de inmuno migradas a Conspat: %', immuno_requests_count;
  else
    raise notice 'ℹ️ Tabla immuno_requests no existe, saltando...';
  end if;
  
  -- =====================================================
  -- PASO 7: Asignar USER_SETTINGS a Conspat (si existe)
  -- =====================================================
  
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_settings') then
    update public.user_settings
    set laboratory_id = conspat_lab_id
    where laboratory_id is null;
    
    get diagnostics user_settings_count = row_count;
    raise notice '✅ Configuraciones de usuario migradas a Conspat: %', user_settings_count;
  else
    raise notice 'ℹ️ Tabla user_settings no existe, saltando...';
  end if;
  
  -- =====================================================
  -- PASO 8: Asignar DELETION_LOGS a Conspat (si existe)
  -- =====================================================
  
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'deletion_logs') then
    update public.deletion_logs
    set laboratory_id = conspat_lab_id
    where laboratory_id is null;
    
    get diagnostics deletion_logs_count = row_count;
    raise notice '✅ Logs de eliminación migrados a Conspat: %', deletion_logs_count;
  else
    raise notice 'ℹ️ Tabla deletion_logs no existe, saltando...';
  end if;
  
  -- =====================================================
  -- PASO 9: Verificación de integridad
  -- =====================================================
  
  -- Verificar que NO queden registros con laboratory_id NULL en tablas críticas
  declare
    null_patients integer;
    null_medical_records integer;
    null_profiles integer;
  begin
    select count(*) into null_patients from public.patients where laboratory_id is null;
    select count(*) into null_medical_records from public.medical_records_clean where laboratory_id is null;
    select count(*) into null_profiles from public.profiles where laboratory_id is null;
    
    if null_patients > 0 or null_medical_records > 0 or null_profiles > 0 then
      raise warning '⚠️ Advertencia: Existen registros sin laboratory_id:';
      raise warning '  - Pacientes: %', null_patients;
      raise warning '  - Registros médicos: %', null_medical_records;
      raise warning '  - Perfiles: %', null_profiles;
    else
      raise notice '✅ Verificación exitosa: Todos los registros tienen laboratory_id asignado';
    end if;
  end;
  
  -- =====================================================
  -- PASO 10: Resumen final
  -- =====================================================
  
  raise notice '================================================';
  raise notice '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE';
  raise notice '================================================';
  raise notice 'Laboratorio: Conspat (ID: %)', conspat_lab_id;
  raise notice 'Registros migrados:';
  raise notice '  - Pacientes: %', patients_count;
  raise notice '  - Casos médicos: %', medical_records_count;
  raise notice '  - Usuarios: %', profiles_count;
  raise notice '  - Logs de cambios: %', change_logs_count;
  raise notice '================================================';
  
end $$;

-- =====================================================
-- PASO 11: Crear función helper para obtener laboratory_id del usuario
-- =====================================================

-- Esta función será útil para RLS policies y queries
create or replace function public.get_user_laboratory_id()
returns uuid
language sql
security definer
stable
as $$
  select laboratory_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

comment on function public.get_user_laboratory_id() is 
  'Función helper que retorna el laboratory_id del usuario autenticado. Útil para RLS policies y queries.';

-- =====================================================
-- PASO 12: Crear vista para ver estadísticas por laboratorio
-- =====================================================

create or replace view public.laboratory_stats as
select 
  l.id,
  l.slug,
  l.name,
  l.status,
  count(distinct p.id) as total_patients,
  count(distinct m.id) as total_medical_records,
  count(distinct pr.id) as total_users,
  max(m.created_at) as last_record_date
from public.laboratories l
left join public.patients p on p.laboratory_id = l.id
left join public.medical_records_clean m on m.laboratory_id = l.id
left join public.profiles pr on pr.laboratory_id = l.id
group by l.id, l.slug, l.name, l.status;

comment on view public.laboratory_stats is 
  'Vista con estadísticas agregadas por laboratorio. Útil para dashboards y reportes.';

-- Permitir a usuarios autenticados ver las estadísticas
grant select on public.laboratory_stats to authenticated;

-- =====================================================
-- IMPORTANTE: Notas post-migración
-- =====================================================

-- NOTA 1: Todos los datos existentes ahora pertenecen a Conspat
--         Esto garantiza retrocompatibilidad con el sistema actual

-- NOTA 2: Los nuevos laboratorios que se creen empezarán desde cero
--         Sin datos históricos (como debe ser en un SaaS)

-- NOTA 3: La función get_user_laboratory_id() se usará en:
--         - RLS policies (Fase 1.5)
--         - Queries del frontend
--         - Triggers y validaciones

-- NOTA 4: La vista laboratory_stats es útil para:
--         - Dashboard de super admin (futuro)
--         - Monitoreo de uso por laboratorio
--         - Reportes de actividad

-- =====================================================
-- Fin de la migración
-- =====================================================

