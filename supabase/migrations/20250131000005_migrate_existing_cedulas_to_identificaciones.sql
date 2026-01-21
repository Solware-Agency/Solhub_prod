-- =====================================================
-- MIGRACIÓN: Datos Existentes (patients.cedula → identificaciones)
-- =====================================================
-- Esta migración migra todos los pacientes existentes
-- que tienen cédula en patients.cedula a la tabla identificaciones
-- 
-- CARACTERÍSTICAS:
-- - Solo migra pacientes con cédula válida (no NULL, no 'S/C')
-- - Parsea cédula para extraer tipo (V, E, J, C) y número
-- - Evita duplicados (ON CONFLICT DO NOTHING)
-- - Mantiene multi-tenant (laboratory_id)
-- - NO modifica datos existentes en patients
-- 
-- SEGURIDAD:
-- - Puede ejecutarse múltiples veces sin problemas (idempotente)
-- - No elimina datos existentes
-- - Rollback: DELETE FROM identificaciones WHERE created_at >= [fecha_migración]
-- =====================================================

-- =====================================================
-- 1. FUNCIÓN HELPER: Parsear cédula
-- =====================================================
-- Extrae tipo y número de una cédula en formato "V-12345678"
-- =====================================================

CREATE OR REPLACE FUNCTION parse_cedula_for_migration(cedula_text TEXT)
RETURNS TABLE (
  tipo_documento TEXT,
  numero TEXT
) 
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  tipo TEXT;
  numero TEXT;
BEGIN
  -- Si es NULL o vacío, retornar NULL
  IF cedula_text IS NULL OR TRIM(cedula_text) = '' OR TRIM(cedula_text) = 'S/C' THEN
    RETURN;
  END IF;

  -- Intentar parsear formato "V-12345678" o "E-12345678"
  IF cedula_text ~ '^([VEJC])-([0-9]+)$' THEN
    tipo := UPPER(SUBSTRING(cedula_text FROM '^([VEJC])-'));
    numero := SUBSTRING(cedula_text FROM '-([0-9]+)$');
    RETURN QUERY SELECT tipo, numero;
    RETURN;
  END IF;

  -- Si empieza con letra pero sin guion: "V12345678"
  IF cedula_text ~ '^[VEJC][0-9]+$' THEN
    tipo := UPPER(SUBSTRING(cedula_text FROM '^([VEJC])'));
    numero := SUBSTRING(cedula_text FROM '^[VEJC]([0-9]+)$');
    RETURN QUERY SELECT tipo, numero;
    RETURN;
  END IF;

  -- Si solo tiene números, asumir V (Venezolano)
  IF cedula_text ~ '^[0-9]+$' THEN
    tipo := 'V';
    numero := cedula_text;
    RETURN QUERY SELECT tipo, numero;
    RETURN;
  END IF;

  -- Si no coincide con ningún patrón, retornar vacío
  RETURN;
END;
$$;

-- =====================================================
-- 2. MIGRACIÓN DE DATOS
-- =====================================================
-- Migra todos los pacientes con cédula válida
-- =====================================================

INSERT INTO identificaciones (
  laboratory_id,
  paciente_id,
  tipo_documento,
  numero,
  created_at,
  updated_at
)
SELECT DISTINCT
  p.laboratory_id,
  p.id as paciente_id,
  parsed.tipo_documento,
  parsed.numero,
  COALESCE(p.created_at, NOW()) as created_at, -- Usar fecha de creación del paciente
  NOW() as updated_at
FROM patients p
CROSS JOIN LATERAL parse_cedula_for_migration(p.cedula) as parsed
WHERE 
  -- Solo pacientes con cédula válida
  p.cedula IS NOT NULL 
  AND p.cedula != 'S/C'
  AND TRIM(p.cedula) != ''
  -- Solo si el parseo fue exitoso
  AND parsed.tipo_documento IS NOT NULL
  AND parsed.numero IS NOT NULL
  -- Excluir pacientes que ya tienen identificación con estos datos
  AND NOT EXISTS (
    SELECT 1 
    FROM identificaciones i
    WHERE i.paciente_id = p.id
      AND i.tipo_documento = parsed.tipo_documento
      AND i.numero = parsed.numero
      AND i.laboratory_id = p.laboratory_id
  )
ON CONFLICT (laboratory_id, numero, tipo_documento) DO NOTHING;

-- =====================================================
-- 3. VERIFICACIÓN Y REPORTE
-- =====================================================
-- Genera un reporte de la migración
-- =====================================================

DO $$
DECLARE
  total_pacientes_con_cedula INTEGER;
  total_identificaciones_migradas INTEGER;
  pacientes_sin_migrar INTEGER;
BEGIN
  -- Contar pacientes con cédula
  SELECT COUNT(*) INTO total_pacientes_con_cedula
  FROM patients
  WHERE cedula IS NOT NULL 
    AND cedula != 'S/C'
    AND TRIM(cedula) != '';

  -- Contar identificaciones migradas
  SELECT COUNT(*) INTO total_identificaciones_migradas
  FROM identificaciones;

  -- Contar pacientes que deberían tener identificación pero no la tienen
  SELECT COUNT(*) INTO pacientes_sin_migrar
  FROM patients p
  WHERE p.cedula IS NOT NULL 
    AND p.cedula != 'S/C'
    AND TRIM(p.cedula) != ''
    AND NOT EXISTS (
      SELECT 1 
      FROM identificaciones i
      WHERE i.paciente_id = p.id
    );

  -- Mostrar reporte
  RAISE NOTICE '================================================';
  RAISE NOTICE 'REPORTE DE MIGRACIÓN DE IDENTIFICACIONES';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total pacientes con cédula: %', total_pacientes_con_cedula;
  RAISE NOTICE 'Total identificaciones migradas: %', total_identificaciones_migradas;
  RAISE NOTICE 'Pacientes sin migrar: %', pacientes_sin_migrar;
  RAISE NOTICE '================================================';
END $$;

-- =====================================================
-- 4. LIMPIEZA: Eliminar función helper (opcional)
-- =====================================================
-- La función puede mantenerse para uso futuro o eliminarse
-- =====================================================

-- DROP FUNCTION IF EXISTS parse_cedula_for_migration(TEXT);

-- =====================================================
-- 5. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION parse_cedula_for_migration IS 
  'Función helper para parsear cédulas durante la migración. Extrae tipo (V, E, J, C) y número de una cédula en formato "V-12345678". Puede eliminarse después de la migración.';

-- =====================================================
-- 6. VERIFICACIÓN MANUAL (OPCIONAL)
-- =====================================================
-- Ejecutar estos queries para verificar la migración:
-- 
-- -- Ver pacientes con cédula pero sin identificación
-- SELECT p.id, p.cedula, p.nombre
-- FROM patients p
-- WHERE p.cedula IS NOT NULL 
--   AND p.cedula != 'S/C'
--   AND NOT EXISTS (
--     SELECT 1 FROM identificaciones i WHERE i.paciente_id = p.id
--   );
-- 
-- -- Ver distribución de tipos de documento migrados
-- SELECT tipo_documento, COUNT(*) as cantidad
-- FROM identificaciones
-- GROUP BY tipo_documento
-- ORDER BY cantidad DESC;
-- 
-- -- Verificar que no hay duplicados
-- SELECT laboratory_id, tipo_documento, numero, COUNT(*) as duplicados
-- FROM identificaciones
-- GROUP BY laboratory_id, tipo_documento, numero
-- HAVING COUNT(*) > 1;
-- =====================================================
