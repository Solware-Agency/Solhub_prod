-- =====================================================
-- Script de Testing para Migración Multi-tenant
-- =====================================================
-- 
-- Este script contiene todos los tests necesarios para verificar
-- que la migración multi-tenant se aplicó correctamente.
--
-- INSTRUCCIONES:
-- 1. Aplicar TODAS las migraciones primero (20251024000000 hasta 20251024000004)
-- 2. Ejecutar este script completo en Supabase SQL Editor
-- 3. Revisar los resultados de cada test
-- 4. Todos los tests deben pasar (✅) antes de ir a producción
--
-- =====================================================

\echo '================================================'
\echo '🧪 INICIANDO TESTS DE MIGRACIÓN MULTI-TENANT'
\echo '================================================'

-- =====================================================
-- TEST 1: Verificar que tabla laboratories existe
-- =====================================================

\echo ''
\echo '📋 TEST 1: Verificar estructura de tabla laboratories'

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'laboratories'
    ) 
    THEN '✅ PASS: Tabla laboratories existe'
    ELSE '❌ FAIL: Tabla laboratories NO existe'
  END as resultado;

-- Verificar que Conspat existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM laboratories WHERE slug = 'conspat')
    THEN '✅ PASS: Laboratorio Conspat existe'
    ELSE '❌ FAIL: Laboratorio Conspat NO existe'
  END as resultado;

-- Ver detalles de Conspat
SELECT 
  '📊 Detalles de Conspat:' as info,
  id, slug, name, status, created_at
FROM laboratories 
WHERE slug = 'conspat';

-- =====================================================
-- TEST 2: Verificar que todas las tablas tienen laboratory_id
-- =====================================================

\echo ''
\echo '📋 TEST 2: Verificar columna laboratory_id en todas las tablas'

SELECT 
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN is_nullable = 'NO' THEN '✅ NOT NULL'
    ELSE '⚠️  NULLABLE'
  END as nullable_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'laboratory_id'
ORDER BY table_name;

-- Contar tablas con laboratory_id
SELECT 
  CASE 
    WHEN COUNT(*) >= 7 
    THEN '✅ PASS: ' || COUNT(*) || ' tablas tienen laboratory_id'
    ELSE '⚠️  WARNING: Solo ' || COUNT(*) || ' tablas tienen laboratory_id (esperado: 7+)'
  END as resultado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'laboratory_id';

-- =====================================================
-- TEST 3: Verificar migración de datos
-- =====================================================

\echo ''
\echo '📋 TEST 3: Verificar que todos los registros tienen laboratory_id'

-- Verificar patients
SELECT 
  '👥 Tabla: patients' as tabla,
  COUNT(*) as total_registros,
  COUNT(laboratory_id) as con_laboratory_id,
  COUNT(*) FILTER (WHERE laboratory_id IS NULL) as sin_laboratory_id,
  CASE 
    WHEN COUNT(*) FILTER (WHERE laboratory_id IS NULL) = 0 
    THEN '✅ PASS'
    ELSE '❌ FAIL: Hay ' || COUNT(*) FILTER (WHERE laboratory_id IS NULL) || ' registros sin laboratory_id'
  END as resultado
FROM patients;

-- Verificar medical_records_clean
SELECT 
  '📋 Tabla: medical_records_clean' as tabla,
  COUNT(*) as total_registros,
  COUNT(laboratory_id) as con_laboratory_id,
  COUNT(*) FILTER (WHERE laboratory_id IS NULL) as sin_laboratory_id,
  CASE 
    WHEN COUNT(*) FILTER (WHERE laboratory_id IS NULL) = 0 
    THEN '✅ PASS'
    ELSE '❌ FAIL: Hay ' || COUNT(*) FILTER (WHERE laboratory_id IS NULL) || ' registros sin laboratory_id'
  END as resultado
FROM medical_records_clean;

