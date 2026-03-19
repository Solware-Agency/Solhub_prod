-- Añadir feature "Saldo a favor" al catálogo de features (si existe la tabla).
-- Permite overpayment y aplicar crédito del paciente en nuevos casos (ej. lab lm).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_catalog') THEN
    INSERT INTO public.feature_catalog (key, name, description, category, is_active, default_value)
    VALUES (
      'hasPositiveBalance',
      'Saldo a favor / Crédito',
      'Permite registrar pagos por encima del monto del caso (saldo a favor) y aplicar crédito del paciente al crear nuevos casos.',
      'addon',
      true,
      false
    )
    ON CONFLICT (key) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      is_active = EXCLUDED.is_active,
      default_value = EXCLUDED.default_value,
      updated_at = now();
  END IF;
END $$;
