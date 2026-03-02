-- Añadir valor 'Anulada' a estatus_poliza para pólizas (UI solo muestra Activa | Anulada)
-- Funciona si la columna es un ENUM o TEXT con CHECK.

DO $$
DECLARE
  col_type text;
  conname text;
BEGIN
  -- Tipo de dato de la columna estatus_poliza
  SELECT udt_name INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'polizas' AND column_name = 'estatus_poliza';

  IF col_type != 'text' AND col_type IS NOT NULL THEN
    -- Es un tipo custom (enum): añadir valor si no existe
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS ''Anulada''', col_type);
    RETURN;
  END IF;

  -- Columna es text: buscar constraint CHECK que restrinja estatus_poliza
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'polizas'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%estatus_poliza%'
  LIMIT 1;

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.polizas DROP CONSTRAINT %I', conname);
    -- Recrear constraint incluyendo Anulada
    ALTER TABLE public.polizas
    ADD CONSTRAINT polizas_estatus_poliza_check
    CHECK (estatus_poliza IN (
      'Activa',
      'Anulada',
      'En emisión',
      'Renovación pendiente',
      'Vencida'
    ));
  END IF;
  -- Si no había constraint, la columna acepta cualquier texto y 'Anulada' ya es válida
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
