-- =====================================================
-- FASE 0: Análisis de Datos Existentes
-- =====================================================
-- Este script NO modifica datos, solo analiza
-- Ejecutar ANTES de comenzar la migración
-- =====================================================

-- 1. Estadísticas generales
SELECT 
  '=== ESTADÍSTICAS GENERALES ===' as seccion;

SELECT 
  COUNT(*) as total_pacientes,
  COUNT(cedula) as pacientes_con_cedula,
  COUNT(*) - COUNT(cedula) as pacientes_sin_cedula,
  COUNT(DISTINCT laboratory_id) as laboratorios_unicos
FROM patients;

-- 2. Distribución por tipo de documento
SELECT 
  '=== DISTRIBUCIÓN POR TIPO DE DOCUMENTO ===' as seccion;

SELECT 
  CASE 
    WHEN cedula IS NULL THEN 'SIN_CEDULA'
    WHEN cedula LIKE 'V-%' THEN 'V (Venezolano)'
    WHEN cedula LIKE 'E-%' THEN 'E (Extranjero)'
    WHEN cedula LIKE 'J-%' THEN 'J (Jurídico)'
    WHEN cedula LIKE 'C-%' THEN 'C (Comuna)'
    ELSE 'FORMATO_DESCONOCIDO'
  END as tipo_documento,
  COUNT(*) as cantidad,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients), 2) as porcentaje
FROM patients
GROUP BY tipo_documento
ORDER BY cantidad DESC;

-- 3. Pacientes por laboratorio
SELECT 
  '=== PACIENTES POR LABORATORIO ===' as seccion;

SELECT 
  l.name as laboratorio,
  l.slug,
  COUNT(p.id) as total_pacientes,
  COUNT(p.cedula) as con_cedula,
  COUNT(p.id) - COUNT(p.cedula) as sin_cedula
FROM laboratories l
LEFT JOIN patients p ON p.laboratory_id = l.id
GROUP BY l.id, l.name, l.slug
ORDER BY total_pacientes DESC;

-- 4. Análisis de formato de cédulas
SELECT 
  '=== ANÁLISIS DE FORMATO DE CÉDULAS ===' as seccion;

SELECT 
  CASE 
    WHEN cedula ~ '^[VEJC]-[0-9]+$' THEN 'FORMATO_CORRECTO'
    WHEN cedula IS NULL THEN 'SIN_CEDULA'
    ELSE 'FORMATO_INCORRECTO'
  END as formato,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      STRING_AGG(DISTINCT LEFT(cedula, 20), ', ' ORDER BY LEFT(cedula, 20))
    ELSE NULL
  END as ejemplos
FROM patients
WHERE cedula IS NOT NULL
GROUP BY formato
ORDER BY cantidad DESC;

-- 5. Posibles duplicados (mismo número, diferente prefijo)
SELECT 
  '=== POSIBLES DUPLICADOS (MISMO NÚMERO, DIFERENTE PREFIJO) ===' as seccion;

WITH cedulas_parseadas AS (
  SELECT 
    id,
    cedula,
    laboratory_id,
    CASE 
      WHEN cedula LIKE 'V-%' THEN SUBSTRING(cedula FROM 3)
      WHEN cedula LIKE 'E-%' THEN SUBSTRING(cedula FROM 3)
      WHEN cedula LIKE 'J-%' THEN SUBSTRING(cedula FROM 3)
      WHEN cedula LIKE 'C-%' THEN SUBSTRING(cedula FROM 3)
      ELSE cedula
    END as numero_sin_prefijo
  FROM patients
  WHERE cedula IS NOT NULL
)
SELECT 
  numero_sin_prefijo,
  COUNT(DISTINCT cedula) as variantes_cedula,
  COUNT(*) as total_pacientes,
  STRING_AGG(DISTINCT cedula, ', ' ORDER BY cedula) as cedulas_encontradas
FROM cedulas_parseadas
GROUP BY numero_sin_prefijo
HAVING COUNT(DISTINCT cedula) > 1
ORDER BY total_pacientes DESC
LIMIT 20;

-- 6. Pacientes con casos médicos asociados
SELECT 
  '=== PACIENTES CON CASOS MÉDICOS ===' as seccion;

SELECT 
  COUNT(DISTINCT p.id) as pacientes_con_casos,
  COUNT(DISTINCT CASE WHEN p.cedula IS NOT NULL THEN p.id END) as con_cedula_y_casos,
  COUNT(DISTINCT CASE WHEN p.cedula IS NULL THEN p.id END) as sin_cedula_y_casos
FROM patients p
INNER JOIN medical_records_clean m ON m.patient_id = p.id;

-- 7. Resumen para migración
SELECT 
  '=== RESUMEN PARA MIGRACIÓN ===' as seccion;

SELECT 
  'Total de identificaciones a crear' as descripcion,
  COUNT(*) as cantidad
FROM patients
WHERE cedula IS NOT NULL
UNION ALL
SELECT 
  'Pacientes sin cédula a marcar como menor',
  COUNT(*)
FROM patients
WHERE cedula IS NULL
UNION ALL
SELECT 
  'Pacientes que necesitan clasificación manual (tipo_paciente)',
  COUNT(*)
FROM patients
WHERE cedula IS NOT NULL; -- Estos necesitan clasificación manual

-- =====================================================
-- FIN DEL ANÁLISIS
-- =====================================================
-- Revisar estos resultados antes de continuar con FASE 1
-- =====================================================

