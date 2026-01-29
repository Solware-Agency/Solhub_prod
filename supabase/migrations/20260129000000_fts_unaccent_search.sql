-- =====================================================
-- BÚSQUEDA POR PALABRAS (FTS) + INSENSIBLE A ACENTOS
-- =====================================================
-- Reemplaza la búsqueda por trigramas (pg_trgm) por Full-Text Search (FTS)
-- con configuración unaccent + simple en pacientes y casos.
--
-- Comportamiento:
-- - "Rene" encuentra "René" (unaccent)
-- - "Rene" NO encuentra "Irene" (búsqueda por palabras, no por subcadenas)
-- - Búsqueda rápida con índice GIN sobre tsvector
-- =====================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- =====================================================
-- 1. CONFIGURACIÓN DE BÚSQUEDA (unaccent + simple)
-- Idempotente: crea solo si no existe (evita error 23505 al re-ejecutar)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'solhub_unaccent') THEN
    CREATE TEXT SEARCH CONFIGURATION solhub_unaccent (COPY = simple);
  END IF;
  ALTER TEXT SEARCH CONFIGURATION solhub_unaccent
    ALTER MAPPING FOR asciiword, word, hword, hword_part
    WITH unaccent, simple;
END
$$;

COMMENT ON TEXT SEARCH CONFIGURATION solhub_unaccent IS
  'Búsqueda por palabras sin stemming, con normalización de acentos (Rene = René). Usado en pacientes y casos.';

-- =====================================================
-- 2. ÍNDICE GIN PARA NOMBRE DE PACIENTES (FTS)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_patients_nombre_fts
  ON patients USING GIN (to_tsvector('solhub_unaccent', COALESCE(nombre, '')));

COMMENT ON INDEX idx_patients_nombre_fts IS
  'Índice FTS para búsqueda por nombre de paciente (palabras, insensible a acentos).';

-- =====================================================
-- 3. search_patients_optimized (FTS + unaccent)
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
DECLARE
  term_trimmed TEXT;
  term_lower TEXT;
BEGIN
  term_trimmed := TRIM(search_term);
  term_lower := LOWER(term_trimmed);

  IF term_trimmed = '' THEN
    RETURN;
  END IF;

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
      1.0::REAL AS exact_score
    FROM patients p
    WHERE p.laboratory_id = lab_id
      AND (
        LOWER(unaccent(COALESCE(p.nombre, ''))) = LOWER(unaccent(term_trimmed))
        OR p.cedula = search_term
        OR p.telefono = search_term
      )
  ),
  fts_matches AS (
    SELECT
      p.id AS fts_id,
      p.nombre::TEXT AS fts_nombre,
      p.cedula::TEXT AS fts_cedula,
      p.telefono::TEXT AS fts_telefono,
      p.email::TEXT AS fts_email,
      p.gender::TEXT AS fts_gender,
      p.tipo_paciente::TEXT AS fts_tipo_paciente,
      p.edad::TEXT AS fts_edad,
      p.fecha_nacimiento AS fts_fecha_nacimiento,
      p.especie::TEXT AS fts_especie,
      ts_rank(
        to_tsvector('solhub_unaccent', COALESCE(p.nombre, '')),
        plainto_tsquery('solhub_unaccent', term_trimmed)
      )::REAL AS fts_score
    FROM patients p
    WHERE p.laboratory_id = lab_id
      AND (
        to_tsvector('solhub_unaccent', COALESCE(p.nombre, '')) @@ plainto_tsquery('solhub_unaccent', term_trimmed)
        OR (term_trimmed <> '' AND COALESCE(p.cedula, '') ILIKE '%' || term_trimmed || '%')
        OR (term_trimmed <> '' AND COALESCE(p.telefono, '') ILIKE '%' || term_trimmed || '%')
      )
      AND NOT EXISTS (SELECT 1 FROM exact_matches em WHERE em.exact_id = p.id)
  ),
  combined AS (
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
      exact_score AS similarity_score
    FROM exact_matches
    UNION ALL
    SELECT
      fts_id,
      fts_nombre,
      fts_cedula,
      fts_telefono,
      fts_email,
      fts_gender,
      fts_tipo_paciente,
      fts_edad,
      fts_fecha_nacimiento,
      fts_especie,
      fts_score
    FROM fts_matches
  )
  SELECT
    c.id, c.nombre, c.cedula, c.telefono, c.email, c.gender, c.tipo_paciente, c.edad, c.fecha_nacimiento, c.especie, c.similarity_score
  FROM combined c
  ORDER BY
    -- 1) Coincidencias exactas primero
    CASE WHEN c.similarity_score >= 1.0 THEN 0 ELSE 1 END,
    -- 2) Relevancia: nombres donde el primer nombre coincide con el término (ej. "Rene Cortes" antes de "Chirino Rene")
    CASE WHEN LOWER(unaccent(trim(split_part(COALESCE(c.nombre, ''), ' ', 1)))) = LOWER(unaccent(term_trimmed)) THEN 0 ELSE 1 END,
    -- 3) ts_rank (relevancia FTS)
    c.similarity_score DESC,
    -- 4) Desempate alfabético
    c.nombre ASC
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION search_patients_optimized IS
  'Búsqueda de pacientes por FTS (palabras) + unaccent. Orden por relevancia: exactos, luego primer nombre = término (ej. Rene Antich antes de Chirino Rene), ts_rank, nombre.';

-- =====================================================
-- 4. search_medical_cases_optimized (FTS + unaccent)
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
DECLARE
  term_trimmed TEXT;
