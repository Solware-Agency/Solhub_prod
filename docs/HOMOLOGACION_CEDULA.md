# Homologación de datos: Cédula (CI)

## Problema

En la interfaz se veían pacientes con el mismo CI en dos formatos:

- **Sin prefijo:** `26396677` / `16704702`
- **Con prefijo:** `V-26396677` / `V-16704702`

Eso generaba confusión (“homologar data”), duplicados en búsqueda y errores al registrar casos (p. ej. cédula 16704702).

## Por qué siguen existiendo cédulas sin prefijo

1. **Datos antiguos:** Antes de la homologación, algunos registros se guardaron solo con número en `patients.cedula`.
2. **Migración conservadora:** La migración `20250129100000_homologar_cedula_canonico.sql` solo actualiza a `V-xxx` cuando **no existe** ya otro paciente en el mismo lab con `V-xxx`. Si ya existía un duplicado con prefijo, el que tenía solo número se dejó así para no violar `unique_cedula_per_laboratory`. Resultado: en BD siguen conviviendo dos filas para el mismo número (una con prefijo, otra sin prefijo).
3. **Nuevos registros:** Todos los flujos que crean/actualizan pacientes pasan por `createPatient`/`updatePatient`, que **siempre** normalizan con `formatCedulaCanonical`. Por tanto, **no se están generando nuevos pacientes sin prefijo**; solo quedan los históricos y los duplicados que la migración no tocó.

## Regla obligatoria en el sistema

- En **patients** y en **identificaciones** no puede haber dos pacientes con la misma cédula en un mismo laboratorio.
- La cédula debe estar **siempre** en formato canónico: `TIPO-NUMERO` (ej: `V-16704702`).

## Solución implementada

### 1. Formato canónico en código

- **Función:** `formatCedulaCanonical(cedula)` en `identificaciones-service.ts`: normaliza a `TIPO-NUMERO`; si solo hay número, devuelve `V-` + número.
- **Escritura:** En `createPatient` y `updatePatient` toda cédula se pasa por `formatCedulaCanonical` antes de guardar. Ningún flujo (formulario de registro, responsables, edición de paciente, etc.) escribe en `patients` sin pasar por estos métodos.
- **Lectura:** `normalizePatientCedula` aplica formato canónico a todo paciente devuelto por el servicio, para que la UI siempre vea el mismo formato.

### 2. Consolidación de duplicados (migración)

- **Archivo:** `supabase/migrations/20250129100001_consolidar_duplicados_cedula.sql`
- **Qué hace:** Para cada laboratorio, busca pares donde un paciente tiene cédula solo numérica (ej: `16704702`) y otro tiene `V-` + ese número (`V-16704702`). Se queda con el paciente que **tiene casos** (el que sin prefijo suele ser el “real”) y se elimina el que no tiene casos. Luego actualiza la cédula del que se queda a formato `V-xxx`.
- **Orden:** Primero consolidar duplicados, después la migración de homologación puede actualizar sin conflictos.

### 3. Homologación de cédulas numéricas restantes

- **Archivo:** `supabase/migrations/20250129100000_homologar_cedula_canonico.sql`
- **Qué hace:** `UPDATE patients SET cedula = 'V-' || cedula` solo donde la cédula es solo dígitos y **no** existe ya otro paciente en el mismo lab con `V-` + ese número (evita violar la única).
- **Cuándo:** Ejecutar después de la consolidación para que no queden cédulas solo numéricas.

## Cómo queda y cómo funciona el sistema

- **En BD:** Un solo paciente por (cédula, laboratorio); cédula siempre en formato `TIPO-NUMERO` (p. ej. `V-16704702`).
- **Formulario de registro:** Siempre envía `idType` + `idNumber` (ej: `V` + `16704702`). `prepareRegistrationData` arma `cedula: "V-16704702"` y `createPatient`/`updatePatient` la normalizan de nuevo antes de guardar. No se guarda sin prefijo.
- **Búsqueda / autocompletado:** Devuelve pacientes con cédula ya normalizada; no aparecen dos “mitades” del mismo número.
- **Identificaciones:** Dual-write sigue escribiendo tipo + número; la restricción por (laboratory_id, numero, tipo_documento) evita duplicados por el mismo número en el mismo lab.

## Resumen para la empresa

- **Homologar data** = un solo formato de CI (`TIPO-NUMERO`) y **un solo paciente por cédula por laboratorio**.
- **Causa de lo que ves:** datos antiguos + migración que no actualizaba cuando ya existía un duplicado con prefijo.
- **Qué se hizo:** (1) Normalizar siempre al guardar y al leer en código. (2) Migración que consolida duplicados (quedarse con el que tiene casos, borrar el otro y poner prefijo al que queda). (3) Migración que homologa el resto de cédulas numéricas sin provocar conflictos.
- **Resultado:** En patients e identificaciones no hay pacientes duplicados por cédula en un mismo laboratorio, y todas las cédulas quedan y se muestran con prefijo.
