-- =====================================================
-- MEJORA DE BÚSQUEDA: Priorizar resultados exactos
-- =====================================================
-- Problema: La búsqueda por trigramas muestra demasiados resultados
-- con coincidencias parciales cuando el usuario busca un nombre completo
-- Solución: 
-- 1. Mejorar detección de coincidencias exactas (incluye búsqueda por palabras completas)
-- 2. Aumentar umbral de similitud para resultados aproximados (0.5 en lugar de 0.3)
-- 3. Limitar resultados aproximados a los más relevantes
-- =====================================================

-- 1. MEJORAR search_patients_optimized
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
DECLARE
  search_words TEXT[];
  search_term_lower TEXT;
BEGIN
  -- Normalizar término de búsqueda
  search_term_lower := LOWER(TRIM(search_term));
  -- Dividir en palabras para búsqueda por palabras completas
  search_words := string_to_array(search_term_lower, ' ');
  
  RETURN QUERY
  WITH exact_matches AS (
    SELECT 
      p.id AS exact_id,
      p.nombre::TEXT AS exact_nombre,
      p.cedula::TEXT AS exact_cedula,
      p.telefono::TEXT AS exact_telefono,
      p.email::TEXT AS exact_email,
      p.gender::TEXT AS exact_gender,
      p.tipo_paciente::TEXT AS exact_tipo_paciente,
      p.edad::TEXT AS exact_edad,
      p.fecha_nacimiento AS exact_fecha_nacimiento,
      p.especie::TEXT AS exact_especie,
      1.0::REAL as exact_similarity_score
    FROM patients p
    WHERE p.laboratory_id = lab_id
      AND (
        -- Coincidencia exacta completa (ignorando mayúsculas)
        LOWER(p.nombre) = search_term_lower OR
        p.cedula = search_term OR
        p.telefono = search_term OR
        -- Coincidencia exacta de todas las palabras (todas las palabras del término están en el nombre)
        (
          array_length(search_words, 1) > 1 AND
          array_length(search_words, 1) = (
            SELECT COUNT(*) 
            FROM unnest(search_words) AS word
            WHERE LOWER(p.nombre) LIKE '%' || word || '%'
          )
        )
      )
  ),
  fuzzy_matches AS (
    SELECT 
      p.id AS fuzzy_id,
      p.nombre::TEXT AS fuzzy_nombre,
      p.cedula::TEXT AS fuzzy_cedula,
      p.telefono::TEXT AS fuzzy_telefono,
      p.email::TEXT AS fuzzy_email,
      p.gender::TEXT AS fuzzy_gender,
      p.tipo_paciente::TEXT AS fuzzy_tipo_paciente,
      p.edad::TEXT AS fuzzy_edad,
      p.fecha_nacimiento AS fuzzy_fecha_nacimiento,
      p.especie::TEXT AS fuzzy_especie,
      GREATEST(
        similarity(p.nombre::TEXT, search_term),
        similarity(COALESCE(p.telefono, '')::TEXT, search_term),
        similarity(COALESCE(p.cedula, '')::TEXT, search_term)
      ) as fuzzy_similarity_score
    FROM patients p
    WHERE p.laboratory_id = lab_id
      AND (
        -- Usar operador % con umbral más alto (similarity > 0.5 en lugar de 0.3)
        similarity(p.nombre::TEXT, search_term) > 0.5 OR
        similarity(COALESCE(p.telefono, '')::TEXT, search_term) > 0.5 OR
        similarity(COALESCE(p.cedula, '')::TEXT, search_term) > 0.5
      )
      AND NOT EXISTS (
        SELECT 1 FROM exact_matches em WHERE em.exact_id = p.id
      )
  ),
  combined_results AS (
    SELECT 
      exact_id AS id,
      exact_nombre AS nombre,
      exact_cedula AS cedula,
      exact_telefono AS telefono,
      exact_email AS email,
      exact_gender AS gender,
      exact_tipo_paciente AS tipo_paciente,
      exact_edad AS edad,
      exact_fecha_nacimiento AS fecha_nacimiento,
      exact_especie AS especie,
      exact_similarity_score AS similarity_score
    FROM exact_matches
    UNION ALL
    SELECT 
      fuzzy_id AS id,
      fuzzy_nombre AS nombre,
      fuzzy_cedula AS cedula,
      fuzzy_telefono AS telefono,
      fuzzy_email AS email,
      fuzzy_gender AS gender,
      fuzzy_tipo_paciente AS tipo_paciente,
      fuzzy_edad AS edad,
      fuzzy_fecha_nacimiento AS fecha_nacimiento,
      fuzzy_especie AS especie,
      fuzzy_similarity_score AS similarity_score
    FROM fuzzy_matches
  )
  SELECT 
    cr.id, cr.nombre, cr.cedula, cr.telefono, cr.email, cr.gender, cr.tipo_paciente, cr.edad, cr.fecha_nacimiento, cr.especie, cr.similarity_score
  FROM combined_results cr
  ORDER BY 
    -- Prioridad 1: Coincidencias exactas primero (score 1.0)
    CASE WHEN cr.similarity_score = 1.0 THEN 1 ELSE 2 END ASC,
    -- Prioridad 2: Mayor similitud
    cr.similarity_score DESC,
    -- Prioridad 3: Orden alfabético por nombre
    cr.nombre ASC
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION search_patients_optimized IS 
  'Función optimizada para búsqueda híbrida de pacientes (exacta + trigram). MEJORADA: 
  - Detecta coincidencias exactas completas y por palabras completas
  - Aumenta umbral de similitud para resultados aproximados (0.5 en lugar de 0.3)
  - Prioriza resultados exactos sobre aproximados
  - Retorna resultados ordenados por relevancia (exactos primero, luego por similitud)';
