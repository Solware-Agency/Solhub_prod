-- =====================================================
-- CORRECCIÓN COMPLETA: Todas las ambigüedades de columnas
-- =====================================================
-- Problema: PostgreSQL confunde columnas entre RETURNS TABLE y CTEs
-- Solución: Usar alias únicos en CTEs (exact_*, fuzzy_*) y renombrar en combined_results
-- =====================================================

-- 1. CORREGIR search_patients_optimized (versión completa sin ambigüedades)
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
        p.cedula = search_term OR
        p.telefono = search_term OR
        LOWER(p.nombre) = LOWER(search_term)
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
        p.nombre % search_term OR
        p.telefono % search_term OR
        p.cedula % search_term
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
    CASE WHEN cr.similarity_score = 1.0 THEN 1 ELSE 2 END ASC,
    cr.similarity_score DESC,
    cr.nombre ASC
  LIMIT result_limit;
END;
$$;

-- 2. CORREGIR search_identifications_optimized (versión completa sin ambigüedades)
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
    SELECT 
      i.id AS exact_id,
      i.paciente_id AS exact_paciente_id,
      i.tipo_documento::TEXT AS exact_tipo_documento,
      i.numero::TEXT AS exact_numero,
      1.0::REAL as exact_similarity_score
    FROM identificaciones i
    WHERE i.laboratory_id = lab_id
      AND i.numero = search_numero
      AND (tipo_documento_filter IS NULL OR i.tipo_documento = tipo_documento_filter)
  ),
  fuzzy_matches AS (
    SELECT 
      i.id AS fuzzy_id,
      i.paciente_id AS fuzzy_paciente_id,
      i.tipo_documento::TEXT AS fuzzy_tipo_documento,
      i.numero::TEXT AS fuzzy_numero,
      similarity(i.numero, search_numero) as fuzzy_similarity_score
    FROM identificaciones i
    WHERE i.laboratory_id = lab_id
      AND i.numero % search_numero
      AND (tipo_documento_filter IS NULL OR i.tipo_documento = tipo_documento_filter)
      AND NOT EXISTS (
        SELECT 1 FROM exact_matches em WHERE em.exact_id = i.id
      )
  ),
  combined_results AS (
    SELECT 
      exact_id AS id,
      exact_paciente_id AS paciente_id,
      exact_tipo_documento AS tipo_documento,
      exact_numero AS numero,
      exact_similarity_score AS similarity_score
    FROM exact_matches
    UNION ALL
    SELECT 
      fuzzy_id AS id,
      fuzzy_paciente_id AS paciente_id,
      fuzzy_tipo_documento AS tipo_documento,
      fuzzy_numero AS numero,
      fuzzy_similarity_score AS similarity_score
    FROM fuzzy_matches
  )
  SELECT 
    cr.id, cr.paciente_id, cr.tipo_documento, cr.numero, cr.similarity_score
  FROM combined_results cr
  ORDER BY 
    CASE WHEN cr.similarity_score = 1.0 THEN 1 ELSE 2 END ASC,
    cr.similarity_score DESC
  LIMIT 5;
END;
$$;

COMMENT ON FUNCTION search_patients_optimized IS 
  'Función optimizada para búsqueda híbrida de pacientes (exacta + trigram). CORREGIDA: Todas las columnas usan alias únicos (exact_*, fuzzy_*) en CTEs para evitar ambigüedad completa con RETURNS TABLE.';

COMMENT ON FUNCTION search_identifications_optimized IS 
  'Función optimizada para búsqueda híbrida de identificaciones (exacta + trigram). CORREGIDA: Todas las columnas usan alias únicos (exact_*, fuzzy_*) en CTEs para evitar ambigüedad completa con RETURNS TABLE.';
