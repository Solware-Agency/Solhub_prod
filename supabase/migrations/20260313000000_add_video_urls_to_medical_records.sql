-- Añadir video_urls a medical_records_clean (videos MP4 del caso, mismo flujo que imágenes).
-- Límite 5 archivos total (imágenes + videos) se aplica en la aplicación.

ALTER TABLE public.medical_records_clean
ADD COLUMN IF NOT EXISTS video_urls text[] DEFAULT NULL;

COMMENT ON COLUMN public.medical_records_clean.video_urls IS
  'URLs de videos MP4 del caso (imagenología). Máximo 5 archivos en total contando imágenes (images_urls + video_urls).';

CREATE INDEX IF NOT EXISTS idx_medical_records_video_urls
  ON public.medical_records_clean USING GIN (video_urls);
