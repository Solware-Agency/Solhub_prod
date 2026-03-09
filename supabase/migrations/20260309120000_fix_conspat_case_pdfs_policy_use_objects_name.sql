-- Fix: En el subquery EXISTS, "name" sin calificar se resuelve a l.name (laboratorio).
-- Usar objects.name para el path del archivo en storage (igual que case-images).
DROP POLICY IF EXISTS "Conspat puede subir PDFs de casos" ON storage.objects;
DROP POLICY IF EXISTS "Conspat puede actualizar PDFs de casos" ON storage.objects;
DROP POLICY IF EXISTS "Conspat puede eliminar PDFs de casos" ON storage.objects;

-- INSERT
CREATE POLICY "Conspat puede subir PDFs de casos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-pdfs'
  AND storage.extension(objects.name) = 'pdf'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND p.laboratory_id IS NOT NULL
      AND LOWER(l.slug) = 'conspat'
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

-- UPDATE
CREATE POLICY "Conspat puede actualizar PDFs de casos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'case-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND p.laboratory_id IS NOT NULL
      AND LOWER(l.slug) = 'conspat'
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
)
WITH CHECK (
  bucket_id = 'case-pdfs'
  AND storage.extension(objects.name) = 'pdf'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND p.laboratory_id IS NOT NULL
      AND LOWER(l.slug) = 'conspat'
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

-- DELETE
CREATE POLICY "Conspat puede eliminar PDFs de casos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'case-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND p.laboratory_id IS NOT NULL
      AND LOWER(l.slug) = 'conspat'
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);
