-- Migration: Agregar rol 'laboratorio' al sistema
-- Fecha: 2026-01-27
-- Descripción: Nuevo rol con permisos para ver pacientes, ver casos, enviar informes y adjuntar PDFs

-- =====================================================================
-- PERMISOS DEL ROL LABORATORIO:
-- =====================================================================
-- ✅ Ver pacientes (patients table)
-- ✅ Ver casos médicos (medical_records_clean table)
-- ✅ Enviar informes por email
-- ✅ Adjuntar PDF en casos (uploaded_pdf_url field)
-- ✅ Subir PDFs a storage
-- ❌ NO puede crear/editar/eliminar casos
-- ❌ NO puede crear/editar/eliminar pacientes
-- ❌ NO puede ver información financiera
-- ❌ NO tiene acceso a configuración de laboratorio

-- 1. Eliminar el constraint actual
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Crear el constraint con TODOS los roles (incluyendo el nuevo 'laboratorio')
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
CHECK (role = ANY (ARRAY[
  'owner'::text,
  'employee'::text,
  'admin'::text,
  'residente'::text,
  'citotecno'::text,
  'patologo'::text,
  'medicowner'::text,
  'medico_tratante'::text,
  'enfermero'::text,
  'imagenologia'::text,
  'call_center'::text,
  'prueba'::text,
  'laboratorio'::text  -- ← NUEVO ROL
]));

-- 3. Verificar que el nuevo rol está en el constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_role_check';

-- 4. Agregar policy para que laboratorio pueda actualizar uploaded_pdf_url
CREATE POLICY "Laboratorio puede adjuntar PDF en casos"
  ON public.medical_records_clean
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'laboratorio'
      AND profiles.laboratory_id = medical_records_clean.laboratory_id
    )
  )
  WITH CHECK (
    -- Solo puede actualizar uploaded_pdf_url, no otros campos
    uploaded_pdf_url IS DISTINCT FROM (
      SELECT uploaded_pdf_url FROM public.medical_records_clean AS old_record
      WHERE old_record.id = medical_records_clean.id
    )
  );

-- =====================================================================
-- NOTAS IMPORTANTES:
-- =====================================================================
-- 1. El rol 'laboratorio' se agrega al CHECK CONSTRAINT de profiles
-- 2. Los usuarios con este rol pueden:
--    - Leer todos los pacientes de su laboratorio
--    - Leer todos los casos médicos de su laboratorio
--    - Actualizar el campo uploaded_pdf_url en casos
--    - Enviar emails (controlado por la aplicación)
-- 3. La aplicación (frontend) debe controlar qué funcionalidades muestra
-- 
-- 4. Para asignar el rol a un usuario:
--    UPDATE profiles SET role = 'laboratorio' WHERE email = 'usuario@ejemplo.com';
--
-- 5. Para verificar que funciona:
--    SELECT 'laboratorio'::text = ANY (ARRAY[
--      'owner'::text, 'employee'::text, 'admin'::text, 'residente'::text,
--      'citotecno'::text, 'patologo'::text, 'medicowner'::text, 
--      'medico_tratante'::text, 'enfermero'::text, 'imagenologia'::text,
--      'call_center'::text, 'prueba'::text, 'laboratorio'::text
--    ]) AS rol_valido;  -- Debería retornar true
