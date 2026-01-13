-- =====================================================
-- ACTUALIZAR EDAD DE PACIENTES EXISTENTES
-- =====================================================
-- Este query calcula automáticamente la edad para todos los pacientes
-- que tienen fecha_nacimiento pero edad es NULL o vacía
-- =====================================================

-- Ver cuántos pacientes se van a actualizar
SELECT 
  COUNT(*) as pacientes_a_actualizar
FROM patients
WHERE fecha_nacimiento IS NOT NULL 
  AND (edad IS NULL OR edad = '');

-- Actualizar todos los registros que tienen fecha_nacimiento pero edad es NULL
UPDATE patients
SET edad = CASE
  WHEN fecha_nacimiento IS NOT NULL THEN
    CASE
      -- Calcular meses totales
      WHEN (EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) * 12 
            + EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_nacimiento))) >= 12 THEN
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento))::TEXT || ' Años'
      WHEN (EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) * 12 
            + EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_nacimiento))) >= 1 THEN
        (EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) * 12 
         + EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_nacimiento)))::TEXT || ' Meses'
      ELSE
        '0 Meses'
    END
  ELSE
    NULL
END
WHERE fecha_nacimiento IS NOT NULL 
  AND (edad IS NULL OR edad = '');

-- Verificar resultados: mostrar algunos ejemplos de pacientes actualizados
SELECT 
  id,
  nombre,
  fecha_nacimiento,
  edad as edad_calculada,
  tipo_paciente
FROM patients
WHERE fecha_nacimiento IS NOT NULL 
  AND edad IS NOT NULL
ORDER BY fecha_nacimiento DESC
LIMIT 10;
