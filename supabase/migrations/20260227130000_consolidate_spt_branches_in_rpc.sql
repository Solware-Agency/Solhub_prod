-- Consolidar sedes duplicadas para TODOS los laboratorios
-- Cafetal + El Cafetal -> El Cafetal; Paseo Hatillo + Paseo El Hatillo -> Paseo El Hatillo

CREATE OR REPLACE FUNCTION public.get_patients_count_by_branch()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lab_id uuid;
  v_by_branch jsonb := '{}'::jsonb;
  v_total_unique bigint := 0;
BEGIN
  SELECT p.laboratory_id INTO v_lab_id
  FROM profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  IF v_lab_id IS NULL THEN
    RETURN jsonb_build_object('byBranch', '{}'::jsonb, 'totalUnique', 0);
  END IF;

  -- Normalizar branch a canónico (todos los labs: variantes duplicadas)
  WITH cases_with_patient AS (
    SELECT DISTINCT m.branch, m.patient_id,
      CASE lower(trim(m.branch))
        WHEN 'cafetal' THEN 'El Cafetal'
        WHEN 'el cafetal' THEN 'El Cafetal'
        WHEN 'paseo hatillo' THEN 'Paseo El Hatillo'
        WHEN 'paseo el hatillo' THEN 'Paseo El Hatillo'
        WHEN 'cnx' THEN 'CNX'
        ELSE m.branch
      END AS canonical_branch
    FROM medical_records_clean m
    WHERE m.laboratory_id = v_lab_id
      AND m.branch IS NOT NULL
      AND m.patient_id IS NOT NULL
  ),
  active_patient_ids AS (
    SELECT id FROM patients
    WHERE laboratory_id = v_lab_id AND is_active = true
  ),
  counts_per_branch AS (
    SELECT c.canonical_branch AS branch, count(*)::int AS cnt
    FROM cases_with_patient c
    INNER JOIN active_patient_ids ap ON ap.id = c.patient_id
    GROUP BY c.canonical_branch
  )
  SELECT COALESCE(jsonb_object_agg(branch, cnt), '{}'::jsonb)
  INTO v_by_branch
  FROM counts_per_branch;

  -- Total de pacientes únicos con al menos un caso
  WITH cases_with_patient AS (
    SELECT DISTINCT m.patient_id
    FROM medical_records_clean m
    WHERE m.laboratory_id = v_lab_id
      AND m.branch IS NOT NULL
      AND m.patient_id IS NOT NULL
  )
  SELECT count(*)::int
  INTO v_total_unique
  FROM cases_with_patient c
  INNER JOIN patients p ON p.id = c.patient_id
  WHERE p.laboratory_id = v_lab_id AND p.is_active = true;

  RETURN jsonb_build_object('byBranch', COALESCE(v_by_branch, '{}'::jsonb), 'totalUnique', COALESCE(v_total_unique, 0));
END;
$$;
