-- =====================================================
-- Migración: Agregar RLS Policies para triaje_records
-- Fecha: 2026-03-06
-- Descripción: Configurar Row Level Security para la tabla triaje_records
-- =====================================================

-- PASO 1: Habilitar RLS en triaje_records (si no está habilitado)
ALTER TABLE public.triaje_records ENABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view their laboratory triage records" ON public.triaje_records;
DROP POLICY IF EXISTS "Users can insert triage records in their laboratory" ON public.triaje_records;
DROP POLICY IF EXISTS "Users can update their laboratory triage records" ON public.triaje_records;
DROP POLICY IF EXISTS "Owners and admins can delete their laboratory triage records" ON public.triaje_records;

-- PASO 3: Crear políticas RLS para triaje_records

-- Policy: Los usuarios pueden ver SOLO los registros de triaje de su laboratorio
CREATE POLICY "Users can view their laboratory triage records"
  ON public.triaje_records
  FOR SELECT
  TO authenticated
  USING (
    laboratory_id = (
      SELECT laboratory_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden insertar registros de triaje en su laboratorio
CREATE POLICY "Users can insert triage records in their laboratory"
  ON public.triaje_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    laboratory_id = (
      SELECT laboratory_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Los usuarios pueden actualizar registros de triaje de su laboratorio
CREATE POLICY "Users can update their laboratory triage records"
  ON public.triaje_records
  FOR UPDATE
  TO authenticated
  USING (
    laboratory_id = (
      SELECT laboratory_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    laboratory_id = (
      SELECT laboratory_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Solo owners y admins pueden eliminar registros de triaje de su laboratorio
CREATE POLICY "Owners and admins can delete their laboratory triage records"
  ON public.triaje_records
  FOR DELETE
  TO authenticated
  USING (
    laboratory_id = (
      SELECT laboratory_id 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- PASO 4: Comentarios para documentación
COMMENT ON POLICY "Users can view their laboratory triage records" ON public.triaje_records IS
  'Los usuarios autenticados solo pueden ver registros de triaje de su propio laboratorio';

COMMENT ON POLICY "Users can insert triage records in their laboratory" ON public.triaje_records IS
  'Los usuarios autenticados solo pueden crear registros de triaje en su propio laboratorio';

COMMENT ON POLICY "Users can update their laboratory triage records" ON public.triaje_records IS
  'Los usuarios autenticados solo pueden actualizar registros de triaje de su propio laboratorio';

COMMENT ON POLICY "Owners and admins can delete their laboratory triage records" ON public.triaje_records IS
  'Solo owners y admins pueden eliminar registros de triaje de su propio laboratorio';

-- PASO 5: Verificación
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'triaje_records';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ RLS policies para triaje_records configuradas correctamente (% policies)', policy_count;
  ELSE
    RAISE WARNING '⚠️ Se esperaban al menos 4 policies para triaje_records, se encontraron %', policy_count;
  END IF;
END $$;
