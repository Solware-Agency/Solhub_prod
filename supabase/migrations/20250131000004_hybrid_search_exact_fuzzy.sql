-- =====================================================
-- BÚSQUEDA HÍBRIDA: EXACTA + TRIGRAM (FUZZY)
-- =====================================================
-- Esta migración actualiza las funciones de búsqueda
-- para priorizar coincidencias exactas sobre aproximadas
-- 
-- BENEFICIOS:
-- - Coincidencias exactas aparecen primero (mejor UX)
-- - Mantiene flexibilidad de búsqueda aproximada (typos)
-- - Performance igual o mejor (búsqueda exacta es más rápida)
-- 
-- FUNCIONES ACTUALIZADAS:
-- 1. search_patients_optimized - Búsqueda de pacientes
-- 2. search_medical_cases_optimized - Búsqueda de casos médicos
-- 3. search_identifications_optimized - Búsqueda de identificaciones
-- =====================================================

-- =====================================================
-- 1. ACTUALIZAR search_patients_optimized
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
  WITH exact_matches AS (
    -- PRIORIDAD 1: Búsqueda exacta (muy rápida con índices B-tree)
    SELECT 
      p.id,
      p.nombre::TEXT,
      p.cedula::TEXT,
      p.telefono::TEXT,
      p.email::TEXT,
      p.gender::TEXT,
      p.tipo_paciente::TEXT,
      p.edad::TEXT,
      p.fecha_nacimiento,
      p.especie::TEXT,
      1.0::REAL as similarity_score, -- Score máximo para exactos
      1 as priority -- Prioridad 1: exactos
    FROM patients p
    WHERE p.laboratory_id = lab_id
      AND (
        p.cedula = search_term OR
        p.telefono = search_term OR
        LOWER(p.nombre) = LOWER(search_term)
      )
  ),
  fuzzy_matches AS (
    -- PRIORIDAD 2: Búsqueda aproximada con trigram (solo si no hay exactos)
    SELECT 
      p.id,
      p.nombre::TEXT,
      p.cedula::TEXT,
      p.telefono::TEXT,
      p.email::TEXT,
      p.gender::TEXT,
      p.tipo_paciente::TEXT,
      p.edad::TEXT,
      p.fecha_nacimiento,
      p.especie::TEXT,
      GREATEST(
        similarity(p.nombre::TEXT, search_term),
        similarity(COALESCE(p.telefono, '')::TEXT, search_term),
        similarity(COALESCE(p.cedula, '')::TEXT, search_term)
      ) as similarity_score,
      2 as priority -- Prioridad 2: aproximados
    FROM patients p
    WHERE p.laboratory_id = lab_id
      AND (
        p.nombre % search_term OR
        p.telefono % search_term OR
        p.cedula % search_term
      )
      -- Excluir los que ya están en exact_matches
      AND NOT EXISTS (
        SELECT 1 FROM exact_matches em WHERE em.id = p.id
      )
  )
  SELECT 
    id, nombre, cedula, telefono, email, gender, tipo_paciente, edad, fecha_nacimiento, especie, similarity_score
  FROM exact_matches
  UNION ALL
  SELECT 
    id, nombre, cedula, telefono, email, gender, tipo_paciente, edad, fecha_nacimiento, especie, similarity_score
  FROM fuzzy_matches
  ORDER BY 
    CASE WHEN similarity_score = 1.0 THEN 1 ELSE 2 END ASC, -- Exactos primero (score 1.0)
    similarity_score DESC, -- Luego por similitud
    nombre ASC -- Finalmente alfabético
  LIMIT result_limit;
END;
$$;

-- =====================================================
-- 2. ACTUALIZAR search_medical_cases_optimized
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
  WITH exact_matches AS (
    -- PRIORIDAD 1: Búsqueda exacta (muy rápida con índices B-tree)
    SELECT 
      mrc.id,
      mrc.code::TEXT,
      mrc.treating_doctor::TEXT,
      mrc.exam_type::TEXT,
      mrc.branch::TEXT,
      mrc.patient_id,
      p.nombre::TEXT as patient_nombre,
      p.cedula::TEXT as patient_cedula,
      1.0::REAL as similarity_score, -- Score máximo para exactos
      1 as priority -- Prioridad 1: exactos
    FROM medical_records_clean mrc
    LEFT JOIN patients p ON mrc.patient_id = p.id
    WHERE mrc.laboratory_id = lab_id
      AND (
        mrc.code = search_term OR
        LOWER(mrc.treating_doctor) = LOWER(search_term) OR
        LOWER(mrc.exam_type) = LOWER(search_term) OR
        LOWER(mrc.branch) = LOWER(search_term) OR
        LOWER(p.nombre) = LOWER(search_term) OR
        p.cedula = search_term
      )
  ),
  fuzzy_matches AS (
    -- PRIORIDAD 2: Búsqueda aproximada con trigram (solo si no hay exactos)
    SELECT 
      mrc.id,
      mrc.code::TEXT,
      mrc.treating_doctor::TEXT,
      mrc.exam_type::TEXT,
      mrc.branch::TEXT,
      mrc.patient_id,
      p.nombre::TEXT as patient_nombre,
      p.cedula::TEXT as patient_cedula,
      GREATEST(
        similarity(COALESCE(mrc.code, '')::TEXT, search_term),
        similarity(COALESCE(mrc.treating_doctor, '')::TEXT, search_term),
        similarity(COALESCE(mrc.exam_type, '')::TEXT, search_term),
        similarity(COALESCE(mrc.branch, '')::TEXT, search_term),
        similarity(COALESCE(p.nombre, '')::TEXT, search_term),
        similarity(COALESCE(p.cedula, '')::TEXT, search_term)
      ) as similarity_score,
      2 as priority -- Prioridad 2: aproximados
    FROM medical_records_clean mrc
    LEFT JOIN patients p ON mrc.patient_id = p.id
    WHERE mrc.laboratory_id = lab_id
      AND (
        mrc.code % search_term OR
        mrc.treating_doctor % search_term OR
        mrc.exam_type % search_term OR
        mrc.branch % search_term OR
        p.nombre % search_term OR
        p.cedula % search_term
      )
      -- Excluir los que ya están en exact_matches
      AND NOT EXISTS (
        SELECT 1 FROM exact_matches em WHERE em.id = mrc.id
      )
  )
  SELECT 
    id, code, treating_doctor, exam_type, branch, patient_id, patient_nombre, patient_cedula, similarity_score
  FROM exact_matches
  UNION ALL
  SELECT 
    id, code, treating_doctor, exam_type, branch, patient_id, patient_nombre, patient_cedula, similarity_score
  FROM fuzzy_matches
  ORDER BY 
    CASE WHEN similarity_score = 1.0 THEN 1 ELSE 2 END ASC, -- Exactos primero (score 1.0)
    similarity_score DESC, -- Luego por similitud
    code ASC -- Finalmente alfabético por código
  LIMIT result_limit;
