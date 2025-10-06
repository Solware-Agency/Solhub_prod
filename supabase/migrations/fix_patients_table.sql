-- =====================================================================
-- ARREGLAR TABLA PATIENTS - CAMBIAR DE BIGINT A UUID
-- =====================================================================

-- PASO 1: Verificar si la tabla patients tiene datos
SELECT COUNT(*) as total_registros FROM patients;

-- PASO 2: Como la tabla patients está vacía (según el listado anterior), 
-- podemos eliminarla y recrearla correctamente

-- Eliminar tabla patients actual
DROP TABLE IF EXISTS patients CASCADE;

-- PASO 3: Crear la tabla patients con estructura correcta
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

-- PASO 4: Habilitar RLS en patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear políticas para patients
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

-- PASO 6: Crear índices para optimizar consultas
CREATE INDEX idx_patients_cedula ON patients(cedula);
CREATE INDEX idx_patients_created_at ON patients(created_at);

-- PASO 7: Agregar comentarios
COMMENT ON TABLE patients IS 'Tabla de pacientes únicos - cada paciente tiene un solo registro';
COMMENT ON COLUMN patients.cedula IS 'Número de cédula único del paciente';
COMMENT ON COLUMN patients.version IS 'Versión para control de cambios optimista';

-- PASO 8: Verificar que la tabla se creó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'patients' AND table_schema = 'public'
ORDER BY ordinal_position;