-- Verificar profiles
SELECT 
  '👤 Tabla: profiles' as tabla,
  COUNT(*) as total_registros,
  COUNT(laboratory_id) as con_laboratory_id,
  COUNT(*) FILTER (WHERE laboratory_id IS NULL) as sin_laboratory_id,
  CASE 
    WHEN COUNT(*) FILTER (WHERE laboratory_id IS NULL) = 0 
    THEN '✅ PASS'
    ELSE '❌ FAIL: Hay ' || COUNT(*) FILTER (WHERE laboratory_id IS NULL) || ' registros sin laboratory_id'
  END as resultado
FROM profiles;

-- Verificar change_logs
SELECT 
  '📝 Tabla: change_logs' as tabla,
  COUNT(*) as total_registros,
  COUNT(laboratory_id) as con_laboratory_id,
  COUNT(*) FILTER (WHERE laboratory_id IS NULL) as sin_laboratory_id,
  CASE 
    WHEN COUNT(*) FILTER (WHERE laboratory_id IS NULL) = 0 
    THEN '✅ PASS'
    ELSE '❌ FAIL: Hay ' || COUNT(*) FILTER (WHERE laboratory_id IS NULL) || ' registros sin laboratory_id'
  END as resultado
FROM change_logs;

-- =====================================================
-- TEST 4: Verificar RLS Policies
-- =====================================================

\echo ''
\echo '📋 TEST 4: Verificar RLS Policies multi-tenant'

-- Contar policies multi-tenant
SELECT 
  CASE 
    WHEN COUNT(*) >= 16 
    THEN '✅ PASS: ' || COUNT(*) || ' policies multi-tenant encontradas'
    ELSE '⚠️  WARNING: Solo ' || COUNT(*) || ' policies (esperado: 16+)'
  END as resultado
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%laboratory%';

-- Ver detalles de policies por tabla
SELECT 
  tablename,
  COUNT(*) as num_policies,
  STRING_AGG(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%laboratory%'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- TEST 5: Verificar índices
-- =====================================================

\echo ''
\echo '📋 TEST 5: Verificar índices de laboratory_id'

SELECT 
  tablename,
  indexname,
  '✅ Índice existe' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%laboratory%'
ORDER BY tablename;

SELECT 
  CASE 
    WHEN COUNT(*) >= 7 
    THEN '✅ PASS: ' || COUNT(*) || ' índices de laboratory_id encontrados'
    ELSE '⚠️  WARNING: Solo ' || COUNT(*) || ' índices (esperado: 7+)'
  END as resultado
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%laboratory%';

-- =====================================================
-- TEST 6: Verificar foreign keys
-- =====================================================

\echo ''
\echo '📋 TEST 6: Verificar foreign keys a laboratories'

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  '✅ FK configurada' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'laboratories'
ORDER BY tc.table_name;

-- =====================================================
-- TEST 7: Verificar constraint de cédula única por laboratorio
-- =====================================================

\echo ''
\echo '📋 TEST 7: Verificar índice único parcial unique_cedula_per_laboratory'

-- Verificar que el índice único parcial existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename = 'patients'
        AND indexname = 'unique_cedula_per_laboratory'
    )
    THEN '✅ PASS: Índice único parcial unique_cedula_per_laboratory existe'
    ELSE '❌ FAIL: Índice único parcial unique_cedula_per_laboratory NO existe'
  END as resultado;

-- Ver detalles del índice
SELECT 
  '📊 Detalles del índice:' as info,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'patients'
  AND indexname = 'unique_cedula_per_laboratory';

-- Verificar que NO existe constraint global de cédula
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
        AND table_name = 'patients'
        AND constraint_name = 'patients_cedula_key'
    )
    THEN '✅ PASS: Constraint global de cédula fue eliminada correctamente'
    ELSE '⚠️  WARNING: Constraint global patients_cedula_key aún existe'
  END as resultado;

-- =====================================================
-- TEST 8: Verificar funciones helper
-- =====================================================

\echo ''
\echo '📋 TEST 8: Verificar funciones helper'

