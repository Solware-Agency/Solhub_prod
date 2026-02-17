/*
  # Create aseguradora-recibos storage bucket and RLS policies

  1. Changes
    - Create `aseguradora-recibos` bucket for payment receipt uploads (aseguradoras)
    - Allow PDF and images (JPG, PNG) - formatos típicos de recibos
    - Path: {laboratory_id}/{poliza_id}/{filename}
    - RLS: usuarios autenticados con laboratory_id pueden subir/ver en su carpeta

  2. Security
    - Solo usuarios con laboratory_id asignado
    - Solo pueden acceder a archivos en su carpeta (laboratory_id)
*/

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aseguradora-recibos',
  'aseguradora-recibos',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view aseguradora recibos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload aseguradora recibos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update aseguradora recibos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete aseguradora recibos" ON storage.objects;

-- SELECT: ver recibos del propio laboratorio
CREATE POLICY "Users can view aseguradora recibos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'aseguradora-recibos'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.laboratory_id IS NOT NULL
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);

-- INSERT: subir recibos en carpeta del laboratorio
CREATE POLICY "Users can upload aseguradora recibos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'aseguradora-recibos'
  AND storage.extension(name) IN ('pdf', 'jpg', 'jpeg', 'png')
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.laboratory_id IS NOT NULL
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);

-- UPDATE: actualizar recibos del propio laboratorio
CREATE POLICY "Users can update aseguradora recibos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'aseguradora-recibos'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.laboratory_id IS NOT NULL
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
)
WITH CHECK (
  bucket_id = 'aseguradora-recibos'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.laboratory_id IS NOT NULL
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);

-- DELETE: eliminar recibos del propio laboratorio
CREATE POLICY "Users can delete aseguradora recibos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'aseguradora-recibos'
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.laboratory_id IS NOT NULL
    AND (storage.foldername(name))[1] = p.laboratory_id::text
  )
);
