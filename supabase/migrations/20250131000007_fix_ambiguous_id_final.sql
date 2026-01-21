-- =====================================================
-- CORRECCIÓN FINAL: Ambigüedad en columnas "id"
-- =====================================================
-- Problema: PostgreSQL confunde "id" entre RETURNS TABLE y CTEs
-- Solución: Usar alias más explícitos y calificar todas las referencias
-- =====================================================

-- 1. CORREGIR search_patients_optimized (versión final)
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
      p.id AS patient_id,
      p.nombre::TEXT,
      p.cedula::TEXT,
      p.telefono::TEXT,
      p.email::TEXT,
      p.gender::TEXT,
      p.tipo_paciente::TEXT,
      p.edad::TEXT,
      p.fecha_nacimiento,
      p.especie::TEXT,
      1.0::REAL as similarity_score
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
      p.id AS patient_id,
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
      ) as similarity_score
    FROM patients p
    WHERE p.laboratory_id = lab_id
      AND (
        p.nombre % search_term OR
        p.telefono % search_term OR
        p.cedula % search_term
      )
      AND NOT EXISTS (
        SELECT 1 FROM exact_matches em WHERE em.patient_id = p.id
      )
  ),
  combined_results AS (
    SELECT 
      patient_id AS id, nombre, cedula, telefono, email, gender, tipo_paciente, edad, fecha_nacimiento, especie, similarity_score
    FROM exact_matches
    UNION ALL
    SELECT 
      patient_id AS id, nombre, cedula, telefono, email, gender, tipo_paciente, edad, fecha_nacimiento, especie, similarity_score
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

-- 2. CORREGIR search_identifications_optimized (versión final)
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
      i.id AS ident_id,
      i.paciente_id,
      i.tipo_documento::TEXT,
      i.numero::TEXT,
      1.0::REAL as similarity_score
    FROM identificaciones i
    WHERE i.laboratory_id = lab_id
      AND i.numero = search_numero
      AND (tipo_documento_filter IS NULL OR i.tipo_documento = tipo_documento_filter)
  ),
  fuzzy_matches AS (
    SELECT 
      i.id AS ident_id,
      i.paciente_id,
      i.tipo_documento::TEXT,
      i.numero::TEXT,
      similarity(i.numero, search_numero) as similarity_score
    FROM identificaciones i
    WHERE i.laboratory_id = lab_id
      AND i.numero % search_numero
      AND (tipo_documento_filter IS NULL OR i.tipo_documento = tipo_documento_filter)
      AND NOT EXISTS (
        SELECT 1 FROM exact_matches em WHERE em.ident_id = i.id
      )
  ),
  combined_results AS (
    SELECT 
      ident_id AS id, paciente_id, tipo_documento, numero, similarity_score
    FROM exact_matches
    UNION ALL
    SELECT 
      ident_id AS id, paciente_id, tipo_documento, numero, similarity_score
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
  'Función optimizada para búsqueda híbrida de pacientes (exacta + trigram). CORREGIDA: Usa alias patient_id en CTEs para evitar ambigüedad con RETURNS TABLE id.';

COMMENT ON FUNCTION search_identifications_optimized IS 
  'Función optimizada para búsqueda híbrida de identificaciones (exacta + trigram). CORREGIDA: Usa alias ident_id en CTEs para evitar ambigüedad con RETURNS TABLE id.';
