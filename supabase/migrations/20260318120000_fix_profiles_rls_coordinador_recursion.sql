-- =====================================================
-- Fix: recursión infinita en políticas RLS de la tabla profiles
--
-- Causa: Cualquier política en profiles que use (SELECT ... FROM profiles WHERE id = auth.uid())
-- provoca que, al leer profiles (p. ej. desde RLS de medical_records_clean), se evalúe la política
-- y se vuelva a leer profiles → recursión infinita.
--
-- Incluye:
-- 1. Política "Coordinador puede ver perfiles de su laboratorio" (EXISTS subquery a profiles).
-- 2. Políticas de 20260305180200 que usan (SELECT laboratory_id FROM profiles) o
--    EXISTS(SELECT 1 FROM profiles) directamente en la definición.
--
-- Solución: Asegurar que las funciones SECURITY DEFINER existan y que TODAS las políticas
-- de profiles usen solo esas funciones (nunca subconsultas directas a profiles).
-- =====================================================

-- 1) Funciones que leen profiles con SECURITY DEFINER (bypasean RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_laboratory_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT laboratory_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'owner' FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
$$;

-- 2) Eliminar TODAS las políticas en profiles que puedan tener subconsultas a profiles
DROP POLICY IF EXISTS "Coordinador puede ver perfiles de su laboratorio" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their laboratory profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners can insert users in their laboratory" ON public.profiles;
DROP POLICY IF EXISTS "Owners can delete users in their laboratory" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "All users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners can update all profiles" ON public.profiles;

-- 3) Recrear solo políticas seguras (usan funciones, nunca SELECT desde profiles en la expresión)
CREATE POLICY "Users can view their laboratory profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      laboratory_id = public.get_current_user_laboratory_id()
      AND public.current_user_laboratory_is_active()
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.current_user_laboratory_is_active())
  WITH CHECK (
    id = auth.uid()
    AND laboratory_id = public.get_current_user_laboratory_id()
    AND public.current_user_laboratory_is_active()
  );

CREATE POLICY "Owners can insert users in their laboratory"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_laboratory_is_active()
    AND public.is_current_user_owner()
    AND laboratory_id = public.get_current_user_laboratory_id()
  );

CREATE POLICY "Owners can delete users in their laboratory"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    laboratory_id = public.get_current_user_laboratory_id()
    AND public.current_user_laboratory_is_active()
    AND public.is_current_user_owner()
  );
