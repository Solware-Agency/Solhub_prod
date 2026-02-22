-- =====================================================
-- Migración: Corregir advisors de seguridad restantes
-- - Vista laboratory_stats: SECURITY INVOKER
-- - RLS en feature_catalog y aseguradoras_code_counters
-- - Políticas más estrictas en audit_logs, immuno_requests, laboratories, module_catalog
-- - Extensiones unaccent y pg_trgm a schema extensions
--
-- NO incluye (configurar en Dashboard de Supabase):
-- - Auth OTP expiry (< 1 hora)
-- - Leaked password protection
-- - Upgrade de Postgres
-- =====================================================

-- =====================================================
-- 1. VISTA laboratory_stats → SECURITY INVOKER
-- =====================================================

DROP VIEW IF EXISTS public.laboratory_stats;

CREATE VIEW public.laboratory_stats
WITH (security_invoker = true)
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
  'Vista con estadísticas por laboratorio. SECURITY INVOKER: respeta RLS del usuario que consulta.';

GRANT SELECT ON public.laboratory_stats TO authenticated;


-- =====================================================
-- 2. RLS EN feature_catalog (si existe la tabla)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_catalog') THEN
    ALTER TABLE public.feature_catalog ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow read feature_catalog" ON public.feature_catalog;
    CREATE POLICY "Allow read feature_catalog"
      ON public.feature_catalog FOR SELECT
      TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "Allow manage feature_catalog for owners" ON public.feature_catalog;
    CREATE POLICY "Allow manage feature_catalog for owners"
      ON public.feature_catalog FOR ALL
      TO authenticated
      USING (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')))
      WITH CHECK (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

    RAISE NOTICE 'RLS y políticas aplicadas en feature_catalog';
  ELSE
    RAISE NOTICE 'Tabla feature_catalog no existe, omitiendo';
  END IF;
END $$;


-- =====================================================
-- 3. RLS EN aseguradoras_code_counters
-- =====================================================

ALTER TABLE public.aseguradoras_code_counters ENABLE ROW LEVEL SECURITY;

-- Lectura: solo el laboratorio del usuario
DROP POLICY IF EXISTS "Users can view their lab aseguradoras counters" ON public.aseguradoras_code_counters;
CREATE POLICY "Users can view their lab aseguradoras counters"
  ON public.aseguradoras_code_counters FOR SELECT
  TO authenticated
  USING (laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid()));

-- INSERT/UPDATE lo hace la función SECURITY DEFINER (bypasea RLS con rol propietario)


-- =====================================================
-- 4. audit_logs: RLS y política INSERT más estricta
-- =====================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert audit logs via triggers" ON public.audit_logs;

CREATE POLICY "Authenticated can insert own audit log rows"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- Permitir SELECT a usuarios autenticados de su laboratorio (para historiales)
DROP POLICY IF EXISTS "Users can view their lab audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their lab audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    laboratory_id IS NULL
    OR laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
  );


-- =====================================================
-- 5. immuno_requests: asegurar políticas por laboratory_id
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can insert immuno requests" ON public.immuno_requests;
DROP POLICY IF EXISTS "Authenticated users can update immuno requests" ON public.immuno_requests;
DROP POLICY IF EXISTS "Users can insert immuno requests in their laboratory" ON public.immuno_requests;
DROP POLICY IF EXISTS "Users can update their laboratory immuno requests" ON public.immuno_requests;

CREATE POLICY "Users can insert immuno requests in their laboratory"
  ON public.immuno_requests FOR INSERT
  TO authenticated
  WITH CHECK (laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their laboratory immuno requests"
  ON public.immuno_requests FOR UPDATE
  TO authenticated
  USING (laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid()));


-- =====================================================
-- 6. laboratories: quitar política permisiva de UPDATE si existe
-- =====================================================

DROP POLICY IF EXISTS "Allow dashboard updates to laboratories" ON public.laboratories;

-- La política "Only owners can update laboratories" sigue siendo la que aplica


-- =====================================================
-- 7. module_catalog: políticas más estrictas (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'module_catalog') THEN
    ALTER TABLE public.module_catalog ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all operations on module_catalog" ON public.module_catalog;

    DROP POLICY IF EXISTS "Allow read module_catalog" ON public.module_catalog;
    CREATE POLICY "Allow read module_catalog"
      ON public.module_catalog FOR SELECT
      TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "Allow manage module_catalog for owners" ON public.module_catalog;
    CREATE POLICY "Allow manage module_catalog for owners"
      ON public.module_catalog FOR ALL
      TO authenticated
      USING (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')))
      WITH CHECK (exists (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

    RAISE NOTICE 'Políticas aplicadas en module_catalog';
  ELSE
    RAISE NOTICE 'Tabla module_catalog no existe, omitiendo';
  END IF;
END $$;


-- =====================================================
-- 8. Extensiones: mover a schema extensions
-- =====================================================

CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION unaccent SET SCHEMA extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Que nuevas conexiones vean unaccent/pg_trgm sin schema
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET search_path TO public, auth, extensions', current_database());
END $$;

-- Funciones que usan unaccent() o similarity() (pg_trgm) deben incluir extensions en search_path
DO $$
DECLARE
  r RECORD;
  funcs_with_extensions text[] := ARRAY[
    'search_patients_optimized', 'search_medical_cases_optimized', 'search_identifications_optimized'
  ];
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = ANY(funcs_with_extensions)
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public, auth, extensions',
      r.proname, r.args
    );
  END LOOP;
END $$;

COMMENT ON SCHEMA extensions IS 'Extensiones movidas aquí para no ensuciar public (advisor 0014).';
