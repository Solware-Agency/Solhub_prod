-- =====================================================
-- FASE 3: Migrar Datos Existentes
-- =====================================================
-- Esta migración:
-- 1. Pobla tabla identificaciones con datos de patients.cedula
-- 2. Marca pacientes sin cédula como 'menor'
-- Rollback: DELETE FROM identificaciones; UPDATE patients SET tipo_paciente = NULL;
-- =====================================================

-- =====================================================
-- 1. FUNCIÓN HELPER: Parsear cédula
-- =====================================================
-- Extrae tipo y número del formato "V-12345678"
-- =====================================================

CREATE OR REPLACE FUNCTION parse_cedula(cedula_text TEXT)
RETURNS TABLE(tipo TEXT, numero TEXT) AS $$
BEGIN
  -- Si no hay cédula, retornar vacío
  IF cedula_text IS NULL OR TRIM(cedula_text) = '' THEN
    RETURN;
  END IF;
  
  -- Extraer tipo y número del formato "V-12345678"
  IF cedula_text ~ '^([VEJC])-(.+)$' THEN
    RETURN QUERY SELECT 
      SUBSTRING(cedula_text FROM '^([VEJC])-')::TEXT as tipo,
      SUBSTRING(cedula_text FROM '^[VEJC]-(.+)$')::TEXT as numero;
  ELSE
    -- Si no tiene formato estándar, intentar detectar tipo
    IF cedula_text ~ '^[0-9]+$' THEN
      -- Solo números, asumir V (Venezolano) por defecto
      RETURN QUERY SELECT 'V'::TEXT as tipo, cedula_text as numero;
    ELSE
      -- Formato desconocido, intentar extraer
      IF cedula_text LIKE 'V%' OR cedula_text LIKE 'v%' THEN
        RETURN QUERY SELECT 'V'::TEXT as tipo, REPLACE(REPLACE(cedula_text, 'V-', ''), 'v-', '') as numero;
      ELSIF cedula_text LIKE 'E%' OR cedula_text LIKE 'e%' THEN
        RETURN QUERY SELECT 'E'::TEXT as tipo, REPLACE(REPLACE(cedula_text, 'E-', ''), 'e-', '') as numero;
      ELSIF cedula_text LIKE 'J%' OR cedula_text LIKE 'j%' THEN
        RETURN QUERY SELECT 'J'::TEXT as tipo, REPLACE(REPLACE(cedula_text, 'J-', ''), 'j-', '') as numero;
      ELSIF cedula_text LIKE 'C%' OR cedula_text LIKE 'c%' THEN
        RETURN QUERY SELECT 'C'::TEXT as tipo, REPLACE(REPLACE(cedula_text, 'C-', ''), 'c-', '') as numero;
      ELSE
        -- Formato desconocido, asumir V y usar toda la cédula como número
        RETURN QUERY SELECT 'V'::TEXT as tipo, cedula_text as numero;
      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. MIGRAR PACIENTES CON CÉDULA A identificaciones
-- =====================================================

INSERT INTO identificaciones (laboratory_id, paciente_id, tipo_documento, numero)
SELECT 
  p.laboratory_id,
  p.id as paciente_id,
  parsed.tipo as tipo_documento,
  parsed.numero
FROM patients p
CROSS JOIN LATERAL parse_cedula(p.cedula) parsed
WHERE p.cedula IS NOT NULL
  AND TRIM(p.cedula) != ''
  AND NOT EXISTS (
    SELECT 1 FROM identificaciones i 
    WHERE i.paciente_id = p.id
  )
ON CONFLICT (laboratory_id, numero, tipo_documento) DO NOTHING;

-- =====================================================
-- 3. MARCAR PACIENTES SIN CÉDULA COMO 'menor'
-- =====================================================
-- Según la lógica del plan: pacientes sin cédula son menores
-- =====================================================

UPDATE patients
SET tipo_paciente = 'menor'
WHERE cedula IS NULL 
  AND tipo_paciente IS NULL;

-- =====================================================
-- 4. ESTADÍSTICAS DE MIGRACIÓN
-- =====================================================

DO $$
DECLARE
  total_pacientes INTEGER;
  pacientes_con_cedula INTEGER;
  identificaciones_creadas INTEGER;
  pacientes_marcados_menor INTEGER;
BEGIN
  -- Contar totales
  SELECT COUNT(*) INTO total_pacientes FROM patients;
  SELECT COUNT(*) INTO pacientes_con_cedula FROM patients WHERE cedula IS NOT NULL;
  SELECT COUNT(*) INTO identificaciones_creadas FROM identificaciones;
  SELECT COUNT(*) INTO pacientes_marcados_menor FROM patients WHERE tipo_paciente = 'menor' AND cedula IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ESTADÍSTICAS DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de pacientes: %', total_pacientes;
  RAISE NOTICE 'Pacientes con cédula: %', pacientes_con_cedula;
  RAISE NOTICE 'Identificaciones creadas: %', identificaciones_creadas;
  RAISE NOTICE 'Pacientes sin cédula marcados como menor: %', pacientes_marcados_menor;
  RAISE NOTICE '========================================';

  -- Validación: verificar que la migración fue exitosa
  IF identificaciones_creadas < pacientes_con_cedula * 0.9 THEN
    RAISE WARNING '⚠️ ADVERTENCIA: Menos del 90%% de las cédulas se migraron. Revisar posibles errores.';
  END IF;

  IF pacientes_marcados_menor != (total_pacientes - pacientes_con_cedula) THEN
    RAISE WARNING '⚠️ ADVERTENCIA: No todos los pacientes sin cédula se marcaron como menor. Revisar.';
  END IF;

  RAISE NOTICE '✅ FASE 3 COMPLETADA: Datos migrados correctamente';
END $$;

-- =====================================================
-- 5. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que no hay pacientes con cédula sin identificación
SELECT 
  'Pacientes con cédula sin identificación' as descripcion,
  COUNT(*) as cantidad
FROM patients p
WHERE p.cedula IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM identificaciones i WHERE i.paciente_id = p.id
  );

-- Verificar distribución de tipos de documento en identificaciones
SELECT 
  'Distribución de tipos de documento' as descripcion,
  tipo_documento,
  COUNT(*) as cantidad
FROM identificaciones
GROUP BY tipo_documento
ORDER BY cantidad DESC;

-- =====================================================
-- FIN DE FASE 3
-- =====================================================
-- Próximo paso: FASE 4 - Crear funciones helper en backend
-- =====================================================

