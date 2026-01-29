-- =====================================================
-- BÚSQUEDA SIN TILDES EN CASOS MÉDICOS
-- =====================================================
-- Esta migración habilita la extensión unaccent y actualiza
-- la función search_medical_cases_optimized para que la
-- búsqueda por nombre de paciente ignore las tildes/acentos.
-- 
-- Ejemplo: Buscar "Rene" también encontrará "René"
-- =====================================================

-- Habilitar extensión unaccent si no está habilitada
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =====================================================
-- ACTUALIZAR search_medical_cases_optimized
-- =====================================================
-- Nota: Usamos unaccent() directamente en las consultas.
-- PostgreSQL usará el índice trigram existente (idx_patients_nombre_trgm)
-- y aplicará unaccent en tiempo de ejecución para ignorar tildes.

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
    -- Usar unaccent para ignorar tildes en nombres de pacientes
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
        -- Usar unaccent para comparar nombres sin tildes
        LOWER(unaccent(p.nombre)) = LOWER(unaccent(search_term)) OR
        p.cedula = search_term
      )
  ),
  fuzzy_matches AS (
    -- PRIORIDAD 2: Búsqueda aproximada con trigram (solo si no hay exactos)
    -- Usar unaccent para ignorar tildes en nombres de pacientes
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
        -- Usar unaccent_immutable para comparar nombres sin tildes
        similarity(unaccent_immutable(COALESCE(p.nombre, ''))::TEXT, unaccent_immutable(search_term)),
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
        -- Usar unaccent para comparar nombres sin tildes
        unaccent(p.nombre) % unaccent(search_term) OR
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

-- Actualizar comentario de la función
COMMENT ON FUNCTION search_medical_cases_optimized IS 
  'Función optimizada para búsqueda híbrida de casos médicos (exacta + trigram). Prioriza coincidencias exactas sobre aproximadas. Busca en código, médico tratante, tipo de examen, sucursal, nombre y cédula del paciente. La búsqueda por nombre de paciente ignora tildes/acentos (ej: "Rene" encuentra "René"). Retorna resultados ordenados por prioridad (exactos primero) y luego por relevancia (similarity_score).';
