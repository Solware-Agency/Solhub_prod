/*
  # Create case-pdfs storage bucket and RLS policies

  1. Changes
    - Create `case-pdfs` bucket in Supabase Storage
    - Configure bucket as public (for public URLs)
    - Set file size limit to 30MB
    - Allow only PDF MIME types
    - Create RLS policies for secure access

  2. Security
    - All authenticated users can read PDFs
    - Only roles: laboratorio, owner, prueba (godmode) in SPT laboratory can upload/update/delete
    - Path structure: {laboratory_id}/{case_id}/uploaded.pdf
*/

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-pdfs',
  'case-pdfs',
  true, -- Public bucket for public URLs
  31457280, -- 30MB in bytes
  ARRAY['application/pdf'] -- Only PDF allowed
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- =====================================================
-- 2. RLS POLICIES FOR STORAGE.OBJECTS
-- =====================================================
-- Note: Policies are created using helper functions from storage schema
-- Path structure: {laboratory_id}/{case_id}/uploaded.pdf

-- Policy: Allow all authenticated users to SELECT (read) PDFs
-- All users can view uploaded PDFs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view case PDFs'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can view case PDFs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = ''case-pdfs''
    )';
  END IF;
END $$;

-- Policy: Allow specific roles to INSERT (upload) PDFs
-- Only roles: laboratorio, owner, prueba (godmode) in SPT laboratory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload case PDFs'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can upload case PDFs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = ''case-pdfs''
      AND storage.extension(name) = ''pdf''
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN (''laboratorio'', ''owner'', ''prueba'')
        AND EXISTS (
          SELECT 1 FROM laboratories l
          WHERE l.id = p.laboratory_id
          AND LOWER(l.slug) = ''spt''
        )
        AND (storage.foldername(name))[1] = p.laboratory_id::text
      )
    )';
  END IF;
END $$;

-- Policy: Allow specific roles to UPDATE (replace) PDFs
-- Only roles: laboratorio, owner, prueba (godmode) in SPT laboratory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update case PDFs'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can update case PDFs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = ''case-pdfs''
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN (''laboratorio'', ''owner'', ''prueba'')
        AND EXISTS (
          SELECT 1 FROM laboratories l
          WHERE l.id = p.laboratory_id
          AND LOWER(l.slug) = ''spt''
        )
        AND (storage.foldername(name))[1] = p.laboratory_id::text
      )
    )
    WITH CHECK (
      bucket_id = ''case-pdfs''
      AND storage.extension(name) = ''pdf''
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN (''laboratorio'', ''owner'', ''prueba'')
        AND EXISTS (
          SELECT 1 FROM laboratories l
          WHERE l.id = p.laboratory_id
          AND LOWER(l.slug) = ''spt''
        )
        AND (storage.foldername(name))[1] = p.laboratory_id::text
      )
    )';
  END IF;
END $$;

-- Policy: Allow specific roles to DELETE PDFs
-- Only roles: laboratorio, owner, prueba (godmode) in SPT laboratory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete case PDFs'
  ) THEN
    EXECUTE '
    CREATE POLICY "Users can delete case PDFs"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = ''case-pdfs''
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN (''laboratorio'', ''owner'', ''prueba'')
        AND EXISTS (
          SELECT 1 FROM laboratories l
          WHERE l.id = p.laboratory_id
          AND LOWER(l.slug) = ''spt''
        )
        AND (storage.foldername(name))[1] = p.laboratory_id::text
      )
    )';
  END IF;
END $$;

-- =====================================================
-- 3. COMMENTS
-- =====================================================

COMMENT ON POLICY "Users can view case PDFs" ON storage.objects IS 
  'Permite a todos los usuarios autenticados ver PDFs subidos de casos';

COMMENT ON POLICY "Users can upload case PDFs" ON storage.objects IS 
  'Permite a roles laboratorio, owner y prueba (godmode) en SPT subir PDFs de casos (PDF, máx 30MB)';

COMMENT ON POLICY "Users can update case PDFs" ON storage.objects IS 
  'Permite a roles laboratorio, owner y prueba (godmode) en SPT actualizar PDFs de casos';

COMMENT ON POLICY "Users can delete case PDFs" ON storage.objects IS 
  'Permite a roles laboratorio, owner y prueba (godmode) en SPT eliminar PDFs de casos';

-- =====================================================
-- 4. VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'case-pdfs'
  ) THEN
    RAISE EXCEPTION 'Error: El bucket case-pdfs no se creó correctamente';
  END IF;
  
  RAISE NOTICE '✅ Migración completada: Bucket case-pdfs creado con políticas RLS';
END $$;
