-- =====================================================
-- HOMOLOGAR DATA: Cédula en formato canónico (TIPO-NUMERO)
-- =====================================================
-- Actualiza patients.cedula cuando está solo en números
-- para que quede siempre como "V-12345678" (prefijo + número).
--
-- CONTEXTO:
-- - Algunos registros tienen cedula "26396677" y otros "V-26396677"
--   por datos legacy, dual-write o flujos que guardaron solo el número.
-- - La app ya normaliza en lectura y escritura; esta migración
--   corrige los datos existentes en BD.
--
-- SEGURIDAD:
-- - Solo actualiza filas donde cedula ~ '^[0-9]+$' (solo dígitos).
-- - No toca NULL, vacíos ni valores que ya tengan prefijo (V-, E-, J-, C-).
-- - NO actualiza si ya existe otro paciente en el mismo lab con "V-"||cedula
--   (evita violar unique_cedula_per_laboratory; el duplicado queda sin prefijo
--   y la app lo normaliza al leer).
-- =====================================================

UPDATE patients p1
SET cedula = 'V-' || p1.cedula
WHERE p1.cedula IS NOT NULL
  AND p1.cedula != ''
  AND p1.cedula ~ '^[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM patients p2
    WHERE p2.laboratory_id = p1.laboratory_id
      AND p2.cedula = 'V-' || p1.cedula
      AND p2.id != p1.id
  );

-- Opcional: comentario para documentar
COMMENT ON COLUMN patients.cedula IS 'Cédula en formato canónico TIPO-NUMERO (ej: V-26396677). Homologado por migración 20250129100000.';
