-- Bucket case-videos para MP4 de casos (máx 30MB). Misma política que case-images (spt, conspat).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-videos',
  'case-videos',
  true,
  31457280,
  ARRAY['video/mp4']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 31457280,
  allowed_mime_types = ARRAY['video/mp4'];

-- SELECT: cualquier autenticado puede ver
DROP POLICY IF EXISTS "Users can view case videos" ON storage.objects;
CREATE POLICY "Users can view case videos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'case-videos');

-- INSERT
DROP POLICY IF EXISTS "Users can upload case videos" ON storage.objects;
CREATE POLICY "Users can upload case videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'case-videos'
  AND storage.extension(name) IN ('mp4')
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

-- UPDATE
DROP POLICY IF EXISTS "Users can update case videos" ON storage.objects;
CREATE POLICY "Users can update case videos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'case-videos'
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
)
WITH CHECK (
  bucket_id = 'case-videos'
  AND storage.extension(name) IN ('mp4')
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);

-- DELETE
DROP POLICY IF EXISTS "Users can delete case videos" ON storage.objects;
CREATE POLICY "Users can delete case videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'case-videos'
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
      AND lower(l.slug) IN ('spt', 'conspat')
      AND (storage.foldername(objects.name))[1] = p.laboratory_id::text
  )
);
