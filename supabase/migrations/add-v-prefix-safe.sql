-- =====================================================================
-- SCRIPT SQL SEGURO: AGREGAR PREFIJO V- A CÉDULAS (VERSIÓN SEGURA)
-- =====================================================================
-- Este script te muestra exactamente qué se va a cambiar antes de hacerlo

-- PASO 1: Ver el estado actual
SELECT 
    'ESTADO ACTUAL' as titulo,
    cedula as cedula_actual,
    'V-' || cedula as cedula_nueva,
    nombre,
    created_at
FROM patients 
WHERE cedula !~ '^[VEJC]-'
ORDER BY created_at;

-- PASO 2: Contar cuántas se van a cambiar
SELECT 
    COUNT(*) as total_a_cambiar,
    'Cédulas que recibirán prefijo V-' as descripcion
FROM patients 
WHERE cedula !~ '^[VEJC]-';

-- PASO 3: Verificar si hay conflictos potenciales
-- (cédulas que al agregar V- podrían duplicar otras existentes)
SELECT 
    'POSIBLES CONFLICTOS' as titulo,
    'V-' || p1.cedula as cedula_que_se_creara,
    p1.cedula as cedula_original,
    p1.nombre as nombre_original,
    p2.cedula as cedula_existente,
    p2.nombre as nombre_existente
FROM patients p1
LEFT JOIN patients p2 ON 'V-' || p1.cedula = p2.cedula
WHERE p1.cedula !~ '^[VEJC]-'
  AND p2.cedula IS NOT NULL;

-- PASO 4: Si no hay conflictos, ejecutar la actualización
-- ⚠️ DESCOMENTAR Y EJECUTAR SOLO SI NO HAY CONFLICTOS EN EL PASO 3
/*
UPDATE patients 
SET cedula = 'V-' || cedula,
    updated_at = NOW()
WHERE cedula !~ '^[VEJC]-';
*/

-- PASO 5: Verificar el resultado final
SELECT 
    'RESULTADO FINAL' as titulo,
    cedula,
    COUNT(*) as cantidad
FROM patients 
GROUP BY cedula
ORDER BY cedula;
