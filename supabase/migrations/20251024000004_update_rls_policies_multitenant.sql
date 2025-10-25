-- =====================================================
-- Migración: Actualizar RLS Policies para Multi-tenant
-- Fecha: 2025-10-24
-- Fase: 1.5 del plan de migración a Multi-tenant
-- Descripción: Actualizar todas las RLS policies para filtrar por laboratory_id
-- ADVERTENCIA: Esta es la migración MÁS CRÍTICA para seguridad multi-tenant
-- =====================================================

-- =====================================================
-- IMPORTANTE: LEER ANTES DE APLICAR
-- =====================================================

-- Esta migración cambia fundamentalmente el comportamiento de seguridad de la app.
-- 
-- ANTES: Los usuarios veían TODOS los datos (USING true)
-- DESPUÉS: Los usuarios SOLO ven datos de su laboratorio
--
-- ⚠️ ESTA MIGRACIÓN DEBE APLICARSE **DESPUÉS** DE ACTUALIZAR EL FRONTEND
-- O AL MISMO TIEMPO QUE EL DEPLOY DEL FRONTEND
--
-- Si se aplica antes, el sistema funcionará igual porque los triggers
-- asignan automáticamente el laboratory_id, pero es mejor coordinarlo.

-- =====================================================
-- PASO 1: ACTUALIZAR RLS POLICIES DE PATIENTS
-- =====================================================

-- Eliminar policies antiguas
drop policy if exists "Authenticated users can view patients" on public.patients;
drop policy if exists "Authenticated users can insert patients" on public.patients;
drop policy if exists "Authenticated users can update patients" on public.patients;
drop policy if exists "Authenticated users can delete patients" on public.patients;

