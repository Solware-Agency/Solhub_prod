-- Permitir a laboratorios spt y conspat usar el bucket case-images (upload/update/delete).
DROP POLICY IF EXISTS "Users can upload case images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update case images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete case images" ON storage.objects;

-- INSERT: usuarios autenticados de lab spt o conspat pueden subir en la carpeta de su lab
CREATE POLICY "Users can upload case images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-images'
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp')
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

-- UPDATE: mismo criterio
CREATE POLICY "Users can update case images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'case-images'
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
)
WITH CHECK (
  bucket_id = 'case-images'
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp')
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

-- DELETE: mismo criterio
CREATE POLICY "Users can delete case images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'case-images'
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);
