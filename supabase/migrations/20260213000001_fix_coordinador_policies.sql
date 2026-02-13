-- Migración para completar las políticas RLS del rol coordinador
-- Fecha: 2026-02-13
-- Descripción: Agregar políticas faltantes para coordinador (INSERT, DELETE)

-- =====================================================================
-- POLÍTICAS FALTANTES PARA COORDINADOR
-- =====================================================================

-- 1. Agregar policy de INSERT para coordinador (mismos permisos que employee)
CREATE POLICY "Coordinador puede crear casos en su laboratorio"
  ON public.medical_records_clean
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id = medical_records_clean.laboratory_id
    )
  );

-- 2. Agregar policy de DELETE para coordinador (si employee puede borrar)
CREATE POLICY "Coordinador puede borrar casos de su laboratorio"
  ON public.medical_records_clean  
  FOR DELETE
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
-- POLÍTICAS ADICIONALES PARA OTRAS TABLAS IMPORTANTES
-- =====================================================================

-- 3. Políticas para tabla profiles (coordinador puede ver otros usuarios del mismo lab)
CREATE POLICY "Coordinador puede ver perfiles de su laboratorio"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'coordinador'
      AND p.laboratory_id = profiles.laboratory_id
    )
  );

-- 4. Políticas para tabla patients (coordinador = employee permissions)
CREATE POLICY "Coordinador puede ver pacientes de su laboratorio"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id = patients.laboratory_id
    )
  );

CREATE POLICY "Coordinador puede crear pacientes en su laboratorio"
  ON public.patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id = patients.laboratory_id
    )
  );

CREATE POLICY "Coordinador puede actualizar pacientes de su laboratorio"
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id = patients.laboratory_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coordinador'
      AND profiles.laboratory_id = patients.laboratory_id
    )
  );

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('medical_records_clean', 'patients', 'profiles')
  AND policyname LIKE '%Coordinador%'
ORDER BY tablename, policyname;

-- =====================================================================
-- NOTAS:
-- =====================================================================
-- 1. Estas políticas dan a coordinador los MISMOS permisos que employee
-- 2. PLUS: puede actualizar uploaded_pdf_url (política ya creada anteriormente)  
-- 3. Si necesitas más tablas, agrega políticas similares
-- 4. Todas las políticas verifican laboratory_id para multi-tenant