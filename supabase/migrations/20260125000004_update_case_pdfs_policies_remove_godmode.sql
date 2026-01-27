/*
  # Actualizar políticas RLS del bucket case-pdfs - Eliminar godmode, usar solo prueba

  1. Changes
    - Actualizar políticas RLS para usar 'prueba' en lugar de 'godmode'
    - El rol 'prueba' es el rol godmode (acceso completo)
    - Roles permitidos: laboratorio, owner, prueba

  2. Security
    - Solo para laboratorio SPT
    - Roles permitidos: laboratorio, owner, prueba (godmode)
*/

-- =====================================================
-- ACTUALIZAR POLÍTICAS RLS EXISTENTES
-- =====================================================

-- Eliminar políticas existentes para recrearlas con el rol correcto
DROP POLICY IF EXISTS "Users can upload case PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update case PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete case PDFs" ON storage.objects;

-- Policy: Allow specific roles to INSERT (upload) PDFs
-- Roles: laboratorio, owner, prueba (godmode) in SPT laboratory
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
    AND p.role IN ('laboratorio', 'owner', 'prueba')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);

-- Policy: Allow specific roles to UPDATE (replace) PDFs
-- Roles: laboratorio, owner, prueba (godmode) in SPT laboratory
CREATE POLICY "Users can update case PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'case-pdfs'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('laboratorio', 'owner', 'prueba')
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
    AND p.role IN ('laboratorio', 'owner', 'prueba')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);

-- Policy: Allow specific roles to DELETE PDFs
-- Roles: laboratorio, owner, prueba (godmode) in SPT laboratory
CREATE POLICY "Users can delete case PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'case-pdfs'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('laboratorio', 'owner', 'prueba')
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
  'Permite a roles laboratorio, owner y prueba (godmode) en SPT subir PDFs de casos (PDF, máx 30MB)';

COMMENT ON POLICY "Users can update case PDFs" ON storage.objects IS 
  'Permite a roles laboratorio, owner y prueba (godmode) en SPT actualizar PDFs de casos';

COMMENT ON POLICY "Users can delete case PDFs" ON storage.objects IS 
  'Permite a roles laboratorio, owner y prueba (godmode) en SPT eliminar PDFs de casos';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada: Políticas RLS actualizadas - rol "prueba" (godmode) agregado, "godmode" removido';
END $$;
