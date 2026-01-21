/*
  # Update doctor-signatures storage bucket to allow PNG files

  1. Changes
    - Update `doctor-signatures` bucket to allow PNG MIME types in addition to JPEG
    - Update RLS policies to allow PNG file extensions (.png)
    - Maintain backward compatibility with existing JPG/JPEG files

  2. Security
    - Same security policies apply
    - Users can only upload/read/delete their own signatures
    - Only medical roles (medico_tratante, patologo, residente) in SPT laboratory
    - Path structure: {laboratory_id}/{user_id}/signature.jpg or signature.png
*/

-- =====================================================
-- 1. UPDATE STORAGE BUCKET TO ALLOW PNG
-- =====================================================

-- Update bucket to allow both JPEG and PNG
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png']
WHERE id = 'doctor-signatures';

-- If bucket doesn't exist, create it (shouldn't happen, but safe fallback)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'doctor-signatures',
  'doctor-signatures',
  true, -- Public bucket for public URLs
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png'] -- JPEG and PNG allowed
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png'];

-- =====================================================
-- 2. UPDATE RLS POLICIES TO ALLOW PNG EXTENSIONS
-- =====================================================

-- Policy: Update INSERT policy to allow PNG extensions
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can upload their own doctor signature" ON storage.objects;
  
  -- Create updated policy with PNG support
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
      AND p.role IN ('medico_tratante', 'patologo', 'residente')
      AND EXISTS (
        SELECT 1 FROM laboratories l
        WHERE l.id = p.laboratory_id
        AND LOWER(l.slug) = 'spt'
      )
    )
  );
END $$;

-- =====================================================
-- 3. UPDATE COMMENTS
-- =====================================================

COMMENT ON POLICY "Users can upload their own doctor signature" ON storage.objects IS 
  'Permite a usuarios médicos de SPT subir su propia firma digital (JPG/JPEG/PNG, máx 10MB)';
