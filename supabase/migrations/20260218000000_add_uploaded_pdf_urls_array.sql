-- Soporte para hasta 5 PDFs adjuntos por caso (SPT)
-- uploaded_pdf_url se mantiene con el primer PDF para compatibilidad

ALTER TABLE medical_records_clean
ADD COLUMN IF NOT EXISTS uploaded_pdf_urls text[] DEFAULT '{}';

COMMENT ON COLUMN medical_records_clean.uploaded_pdf_urls IS
'Array de URLs de PDFs subidos manualmente (máximo 5). El primer elemento se refleja en uploaded_pdf_url para compatibilidad.';

-- Migrar datos existentes: un solo PDF en uploaded_pdf_url pasa a ser el primer elemento del array
UPDATE medical_records_clean
SET uploaded_pdf_urls = ARRAY[uploaded_pdf_url]
WHERE uploaded_pdf_url IS NOT NULL
  AND (uploaded_pdf_urls IS NULL OR uploaded_pdf_urls = '{}');
