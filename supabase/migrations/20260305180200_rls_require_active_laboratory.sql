-- =====================================================
-- RLS: exigir laboratorio activo para operar
-- Fecha: 2026-03-05
-- Cuando status = 'inactive', los usuarios del lab no pueden leer/escribir
-- datos (excepto su propio perfil y el lab para mostrar el mensaje de bloqueo).
-- =====================================================

-- Función auxiliar: true si el laboratorio del usuario actual está activo
CREATE OR REPLACE FUNCTION public.current_user_laboratory_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT l.status = 'active'
     FROM public.laboratories l
     JOIN public.profiles p ON p.laboratory_id = l.id
     WHERE p.id = auth.uid()
     LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION public.current_user_laboratory_is_active() IS
'Devuelve true si el laboratorio del usuario actual tiene status = active. Usado en RLS para bloquear acceso cuando el lab está inactivo por falta de pago.';

-- =====================================================
-- PATIENTS: exigir lab activo en todas las políticas
-- =====================================================

DROP POLICY IF EXISTS "Users can view their laboratory patients" ON public.patients;
CREATE POLICY "Users can view their laboratory patients"
  ON public.patients FOR SELECT TO authenticated
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  );

DROP POLICY IF EXISTS "Users can insert patients in their laboratory" ON public.patients;
CREATE POLICY "Users can insert patients in their laboratory"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  );

DROP POLICY IF EXISTS "Users can update their laboratory patients" ON public.patients;
CREATE POLICY "Users can update their laboratory patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  )
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  );

DROP POLICY IF EXISTS "Owners and admins can delete their laboratory patients" ON public.patients;
CREATE POLICY "Owners and admins can delete their laboratory patients"
  ON public.patients FOR DELETE TO authenticated
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- =====================================================
-- MEDICAL_RECORDS_CLEAN: exigir lab activo
-- =====================================================

DROP POLICY IF EXISTS "Users can view their laboratory medical records" ON public.medical_records_clean;
CREATE POLICY "Users can view their laboratory medical records"
  ON public.medical_records_clean FOR SELECT TO authenticated
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  );

DROP POLICY IF EXISTS "Users can insert medical records in their laboratory" ON public.medical_records_clean;
CREATE POLICY "Users can insert medical records in their laboratory"
  ON public.medical_records_clean FOR INSERT TO authenticated
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  );

DROP POLICY IF EXISTS "Users can update their laboratory medical records" ON public.medical_records_clean;
CREATE POLICY "Users can update their laboratory medical records"
  ON public.medical_records_clean FOR UPDATE TO authenticated
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  )
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  );

DROP POLICY IF EXISTS "Owners and admins can delete their laboratory medical records" ON public.medical_records_clean;
CREATE POLICY "Owners and admins can delete their laboratory medical records"
  ON public.medical_records_clean FOR DELETE TO authenticated
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- =====================================================
-- CHANGE_LOGS: exigir lab activo
-- =====================================================

DROP POLICY IF EXISTS "Users can view their laboratory change logs" ON public.change_logs;
CREATE POLICY "Users can view their laboratory change logs"
  ON public.change_logs FOR SELECT TO authenticated
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  );

DROP POLICY IF EXISTS "Users can insert change logs in their laboratory" ON public.change_logs;
CREATE POLICY "Users can insert change logs in their laboratory"
  ON public.change_logs FOR INSERT TO authenticated
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  );

-- =====================================================
-- PROFILES: permitir siempre leer el propio perfil (para cargar lab);
-- el resto de operaciones y ver otros perfiles solo con lab activo
-- =====================================================

DROP POLICY IF EXISTS "Users can view their laboratory profiles" ON public.profiles;
CREATE POLICY "Users can view their laboratory profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
      AND public.current_user_laboratory_is_active()
    )
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.current_user_laboratory_is_active())
  WITH CHECK (
    id = auth.uid()
    AND laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
  );

