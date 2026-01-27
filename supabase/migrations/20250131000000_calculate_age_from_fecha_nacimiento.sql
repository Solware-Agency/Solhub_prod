-- =====================================================
-- CALCULAR EDAD AUTOMÁTICAMENTE DESDE fecha_nacimiento
-- =====================================================
-- Esta migración crea un trigger que calcula automáticamente
-- la edad en formato "X Años" o "X Meses" cuando se inserta
-- o actualiza fecha_nacimiento en la tabla patients
-- =====================================================

-- =====================================================
-- 1. FUNCIÓN PARA CALCULAR EDAD DESDE fecha_nacimiento
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_age_from_fecha_nacimiento()
RETURNS TRIGGER AS $$
DECLARE
  calculated_age TEXT;
  total_months INTEGER;
  years_diff INTEGER;
BEGIN
  -- Solo calcular si fecha_nacimiento está presente y edad es NULL o vacía
  IF NEW.fecha_nacimiento IS NOT NULL AND (NEW.edad IS NULL OR NEW.edad = '') THEN
    -- Calcular meses totales desde fecha_nacimiento hasta hoy
    -- Esto es más preciso que usar EXTRACT(MONTH FROM AGE(...))
    total_months := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.fecha_nacimiento)) * 12 
                    + EXTRACT(MONTH FROM AGE(CURRENT_DATE, NEW.fecha_nacimiento));
    
    -- Calcular años para decidir el formato
    years_diff := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.fecha_nacimiento));
    
    -- Si tiene 12 meses o más (1 año o más), mostrar en años
    IF total_months >= 12 THEN
      calculated_age := years_diff::TEXT || ' Años';
    -- Si tiene menos de 12 meses pero más de 0 meses, mostrar en meses
    ELSIF total_months >= 1 THEN
      calculated_age := total_months::TEXT || ' Meses';
    -- Si tiene menos de 1 mes, mostrar como "0 Meses" (recién nacido)
    ELSE
      calculated_age := '0 Meses';
    END IF;
    
    -- Asignar la edad calculada
    NEW.edad := calculated_age;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREAR TRIGGER PARA INSERT Y UPDATE
-- =====================================================

-- Eliminar trigger si existe (para poder recrearlo)
DROP TRIGGER IF EXISTS trigger_calculate_age_from_fecha_nacimiento ON patients;

-- Crear trigger que se ejecuta ANTES de INSERT o UPDATE
CREATE TRIGGER trigger_calculate_age_from_fecha_nacimiento
  BEFORE INSERT OR UPDATE OF fecha_nacimiento, edad ON patients
  FOR EACH ROW
  EXECUTE FUNCTION calculate_age_from_fecha_nacimiento();

-- =====================================================
-- 3. ACTUALIZAR REGISTROS EXISTENTES
-- =====================================================

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

-- =====================================================
-- 4. COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION calculate_age_from_fecha_nacimiento() IS 
  'Calcula automáticamente la edad en formato "X Años" o "X Meses" desde fecha_nacimiento cuando edad es NULL. Para menores de 1 año muestra meses totales (ej: 6 Meses, 11 Meses)';

COMMENT ON TRIGGER trigger_calculate_age_from_fecha_nacimiento ON patients IS 
  'Trigger que calcula automáticamente la edad cuando se inserta o actualiza fecha_nacimiento';
