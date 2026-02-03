-- Permitir a usuarios del laboratorio eliminar tipos de muestra en estructura de costos
DROP POLICY IF EXISTS "Users can delete sample_type_costs in their laboratory" ON public.sample_type_costs;

CREATE POLICY "Users can delete sample_type_costs in their laboratory"
  ON public.sample_type_costs FOR DELETE
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
  );
