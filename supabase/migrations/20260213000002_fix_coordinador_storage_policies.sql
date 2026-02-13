-- Migración para agregar políticas de Storage para coordinador
-- Fecha: 2026-02-13
-- Descripción: Permitir a coordinador subir/eliminar PDFs en bucket case-pdfs

-- =====================================================================
-- POLÍTICAS DE STORAGE PARA COORDINADOR
-- =====================================================================

-- 1. Policy de INSERT (upload) para bucket case-pdfs
CREATE POLICY "Coordinador puede subir PDFs de casos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id IS NOT NULL
    )
  );

-- 2. Policy de SELECT (read/download) para bucket case-pdfs
CREATE POLICY "Coordinador puede ver PDFs de su laboratorio"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'case-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id IS NOT NULL
      -- Verificar que el path contiene su laboratory_id
      AND (storage.foldername(name))[1] = profiles.laboratory_id::text
    )
  );

-- 3. Policy de UPDATE para bucket case-pdfs (si necesitan reemplazar PDFs)
CREATE POLICY "Coordinador puede actualizar PDFs de casos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'case-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id IS NOT NULL
      AND (storage.foldername(name))[1] = profiles.laboratory_id::text
    )
  )
  WITH CHECK (
    bucket_id = 'case-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id IS NOT NULL
    )
  );

-- 4. Policy de DELETE para bucket case-pdfs
CREATE POLICY "Coordinador puede eliminar PDFs de casos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'case-pdfs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id IS NOT NULL
      AND (storage.foldername(name))[1] = profiles.laboratory_id::text
    )
  );

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================

-- Verificar políticas de storage para coordinador
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%Coordinador%'
ORDER BY policyname;

-- =====================================================================
-- NOTAS:
-- =====================================================================
-- 1. Estas políticas permiten a coordinador gestionar PDFs en el bucket case-pdfs
-- 2. Los PDFs se organizan por laboratory_id para multi-tenancy
-- 3. Coordinador solo puede acceder a PDFs de su propio laboratorio
-- 4. El path esperado es: case-pdfs/{laboratory_id}/{case_id}/uploaded.pdf
