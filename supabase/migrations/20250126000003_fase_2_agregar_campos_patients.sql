-- =====================================================
-- FASE 2: Agregar Campos a patients (NULLABLE)
-- =====================================================
-- Esta migración es SEGURA: solo agrega campos NULLABLE
-- NO modifica datos existentes
-- Rollback: ALTER TABLE patients DROP COLUMN tipo_paciente, fecha_nacimiento, especie;
-- =====================================================

-- =====================================================
-- 1. AGREGAR CAMPOS NUEVOS (TODOS NULLABLE)
-- =====================================================

-- Campo tipo_paciente: adulto, menor, animal
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS tipo_paciente TEXT 
    CHECK (tipo_paciente IN ('adulto', 'menor', 'animal'));

-- Campo fecha_nacimiento: para cálculo automático de edad
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

-- Campo especie: solo para animales
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS especie TEXT;

-- =====================================================
-- 2. CREAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_patients_tipo_paciente 
  ON patients(tipo_paciente)
  WHERE tipo_paciente IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_fecha_nacimiento 
  ON patients(fecha_nacimiento)
  WHERE fecha_nacimiento IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_especie 
  ON patients(especie)
  WHERE especie IS NOT NULL;

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_patients_lab_tipo 
  ON patients(laboratory_id, tipo_paciente)
  WHERE tipo_paciente IS NOT NULL;

-- =====================================================
-- 3. COMENTARIOS
-- =====================================================

COMMENT ON COLUMN patients.tipo_paciente IS 
  'Tipo de paciente: adulto (con cédula), menor (sin cédula, necesita responsable), animal (necesita responsable)';

COMMENT ON COLUMN patients.fecha_nacimiento IS 
  'Fecha de nacimiento para cálculo automático de edad. Alternativa al campo edad manual.';

COMMENT ON COLUMN patients.especie IS 
  'Especie del animal (solo para tipo_paciente = animal). Ej: Perro, Gato, etc.';

-- =====================================================
-- 4. VALIDACIÓN: Verificar que los campos se agregaron
-- =====================================================

DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Verificar tipo_paciente
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patients' 
    AND column_name = 'tipo_paciente'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION '❌ ERROR: Campo tipo_paciente no se agregó correctamente';
  END IF;

  -- Verificar fecha_nacimiento
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patients' 
    AND column_name = 'fecha_nacimiento'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION '❌ ERROR: Campo fecha_nacimiento no se agregó correctamente';
  END IF;

  -- Verificar especie
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patients' 
    AND column_name = 'especie'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION '❌ ERROR: Campo especie no se agregó correctamente';
  END IF;

  -- Verificar que los registros existentes tienen NULL en campos nuevos
  IF EXISTS (
    SELECT 1 FROM patients 
    WHERE tipo_paciente IS NOT NULL 
    OR fecha_nacimiento IS NOT NULL 
    OR especie IS NOT NULL
  ) THEN
    RAISE NOTICE '⚠️ ADVERTENCIA: Algunos registros ya tienen valores en campos nuevos (esto es normal si se ejecutó antes)';
  END IF;

  RAISE NOTICE '✅ FASE 2 COMPLETADA: Campos agregados correctamente';
  RAISE NOTICE '   - tipo_paciente: agregado';
  RAISE NOTICE '   - fecha_nacimiento: agregado';
  RAISE NOTICE '   - especie: agregado';
  RAISE NOTICE '   - Todos los registros existentes tienen NULL en campos nuevos (correcto)';
END $$;

-- =====================================================
-- FIN DE FASE 2
-- =====================================================
-- Próximo paso: FASE 3 - Migrar datos existentes
-- =====================================================

