-- Soft delete para pacientes: is_active + deactivated_at
-- Eliminar desde la UI = marcar is_active = false; los datos se mantienen.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

COMMENT ON COLUMN public.patients.is_active IS 'Si false, el paciente está "eliminado" (oculto en listados, datos conservados)';
COMMENT ON COLUMN public.patients.deactivated_at IS 'Fecha/hora en que se desactivó el paciente (soft delete)';

CREATE INDEX IF NOT EXISTS idx_patients_is_active
  ON public.patients (laboratory_id, is_active)
  WHERE is_active = true;

-- Actualizar search_patients_optimized para devolver solo pacientes activos
CREATE OR REPLACE FUNCTION public.search_patients_optimized(search_term text, lab_id uuid, result_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, nombre text, cedula text, telefono text, email text, gender text, tipo_paciente text, edad text, fecha_nacimiento date, especie text, similarity_score real)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
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
      AND p.is_active = true
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
      AND p.is_active = true
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
    CASE WHEN c.similarity_score >= 1.0 THEN 0 ELSE 1 END,
    CASE WHEN LOWER(unaccent(trim(split_part(COALESCE(c.nombre, ''), ' ', 1)))) = LOWER(unaccent(term_trimmed)) THEN 0 ELSE 1 END,
    c.similarity_score DESC,
    c.nombre ASC
  LIMIT result_limit;
END;
$function$;
