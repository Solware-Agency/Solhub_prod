-- =====================================================================
-- SCRIPT DE REPARACIÓN PARA LA MIGRACIÓN
-- =====================================================================
-- Este script limpia los problemas identificados y permite ejecutar la migración correctamente

-- PASO 1: Eliminar el constraint que está causando problemas (si existe)
ALTER TABLE change_logs DROP CONSTRAINT IF EXISTS change_logs_entity_check;

-- PASO 2: Verificar el estado actual de change_logs
SELECT 
    'Registros totales en change_logs' as descripcion,
    COUNT(*) as cantidad
FROM change_logs
UNION ALL
SELECT 
    'Registros con medical_record_id NULL' as descripcion,
    COUNT(*) as cantidad
FROM change_logs 
WHERE medical_record_id IS NULL
UNION ALL
SELECT 
    'Registros con medical_record_id que no existe en medical_records_clean' as descripcion,
    COUNT(*) as cantidad
FROM change_logs cl
WHERE cl.medical_record_id IS NOT NULL 
  AND cl.medical_record_id NOT IN (SELECT id FROM medical_records_clean);

-- PASO 3: Limpiar registros huérfanos o problemáticos
-- Opción A: Eliminar registros huérfanos (más agresivo pero limpio)
DELETE FROM change_logs 
WHERE medical_record_id IS NULL 
   OR (medical_record_id IS NOT NULL 
       AND medical_record_id NOT IN (SELECT id FROM medical_records_clean));

-- PASO 4: Verificar que la limpieza funcionó
SELECT 
    'Registros restantes después de limpieza' as descripcion,
    COUNT(*) as cantidad
FROM change_logs;

-- PASO 5: Ahora podemos agregar las columnas y constraints de forma segura
-- Agregar columnas si no existen
DO $$ 
BEGIN
    -- Agregar entity_type si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'change_logs' AND column_name = 'entity_type') THEN
        ALTER TABLE change_logs ADD COLUMN entity_type VARCHAR DEFAULT 'medical_case';
    END IF;
    
    -- Agregar patient_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'change_logs' AND column_name = 'patient_id') THEN
        ALTER TABLE change_logs ADD COLUMN patient_id UUID;
    END IF;
END $$;

-- PASO 6: Hacer medical_record_id nullable si no lo es ya
ALTER TABLE change_logs ALTER COLUMN medical_record_id DROP NOT NULL;

-- PASO 7: Verificar que la tabla patients tiene la estructura correcta
DO $$
DECLARE
    patients_id_type TEXT;
BEGIN
    -- Verificar el tipo de dato de patients.id
    SELECT data_type INTO patients_id_type
    FROM information_schema.columns 
    WHERE table_name = 'patients' 
      AND table_schema = 'public' 
      AND column_name = 'id';
    
    -- Solo agregar foreign key si patients.id es UUID
    IF patients_id_type = 'uuid' THEN
        -- Agregar foreign key a patients (si no existe)
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'change_logs_patient_id_fkey') THEN
            ALTER TABLE change_logs 
            ADD CONSTRAINT change_logs_patient_id_fkey 
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Foreign key agregado correctamente - patients.id es UUID';
    ELSE
        RAISE NOTICE 'ADVERTENCIA: No se puede agregar foreign key. patients.id es %, necesita ser uuid', patients_id_type;
        RAISE NOTICE 'Ejecuta primero fix_patients_table.sql';
    END IF;
END $$;

-- PASO 8: Agregar el constraint de validación (solo si patients está correcto)
DO $$
DECLARE
    patients_id_type TEXT;
BEGIN
    SELECT data_type INTO patients_id_type
    FROM information_schema.columns 
    WHERE table_name = 'patients' 
      AND table_schema = 'public' 
      AND column_name = 'id';
    
    IF patients_id_type = 'uuid' THEN
        -- Solo agregar constraint si patients está correcto
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'change_logs_entity_check') THEN
            ALTER TABLE change_logs 
            ADD CONSTRAINT change_logs_entity_check 
            CHECK (medical_record_id IS NOT NULL OR patient_id IS NOT NULL);
        END IF;
        RAISE NOTICE 'Constraint de validación agregado correctamente';
    ELSE
        RAISE NOTICE 'SALTANDO constraint - primero arregla la tabla patients';
    END IF;
END $$;

-- PASO 9: Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_change_logs_patient_id ON change_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_entity_type ON change_logs(entity_type);

-- PASO 10: Verificación final
SELECT 
    'VERIFICACIÓN FINAL - Registros en change_logs' as descripcion,
    COUNT(*) as cantidad
FROM change_logs
UNION ALL
SELECT 
    'Registros que cumplen con el constraint' as descripcion,
    COUNT(*) as cantidad
FROM change_logs 
WHERE medical_record_id IS NOT NULL OR patient_id IS NOT NULL;
