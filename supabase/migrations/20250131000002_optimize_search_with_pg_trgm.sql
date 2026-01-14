-- =====================================================
-- OPTIMIZACIÓN DE BÚSQUEDA CON pg_trgm
-- =====================================================
-- Esta migración crea índices GIN para búsqueda rápida
-- usando trigramas (método usado por GitHub, GitLab)
-- 
-- BENEFICIOS:
-- - 10-100x más rápido que ILIKE en búsquedas parciales
-- - Búsqueda aproximada (typos, variaciones)
-- - Escalable a millones de registros
-- 
-- SEGURIDAD: Solo agrega índices y funciones nuevas
-- No modifica datos ni estructura existente
-- =====================================================

-- =====================================================
-- 1. HABILITAR EXTENSIÓN pg_trgm
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- 2. CREAR ÍNDICES GIN PARA BÚSQUEDA DE TEXTO
-- =====================================================

-- Índice GIN para búsqueda rápida de nombres
-- Permite búsquedas parciales como "Juan" encontrando "Juan Carlos"
CREATE INDEX IF NOT EXISTS idx_patients_nombre_trgm 
ON patients USING gin(nombre gin_trgm_ops)
WHERE nombre IS NOT NULL;

-- Índice GIN para búsqueda rápida de teléfonos
-- Permite búsquedas parciales de números de teléfono
CREATE INDEX IF NOT EXISTS idx_patients_telefono_trgm 
ON patients USING gin(telefono gin_trgm_ops)
WHERE telefono IS NOT NULL;

-- Índice GIN para búsqueda rápida de cédulas
-- Permite búsquedas parciales de números de cédula
CREATE INDEX IF NOT EXISTS idx_patients_cedula_trgm 
ON patients USING gin(cedula gin_trgm_ops)
WHERE cedula IS NOT NULL;

-- Índice compuesto para búsqueda multi-campo
-- Combina nombre, teléfono y cédula en un solo índice
CREATE INDEX IF NOT EXISTS idx_patients_search_trgm 
ON patients USING gin(
  (nombre || ' ' || COALESCE(telefono, '') || ' ' || COALESCE(cedula, '')) gin_trgm_ops
)
WHERE laboratory_id IS NOT NULL;

-- Índice para identificaciones (nuevo sistema)
-- Permite búsqueda rápida por número de identificación
CREATE INDEX IF NOT EXISTS idx_identificaciones_numero_trgm 
ON identificaciones USING gin(numero gin_trgm_ops)
WHERE numero IS NOT NULL;

-- =====================================================
-- 3. FUNCIÓN OPTIMIZADA PARA BÚSQUEDA DE PACIENTES
-- =====================================================

