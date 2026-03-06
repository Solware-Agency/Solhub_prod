-- Adjuntos del asegurado: hasta 3 archivos (PDF/imágenes) al registrar/editar.
-- Se guardan URLs en JSONB; los archivos están en storage bucket aseguradora-recibos.
ALTER TABLE asegurados ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN asegurados.attachments IS 'Array de hasta 3 elementos: [{ "url": "...", "name": "nombre.pdf" }]. Documentos adjuntos del asegurado.';

-- Opcional: restricción para máximo 3 elementos (PostgreSQL 16+ podría usar jsonb_array_length)
ALTER TABLE asegurados DROP CONSTRAINT IF EXISTS asegurados_attachments_max_3;
ALTER TABLE asegurados ADD CONSTRAINT asegurados_attachments_max_3
  CHECK (jsonb_array_length(attachments) <= 3);
