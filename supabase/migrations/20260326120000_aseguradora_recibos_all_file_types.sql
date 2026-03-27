-- Permitir cualquier tipo de archivo en recibos de póliza (comprobantes de pago).
-- Aumenta límite a 25 MB; quita restricción de extensión en política INSERT.

UPDATE storage.buckets
SET
  allowed_mime_types = NULL,
  file_size_limit = 26214400
WHERE id = 'aseguradora-recibos';

DROP POLICY IF EXISTS "Users can upload aseguradora recibos" ON storage.objects;

CREATE POLICY "Users can upload aseguradora recibos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'aseguradora-recibos'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.laboratory_id IS NOT NULL
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);
