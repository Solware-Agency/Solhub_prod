-- =====================================================
-- ROLLBACK: Deshace 20260220110000_fix_remaining_security_advisors.sql
-- Ejecutar SOLO si necesitas revertir los cambios de seguridad.
-- Orden: se deshace en orden inverso (extensiones primero, vista al final).
-- =====================================================

-- =====================================================
-- 8. Extensiones: volver a schema public
-- =====================================================

-- Restaurar search_path de las funciones que usan unaccent/pg_trgm
DO $$
DECLARE
  r RECORD;
  funcs text[] := ARRAY[
    'search_patients_optimized', 'search_medical_cases_optimized', 'search_identifications_optimized'
  ];
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = ANY(funcs)
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public, auth',
      r.proname, r.args
    );
  END LOOP;
END $$;

-- Restaurar search_path por defecto de la BD
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET search_path TO public, auth', current_database());
END $$;

ALTER EXTENSION unaccent SET SCHEMA public;
ALTER EXTENSION pg_trgm SET SCHEMA public;


-- =====================================================
-- 7. module_catalog: restaurar política permisiva y RLS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'module_catalog') THEN
    DROP POLICY IF EXISTS "Allow read module_catalog" ON public.module_catalog;
    DROP POLICY IF EXISTS "Allow manage module_catalog for owners" ON public.module_catalog;

    CREATE POLICY "Allow all operations on module_catalog"
      ON public.module_catalog FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);

    ALTER TABLE public.module_catalog DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Rollback module_catalog aplicado';
  END IF;
END $$;


-- =====================================================
-- 6. laboratories: restaurar política "Allow dashboard updates"
-- =====================================================

CREATE POLICY "Allow dashboard updates to laboratories"
  ON public.laboratories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =====================================================
-- 5. immuno_requests: restaurar políticas permisivas
-- =====================================================

DROP POLICY IF EXISTS "Users can insert immuno requests in their laboratory" ON public.immuno_requests;
DROP POLICY IF EXISTS "Users can update their laboratory immuno requests" ON public.immuno_requests;

CREATE POLICY "Authenticated users can insert immuno requests"
  ON public.immuno_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update immuno requests"
  ON public.immuno_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =====================================================
-- 4. audit_logs: restaurar política INSERT permisiva
-- =====================================================

DROP POLICY IF EXISTS "Authenticated can insert own audit log rows" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their lab audit logs" ON public.audit_logs;

CREATE POLICY "System can insert audit logs via triggers"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;


-- =====================================================
-- 3. aseguradoras_code_counters: quitar RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their lab aseguradoras counters" ON public.aseguradoras_code_counters;
ALTER TABLE public.aseguradoras_code_counters DISABLE ROW LEVEL SECURITY;


-- =====================================================
-- 2. feature_catalog: quitar RLS (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_catalog') THEN
    DROP POLICY IF EXISTS "Allow read feature_catalog" ON public.feature_catalog;
    DROP POLICY IF EXISTS "Allow manage feature_catalog for owners" ON public.feature_catalog;
    ALTER TABLE public.feature_catalog DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Rollback feature_catalog aplicado';
  END IF;
END $$;


-- =====================================================
-- 1. laboratory_stats: volver a SECURITY DEFINER
-- =====================================================

DROP VIEW IF EXISTS public.laboratory_stats;

CREATE VIEW public.laboratory_stats
AS
SELECT
  l.id,
  l.slug,
  l.name,
  l.status,
  count(DISTINCT p.id) AS total_patients,
  count(DISTINCT m.id) AS total_medical_records,
  count(DISTINCT pr.id) AS total_users,
  max(m.created_at) AS last_record_date
FROM public.laboratories l
LEFT JOIN public.patients p ON p.laboratory_id = l.id
LEFT JOIN public.medical_records_clean m ON m.laboratory_id = l.id
LEFT JOIN public.profiles pr ON pr.laboratory_id = l.id
GROUP BY l.id, l.slug, l.name, l.status;

COMMENT ON VIEW public.laboratory_stats IS
  'Vista con estadísticas agregadas por laboratorio. Útil para dashboards y reportes.';

GRANT SELECT ON public.laboratory_stats TO authenticated;