DROP POLICY IF EXISTS "Owners can insert users in their laboratory" ON public.profiles;
CREATE POLICY "Owners can insert users in their laboratory"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_laboratory_is_active()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
    AND laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can delete users in their laboratory" ON public.profiles;
CREATE POLICY "Owners can delete users in their laboratory"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
    AND public.current_user_laboratory_is_active()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- =====================================================
-- IMMUNO_REQUESTS (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'immuno_requests') THEN
    DROP POLICY IF EXISTS "Users can view their laboratory immuno requests" ON public.immuno_requests;
    CREATE POLICY "Users can view their laboratory immuno requests"
      ON public.immuno_requests FOR SELECT TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );

    DROP POLICY IF EXISTS "Users can insert immuno requests in their laboratory" ON public.immuno_requests;
    CREATE POLICY "Users can insert immuno requests in their laboratory"
      ON public.immuno_requests FOR INSERT TO authenticated
      WITH CHECK (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );

    DROP POLICY IF EXISTS "Users can update their laboratory immuno requests" ON public.immuno_requests;
    CREATE POLICY "Users can update their laboratory immuno requests"
      ON public.immuno_requests FOR UPDATE TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      )
      WITH CHECK (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );

    DROP POLICY IF EXISTS "Owners can delete their laboratory immuno requests" ON public.immuno_requests;
    DROP POLICY IF EXISTS "Users can delete their laboratory immuno requests" ON public.immuno_requests;
    CREATE POLICY "Owners can delete their laboratory immuno requests"
      ON public.immuno_requests FOR DELETE TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
      );
    RAISE NOTICE 'RLS immuno_requests actualizado con lab activo';
  END IF;
END $$;

