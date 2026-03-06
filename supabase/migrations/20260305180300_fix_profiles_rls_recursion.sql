-- =====================================================
-- Fix: recursión infinita en políticas de profiles
-- Las políticas que hacían (SELECT ... FROM profiles WHERE id = auth.uid())
-- provocaban que al leer profiles se evaluara la política de nuevo.
-- Solución: funciones SECURITY DEFINER que leen profiles sin RLS.
-- =====================================================

-- Devuelve el laboratory_id del usuario actual (bypasea RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_laboratory_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT laboratory_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_current_user_laboratory_id() IS
'Devuelve el laboratory_id del usuario actual. SECURITY DEFINER para usar en políticas RLS de profiles sin recursión.';

-- Devuelve true si el usuario actual tiene role = 'owner'
CREATE OR REPLACE FUNCTION public.is_current_user_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'owner' FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
$$;

COMMENT ON FUNCTION public.is_current_user_owner() IS
'Devuelve true si el usuario actual es owner. SECURITY DEFINER para usar en políticas RLS de profiles sin recursión.';

-- =====================================================
-- Recrear políticas de profiles usando las funciones (sin subconsultas a profiles)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their laboratory profiles" ON public.profiles;
CREATE POLICY "Users can view their laboratory profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      laboratory_id = public.get_current_user_laboratory_id()
      AND public.current_user_laboratory_is_active()
    )
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.current_user_laboratory_is_active())
  WITH CHECK (
    id = auth.uid()
    AND laboratory_id = public.get_current_user_laboratory_id()
    AND public.current_user_laboratory_is_active()
  );

DROP POLICY IF EXISTS "Owners can insert users in their laboratory" ON public.profiles;
CREATE POLICY "Owners can insert users in their laboratory"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_laboratory_is_active()
    AND public.is_current_user_owner()
    AND laboratory_id = public.get_current_user_laboratory_id()
  );

DROP POLICY IF EXISTS "Owners can delete users in their laboratory" ON public.profiles;
CREATE POLICY "Owners can delete users in their laboratory"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    laboratory_id = public.get_current_user_laboratory_id()
    AND public.current_user_laboratory_is_active()
    AND public.is_current_user_owner()
  );
