/*
  # Doctor-signatures RLS: usar feature flag hasDoctorSignatures

  1. Cambios
    - Reemplazar condición LOWER(l.slug) = 'spt' por (l.features->>'hasDoctorSignatures') = 'true'
    - Las firmas quedan activas para cualquier laboratorio que tenga la feature activada desde el dashboard

  2. Seguridad
    - Sigue siendo solo la propia firma: (storage.foldername(name))[2] = auth.uid()::text
    - Roles permitidos: owner, medico_tratante, patologo, residente
    - El laboratorio debe tener laboratories.features.hasDoctorSignatures = true (activado desde dashboard)

  3. Compatibilidad
    - Activar hasDoctorSignatures para laboratorios que hoy tienen slug = 'spt' para no quitarles acceso
*/

-- Activar hasDoctorSignatures en labs que actualmente usan firmas (slug = spt)
UPDATE laboratories
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{hasDoctorSignatures}',
  'true'::jsonb,
  true
)
WHERE LOWER(slug) = 'spt'
  AND (features->>'hasDoctorSignatures' IS NULL OR features->>'hasDoctorSignatures' <> 'true');

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view their own doctor signature" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own doctor signature" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own doctor signature" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own doctor signature" ON storage.objects;

-- SELECT: ver propia firma (owner + roles médicos en labs con feature hasDoctorSignatures)
CREATE POLICY "Users can view their own doctor signature"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'doctor-signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND (l.features->>'hasDoctorSignatures') = 'true'
  )
);

-- INSERT: subir propia firma (JPG/JPEG/PNG)
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
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND (l.features->>'hasDoctorSignatures') = 'true'
  )
);

-- UPDATE: reemplazar propia firma
CREATE POLICY "Users can update their own doctor signature"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'doctor-signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND (l.features->>'hasDoctorSignatures') = 'true'
  )
)
WITH CHECK (
  bucket_id = 'doctor-signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND (l.features->>'hasDoctorSignatures') = 'true'
  )
);

-- DELETE: eliminar propia firma
CREATE POLICY "Users can delete their own doctor signature"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'doctor-signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN laboratories l ON l.id = p.laboratory_id
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'medico_tratante', 'patologo', 'residente')
    AND (l.features->>'hasDoctorSignatures') = 'true'
  )
);

-- Comentarios
COMMENT ON POLICY "Users can view their own doctor signature" ON storage.objects IS
  'Permite a owner y médicos ver su propia firma digital cuando el laboratorio tiene hasDoctorSignatures activo';

COMMENT ON POLICY "Users can upload their own doctor signature" ON storage.objects IS
  'Permite a owner y médicos subir su propia firma (JPG/JPEG/PNG, máx 10MB) cuando el lab tiene hasDoctorSignatures';

COMMENT ON POLICY "Users can update their own doctor signature" ON storage.objects IS
  'Permite a owner y médicos actualizar su propia firma cuando el lab tiene hasDoctorSignatures';

COMMENT ON POLICY "Users can delete their own doctor signature" ON storage.objects IS
  'Permite a owner y médicos eliminar su propia firma cuando el lab tiene hasDoctorSignatures';
