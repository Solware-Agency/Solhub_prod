-- =====================================================================
-- MIGRACIÓN PRINCIPAL - PASO 3: COMPLETAR LA RESTRUCTURACIÓN
-- =====================================================================
-- Este script completa la migración después de haber arreglado patients y change_logs
-- REQUISITOS: Ejecutar después de fix_patients_table.sql y reparar_migracion.sql
-- =====================================================================

-- =====================================================================
-- PASO 1: AGREGAR COLUMNA PATIENT_ID A MEDICAL_RECORDS_CLEAN
-- =====================================================================

-- 1.1: Agregar columna patient_id a medical_records_clean (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'medical_records_clean' AND column_name = 'patient_id') THEN
        ALTER TABLE medical_records_clean ADD COLUMN patient_id UUID;
        RAISE NOTICE 'Columna patient_id agregada a medical_records_clean';
    ELSE
        RAISE NOTICE 'Columna patient_id ya existe en medical_records_clean';
    END IF;
END $$;

-- 1.2: Crear índice en patient_id para optimizar joins
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records_clean(patient_id);

-- =====================================================================
-- PASO 2: MIGRAR DATOS EXISTENTES
-- =====================================================================

-- 2.1: Insertar pacientes únicos en la tabla patients
-- Extraemos los datos únicos por cedula, tomando el registro más reciente
WITH unique_patients AS (
    SELECT DISTINCT ON (id_number) 
        id_number as cedula,
        full_name as nombre,
        CASE 
            WHEN edad IS NOT NULL AND edad ~ '^[0-9]+$' THEN edad::INTEGER 
            ELSE NULL 
        END as edad,
        phone as telefono,
        email,
        created_at
    FROM medical_records_clean
    WHERE id_number IS NOT NULL AND id_number != ''
    ORDER BY id_number, created_at DESC
)
INSERT INTO patients (cedula, nombre, edad, telefono, email, created_at)
SELECT 
    cedula,
    nombre,
    edad,
    telefono,
    email,
    created_at
FROM unique_patients
ON CONFLICT (cedula) DO NOTHING; -- Evitar duplicados si ya existen

-- 2.2: Actualizar medical_records_clean con patient_id
UPDATE medical_records_clean mr
SET patient_id = p.id
FROM patients p
WHERE mr.id_number = p.cedula
  AND mr.patient_id IS NULL; -- Solo actualizar los que no tienen patient_id

-- 2.3: Verificar que todos los registros tienen patient_id
SELECT 
    'Registros sin patient_id (debe ser 0)' as verificacion,
    COUNT(*) as cantidad
FROM medical_records_clean 
WHERE patient_id IS NULL;

-- =====================================================================
-- PASO 3: AGREGAR FOREIGN KEY CONSTRAINT
-- =====================================================================

-- 3.1: Agregar constraint de foreign key (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'medical_records_clean_patient_id_fkey') THEN
        ALTER TABLE medical_records_clean 
        ADD CONSTRAINT medical_records_clean_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;
        RAISE NOTICE 'Foreign key constraint agregado a medical_records_clean';
    ELSE
        RAISE NOTICE 'Foreign key constraint ya existe en medical_records_clean';
    END IF;
END $$;

-- =====================================================================
-- PASO 4: ELIMINAR COLUMNAS REDUNDANTES DE MEDICAL_RECORDS_CLEAN
-- =====================================================================

-- 4.1: Verificar qué columnas vamos a eliminar
SELECT 
    'Columnas a eliminar de medical_records_clean:' as info,
    string_agg(column_name, ', ') as columnas
FROM information_schema.columns 
WHERE table_name = 'medical_records_clean' 
  AND column_name IN ('full_name', 'id_number', 'phone', 'email', 'edad');

-- 4.2: Eliminar las columnas de datos de paciente (ahora están en patients)
DO $$
BEGIN
    -- Eliminar full_name si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'medical_records_clean' AND column_name = 'full_name') THEN
        ALTER TABLE medical_records_clean DROP COLUMN full_name;
        RAISE NOTICE 'Columna full_name eliminada';
    END IF;
    
    -- Eliminar id_number si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'medical_records_clean' AND column_name = 'id_number') THEN
        ALTER TABLE medical_records_clean DROP COLUMN id_number;
        RAISE NOTICE 'Columna id_number eliminada';
    END IF;
    
    -- Eliminar phone si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'medical_records_clean' AND column_name = 'phone') THEN
        ALTER TABLE medical_records_clean DROP COLUMN phone;
        RAISE NOTICE 'Columna phone eliminada';
    END IF;
    
    -- Eliminar email si existe (de medical_records_clean)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'medical_records_clean' AND column_name = 'email') THEN
        ALTER TABLE medical_records_clean DROP COLUMN email;
        RAISE NOTICE 'Columna email eliminada';
    END IF;
    
    -- Eliminar edad si existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'medical_records_clean' AND column_name = 'edad') THEN
        ALTER TABLE medical_records_clean DROP COLUMN edad;
        RAISE NOTICE 'Columna edad eliminada';
    END IF;
