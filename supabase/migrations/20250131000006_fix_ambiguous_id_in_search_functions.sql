-- =====================================================
-- CORRECCIÓN: Ambigüedad en columnas "id" en ORDER BY
-- =====================================================
-- Problema: column reference "id" is ambiguous en ORDER BY
-- Solución: Envolver UNION ALL en subquery y ordenar después
-- =====================================================

-- 1. CORREGIR search_patients_optimized
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
  ),
  combined_results AS (
    SELECT 
      id, nombre, cedula, telefono, email, gender, tipo_paciente, edad, fecha_nacimiento, especie, similarity_score
    FROM exact_matches
    UNION ALL
    SELECT 
      id, nombre, cedula, telefono, email, gender, tipo_paciente, edad, fecha_nacimiento, especie, similarity_score
    FROM fuzzy_matches
  )
  SELECT 
    cr.id, cr.nombre, cr.cedula, cr.telefono, cr.email, cr.gender, cr.tipo_paciente, cr.edad, cr.fecha_nacimiento, cr.especie, cr.similarity_score
  FROM combined_results cr
  ORDER BY 
    CASE WHEN cr.similarity_score = 1.0 THEN 1 ELSE 2 END ASC, -- Exactos primero (score 1.0)
    cr.similarity_score DESC, -- Luego por similitud
    cr.nombre ASC -- Finalmente alfabético
  LIMIT result_limit;
END;
$$;

-- 2. CORREGIR search_identifications_optimized
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
  ),
  combined_results AS (
    SELECT 
      id, paciente_id, tipo_documento, numero, similarity_score
    FROM exact_matches
    UNION ALL
    SELECT 
      id, paciente_id, tipo_documento, numero, similarity_score
    FROM fuzzy_matches
  )
  SELECT 
    cr.id, cr.paciente_id, cr.tipo_documento, cr.numero, cr.similarity_score
  FROM combined_results cr
  ORDER BY 
    CASE WHEN cr.similarity_score = 1.0 THEN 1 ELSE 2 END ASC, -- Exactos primero (score 1.0)
    cr.similarity_score DESC -- Luego por similitud
  LIMIT 5; -- Limitar resultados para autocomplete
END;
$$;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION search_patients_optimized IS 
  'Función optimizada para búsqueda híbrida de pacientes (exacta + trigram). Prioriza coincidencias exactas sobre aproximadas. 10-100x más rápida que ILIKE en tablas grandes. Retorna resultados ordenados por prioridad (exactos primero) y luego por relevancia (similarity_score). CORREGIDA: Ambigüedad en columnas resuelta usando CTE combined_results.';

COMMENT ON FUNCTION search_identifications_optimized IS 
  'Función optimizada para búsqueda híbrida de identificaciones (exacta + trigram). Prioriza coincidencias exactas sobre aproximadas. Permite búsqueda rápida por número con filtro opcional de tipo. Retorna resultados ordenados por prioridad (exactos primero) y luego por relevancia (similarity_score). CORREGIDA: Ambigüedad en columnas resuelta usando CTE combined_results.';
