-- Migration: RPC para incrementar uso de códigos de laboratorio
-- Fecha: 2026-01-28
-- Descripción:
--   Durante el signup el usuario normalmente NO tiene sesión válida (email confirmation),
--   por lo que un UPDATE directo sobre public.laboratory_codes suele fallar por RLS.
--   Esta función SECURITY DEFINER permite incrementar current_uses desde el frontend
--   vía supabase.rpc, manteniendo validaciones (activo, no expirado, no excedido).

-- Función: incrementa el uso de un código de laboratorio (atómica)
CREATE OR REPLACE FUNCTION public.increment_laboratory_code_usage(code_id uuid)
RETURNS TABLE (id uuid, current_uses integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.laboratory_codes AS lc
  SET current_uses = lc.current_uses + 1
  WHERE lc.id = code_id
    AND lc.is_active = true
    AND (lc.expires_at IS NULL OR lc.expires_at > now())
    AND (lc.max_uses IS NULL OR lc.current_uses < lc.max_uses)
  RETURNING lc.id, lc.current_uses
  INTO id, current_uses;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo incrementar el uso del código (inválido/inactivo/expirado/límite alcanzado)';
  END IF;

  RETURN NEXT;
END;
$$;

-- Permitir llamada desde el cliente (anon para signup y authenticated para admin/otros)
GRANT EXECUTE ON FUNCTION public.increment_laboratory_code_usage(uuid) TO anon, authenticated;