-- Verificar get_user_laboratory_id
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name = 'get_user_laboratory_id'
    )
    THEN '✅ PASS: Función get_user_laboratory_id existe'
    ELSE '❌ FAIL: Función get_user_laboratory_id NO existe'
  END as resultado;

-- Verificar test_multitenant_isolation
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name = 'test_multitenant_isolation'
    )
    THEN '✅ PASS: Función test_multitenant_isolation existe'
    ELSE '❌ FAIL: Función test_multitenant_isolation NO existe'
  END as resultado;

-- Verificar validate_laboratory_id
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name = 'validate_laboratory_id'
    )
    THEN '✅ PASS: Función validate_laboratory_id existe'
    ELSE '❌ FAIL: Función validate_laboratory_id NO existe'
  END as resultado;

-- =====================================================
-- TEST 9: Verificar triggers
-- =====================================================

\echo ''
\echo '📋 TEST 9: Verificar triggers de validación'

SELECT 
  trigger_name,
  event_object_table,
  '✅ Trigger configurado' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%validate_laboratory_id%'
ORDER BY event_object_table;

-- =====================================================
-- TEST 10: Verificar vista laboratory_stats
-- =====================================================

\echo ''
\echo '📋 TEST 10: Verificar vista laboratory_stats'

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name = 'laboratory_stats'
    )
    THEN '✅ PASS: Vista laboratory_stats existe'
    ELSE '❌ FAIL: Vista laboratory_stats NO existe'
  END as resultado;

-- Ver estadísticas de laboratorios
SELECT * FROM laboratory_stats;

-- =====================================================
-- TEST 11: Test de aislamiento (requiere usuario autenticado)
-- =====================================================

\echo ''
\echo '📋 TEST 11: Test de aislamiento multi-tenant'
\echo '⚠️  Este test requiere un usuario autenticado'
\echo '    Ejecutar desde la aplicación frontend o con auth.uid() válido'

-- Ejecutar función de testing (solo funciona con usuario autenticado)
-- SELECT * FROM test_multitenant_isolation();

-- =====================================================
-- TEST 12: Estadísticas generales
-- =====================================================

\echo ''
\echo '📋 TEST 12: Estadísticas generales del sistema'

SELECT 
  '📊 Estadísticas Generales' as seccion,
  (SELECT COUNT(*) FROM laboratories) as total_laboratorios,
  (SELECT COUNT(*) FROM patients) as total_pacientes,
  (SELECT COUNT(*) FROM medical_records_clean) as total_casos,
  (SELECT COUNT(*) FROM profiles) as total_usuarios,
  (SELECT COUNT(*) FROM change_logs) as total_logs;

-- Estadísticas por laboratorio
SELECT 
  l.name as laboratorio,
  l.status,
  COUNT(DISTINCT p.id) as pacientes,
  COUNT(DISTINCT m.id) as casos,
  COUNT(DISTINCT pr.id) as usuarios
FROM laboratories l
LEFT JOIN patients p ON p.laboratory_id = l.id
LEFT JOIN medical_records_clean m ON m.laboratory_id = l.id
LEFT JOIN profiles pr ON pr.laboratory_id = l.id
GROUP BY l.id, l.name, l.status
ORDER BY l.name;

-- =====================================================
-- RESUMEN FINAL
-- =====================================================

\echo ''
\echo '================================================'
\echo '📋 RESUMEN DE TESTS'
\echo '================================================'
\echo ''
\echo '✅ Si todos los tests pasaron:'
\echo '   - La migración multi-tenant está completa'
\echo '   - El sistema está listo para multi-tenancy'
\echo '   - Puedes proceder a actualizar el frontend'
\echo ''
\echo '❌ Si algún test falló:'
\echo '   - NO continuar con deploy a producción'
\echo '   - Revisar la migración que falló'
\echo '   - Considerar rollback y reintentar'
\echo ''
\echo '================================================'
\echo '🎉 TESTING COMPLETADO'
\echo '================================================'

