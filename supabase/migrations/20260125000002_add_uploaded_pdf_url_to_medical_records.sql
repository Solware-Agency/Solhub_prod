/*
  # Agregar campo uploaded_pdf_url a medical_records_clean

  1. Changes
    - Add `uploaded_pdf_url` column to `medical_records_clean` table (text, nullable)
    - Add index for better query performance
    - Add comment for documentation

  2. Purpose
    - Store URL of PDF uploaded by roles: laboratorio, owner, godmode
    - Only for SPT laboratory
    - PDF is stored in Supabase Storage bucket 'case-pdfs'
    - All users can view the PDF, but only specific roles can upload

  3. Behavior
    - Field is optional (nullable)
    - One PDF per case (replaces existing if new one is uploaded)
    - URL points to public URL in Supabase Storage
*/

-- Agregar columna uploaded_pdf_url
ALTER TABLE medical_records_clean 
ADD COLUMN IF NOT EXISTS uploaded_pdf_url text;

-- Agregar índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_uploaded_pdf_url 
ON medical_records_clean(uploaded_pdf_url) 
WHERE uploaded_pdf_url IS NOT NULL;

-- Comentario para documentación
COMMENT ON COLUMN medical_records_clean.uploaded_pdf_url IS 
'URL del PDF subido manualmente desde los detalles del caso. Solo para roles laboratorio, owner y godmode en laboratorio SPT. Almacenado en Supabase Storage bucket case-pdfs. Visible para todos los usuarios.';

-- Verificación
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'medical_records_clean' 
      AND column_name = 'uploaded_pdf_url'
  ) THEN
    RAISE EXCEPTION 'Error: La columna uploaded_pdf_url no se agregó correctamente a medical_records_clean';
  END IF;
  
  RAISE NOTICE '✅ Migración completada: Columna uploaded_pdf_url agregada a medical_records_clean';
END $$;
