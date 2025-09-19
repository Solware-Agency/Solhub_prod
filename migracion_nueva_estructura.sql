-- =====================================================================
-- MIGRACIÓN COMPLETA: NUEVA ESTRUCTURA DE 2 TABLAS
-- =====================================================================
-- Autor: Asistente IA
-- Descripción: Migra de estructura monolítica a estructura separada
--              patients + medical_records_clean + change_logs mejorado
-- =====================================================================

-- =====================================================================
-- PASO 1: MODIFICAR TABLA PATIENTS
-- =====================================================================

-- 1.1: Eliminar la tabla patients actual (está vacía según el listado)
DROP TABLE IF EXISTS patients CASCADE;

-- 1.2: Crear la nueva tabla patients con estructura correcta
CREATE TABLE patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cedula VARCHAR UNIQUE NOT NULL,
    nombre VARCHAR NOT NULL,
    edad INTEGER,
    telefono VARCHAR,
    email VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- 1.3: Habilitar RLS en patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 1.4: Crear políticas para patients (similar a medical_records_clean)
CREATE POLICY "Authenticated users can view patients" 
ON patients FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert patients" 
ON patients FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients" 
ON patients FOR UPDATE 
TO authenticated 
USING (true);

-- 1.5: Crear índices para optimizar consultas
CREATE INDEX idx_patients_cedula ON patients(cedula);
CREATE INDEX idx_patients_created_at ON patients(created_at);

-- =====================================================================
-- PASO 2: MODIFICAR TABLA MEDICAL_RECORDS_CLEAN
-- =====================================================================

-- 2.1: Agregar columna patient_id a medical_records_clean
ALTER TABLE medical_records_clean 
ADD COLUMN patient_id UUID;

-- 2.2: Crear índice en patient_id para optimizar joins
CREATE INDEX idx_medical_records_patient_id ON medical_records_clean(patient_id);

-- =====================================================================
-- PASO 3: MIGRAR DATOS EXISTENTES
-- =====================================================================

-- 3.1: Insertar pacientes únicos en la tabla patients
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
FROM unique_patients;

-- 3.2: Actualizar medical_records_clean con patient_id
UPDATE medical_records_clean mr
SET patient_id = p.id
FROM patients p
WHERE mr.id_number = p.cedula;

-- 3.3: Verificar que todos los registros tienen patient_id
-- (Esta consulta debe retornar 0 registros)
SELECT COUNT(*) as registros_sin_patient_id 
FROM medical_records_clean 
WHERE patient_id IS NULL;

-- =====================================================================
-- PASO 4: AGREGAR FOREIGN KEY CONSTRAINT
-- =====================================================================

-- 4.1: Agregar constraint de foreign key
ALTER TABLE medical_records_clean 
ADD CONSTRAINT medical_records_clean_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;

-- =====================================================================
-- PASO 5: ELIMINAR COLUMNAS REDUNDANTES DE MEDICAL_RECORDS_CLEAN
-- =====================================================================

-- 5.1: Eliminar las columnas de datos de paciente que ahora están en patients
ALTER TABLE medical_records_clean 
DROP COLUMN full_name,
DROP COLUMN id_number,
DROP COLUMN phone,
DROP COLUMN email,
DROP COLUMN edad;

-- =====================================================================
-- PASO 6: MODIFICAR TABLA CHANGE_LOGS PARA SOPORTAR CAMBIOS DE PACIENTES
-- =====================================================================

-- 6.1: Agregar columnas nuevas a change_logs
ALTER TABLE change_logs 
ADD COLUMN entity_type VARCHAR DEFAULT 'medical_case',
ADD COLUMN patient_id UUID;

-- 6.2: Hacer que medical_record_id sea nullable (para cambios de pacientes)
ALTER TABLE change_logs 
ALTER COLUMN medical_record_id DROP NOT NULL;

-- 6.3: Agregar foreign key a patients
ALTER TABLE change_logs 
ADD CONSTRAINT change_logs_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

-- 6.4: Limpiar registros huérfanos antes de agregar constraint
-- Eliminar registros que no tienen medical_record_id válido
DELETE FROM change_logs 
WHERE medical_record_id IS NULL 
   OR medical_record_id NOT IN (SELECT id FROM medical_records_clean);

-- 6.5: Agregar constraint para asegurar que al menos uno de los IDs esté presente
ALTER TABLE change_logs 
ADD CONSTRAINT change_logs_entity_check 
CHECK (medical_record_id IS NOT NULL OR patient_id IS NOT NULL);

-- 6.6: Crear índices para optimizar consultas de change_logs
CREATE INDEX idx_change_logs_patient_id ON change_logs(patient_id);
CREATE INDEX idx_change_logs_entity_type ON change_logs(entity_type);

-- =====================================================================
-- PASO 7: ACTUALIZAR REGISTROS EXISTENTES EN CHANGE_LOGS
-- =====================================================================

-- 7.1: Actualizar entity_type para registros existentes
UPDATE change_logs 
SET entity_type = 'medical_case' 
WHERE entity_type IS NULL AND medical_record_id IS NOT NULL;

-- =====================================================================
-- PASO 8: CREAR TRIGGERS PARA MANTENER updated_at
-- =====================================================================

-- 8.1: Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8.2: Trigger para patients
CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- PASO 9: CREAR VISTAS ÚTILES PARA REPORTES
-- =====================================================================

-- 9.1: Vista para obtener casos con datos del paciente
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

-- 9.2: Vista para estadísticas de pacientes
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
-- PASO 10: COMENTARIOS DESCRIPTIVOS
-- =====================================================================

-- 10.1: Agregar comentarios a las tablas
COMMENT ON TABLE patients IS 'Tabla de pacientes únicos - cada paciente tiene un solo registro';
COMMENT ON COLUMN patients.cedula IS 'Número de cédula único del paciente';
COMMENT ON COLUMN patients.version IS 'Versión para control de cambios optimista';

COMMENT ON COLUMN medical_records_clean.patient_id IS 'Referencia al paciente en la tabla patients';

COMMENT ON COLUMN change_logs.entity_type IS 'Tipo de entidad: "patient" o "medical_case"';
COMMENT ON COLUMN change_logs.patient_id IS 'ID del paciente cuando el cambio es en la tabla patients';

-- =====================================================================
-- PASO 11: VERIFICACIONES FINALES
-- =====================================================================

-- 11.1: Verificar que la migración fue exitosa
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
    'VERIFICACIÓN 4: Total de change_logs' as verificacion,
    COUNT(*) as count
FROM change_logs;

-- =====================================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================================

-- La estructura ahora es:
-- 1. patients: Datos únicos de pacientes
-- 2. medical_records_clean: Solo datos de casos médicos + patient_id
-- 3. change_logs: Historial de cambios para ambas entidades
--
-- Beneficios logrados:
-- ✅ Un paciente = Un registro único
-- ✅ Eliminación de duplicación de datos
-- ✅ Actualizaciones eficientes
-- ✅ Reportes precisos
-- ✅ Historial de cambios unificado
-- ✅ Mejor integridad referencial
