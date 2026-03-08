# Consistencia identificaciones ↔ patients.cedula

## Regla: una sola fuente de verdad

- **Cédula “oficial” del paciente** = la que está en `patients.cedula`.
- **Tabla `identificaciones`** = desglose (tipo + número) de esa misma cédula, vinculada al mismo paciente.

No se debe vincular en `identificaciones` un (tipo, numero) a un paciente que en `patients` tiene **otra** cédula. Eso evita confusión entre personas (ej.: que el número 8342306 quede asociado a la persona equivocada).

## Cómo se garantiza

### 1. Validación en el servicio (app)

- **`createIdentification`** y **`updateIdentification`** en `identificaciones-service.ts`:
  - Antes de insertar/actualizar, comprueban que el paciente (por `paciente_id`) tenga en `patients.cedula`:
    - `NULL` o vacío → se permite cualquier (tipo, numero).
    - Con valor → debe coincidir con `tipo-numero` (normalizado). Si no, se lanza error claro para el usuario.

### 2. Trigger en base de datos

- **Función:** `check_identificacion_patient_cedula_consistency()`
- **Trigger:** `trigger_check_identificacion_patient_cedula` en `identificaciones` (BEFORE INSERT OR UPDATE OF paciente_id, tipo_documento, numero).
- **Lógica:** Para tipos V, E, J, C, si el paciente tiene `cedula` en `patients`, debe ser igual a `tipo_documento || '-' || numero` (comparación case-insensitive). Si no, se hace `RAISE EXCEPTION`.
- **Migración:** `20260306222600_identificaciones_consistency_with_patients_cedula.sql`

### 3. UI clara al editar

- En **Editar paciente / responsable** se muestra explícitamente: “Editando a: **Nombre** — Cédula en ficha: **V-12345678**”.
- Junto al campo Cédula se indica: “El tipo y número deben coincidir con la cédula de este paciente en su ficha.”
- Cualquier pantalla que edite `identificaciones` (dashboard, etc.) debería mostrar siempre el paciente (nombre + cédula) al que pertenece la fila.

### 4. Un solo lugar para cambiar la cédula

- **Cambiar la cédula de un paciente** = flujo que actualice **`patients.cedula`** y, si se usa el sistema de identificaciones, que actualice o cree la fila correspondiente en **`identificaciones`** (mismo `paciente_id`, mismo tipo-numero).
- En la app, eso se hace desde **edición de paciente** (por ejemplo `updatePatient` + dual-write a identificaciones). No se debe cambiar solo `identificaciones` a mano dejando `patients.cedula` distinto; el trigger y el servicio lo impiden.

## Resumen

| Qué | Dónde |
|-----|--------|
| Fuente de verdad de la cédula | `patients.cedula` |
| Validación al crear/editar identificación | Servicio (createIdentification / updateIdentification) |
| Validación en BD | Trigger `check_identificacion_patient_cedula_consistency` |
| UI para no confundir personas | Mostrar “Editando a: Nombre — Cédula: V-xxx” y texto de ayuda en el campo |
| Cambiar cédula | Siempre desde el flujo de edición de paciente (actualiza patients + identificaciones) |