END $$;

-- =====================================================================
-- PASO 5: CREAR TRIGGERS PARA MANTENER UPDATED_AT
-- =====================================================================

-- 5.1: Función para actualizar timestamp (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5.2: Trigger para patients (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'update_patients_updated_at') THEN
        CREATE TRIGGER update_patients_updated_at 
            BEFORE UPDATE ON patients 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger update_patients_updated_at creado';
    ELSE
        RAISE NOTICE 'Trigger update_patients_updated_at ya existe';
    END IF;
END $$;

-- =====================================================================
-- PASO 6: CREAR VISTAS ÚTILES PARA REPORTES
-- =====================================================================

-- 6.1: Vista para obtener casos con datos del paciente
CREATE OR REPLACE VIEW medical_cases_with_patient AS
SELECT 
    mr.*,
    p.cedula,
    p.nombre,
    p.edad,
    p.telefono,
    p.email as patient_email
FROM medical_records_clean mr
INNER JOIN patients p ON mr.patient_id = p.id;

-- 6.2: Vista para estadísticas de pacientes
CREATE OR REPLACE VIEW patient_statistics AS
SELECT 
    p.id,
    p.cedula,
    p.nombre,
    p.edad,
    p.telefono,
    p.email,
    p.created_at,
    COUNT(mr.id) as total_cases,
    MIN(mr.created_at) as first_case_date,
    MAX(mr.created_at) as last_case_date,
    SUM(mr.total_amount) as total_amount_all_cases
FROM patients p
LEFT JOIN medical_records_clean mr ON p.id = mr.patient_id
GROUP BY p.id, p.cedula, p.nombre, p.edad, p.telefono, p.email, p.created_at;

-- =====================================================================
-- PASO 7: AGREGAR COMENTARIOS DESCRIPTIVOS
-- =====================================================================

-- 7.1: Agregar comentarios a las columnas nuevas
COMMENT ON COLUMN medical_records_clean.patient_id IS 'Referencia al paciente en la tabla patients';

-- =====================================================================
-- PASO 8: VERIFICACIONES FINALES
-- =====================================================================

-- 8.1: Verificar que la migración fue exitosa
SELECT 
    'VERIFICACIÓN 1: Total de pacientes únicos' as verificacion,
    COUNT(*) as count
FROM patients
UNION ALL
SELECT 
    'VERIFICACIÓN 2: Total de casos médicos' as verificacion,
    COUNT(*) as count
FROM medical_records_clean
UNION ALL
SELECT 
    'VERIFICACIÓN 3: Casos sin patient_id (debe ser 0)' as verificacion,
    COUNT(*) as count
FROM medical_records_clean 
WHERE patient_id IS NULL
UNION ALL
SELECT 
    'VERIFICACIÓN 4: Casos con patient_id válido' as verificacion,
    COUNT(*) as count
FROM medical_records_clean mr
INNER JOIN patients p ON mr.patient_id = p.id
UNION ALL
SELECT 
    'VERIFICACIÓN 5: Total de change_logs' as verificacion,
    COUNT(*) as count
FROM change_logs;

-- 8.2: Verificar estructura final de las tablas
SELECT 
    'ESTRUCTURA FINAL - Columnas en patients:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columnas
FROM information_schema.columns 
WHERE table_name = 'patients' AND table_schema = 'public'
UNION ALL
SELECT 
    'ESTRUCTURA FINAL - Nuevas columnas en change_logs:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columnas
FROM information_schema.columns 
WHERE table_name = 'change_logs' 
  AND table_schema = 'public'
  AND column_name IN ('entity_type', 'patient_id');

-- 8.3: Probar las vistas creadas
SELECT 
    'PRUEBA VISTA - Primeros 3 casos con paciente:' as info,
    COUNT(*) as total_registros
FROM medical_cases_with_patient
LIMIT 1;

SELECT 
    'PRUEBA VISTA - Estadísticas de pacientes:' as info,
    COUNT(*) as total_pacientes_con_stats
FROM patient_statistics
LIMIT 1;

-- =====================================================================
-- MIGRACIÓN PRINCIPAL COMPLETADA ✅
-- =====================================================================

-- 🎉 ESTRUCTURA FINAL LOGRADA:
-- 
-- 1. ✅ patients: Datos únicos de pacientes (UUID, cedula, nombre, etc.)
-- 2. ✅ medical_records_clean: Solo datos de casos + patient_id (sin duplicar datos de paciente)
-- 3. ✅ change_logs: Historial unificado para pacientes y casos
-- 
-- 🚀 BENEFICIOS OBTENIDOS:
-- ✅ Un paciente = Un registro único
-- ✅ Eliminación total de duplicación de datos
-- ✅ Actualizaciones eficientes (un solo lugar)
-- ✅ Reportes precisos (conteos reales)
-- ✅ Historial de cambios unificado
-- ✅ Mejor integridad referencial
-- ✅ Vistas optimizadas para consultas complejas