BEGIN
  term_trimmed := TRIM(search_term);

  IF term_trimmed = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH exact_matches AS (
    SELECT
      mrc.id,
      mrc.code::TEXT,
      mrc.treating_doctor::TEXT,
      mrc.exam_type::TEXT,
      mrc.branch::TEXT,
      mrc.patient_id,
      p.nombre::TEXT AS patient_nombre,
      p.cedula::TEXT AS patient_cedula,
      1.0::REAL AS similarity_score
    FROM medical_records_clean mrc
    LEFT JOIN patients p ON mrc.patient_id = p.id
    WHERE mrc.laboratory_id = lab_id
      AND (
        mrc.code = search_term
        OR LOWER(mrc.treating_doctor) = LOWER(search_term)
        OR LOWER(mrc.exam_type) = LOWER(search_term)
        OR LOWER(mrc.branch) = LOWER(search_term)
        OR LOWER(unaccent(COALESCE(p.nombre, ''))) = LOWER(unaccent(term_trimmed))
        OR p.cedula = search_term
      )
  ),
  fts_matches AS (
    SELECT
      mrc.id,
      mrc.code::TEXT,
      mrc.treating_doctor::TEXT,
      mrc.exam_type::TEXT,
      mrc.branch::TEXT,
      mrc.patient_id,
      p.nombre::TEXT AS patient_nombre,
      p.cedula::TEXT AS patient_cedula,
      GREATEST(
        CASE
          WHEN to_tsvector('solhub_unaccent', COALESCE(p.nombre, '')) @@ plainto_tsquery('solhub_unaccent', term_trimmed)
          THEN ts_rank(to_tsvector('solhub_unaccent', COALESCE(p.nombre, '')), plainto_tsquery('solhub_unaccent', term_trimmed))::REAL
          ELSE 0::REAL
        END,
        CASE WHEN term_trimmed <> '' AND COALESCE(mrc.code, '') ILIKE '%' || term_trimmed || '%' THEN 0.5::REAL ELSE 0::REAL END,
        CASE WHEN term_trimmed <> '' AND LOWER(unaccent(COALESCE(mrc.treating_doctor, ''))) LIKE '%' || LOWER(unaccent(term_trimmed)) || '%' THEN 0.5::REAL ELSE 0::REAL END,
        CASE WHEN term_trimmed <> '' AND LOWER(unaccent(COALESCE(mrc.exam_type, ''))) LIKE '%' || LOWER(unaccent(term_trimmed)) || '%' THEN 0.5::REAL ELSE 0::REAL END,
        CASE WHEN term_trimmed <> '' AND LOWER(unaccent(COALESCE(mrc.branch, ''))) LIKE '%' || LOWER(unaccent(term_trimmed)) || '%' THEN 0.5::REAL ELSE 0::REAL END,
        CASE WHEN term_trimmed <> '' AND COALESCE(p.cedula, '') ILIKE '%' || term_trimmed || '%' THEN 0.5::REAL ELSE 0::REAL END
      ) AS similarity_score
    FROM medical_records_clean mrc
    LEFT JOIN patients p ON mrc.patient_id = p.id
    WHERE mrc.laboratory_id = lab_id
      AND (
        to_tsvector('solhub_unaccent', COALESCE(p.nombre, '')) @@ plainto_tsquery('solhub_unaccent', term_trimmed)
        OR (term_trimmed <> '' AND COALESCE(mrc.code, '') ILIKE '%' || term_trimmed || '%')
        OR (term_trimmed <> '' AND LOWER(unaccent(COALESCE(mrc.treating_doctor, ''))) LIKE '%' || LOWER(unaccent(term_trimmed)) || '%')
        OR (term_trimmed <> '' AND LOWER(unaccent(COALESCE(mrc.exam_type, ''))) LIKE '%' || LOWER(unaccent(term_trimmed)) || '%')
        OR (term_trimmed <> '' AND LOWER(unaccent(COALESCE(mrc.branch, ''))) LIKE '%' || LOWER(unaccent(term_trimmed)) || '%')
        OR (term_trimmed <> '' AND COALESCE(p.cedula, '') ILIKE '%' || term_trimmed || '%')
      )
      AND NOT EXISTS (SELECT 1 FROM exact_matches em WHERE em.id = mrc.id)
  )
  SELECT id, code, treating_doctor, exam_type, branch, patient_id, patient_nombre, patient_cedula, similarity_score
  FROM exact_matches
  UNION ALL
  SELECT id, code, treating_doctor, exam_type, branch, patient_id, patient_nombre, patient_cedula, similarity_score
  FROM fts_matches
  ORDER BY
    -- 1) Coincidencias exactas primero
    CASE WHEN similarity_score >= 1.0 THEN 0 ELSE 1 END,
    -- 2) Relevancia: paciente cuyo primer nombre coincide con el término (ej. "Rene Cortes" antes de "Chirino Rene")
    CASE WHEN LOWER(unaccent(trim(split_part(COALESCE(patient_nombre, ''), ' ', 1)))) = LOWER(unaccent(term_trimmed)) THEN 0 ELSE 1 END,
    -- 3) similarity_score (relevancia FTS/parcial)
    similarity_score DESC,
    -- 4) Desempate por código de caso
    code ASC
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION search_medical_cases_optimized IS
  'Búsqueda de casos por FTS (nombre paciente) + unaccent. Orden por relevancia: exactos, luego primer nombre = término, score, código. "Rene" encuentra "René", no "Irene".';
