-- Documentos de póliza: hasta 3 archivos (PDF/imágenes), igual que asegurados.
-- Se guardan en JSONB; los archivos en storage bucket aseguradora-recibos (path lab/polizas_docs/poliza_id/).
ALTER TABLE polizas ADD COLUMN IF NOT EXISTS documentos_poliza JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN polizas.documentos_poliza IS 'Array de hasta 3 elementos: [{ "url": "...", "name": "nombre.pdf" }]. Documentos adjuntos de la póliza.';

ALTER TABLE polizas DROP CONSTRAINT IF EXISTS polizas_documentos_poliza_max_3;
ALTER TABLE polizas ADD CONSTRAINT polizas_documentos_poliza_max_3
  CHECK (jsonb_array_length(documentos_poliza) <= 3);
