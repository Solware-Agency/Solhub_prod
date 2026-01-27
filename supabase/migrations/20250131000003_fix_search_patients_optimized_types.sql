-- =====================================================
-- CORRECCIÓN DE TIPOS EN search_patients_optimized
-- =====================================================
-- Esta migración corrige el error de tipos:
-- "Returned type character varying does not match expected type text"
-- 
-- PROBLEMA: La función retornaba VARCHAR pero se esperaba TEXT
-- SOLUCIÓN: Agregar CAST explícito a TEXT en todos los campos
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
    p.nombre::TEXT,
    p.cedula::TEXT,
    p.telefono::TEXT,
    p.email::TEXT,
    p.gender::TEXT,
    p.tipo_paciente::TEXT,
    p.edad::TEXT,
    p.fecha_nacimiento,
    p.especie::TEXT,
    -- Calcular score de similitud (mayor = más relevante)
    GREATEST(
      similarity(p.nombre::TEXT, search_term),
      similarity(COALESCE(p.telefono, '')::TEXT, search_term),
      similarity(COALESCE(p.cedula, '')::TEXT, search_term)
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

COMMENT ON FUNCTION search_patients_optimized IS 
  'Función optimizada para búsqueda de pacientes usando pg_trgm. 10-100x más rápida que ILIKE en tablas grandes. Retorna resultados ordenados por relevancia (similarity_score). CORREGIDA: Todos los campos VARCHAR ahora se convierten explícitamente a TEXT.';
