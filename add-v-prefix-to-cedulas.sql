-- =====================================================================
-- SCRIPT SQL: AGREGAR PREFIJO V- A TODAS LAS CÉDULAS
-- =====================================================================
-- Este script agrega el prefijo "V-" a todas las cédulas que no lo tengan

-- PASO 1: Verificar el estado actual de las cédulas
SELECT 
    cedula,
    COUNT(*) as cantidad,
    CASE 
        WHEN cedula ~ '^[VEJC]-' THEN 'Con prefijo'
        ELSE 'Sin prefijo'
    END as estado
FROM patients 
GROUP BY cedula
ORDER BY estado, cedula;

-- PASO 2: Mostrar cuántas cédulas necesitan el prefijo
SELECT 
    COUNT(*) as cedulas_sin_prefijo,
    'Cédulas que necesitan prefijo V-' as descripcion
FROM patients 
WHERE cedula !~ '^[VEJC]-';

-- PASO 3: ACTUALIZAR TODAS LAS CÉDULAS SIN PREFIJO
-- ⚠️ IMPORTANTE: Ejecutar solo después de verificar los pasos anteriores
UPDATE patients 
SET cedula = 'V-' || cedula,
    updated_at = NOW()
WHERE cedula !~ '^[VEJC]-';

-- PASO 4: Verificar el resultado
SELECT 
    cedula,
    COUNT(*) as cantidad,
    'Con prefijo V-' as estado
FROM patients 
GROUP BY cedula
ORDER BY cedula;

-- PASO 5: Mostrar resumen final
SELECT 
    COUNT(*) as total_pacientes,
    COUNT(CASE WHEN cedula ~ '^V-' THEN 1 END) as con_prefijo_v,
    COUNT(CASE WHEN cedula ~ '^[EJC]-' THEN 1 END) as con_otros_prefijos,
    COUNT(CASE WHEN cedula !~ '^[VEJC]-' THEN 1 END) as sin_prefijo
FROM patients;
