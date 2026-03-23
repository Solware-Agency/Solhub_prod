-- Habilitar Storage para Marihorgen/LM en adjuntos de casos:
-- - case-images
-- - case-videos
-- - case-pdfs
-- Mantiene aislamiento por carpeta laboratory_id.

-- =========================
-- CASE IMAGES
-- =========================
DROP POLICY IF EXISTS "Users can upload case images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update case images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete case images" ON storage.objects;

CREATE POLICY "Users can upload case images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-images'
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp')
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat', 'marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

CREATE POLICY "Users can update case images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'case-images'
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat', 'marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
)
WITH CHECK (
  bucket_id = 'case-images'
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp')
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat', 'marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

CREATE POLICY "Users can delete case images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'case-images'
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat', 'marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

-- =========================
-- CASE VIDEOS
-- =========================
DROP POLICY IF EXISTS "Users can upload case videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update case videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete case videos" ON storage.objects;

CREATE POLICY "Users can upload case videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-videos'
  AND storage.extension(name) IN ('mp4')
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat', 'marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

CREATE POLICY "Users can update case videos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'case-videos'
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat', 'marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
)
WITH CHECK (
  bucket_id = 'case-videos'
  AND storage.extension(name) IN ('mp4')
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat', 'marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

CREATE POLICY "Users can delete case videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'case-videos'
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat', 'marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

-- =========================
-- CASE PDFS (Marihorgen/LM)
-- =========================
DROP POLICY IF EXISTS "Marihorgen puede subir PDFs de casos" ON storage.objects;
DROP POLICY IF EXISTS "Marihorgen puede actualizar PDFs de casos" ON storage.objects;
DROP POLICY IF EXISTS "Marihorgen puede eliminar PDFs de casos" ON storage.objects;

CREATE POLICY "Marihorgen puede subir PDFs de casos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-pdfs'
  AND storage.extension(objects.name) = 'pdf'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND p.laboratory_id IS NOT NULL
      AND lower(l.slug) IN ('marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

CREATE POLICY "Marihorgen puede actualizar PDFs de casos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'case-pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND p.laboratory_id IS NOT NULL
      AND lower(l.slug) IN ('marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
)
WITH CHECK (
  bucket_id = 'case-pdfs'
  AND storage.extension(objects.name) = 'pdf'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND p.laboratory_id IS NOT NULL
      AND lower(l.slug) IN ('marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

CREATE POLICY "Marihorgen puede eliminar PDFs de casos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'case-pdfs'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND p.laboratory_id IS NOT NULL
      AND lower(l.slug) IN ('marihorgen', 'lm')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);
