/*
  # Permitir rol call_center en case-pdfs

  1. Changes
    - Agregar el rol 'call_center' a las policies de Storage para el bucket `case-pdfs`
    - Mantener restricción: solo laboratorio SPT y solo en su propio laboratory_id folder

  2. Security
    - Roles permitidos para subir/actualizar/eliminar: laboratorio, owner, prueba, call_center
    - Lectura: se mantiene para todos los usuarios autenticados (policy existente)
*/

-- =====================================================
-- ACTUALIZAR POLÍTICAS RLS EXISTENTES (storage.objects)
-- =====================================================

-- Re-crear policies para incluir call_center
DROP POLICY IF EXISTS "Users can upload case PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update case PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete case PDFs" ON storage.objects;

-- Policy: INSERT (upload) PDFs
CREATE POLICY "Users can upload case PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-pdfs'
  AND storage.extension(name) = 'pdf'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('laboratorio', 'owner', 'prueba', 'call_center')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);

-- Policy: UPDATE (replace) PDFs
CREATE POLICY "Users can update case PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'case-pdfs'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('laboratorio', 'owner', 'prueba', 'call_center')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
)
WITH CHECK (
  bucket_id = 'case-pdfs'
  AND storage.extension(name) = 'pdf'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('laboratorio', 'owner', 'prueba', 'call_center')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);

-- Policy: DELETE PDFs
CREATE POLICY "Users can delete case PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'case-pdfs'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('laboratorio', 'owner', 'prueba', 'call_center')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);

-- =====================================================
-- ACTUALIZAR COMENTARIOS
-- =====================================================

COMMENT ON POLICY "Users can upload case PDFs" ON storage.objects IS 
  'Permite a roles laboratorio, owner, prueba y call_center en SPT subir PDFs de casos (PDF, máx 30MB)';

COMMENT ON POLICY "Users can update case PDFs" ON storage.objects IS 
  'Permite a roles laboratorio, owner, prueba y call_center en SPT actualizar PDFs de casos';

COMMENT ON POLICY "Users can delete case PDFs" ON storage.objects IS 
  'Permite a roles laboratorio, owner, prueba y call_center en SPT eliminar PDFs de casos';

DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada: call_center habilitado para subir/actualizar/eliminar PDFs en bucket case-pdfs (solo SPT)';
END $$;