-- =====================================================
-- USER_SETTINGS (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Only user can read their settings" ON public.user_settings;
    CREATE POLICY "Users can view their own settings"
      ON public.user_settings FOR SELECT TO authenticated
      USING (
        id = auth.uid()
        AND laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );

    DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Only user can update their settings" ON public.user_settings;
    CREATE POLICY "Users can update their own settings"
      ON public.user_settings FOR UPDATE TO authenticated
      USING (id = auth.uid() AND public.current_user_laboratory_is_active())
      WITH CHECK (
        id = auth.uid()
        AND laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );

    DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "User can insert their own settings" ON public.user_settings;
    CREATE POLICY "Users can insert their own settings"
      ON public.user_settings FOR INSERT TO authenticated
      WITH CHECK (
        id = auth.uid()
        AND laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    RAISE NOTICE 'RLS user_settings actualizado con lab activo';
  END IF;
END $$;

-- =====================================================
-- DELETION_LOGS (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deletion_logs') THEN
    DROP POLICY IF EXISTS "Owners can view their laboratory deletion logs" ON public.deletion_logs;
    CREATE POLICY "Owners can view their laboratory deletion logs"
      ON public.deletion_logs FOR SELECT TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
      );

    DROP POLICY IF EXISTS "System can insert deletion logs" ON public.deletion_logs;
    CREATE POLICY "System can insert deletion logs"
      ON public.deletion_logs FOR INSERT TO authenticated
      WITH CHECK (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    RAISE NOTICE 'RLS deletion_logs actualizado con lab activo';
  END IF;
END $$;

-- =====================================================
-- IDENTIFICACIONES (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'identificaciones') THEN
    DROP POLICY IF EXISTS "Users can view identificaciones from their laboratory" ON public.identificaciones;
    CREATE POLICY "Users can view identificaciones from their laboratory"
      ON public.identificaciones FOR SELECT TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    DROP POLICY IF EXISTS "Users can insert identificaciones in their laboratory" ON public.identificaciones;
    CREATE POLICY "Users can insert identificaciones in their laboratory"
      ON public.identificaciones FOR INSERT TO authenticated
      WITH CHECK (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    DROP POLICY IF EXISTS "Users can update identificaciones in their laboratory" ON public.identificaciones;
    CREATE POLICY "Users can update identificaciones in their laboratory"
      ON public.identificaciones FOR UPDATE TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      )
      WITH CHECK (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    DROP POLICY IF EXISTS "Owners can delete identificaciones in their laboratory" ON public.identificaciones;
    CREATE POLICY "Owners can delete identificaciones in their laboratory"
      ON public.identificaciones FOR DELETE TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
      );
    RAISE NOTICE 'RLS identificaciones actualizado con lab activo';
  END IF;
END $$;

-- =====================================================
-- RESPONSABILIDADES (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'responsabilidades') THEN
    DROP POLICY IF EXISTS "Users can view responsabilidades from their laboratory" ON public.responsabilidades;
    CREATE POLICY "Users can view responsabilidades from their laboratory"
      ON public.responsabilidades FOR SELECT TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    DROP POLICY IF EXISTS "Users can insert responsabilidades in their laboratory" ON public.responsabilidades;
    CREATE POLICY "Users can insert responsabilidades in their laboratory"
      ON public.responsabilidades FOR INSERT TO authenticated
      WITH CHECK (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    DROP POLICY IF EXISTS "Users can update responsabilidades in their laboratory" ON public.responsabilidades;
    CREATE POLICY "Users can update responsabilidades in their laboratory"
      ON public.responsabilidades FOR UPDATE TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      )
      WITH CHECK (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    DROP POLICY IF EXISTS "Owners can delete responsabilidades in their laboratory" ON public.responsabilidades;
    CREATE POLICY "Owners can delete responsabilidades in their laboratory"
      ON public.responsabilidades FOR DELETE TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
      );
    RAISE NOTICE 'RLS responsabilidades actualizado con lab activo';
  END IF;
END $$;

-- =====================================================
-- SAMPLE_TYPE_COSTS (si existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sample_type_costs') THEN
    DROP POLICY IF EXISTS "Users can view sample_type_costs from their laboratory" ON public.sample_type_costs;
    CREATE POLICY "Users can view sample_type_costs from their laboratory"
      ON public.sample_type_costs FOR SELECT TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    DROP POLICY IF EXISTS "Users can update sample_type_costs in their laboratory" ON public.sample_type_costs;
    CREATE POLICY "Users can update sample_type_costs in their laboratory"
      ON public.sample_type_costs FOR UPDATE TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      )
      WITH CHECK (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    DROP POLICY IF EXISTS "Users can insert sample_type_costs in their laboratory" ON public.sample_type_costs;
    CREATE POLICY "Users can insert sample_type_costs in their laboratory"
      ON public.sample_type_costs FOR INSERT TO authenticated
      WITH CHECK (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    DROP POLICY IF EXISTS "Users can delete sample_type_costs in their laboratory" ON public.sample_type_costs;
    CREATE POLICY "Users can delete sample_type_costs in their laboratory"
      ON public.sample_type_costs FOR DELETE TO authenticated
      USING (
        laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
        AND public.current_user_laboratory_is_active()
      );
    RAISE NOTICE 'RLS sample_type_costs actualizado con lab activo';
  END IF;
END $$;

-- =====================================================
-- DASHBOARD_ADMIN en profiles: solo si el lab está activo
-- =====================================================

DROP POLICY IF EXISTS "dashboard_admin_read_all_profiles" ON public.profiles;
CREATE POLICY "dashboard_admin_read_all_profiles"
  ON public.profiles FOR SELECT TO public
  USING (public.is_dashboard_admin() AND public.current_user_laboratory_is_active());

DROP POLICY IF EXISTS "dashboard_admin_update_all_profiles" ON public.profiles;
CREATE POLICY "dashboard_admin_update_all_profiles"
  ON public.profiles FOR UPDATE TO public
  USING (public.is_dashboard_admin() AND public.current_user_laboratory_is_active())
  WITH CHECK (public.is_dashboard_admin() AND public.current_user_laboratory_is_active());

-- =====================================================
-- Nota: laboratories no se restringe SELECT para que el front
-- pueda cargar el lab y mostrar status = 'inactive' y el mensaje.
-- =====================================================
