/*
  # Create doctor-signatures storage bucket and RLS policies

  1. Changes
    - Create `doctor-signatures` bucket in Supabase Storage
    - Configure bucket as public (for public URLs)
    - Set file size limit to 10MB
    - Allow only JPG/JPEG MIME types
    - Create RLS policies for secure access

  2. Security
    - Users can only upload/read/delete their own signatures
    - Only medical roles (medico_tratante, patologo, residente) in SPT laboratory
    - Path structure: {laboratory_id}/{user_id}/signature.jpg
*/

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'doctor-signatures',
  'doctor-signatures',
  true, -- Public bucket for public URLs
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg'] -- Only JPEG allowed (image/jpeg is the standard MIME type)
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg'];

-- =====================================================
-- 2. RLS POLICIES FOR STORAGE.OBJECTS
-- =====================================================
-- Note: Policies are created using helper functions from storage schema
-- Path structure: {laboratory_id}/{user_id}/signature.jpg

-- Policy: Allow users to SELECT (read) their own signature
-- Only for medical roles in SPT laboratory
-- Using storage.foldername() helper to extract path components
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view their own doctor signature'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can view their own doctor signature"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = ''doctor-signatures''
      AND (storage.foldername(name))[2] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN (''medico_tratante'', ''patologo'', ''residente'')
        AND EXISTS (
          SELECT 1 FROM laboratories l
          WHERE l.id = p.laboratory_id
          AND LOWER(l.slug) = ''spt''
        )
      )
    )';
  END IF;
END $$;

-- Policy: Allow users to INSERT (upload) their own signature
-- Only for medical roles in SPT laboratory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own doctor signature'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can upload their own doctor signature"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''doctor-signatures''
      AND (storage.foldername(name))[2] = auth.uid()::text
      AND storage.extension(name) IN (''jpg'', ''jpeg'')
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN (''medico_tratante'', ''patologo'', ''residente'')
        AND EXISTS (
          SELECT 1 FROM laboratories l
          WHERE l.id = p.laboratory_id
          AND LOWER(l.slug) = ''spt''
        )
      )
    )';
  END IF;
END $$;

-- Policy: Allow users to UPDATE (replace) their own signature
-- Only for medical roles in SPT laboratory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own doctor signature'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can update their own doctor signature"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = ''doctor-signatures''
      AND (storage.foldername(name))[2] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN (''medico_tratante'', ''patologo'', ''residente'')
        AND EXISTS (
          SELECT 1 FROM laboratories l
          WHERE l.id = p.laboratory_id
          AND LOWER(l.slug) = ''spt''
        )
      )
    )
    WITH CHECK (
      bucket_id = ''doctor-signatures''
      AND (storage.foldername(name))[2] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN (''medico_tratante'', ''patologo'', ''residente'')
        AND EXISTS (
          SELECT 1 FROM laboratories l
          WHERE l.id = p.laboratory_id
          AND LOWER(l.slug) = ''spt''
        )
      )
    )';
  END IF;
END $$;

-- Policy: Allow users to DELETE their own signature
-- Only for medical roles in SPT laboratory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own doctor signature'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can delete their own doctor signature"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''doctor-signatures''
      AND (storage.foldername(name))[2] = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN (''medico_tratante'', ''patologo'', ''residente'')
        AND EXISTS (
          SELECT 1 FROM laboratories l
          WHERE l.id = p.laboratory_id
          AND LOWER(l.slug) = ''spt''
        )
      )
    )';
  END IF;
END $$;

-- =====================================================
-- 3. COMMENTS
-- =====================================================

COMMENT ON POLICY "Users can view their own doctor signature" ON storage.objects IS 
  'Permite a usuarios médicos de SPT ver su propia firma digital';

COMMENT ON POLICY "Users can upload their own doctor signature" ON storage.objects IS 
  'Permite a usuarios médicos de SPT subir su propia firma digital (JPG/JPEG, máx 10MB)';

COMMENT ON POLICY "Users can update their own doctor signature" ON storage.objects IS 
  'Permite a usuarios médicos de SPT actualizar su propia firma digital';

COMMENT ON POLICY "Users can delete their own doctor signature" ON storage.objects IS 
  'Permite a usuarios médicos de SPT eliminar su propia firma digital';
