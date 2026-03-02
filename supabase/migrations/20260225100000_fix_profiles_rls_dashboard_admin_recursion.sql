/*
  # Fix infinite recursion in profiles RLS - dashboard_admin policies

  Problem:
  - Policies "dashboard_admin_read_all_profiles" and "dashboard_admin_update_all_profiles"
    use subqueries that SELECT from the profiles table within policies on the same table
  - This causes infinite recursion: policy eval -> SELECT profiles -> policy eval -> ...

  Solution:
  - Create is_dashboard_admin() SECURITY DEFINER function (runs as postgres, bypasses RLS)
  - Update both policies to use the function instead of direct subqueries
  - This breaks the recursive loop while maintaining the same security semantics
*/

-- Create SECURITY DEFINER function to check dashboard admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_dashboard_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT p.is_dashboard_admin FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION public.is_dashboard_admin() IS 
  'Returns true if current user is a dashboard admin. SECURITY DEFINER to avoid RLS recursion when used in profiles policies.';

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "dashboard_admin_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "dashboard_admin_update_all_profiles" ON public.profiles;

-- Recreate policies using the safe function
CREATE POLICY "dashboard_admin_read_all_profiles"
  ON public.profiles
  FOR SELECT
  TO public
  USING (is_dashboard_admin());

CREATE POLICY "dashboard_admin_update_all_profiles"
  ON public.profiles
  FOR UPDATE
  TO public
  USING (is_dashboard_admin())
  WITH CHECK (is_dashboard_admin());
