-- Permitir a todos los roles de Conspat subir/actualizar/eliminar PDFs de casos (bucket case-pdfs).
-- Restricción: solo en la carpeta de su laboratory_id.

-- INSERT: cualquier usuario de laboratorio Conspat puede subir PDFs en su carpeta
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

-- UPDATE: cualquier usuario Conspat puede actualizar PDFs en su carpeta
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

-- DELETE: cualquier usuario Conspat puede eliminar PDFs en su carpeta
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
