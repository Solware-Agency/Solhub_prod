# Optimización: statement timeout en listado de casos

## Problema

En los logs de Postgres (Supabase) aparecía repetidamente:

```text
canceling statement due to statement timeout
```

La consulta que disparaba el error es la que usa **PostgREST** para el listado paginado de la tabla `medical_records_clean` (página de casos), con `count: 'exact'`: un `SELECT` con `LIMIT`/`OFFSET` más un `COUNT(*)` sobre el mismo conjunto de filas (mismo `WHERE` y mismo `JOIN` con `patients`). Con muchos registros por laboratorio, esa consulta superaba el `statement_timeout` configurado en Supabase.

## Cambios realizados

### 1. Nueva migración de índices

**Archivo:** `supabase/migrations/20260317120000_optimize_medical_records_count_and_list.sql`

- **`idx_medical_records_lab_patient_id`** en `(laboratory_id, patient_id)`  
  Acelera el filtro por laboratorio y el `JOIN` con `patients` que usa el listado y el `COUNT`.

- **`idx_medical_records_lab_branch`** en `(laboratory_id, branch)`  
  Acelera el filtro por sede (branch) en la UI.

- **`ANALYZE`** sobre `medical_records_clean` y `patients` para que el planificador use bien los índices.

El índice `(laboratory_id, created_at DESC)` ya existía (`idx_medical_records_lab_created`) y sigue siendo el adecuado para ordenar por fecha.

### 2. Sin límite artificial en la ruta “orden en cliente”

En **`getCasesWithPatientInfo`**, cuando se ordena por nombre/cédula del paciente o se usa el filtro de triaje, se siguen trayendo **todas** las filas que cumplan el filtro para ordenarlas en el cliente. **No** se aplica un límite de 10.000: hacerlo ocultaría registros cuando hay más de 10k casos (el usuario no vería el resto). La mejora de rendimiento depende de los **índices** anteriores; si con tablas muy grandes el timeout reaparece, las alternativas son ordenar por nombre en el servidor (RPC con `ORDER BY patients.nombre`) o pedir al usuario que acote filtros (fechas, sede, etc.).

## Cómo aplicar

1. **Aplicar la migración** en tu proyecto Supabase (local o remoto):

   ```bash
   pnpm supabase db push
   # o, si usas migraciones manuales:
   # ejecutar el SQL de 20260317120000_optimize_medical_records_count_and_list.sql en el SQL Editor del dashboard
   ```

2. Tras desplegar, los listados de casos deberían responder más rápido y el error `canceling statement due to statement timeout` debería dejar de aparecer en condiciones normales de uso.

## Si el timeout sigue apareciendo

1. **Revisar `statement_timeout` en Supabase**  
   En el dashboard: Project Settings → Database. En planes gratuitos suele ser bajo (p. ej. 8 s). Subirlo solo si es necesario y teniendo en cuenta el plan.

2. **Orden por nombre en el servidor**  
   Si ordenar por nombre/cédula sigue siendo lento con muchos registros, se puede crear una RPC que haga `ORDER BY patients.nombre` en SQL y devuelva solo la página pedida, sin traer todos los registros al cliente.

3. **RPC para listado + count**  
   Para casos extremos (muy alto volumen por laboratorio), se puede crear una función RPC en Postgres que devuelva página + count en una sola llamada, con un `SELECT` y un `COUNT(*)` optimizados (p. ej. usando los mismos índices y quizá una vista o query afinada).

## Resumen

- **Causa:** consulta pesada de listado + count sobre `medical_records_clean` con `JOIN` a `patients`.
- **Solución principal:** índices `(laboratory_id, patient_id)` y `(laboratory_id, branch)` + `ANALYZE`.
- **Sin límite de filas:** no se aplica tope para no ocultar casos cuando hay más de 10k; la mejora depende de los índices. Si hace falta más rendimiento, usar orden por nombre en el servidor (RPC) o filtrar por fechas/sede.
