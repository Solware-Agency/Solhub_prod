/*
  # Add counterPattern to laboratory configurations
  
  - Agrega counterPattern a Conspat y SPT
  - counterPattern define cómo buscar códigos existentes para calcular el siguiente contador
  - Conspat: {type}{year:2}*{month} (busca códigos que empiecen con tipo+año y terminen con mes)
  - SPT: {examCode}*{month}{year:2} (busca códigos que empiecen con código de examen y terminen con mes+año)
*/

-- Actualizar Conspat: Formato {type}{year:2}{counter:3}{month} → Ejemplo: 125001K
UPDATE laboratories
SET config = jsonb_set(
  config,
  '{counterPattern}',
  '"{type}{year:2}*{month}"'::jsonb
)
WHERE slug = 'conspat'
AND (config->>'counterPattern' IS NULL OR config->>'counterPattern' = '');

-- Actualizar SPT: Formato {examCode}{counter:4}{month}{year:2} → Ejemplo: CI0001K25
UPDATE laboratories
SET config = jsonb_set(
  config,
  '{counterPattern}',
  '"{examCode}*{month}{year:2}"'::jsonb
)
WHERE slug = 'spt'
AND (config->>'counterPattern' IS NULL OR config->>'counterPattern' = '');

-- Verificar que se actualizaron correctamente
DO $$
DECLARE
  conspat_pattern text;
  spt_pattern text;
BEGIN
  SELECT config->>'counterPattern' INTO conspat_pattern
  FROM laboratories WHERE slug = 'conspat';
  
  SELECT config->>'counterPattern' INTO spt_pattern
  FROM laboratories WHERE slug = 'spt';
  
  IF conspat_pattern IS NULL OR conspat_pattern = '' THEN
    RAISE WARNING 'No se pudo actualizar counterPattern para Conspat';
  ELSE
    RAISE NOTICE 'Conspat counterPattern actualizado: %', conspat_pattern;
  END IF;
  
  IF spt_pattern IS NULL OR spt_pattern = '' THEN
    RAISE WARNING 'No se pudo actualizar counterPattern para SPT';
  ELSE
    RAISE NOTICE 'SPT counterPattern actualizado: %', spt_pattern;
  END IF;
END $$;

