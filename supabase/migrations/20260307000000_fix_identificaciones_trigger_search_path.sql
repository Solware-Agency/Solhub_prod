-- Fix: Function Search Path Mutable (security advisory)
-- Fija search_path de la función del trigger para que no sea modificable.
ALTER FUNCTION public.check_identificacion_patient_cedula_consistency() SET search_path = public;
