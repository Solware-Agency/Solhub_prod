-- Permitir a usuarios del laboratorio insertar nuevos tipos de muestra en estructura de costos
-- Ejecutar en Supabase Dashboard > SQL Editor si la migración no se aplicó por CLI

DROP POLICY IF EXISTS "Users can insert sample_type_costs in their laboratory" ON public.sample_type_costs;

CREATE POLICY "Users can insert sample_type_costs in their laboratory"
  ON public.sample_type_costs FOR INSERT
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
  );
