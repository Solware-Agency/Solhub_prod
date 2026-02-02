/*
  # Doctor-signatures RLS: permitir rol owner en SPT

  1. Cambios
    - Incluir rol 'owner' en las 4 políticas RLS del bucket doctor-signatures
    - El owner del laboratorio SPT puede subir/ver/actualizar/eliminar su propia firma

  2. Seguridad
    - Sigue siendo solo SPT (laboratory slug = 'spt')
    - Sigue siendo solo la propia firma: (storage.foldername(name))[2] = auth.uid()::text
    - Roles permitidos: owner, medico_tratante, patologo, residente

*/

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view their own doctor signature" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own doctor signature" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own doctor signature" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own doctor signature" ON storage.objects;

-- SELECT: ver propia firma (owner + roles médicos en SPT)
CREATE POLICY "Users can view their own doctor signature"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'doctor-signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
  )
);

-- INSERT: subir propia firma (JPG/JPEG/PNG)
CREATE POLICY "Users can upload their own doctor signature"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'doctor-signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png')
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
  )
);

-- UPDATE: reemplazar propia firma
CREATE POLICY "Users can update their own doctor signature"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'doctor-signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
  )
)
WITH CHECK (
  bucket_id = 'doctor-signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
  )
);

-- DELETE: eliminar propia firma
CREATE POLICY "Users can delete their own doctor signature"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'doctor-signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND EXISTS (
      SELECT 1 FROM laboratories l
      WHERE l.id = p.laboratory_id
      AND LOWER(l.slug) = 'spt'
    )
  )
);

-- Comentarios
COMMENT ON POLICY "Users can view their own doctor signature" ON storage.objects IS
  'Permite a owner y médicos de SPT ver su propia firma digital';

COMMENT ON POLICY "Users can upload their own doctor signature" ON storage.objects IS
  'Permite a owner y médicos de SPT subir su propia firma digital (JPG/JPEG/PNG, máx 10MB)';

COMMENT ON POLICY "Users can update their own doctor signature" ON storage.objects IS
  'Permite a owner y médicos de SPT actualizar su propia firma digital';

COMMENT ON POLICY "Users can delete their own doctor signature" ON storage.objects IS
  'Permite a owner y médicos de SPT eliminar su propia firma digital';