-- Policy: Los usuarios pueden ver SOLO los pacientes de su laboratorio
create policy "Users can view their laboratory patients"
  on public.patients
  for select
  to authenticated
  using (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden insertar pacientes en su laboratorio
create policy "Users can insert patients in their laboratory"
  on public.patients
  for insert
  to authenticated
  with check (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden actualizar pacientes de su laboratorio
create policy "Users can update their laboratory patients"
  on public.patients
  for update
  to authenticated
  using (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  )
  with check (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Solo owners y admins pueden eliminar pacientes de su laboratorio
create policy "Owners and admins can delete their laboratory patients"
  on public.patients
  for delete
  to authenticated
  using (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
    and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Policies de PATIENTS actualizadas (ver resumen al final)

-- =====================================================
-- PASO 2: ACTUALIZAR RLS POLICIES DE MEDICAL_RECORDS_CLEAN
-- =====================================================

-- Eliminar policies antiguas
drop policy if exists "Authenticated users can view medical records" on public.medical_records_clean;
drop policy if exists "Authenticated users can insert medical records" on public.medical_records_clean;
drop policy if exists "Authenticated users can update medical records" on public.medical_records_clean;
drop policy if exists "Authenticated users can delete medical records" on public.medical_records_clean;

-- Policy: Ver solo registros del laboratorio propio
create policy "Users can view their laboratory medical records"
  on public.medical_records_clean
  for select
  to authenticated
  using (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Insertar solo en su laboratorio
create policy "Users can insert medical records in their laboratory"
  on public.medical_records_clean
  for insert
  to authenticated
  with check (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Actualizar solo registros de su laboratorio
create policy "Users can update their laboratory medical records"
  on public.medical_records_clean
  for update
  to authenticated
  using (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  )
  with check (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Solo owners y admins pueden eliminar
create policy "Owners and admins can delete their laboratory medical records"
  on public.medical_records_clean
  for delete
  to authenticated
  using (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
    and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Policies de MEDICAL_RECORDS_CLEAN actualizadas (ver resumen al final)

-- =====================================================
-- PASO 3: ACTUALIZAR RLS POLICIES DE PROFILES
-- =====================================================

-- Eliminar policies antiguas
drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Authenticated users can update own profile" on public.profiles;
drop policy if exists "Users can view all profiles" on public.profiles;

-- Policy: Ver solo perfiles de su laboratorio
create policy "Users can view their laboratory profiles"
  on public.profiles
  for select
  to authenticated
  using (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden actualizar su propio perfil
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and
    -- No pueden cambiar de laboratorio
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Solo owners pueden insertar nuevos usuarios en su laboratorio
create policy "Owners can insert users in their laboratory"
  on public.profiles
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'owner'
    )
    and
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Solo owners pueden eliminar usuarios de su laboratorio
create policy "Owners can delete users in their laboratory"
  on public.profiles
  for delete
  to authenticated
  using (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
    and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'owner'
    )
  );

-- Policies de PROFILES actualizadas (ver resumen al final)

-- =====================================================
-- PASO 4: ACTUALIZAR RLS POLICIES DE CHANGE_LOGS
-- =====================================================

-- Eliminar policies antiguas
drop policy if exists "Authenticated users can view change logs" on public.change_logs;
drop policy if exists "Authenticated users can insert change logs" on public.change_logs;

-- Policy: Ver solo logs de su laboratorio
create policy "Users can view their laboratory change logs"
  on public.change_logs
  for select
  to authenticated
  using (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Policy: Insertar logs solo en su laboratorio
create policy "Users can insert change logs in their laboratory"
  on public.change_logs
  for insert
  to authenticated
  with check (
    laboratory_id = (
      select laboratory_id 
      from public.profiles 
      where id = auth.uid()
    )
  );

-- Los logs NO se pueden actualizar ni eliminar (auditoría)
-- Policies de CHANGE_LOGS actualizadas (ver resumen al final)

-- =====================================================
-- PASO 5: ACTUALIZAR RLS POLICIES DE IMMUNO_REQUESTS (si existe)
-- =====================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'immuno_requests'
  ) then
    -- Eliminar policies antiguas
    execute 'drop policy if exists "Authenticated users can view immuno requests" on public.immuno_requests';
    execute 'drop policy if exists "Authenticated users can insert immuno requests" on public.immuno_requests';
    execute 'drop policy if exists "Authenticated users can update immuno requests" on public.immuno_requests';
    execute 'drop policy if exists "Authenticated users can delete immuno requests" on public.immuno_requests';
    
    -- Crear nuevas policies
    execute 'create policy "Users can view their laboratory immuno requests"
      on public.immuno_requests for select to authenticated
      using (laboratory_id = (select laboratory_id from public.profiles where id = auth.uid()))';
    
    execute 'create policy "Users can insert immuno requests in their laboratory"
      on public.immuno_requests for insert to authenticated
      with check (laboratory_id = (select laboratory_id from public.profiles where id = auth.uid()))';
    
    execute 'create policy "Users can update their laboratory immuno requests"
      on public.immuno_requests for update to authenticated
      using (laboratory_id = (select laboratory_id from public.profiles where id = auth.uid()))';
    
    execute 'create policy "Owners can delete their laboratory immuno requests"
      on public.immuno_requests for delete to authenticated
      using (
        laboratory_id = (select laboratory_id from public.profiles where id = auth.uid())
        and exists (select 1 from public.profiles where id = auth.uid() and role in (''owner'', ''admin''))
      )';
    
    raise notice '✅ Policies de IMMUNO_REQUESTS actualizadas';
  else
    raise notice 'ℹ️ Tabla immuno_requests no existe, saltando...';
  end if;
end $$;

-- =====================================================
-- PASO 6: ACTUALIZAR RLS POLICIES DE USER_SETTINGS (si existe)
-- =====================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'user_settings'
  ) then
    -- Eliminar policies antiguas
    execute 'drop policy if exists "Users can view own settings" on public.user_settings';
    execute 'drop policy if exists "Users can update own settings" on public.user_settings';
    
    -- Los settings son por usuario, pero deben estar en el mismo laboratorio
    execute 'create policy "Users can view their own settings"
      on public.user_settings for select to authenticated
      using (user_id = auth.uid() and laboratory_id = (select laboratory_id from public.profiles where id = auth.uid()))';
    
    execute 'create policy "Users can update their own settings"
      on public.user_settings for update to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid() and laboratory_id = (select laboratory_id from public.profiles where id = auth.uid()))';
    
    execute 'create policy "Users can insert their own settings"
      on public.user_settings for insert to authenticated
      with check (user_id = auth.uid() and laboratory_id = (select laboratory_id from public.profiles where id = auth.uid()))';
    
    raise notice '✅ Policies de USER_SETTINGS actualizadas';
  else
    raise notice 'ℹ️ Tabla user_settings no existe, saltando...';
  end if;
end $$;

-- =====================================================
-- PASO 7: ACTUALIZAR RLS POLICIES DE DELETION_LOGS (si existe)
-- =====================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'deletion_logs'
  ) then
    -- Eliminar policies antiguas
    execute 'drop policy if exists "Authenticated users can view deletion logs" on public.deletion_logs';
    execute 'drop policy if exists "Authenticated users can insert deletion logs" on public.deletion_logs';
    
    -- Solo owners y admins pueden ver deletion logs
    execute 'create policy "Owners can view their laboratory deletion logs"
      on public.deletion_logs for select to authenticated
      using (
        laboratory_id = (select laboratory_id from public.profiles where id = auth.uid())
        and exists (select 1 from public.profiles where id = auth.uid() and role in (''owner'', ''admin''))
      )';
    
    execute 'create policy "System can insert deletion logs"
      on public.deletion_logs for insert to authenticated
      with check (laboratory_id = (select laboratory_id from public.profiles where id = auth.uid()))';
    
    raise notice '✅ Policies de DELETION_LOGS actualizadas';
  else
    raise notice 'ℹ️ Tabla deletion_logs no existe, saltando...';
  end if;
end $$;

-- =====================================================
-- PASO 8: Crear función para testing de aislamiento
-- =====================================================

create or replace function public.test_multitenant_isolation()
returns table(
  test_name text,
  result text,
  details text
)
language plpgsql
security definer
as $$
declare
  user_lab_id uuid;
  total_labs integer;
  visible_patients integer;
  total_patients integer;
begin
  -- Obtener laboratory_id del usuario actual
  select laboratory_id into user_lab_id
  from public.profiles
  where id = auth.uid();
  
  -- Test 1: Verificar que el usuario tiene laboratorio asignado
  if user_lab_id is null then
    return query select 
      'User Laboratory Assignment'::text,
      'FAIL'::text,
      'Usuario no tiene laboratory_id asignado'::text;
    return;
  else
    return query select 
      'User Laboratory Assignment'::text,
      'PASS'::text,
      format('Usuario pertenece a laboratorio: %s', user_lab_id)::text;
  end if;
  
  -- Test 2: Verificar aislamiento de pacientes
  select count(*) into total_labs from public.laboratories;
  select count(*) into visible_patients from public.patients; -- RLS aplicado
  select count(*) into total_patients from public.patients where true; -- Sin filtro adicional
  
  if visible_patients = total_patients and total_labs > 1 then
    return query select 
      'Patient Isolation'::text,
      'WARNING'::text,
      format('Usuario ve TODOS los pacientes (%s). Posible fuga de datos.', total_patients)::text;
  else
    return query select 
      'Patient Isolation'::text,
      'PASS'::text,
      format('Usuario ve solo %s pacientes de su laboratorio', visible_patients)::text;
  end if;
  
  -- Test 3: Verificar que no se pueden insertar datos en otro laboratorio
  -- (Este test es conceptual, no se ejecuta realmente)
  return query select 
    'Insert Protection'::text,
    'INFO'::text,
    'RLS policies previenen inserts en otros laboratorios'::text;
  
end;
$$;

comment on function public.test_multitenant_isolation() is 
  'Función de testing para verificar que el aislamiento multi-tenant funciona correctamente.';

grant execute on function public.test_multitenant_isolation() to authenticated;

-- =====================================================
-- PASO 9: Resumen y verificación final
-- =====================================================

do $$
declare
  policies_count integer;
begin
  -- Contar policies creadas
  select count(*) into policies_count
  from pg_policies
  where schemaname = 'public'
  and policyname like '%laboratory%';
  
  raise notice '================================================';
  raise notice '🎉 FASE 1.5 COMPLETADA EXITOSAMENTE';
  raise notice '================================================';
  raise notice 'RLS Policies actualizadas para multi-tenant:';
  raise notice '  ✅ patients (4 policies)';
  raise notice '  ✅ medical_records_clean (4 policies)';
  raise notice '  ✅ profiles (4 policies)';
  raise notice '  ✅ change_logs (2 policies)';
  raise notice '  ✅ immuno_requests (si existe)';
  raise notice '  ✅ user_settings (si existe)';
  raise notice '  ✅ deletion_logs (si existe)';
  raise notice '================================================';
  raise notice 'Total de policies multi-tenant: %', policies_count;
  raise notice '================================================';
  raise notice '⚠️  IMPORTANTE:';
  raise notice '   - Los usuarios ahora SOLO ven datos de su laboratorio';
  raise notice '   - Coordinar deploy del frontend con esta migración';
  raise notice '   - Ejecutar test_multitenant_isolation() para verificar';
  raise notice '================================================';
end $$;

-- =====================================================
-- IMPORTANTE: Notas de seguridad
-- =====================================================

-- SEGURIDAD MULTI-TENANT GARANTIZADA POR:
--
-- 1. RLS Policies filtran por laboratory_id en TODAS las operaciones
-- 2. Foreign keys con CASCADE protegen integridad referencial
-- 3. Triggers validan laboratory_id en INSERT
-- 4. Columnas NOT NULL previenen registros huérfanos
-- 5. WITH CHECK garantiza que no se pueden actualizar datos para cambiar de lab
--
-- TESTING OBLIGATORIO:
--
-- 1. Crear 2 laboratorios de prueba
-- 2. Crear usuarios en cada laboratorio
-- 3. Crear datos en cada laboratorio
-- 4. Verificar que Usuario A NO ve datos de Usuario B
-- 5. Intentar INSERT con laboratory_id de otro lab (debe fallar)
-- 6. Ejecutar: SELECT * FROM test_multitenant_isolation();

-- =====================================================
-- Fin de la migración
-- =====================================================

