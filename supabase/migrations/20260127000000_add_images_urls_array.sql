-- Migration: Cambiar image_url a images_urls (array) para múltiples imágenes
-- Fecha: 2026-01-27
-- Descripción: Permite hasta 10 URLs de imágenes para imagenología

-- 1. Agregar nueva columna images_urls como array de text
ALTER TABLE public.medical_records_clean
ADD COLUMN IF NOT EXISTS images_urls text[] DEFAULT NULL;

-- 2. Migrar datos existentes: copiar image_url a images_urls[1] si existe
UPDATE public.medical_records_clean
SET images_urls = ARRAY[image_url]::text[]
WHERE image_url IS NOT NULL 
  AND image_url != '';

-- 3. Opcional: Mantener image_url por compatibilidad (deprecated)
-- Si prefieres eliminarlo después de validar en producción, comenta estas líneas
COMMENT ON COLUMN public.medical_records_clean.image_url IS 
  'DEPRECATED: Usar images_urls en su lugar. Mantenido por compatibilidad temporal.';

-- 4. Agregar índice para búsquedas en el array (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_medical_records_images_urls 
  ON public.medical_records_clean USING GIN (images_urls);

-- 5. Agregar constraint para limitar máximo 10 URLs
ALTER TABLE public.medical_records_clean
ADD CONSTRAINT chk_images_urls_max_10 
  CHECK (images_urls IS NULL OR array_length(images_urls, 1) <= 10);

-- 6. Agregar constraint para validar formato URL
-- Nota: PostgreSQL no permite subqueries en CHECK constraints
-- Validación movida a nivel de aplicación (MultipleImageUrls component)
-- Como alternativa, se puede crear una función de validación:

-- Función helper para validar URLs
CREATE OR REPLACE FUNCTION validate_images_urls(urls text[])
RETURNS boolean AS $$
BEGIN
  IF urls IS NULL THEN
    RETURN true;
  END IF;
  
  -- Verificar que todas las URLs tengan formato válido
  RETURN NOT EXISTS (
    SELECT 1 FROM unnest(urls) AS url
    WHERE url !~* '^https?://.*'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Aplicar constraint usando la función
ALTER TABLE public.medical_records_clean
ADD CONSTRAINT chk_images_urls_format 
  CHECK (validate_images_urls(images_urls));

-- Comentario sobre la tabla
COMMENT ON COLUMN public.medical_records_clean.images_urls IS 
  'Array de URLs de imágenes para imagenología. Máximo 10 URLs. Cada URL debe comenzar con http:// o https://.';

-- =====================================================================
-- NOTAS IMPORTANTES:
-- =====================================================================
-- 1. Los datos existentes en image_url se migran automáticamente a images_urls[1]
-- 2. image_url se mantiene por compatibilidad temporal (puedes eliminarlo más adelante)
-- 3. El array puede contener hasta 10 URLs
-- 4. Cada URL debe tener formato válido (http:// o https://)
-- 5. RLS policies existentes se aplicarán automáticamente a la nueva columna
-- 6. Para eliminar image_url en el futuro (después de validar):
--    ALTER TABLE public.medical_records_clean DROP COLUMN image_url;