CREATE OR REPLACE FUNCTION search_patients_optimized(
  search_term TEXT,
  lab_id UUID,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  cedula TEXT,
  telefono TEXT,
  email TEXT,
  gender TEXT,
  tipo_paciente TEXT,
  edad TEXT,
  fecha_nacimiento DATE,
  especie TEXT,
  similarity_score REAL
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nombre,
    p.cedula,
    p.telefono,
    p.email,
    p.gender,
    p.tipo_paciente,
    p.edad,
    p.fecha_nacimiento,
    p.especie,
    -- Calcular score de similitud (mayor = más relevante)
    GREATEST(
      similarity(p.nombre, search_term),
      similarity(COALESCE(p.telefono, ''), search_term),
      similarity(COALESCE(p.cedula, ''), search_term)
    ) as similarity_score
  FROM patients p
  WHERE p.laboratory_id = lab_id
    AND (
      -- Búsqueda usando operador % (similarity > 0.3 por defecto)
      p.nombre % search_term OR
      p.telefono % search_term OR
      p.cedula % search_term
    )
  ORDER BY 
    -- Ordenar por similitud descendente (más relevantes primero)
    similarity_score DESC,
    -- Luego por nombre alfabéticamente
    p.nombre ASC
  LIMIT result_limit;
END;
$$;

-- =====================================================
-- 4. FUNCIÓN OPTIMIZADA PARA BÚSQUEDA POR IDENTIFICACIÓN
-- =====================================================

CREATE OR REPLACE FUNCTION search_identifications_optimized(
  search_numero TEXT,
  lab_id UUID,
  tipo_documento_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  paciente_id UUID,
  tipo_documento TEXT,
  numero TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.paciente_id,
    i.tipo_documento,
    i.numero,
    similarity(i.numero, search_numero) as similarity_score
  FROM identificaciones i
  WHERE i.laboratory_id = lab_id
    AND i.numero % search_numero
    AND (tipo_documento_filter IS NULL OR i.tipo_documento = tipo_documento_filter)
  ORDER BY similarity_score DESC
  LIMIT 5; -- Limitar resultados para autocomplete
END;
$$;

-- =====================================================
-- 5. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON INDEX idx_patients_nombre_trgm IS 
  'Índice GIN para búsqueda rápida de nombres usando trigramas (método GitHub/GitLab). Permite búsquedas parciales 10-100x más rápidas que ILIKE.';

COMMENT ON INDEX idx_patients_telefono_trgm IS 
  'Índice GIN para búsqueda rápida de teléfonos usando trigramas. Permite búsquedas parciales de números.';

COMMENT ON INDEX idx_patients_cedula_trgm IS 
  'Índice GIN para búsqueda rápida de cédulas usando trigramas. Permite búsquedas parciales de números.';

COMMENT ON INDEX idx_patients_search_trgm IS 
  'Índice GIN compuesto para búsqueda multi-campo (nombre + teléfono + cédula). Optimiza búsquedas que buscan en múltiples campos.';

COMMENT ON INDEX idx_identificaciones_numero_trgm IS 
  'Índice GIN para búsqueda rápida de números de identificación usando trigramas.';

COMMENT ON FUNCTION search_patients_optimized IS 
  'Función optimizada para búsqueda de pacientes usando pg_trgm. 10-100x más rápida que ILIKE en tablas grandes. Retorna resultados ordenados por relevancia (similarity_score).';

COMMENT ON FUNCTION search_identifications_optimized IS 
  'Función optimizada para búsqueda de identificaciones usando pg_trgm. Permite búsqueda rápida por número con filtro opcional de tipo.';

-- =====================================================
-- 6. ÍNDICES GIN PARA BÚSQUEDA DE CASOS MÉDICOS
-- =====================================================

-- Índice GIN para búsqueda rápida de códigos de casos
CREATE INDEX IF NOT EXISTS idx_medical_records_code_trgm 
ON medical_records_clean USING gin(code gin_trgm_ops)
WHERE code IS NOT NULL;

-- Índice GIN para búsqueda rápida de médicos tratantes
CREATE INDEX IF NOT EXISTS idx_medical_records_treating_doctor_trgm 
ON medical_records_clean USING gin(treating_doctor gin_trgm_ops)
WHERE treating_doctor IS NOT NULL;

-- Índice GIN para búsqueda rápida de tipos de examen
CREATE INDEX IF NOT EXISTS idx_medical_records_exam_type_trgm 
ON medical_records_clean USING gin(exam_type gin_trgm_ops)
WHERE exam_type IS NOT NULL;

-- Índice GIN para búsqueda rápida de sucursales
CREATE INDEX IF NOT EXISTS idx_medical_records_branch_trgm 
ON medical_records_clean USING gin(branch gin_trgm_ops)
WHERE branch IS NOT NULL;

-- Índice compuesto para búsqueda multi-campo en casos
CREATE INDEX IF NOT EXISTS idx_medical_records_search_trgm 
ON medical_records_clean USING gin(
  (COALESCE(code, '') || ' ' || COALESCE(treating_doctor, '') || ' ' || COALESCE(exam_type, '') || ' ' || COALESCE(branch, '')) gin_trgm_ops
)
WHERE laboratory_id IS NOT NULL;

-- =====================================================
-- 7. FUNCIÓN OPTIMIZADA PARA BÚSQUEDA DE CASOS MÉDICOS
-- =====================================================

CREATE OR REPLACE FUNCTION search_medical_cases_optimized(
  search_term TEXT,
  lab_id UUID,
  result_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  treating_doctor TEXT,
  exam_type TEXT,
  branch TEXT,
  patient_id UUID,
  patient_nombre TEXT,
  patient_cedula TEXT,
  similarity_score REAL
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mrc.id,
    mrc.code,
    mrc.treating_doctor,
    mrc.exam_type,
    mrc.branch,
    mrc.patient_id,
    p.nombre as patient_nombre,
    p.cedula as patient_cedula,
    -- Calcular score de similitud (mayor = más relevante)
    GREATEST(
      similarity(COALESCE(mrc.code, ''), search_term),
      similarity(COALESCE(mrc.treating_doctor, ''), search_term),
      similarity(COALESCE(mrc.exam_type, ''), search_term),
      similarity(COALESCE(mrc.branch, ''), search_term),
      similarity(COALESCE(p.nombre, ''), search_term),
      similarity(COALESCE(p.cedula, ''), search_term)
    ) as similarity_score
  FROM medical_records_clean mrc
  LEFT JOIN patients p ON mrc.patient_id = p.id
  WHERE mrc.laboratory_id = lab_id
    AND (
      -- Búsqueda usando operador % (similarity > 0.3 por defecto)
      mrc.code % search_term OR
      mrc.treating_doctor % search_term OR
      mrc.exam_type % search_term OR
      mrc.branch % search_term OR
      p.nombre % search_term OR
      p.cedula % search_term
    )
  ORDER BY 
    -- Ordenar por similitud descendente (más relevantes primero)
    similarity_score DESC,
    -- Luego por fecha de creación descendente
    mrc.created_at DESC
  LIMIT result_limit;
END;
$$;

COMMENT ON INDEX idx_medical_records_code_trgm IS 
  'Índice GIN para búsqueda rápida de códigos de casos usando trigramas. Permite búsquedas parciales 10-100x más rápidas que ILIKE.';

COMMENT ON INDEX idx_medical_records_treating_doctor_trgm IS 
  'Índice GIN para búsqueda rápida de médicos tratantes usando trigramas. Permite búsquedas parciales de nombres.';

COMMENT ON INDEX idx_medical_records_exam_type_trgm IS 
  'Índice GIN para búsqueda rápida de tipos de examen usando trigramas. Permite búsquedas parciales de tipos.';

COMMENT ON INDEX idx_medical_records_branch_trgm IS 
  'Índice GIN para búsqueda rápida de sucursales usando trigramas. Permite búsquedas parciales de nombres de sucursales.';

COMMENT ON INDEX idx_medical_records_search_trgm IS 
  'Índice GIN compuesto para búsqueda multi-campo en casos médicos (código + médico + tipo + sucursal). Optimiza búsquedas que buscan en múltiples campos.';

COMMENT ON FUNCTION search_medical_cases_optimized IS 
  'Función optimizada para búsqueda de casos médicos usando pg_trgm. 10-100x más rápida que múltiples queries ILIKE. Busca en código, médico tratante, tipo de examen, sucursal, nombre y cédula del paciente. Retorna resultados ordenados por relevancia (similarity_score).';

-- =====================================================
-- 8. VERIFICACIÓN (OPCIONAL - Ejecutar manualmente)
-- =====================================================

-- Para verificar que los índices se crearon correctamente:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('patients', 'medical_records_clean', 'identificaciones')
--   AND indexname LIKE '%trgm%';

-- Para probar las funciones:
-- SELECT * FROM search_patients_optimized('Juan', 'TU_LAB_ID', 10);
-- SELECT * FROM search_medical_cases_optimized('125001', 'TU_LAB_ID', 50);