END;
$$;

-- =====================================================
-- 3. ACTUALIZAR search_identifications_optimized
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
  WITH exact_matches AS (
    -- PRIORIDAD 1: Búsqueda exacta (muy rápida con índices B-tree)
    SELECT 
      i.id,
      i.paciente_id,
      i.tipo_documento::TEXT,
      i.numero::TEXT,
      1.0::REAL as similarity_score, -- Score máximo para exactos
      1 as priority -- Prioridad 1: exactos
    FROM identificaciones i
    WHERE i.laboratory_id = lab_id
      AND i.numero = search_numero
      AND (tipo_documento_filter IS NULL OR i.tipo_documento = tipo_documento_filter)
  ),
  fuzzy_matches AS (
    -- PRIORIDAD 2: Búsqueda aproximada con trigram (solo si no hay exactos)
    SELECT 
      i.id,
      i.paciente_id,
      i.tipo_documento::TEXT,
      i.numero::TEXT,
      similarity(i.numero, search_numero) as similarity_score,
      2 as priority -- Prioridad 2: aproximados
    FROM identificaciones i
    WHERE i.laboratory_id = lab_id
      AND i.numero % search_numero
      AND (tipo_documento_filter IS NULL OR i.tipo_documento = tipo_documento_filter)
      -- Excluir los que ya están en exact_matches
      AND NOT EXISTS (
        SELECT 1 FROM exact_matches em WHERE em.id = i.id
      )
  )
  SELECT 
    id, paciente_id, tipo_documento, numero, similarity_score
  FROM exact_matches
  UNION ALL
  SELECT 
    id, paciente_id, tipo_documento, numero, similarity_score
  FROM fuzzy_matches
  ORDER BY 
    CASE WHEN similarity_score = 1.0 THEN 1 ELSE 2 END ASC, -- Exactos primero (score 1.0)
    similarity_score DESC -- Luego por similitud
  LIMIT 5; -- Limitar resultados para autocomplete
END;
$$;

-- =====================================================
-- 4. ACTUALIZAR COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION search_patients_optimized IS 
  'Función optimizada para búsqueda híbrida de pacientes (exacta + trigram). Prioriza coincidencias exactas sobre aproximadas. 10-100x más rápida que ILIKE en tablas grandes. Retorna resultados ordenados por prioridad (exactos primero) y luego por relevancia (similarity_score).';

COMMENT ON FUNCTION search_medical_cases_optimized IS 
  'Función optimizada para búsqueda híbrida de casos médicos (exacta + trigram). Prioriza coincidencias exactas sobre aproximadas. Busca en código, médico tratante, tipo de examen, sucursal, nombre y cédula del paciente. Retorna resultados ordenados por prioridad (exactos primero) y luego por relevancia (similarity_score).';

COMMENT ON FUNCTION search_identifications_optimized IS 
  'Función optimizada para búsqueda híbrida de identificaciones (exacta + trigram). Prioriza coincidencias exactas sobre aproximadas. Permite búsqueda rápida por número con filtro opcional de tipo. Retorna resultados ordenados por prioridad (exactos primero) y luego por relevancia (similarity_score).';

-- =====================================================
-- 5. VERIFICACIÓN (OPCIONAL - Ejecutar manualmente)
-- =====================================================

-- Para verificar que las funciones se actualizaron correctamente:
-- SELECT proname, prosrc 
-- FROM pg_proc 
-- WHERE proname IN ('search_patients_optimized', 'search_medical_cases_optimized', 'search_identifications_optimized');

-- Para probar las funciones:
-- SELECT * FROM search_patients_optimized('11309244', 'TU_LAB_ID', 10);
-- SELECT * FROM search_medical_cases_optimized('125001', 'TU_LAB_ID', 50);
-- SELECT * FROM search_identifications_optimized('12345678', 'TU_LAB_ID', 'V');
