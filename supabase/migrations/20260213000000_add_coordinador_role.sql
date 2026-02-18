-- Migration: Agregar rol 'coordinador' al sistema
-- Fecha: 2026-02-13
-- Descripción: Nuevo rol con permisos de employee + capacidad de subir PDFs

-- =====================================================================
-- PERMISOS DEL ROL COORDINADOR:
-- =====================================================================
-- ✅ TODOS los permisos de 'employee':
--    - Ver/crear/editar casos médicos
--    - Ver/crear/editar pacientes  
--    - Ver formulario médico
--    - Ver usuarios
--    - Ver historial de cambios
--    - Ver aseguradoras (condicional)
-- ✅ PLUS: Adjuntar PDF en casos (uploaded_pdf_url field) como 'laboratorio'
-- ✅ PLUS: Subir PDFs a storage

-- 1. Eliminar el constraint actual
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Crear el constraint con TODOS los roles (incluyendo el nuevo 'coordinador')
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
  'laboratorio'::text,
  'coordinador'::text  -- ← NUEVO ROL
]));

-- 3. Verificar que el nuevo rol está en el constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_role_check';

-- 4. Agregar policy para que coordinador pueda actualizar uploaded_pdf_url
CREATE POLICY "Coordinador puede adjuntar PDF en casos"
  ON public.medical_records_clean
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id = medical_records_clean.laboratory_id
    )
  )
  WITH CHECK (
    -- Puede actualizar uploaded_pdf_url y otros campos (permisos tipo employee)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id = medical_records_clean.laboratory_id
    )
  );

-- 5. Agregar policy de SELECT para coordinador (permisos tipo employee)
CREATE POLICY "Coordinador puede ver casos de su laboratorio"
  ON public.medical_records_clean
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id = medical_records_clean.laboratory_id
    )
  );

-- =====================================================================
-- NOTAS IMPORTANTES:
-- =====================================================================
-- 1. El rol 'coordinador' combina permisos de 'employee' + subir PDFs
-- 2. Los usuarios con este rol pueden:
--    - TODO lo que puede un 'employee'
--    - PLUS: Actualizar el campo uploaded_pdf_url en casos
--    - PLUS: Subir archivos a storage (controlado por la aplicación)
-- 3. La aplicación (frontend) debe tratar 'coordinador' como 'employee'
--    PERO permitir funcionalidad de subir PDFs
-- 
-- 4. Para asignar el rol a un usuario:
--    UPDATE profiles SET role = 'coordinador' WHERE email = 'usuario@ejemplo.com';
--
-- 5. Para verificar que funciona:
--    SELECT 'coordinador'::text = ANY (ARRAY[
--      'owner'::text, 'employee'::text, 'admin'::text, 'residente'::text,
--      'citotecno'::text, 'patologo'::text, 'medicowner'::text, 
--      'medico_tratante'::text, 'enfermero'::text, 'imagenologia'::text,
--      'call_center'::text, 'prueba'::text, 'laboratorio'::text, 'coordinador'::text
--    ]) AS rol_valido;  -- Debería retornar true

-- =====================================================================
-- CONFIGURACIÓN ADICIONAL NECESARIA:
-- =====================================================================
-- ACTUALIZAR EN EL CÓDIGO:
-- 1. types.ts: Agregar 'coordinador' a la unión de roles
-- 2. Sidebar.tsx: Configurar rutas como 'employee' para 'coordinador'  
-- 3. Comentarios: Actualizar "solo SPT, roles: laboratorio, owner, prueba, call_center, coordinador"
-- 4. Validaciones: Incluir 'coordinador' donde se valide subir PDFs