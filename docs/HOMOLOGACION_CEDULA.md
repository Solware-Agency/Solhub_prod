# Homologación de datos: Cédula (CI)

## Problema

En la interfaz se veían pacientes con el mismo CI en dos formatos:

- **Sin prefijo:** `26396677`
- **Con prefijo:** `V-26396677`

Eso generaba confusión (“homologar data”) y posibles duplicados lógicos al buscar o comparar.

## Origen de la inconsistencia

1. **Dual-write:** Se escribe en `patients.cedula` (sistema antiguo) y en `identificaciones` (tipo + número). En `identificaciones` el número va siempre sin prefijo; en `patients.cedula` a veces se guardó solo el número.
2. **Datos legacy o importaciones** donde la cédula se guardó solo como número.
3. **Diferentes pantallas** (registro, edición de paciente, responsable) que en el pasado pudieron enviar solo el número en algún flujo.

## Solución implementada

### 1. Formato canónico

- **Regla:** La cédula se trata siempre como `TIPO-NUMERO` (ej: `V-26396677`).
- **Función:** `formatCedulaCanonical(cedula)` en `identificaciones-service.ts`:
  - Si viene `26396677` → devuelve `V-26396677`.
  - Si ya viene `V-26396677` → se deja igual.
  - NULL, vacío o `S/C` → devuelve null.

### 2. Al escribir (create/update paciente)

- En **createPatient** y **updatePatient** (`patients-service.ts`):
  - Toda cédula que se guarde en `patients.cedula` se pasa por `formatCedulaCanonical` antes del `insert`/`update`.
- Con eso, todo registro nuevo o actualizado queda con prefijo en BD.

### 3. Al leer (respuestas del servicio)

- Cualquier paciente devuelto por el servicio se normaliza con `normalizePatientCedula`:
  - Si en BD está `26396677`, la API devuelve `V-26396677`.
- Afecta a: `findPatientById`, `findPatientByCedula`, `findPatientUnified`, `createPatient`, `updatePatient`, `searchPatients`, `searchPatientsOptimized`, `getPatientsPaginated`.

Así la UI siempre recibe el mismo formato, aunque en BD quede algún valor antiguo sin prefijo.

### 4. Migración de datos históricos

- **Archivo:** `supabase/migrations/20250129100000_homologar_cedula_canonico.sql`
- **Qué hace:**  
  `UPDATE patients SET cedula = 'V-' || cedula WHERE cedula ~ '^[0-9]+$'`  
  (solo filas donde la cédula son únicamente dígitos).
- **Cuándo ejecutar:** Una vez en cada entorno (local, staging, producción) para que en BD no queden cédulas solo numéricas.

## Resumen para la empresa

- **Homologar data** = un solo formato de CI: siempre `TIPO-NUMERO` (ej: `V-26396677`).
- **Causa:** dual-write + datos antiguos/importados que guardaron solo el número.
- **Qué se hizo:**
  1. Normalizar siempre al guardar y al devolver pacientes.
  2. Migración SQL para corregir registros que ya estaban solo con número en `patients.cedula`.

Después de desplegar el código y ejecutar la migración, todas las vistas que usan el servicio de pacientes verán la cédula homologada.
