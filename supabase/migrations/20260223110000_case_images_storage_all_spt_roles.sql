-- Permitir a todos los roles de SPT subir/actualizar/eliminar imágenes en detalles del caso (bucket case-images).
-- Antes solo: imagenologia, owner, prueba, call_center. Ahora: cualquier usuario de un laboratorio con slug = spt.

DROP POLICY IF EXISTS "Users can upload case images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update case images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete case images" ON storage.objects;

-- INSERT: cualquier usuario autenticado de un lab SPT puede subir en la carpeta de su lab
CREATE POLICY "Users can upload case images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-images'
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp')
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) = 'spt'
      AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);

-- UPDATE: mismo criterio (usuario SPT, carpeta de su lab)
CREATE POLICY "Users can update case images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'case-images'
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) = 'spt'
      AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
)
WITH CHECK (
  bucket_id = 'case-images'
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp')
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) = 'spt'
      AND (storage.foldername(name))[1] = p.laboratory_id::text
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
      AND lower(l.slug) = 'spt'
      AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);
