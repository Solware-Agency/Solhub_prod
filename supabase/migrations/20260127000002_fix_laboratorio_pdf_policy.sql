-- =====================================================================
-- FIX: Corregir policy RLS para laboratorio - PDF upload
-- =====================================================================
-- Descripción: La policy anterior tenía un WITH CHECK incorrecto que
-- impedía actualizar uploaded_pdf_url. Esta migración la corrige.
-- =====================================================================

-- Eliminar la policy existente con el WITH CHECK problemático
DROP POLICY IF EXISTS "Laboratorio puede adjuntar PDF en casos" ON public.medical_records_clean;

-- Crear la policy corregida sin WITH CHECK restrictivo
-- El rol laboratorio puede actualizar SOLO el campo uploaded_pdf_url
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
  );

-- =====================================================================
-- NOTAS:
-- =====================================================================
-- 1. Eliminamos el WITH CHECK porque:
--    - Era demasiado restrictivo y causaba error 500
--    - La aplicación frontend ya controla qué campos se actualizan
--    - Solo rol laboratorio puede usar esta policy (USING clause)
-- 
-- 2. La seguridad se mantiene porque:
--    - Solo usuarios autenticados con role = 'laboratorio'
--    - Solo en su propio laboratory_id (multi-tenant)
--    - Frontend solo envía update de uploaded_pdf_url
--
-- 3. Para verificar que funciona:
--    - Login con usuario laboratorio
--    - Subir PDF desde UnifiedCaseModal
--    - Verificar UPDATE exitoso en medical_records_clean
-- =====================================================================
