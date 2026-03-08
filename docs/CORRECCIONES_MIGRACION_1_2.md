# 🔧 Correcciones Aplicadas a la Migración 1.2

## 🔴 Problemas Detectados y Corregidos

Durante la aplicación de la migración
`20251024000001_add_laboratory_id_to_tables.sql`, se detectaron 2 problemas en
la base de datos de producción:

### Problema 1: Pacientes con `cedula = NULL`

**Error:**

```
ERROR: 23505: could not create unique index "unique_cedula_per_laboratory"
DETAIL: Key (cedula, laboratory_id)=(null, null) is duplicated.
```

### Problema 2: Columna `status_result` no existe

**Error:**

```
ERROR: 42703: column "status_result" does not exist
```

---

## ✅ Soluciones Implementadas

### Solución 1: Índice Único Parcial para Cédulas

Se cambió de un **CONSTRAINT único** a un **UNIQUE INDEX parcial** que solo
aplica cuando la cédula NO es NULL.

### Código Anterior (que causaba el error):

```sql
alter table public.patients
add constraint unique_cedula_per_laboratory
unique nulls not distinct (cedula, laboratory_id);
```

### Código Nuevo (corregido):

```sql
-- SOLUCIÓN: Usar un UNIQUE INDEX parcial
drop index if exists unique_cedula_per_laboratory;
create unique index unique_cedula_per_laboratory
on public.patients (cedula, laboratory_id)
where cedula is not null;
```

### Solución 2: Corregir Nombre de Columna en Índice

La migración intentaba crear un índice en una columna `status_result` que no
existe en la tabla `medical_records_clean`. Se corrigió para usar
`payment_status` que es la columna real.

#### Código Anterior (que causaba el error):

```sql
-- Casos por laboratorio y estado (filtros en UI)
create index if not exists idx_medical_records_lab_status
on public.medical_records_clean(laboratory_id, status_result);
```

#### Código Nuevo (corregido):

```sql
-- Casos por laboratorio y estado de pago (filtros en UI)
-- Usar payment_status que es la columna que existe en medical_records_clean
create index if not exists idx_medical_records_lab_payment_status
on public.medical_records_clean(laboratory_id, payment_status);
```

**Por qué `payment_status`:**

- Es la columna real que existe en `medical_records_clean`
- Se usa para filtrar casos por estado de pago (Pendiente, Pagado, Parcial)
- Es un campo útil para optimizar queries del dashboard y reportes

---

## 📊 Comportamiento del Índice Único Parcial

| Escenario                    | Cédula       | laboratory_id | ¿Se permite? | Explicación                                   |
| ---------------------------- | ------------ | ------------- | ------------ | --------------------------------------------- |
| Paciente con cédula en Lab A | `V-12345678` | `lab-a-uuid`  | ✅ SÍ        | Primera vez esta cédula en Lab A              |
| Duplicar cédula en Lab A     | `V-12345678` | `lab-a-uuid`  | ❌ NO        | Ya existe en Lab A (violación única)          |
| Misma cédula en Lab B        | `V-12345678` | `lab-b-uuid`  | ✅ SÍ        | Multi-tenant: mismo paciente en diferente lab |
| Paciente sin cédula #1       | `NULL`       | `lab-a-uuid`  | ✅ SÍ        | Índice no aplica cuando cedula IS NULL        |
| Paciente sin cédula #2       | `NULL`       | `lab-a-uuid`  | ✅ SÍ        | Múltiples NULL permitidos                     |
| Paciente sin cédula #3       | `NULL`       | `NULL`        | ✅ SÍ        | Múltiples NULL permitidos                     |

---

## 🎯 Ventajas de Esta Solución

### 1. ✅ Permite Casos Excepcionales

Algunos pacientes legítimamente pueden no tener cédula:

- **Extranjeros** sin cédula venezolana
- **Casos urgentes** registrados temporalmente sin documentos
- **Pacientes pediátricos** sin cédula aún
- **Registros en proceso** de actualización

### 2. ✅ Mantiene Integridad de Datos

Cuando SÍ hay cédula, garantiza:

- **Unicidad por laboratorio**: Una cédula = Un paciente por lab
- **Multi-tenancy**: Misma cédula puede existir en diferentes labs
- **Sin colisiones**: No permite duplicados accidentales

### 3. ✅ Compatibilidad Total

- **No modifica datos existentes**
- **No requiere limpieza manual**
- **Funciona con el código actual**
- **Más flexible para producción**

---

## 🔍 Cómo Verificar Pacientes sin Cédula

Si quieres investigar cuántos pacientes sin cédula tienes:

```sql
-- Contar pacientes sin cédula
SELECT COUNT(*) as total_sin_cedula
FROM patients
WHERE cedula IS NULL;

-- Ver detalles de esos pacientes
SELECT
  id,
  nombre,
  edad,
  telefono,
  email,
  created_at,
  updated_at
FROM patients
WHERE cedula IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Estadísticas por fecha de creación
SELECT
  DATE(created_at) as fecha,
  COUNT(*) as pacientes_sin_cedula
FROM patients
WHERE cedula IS NULL
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

---

## 📝 Testing del Índice

Para verificar que el índice funciona correctamente:

```sql
-- TEST 1: Verificar que el índice existe
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'patients'
  AND indexname = 'unique_cedula_per_laboratory';

-- TEST 2: Intentar insertar cédula duplicada en mismo lab (debe fallar)
-- Asumiendo que tienes un paciente con V-12345678 en Conspat
INSERT INTO patients (cedula, nombre, laboratory_id)
VALUES ('V-12345678', 'Paciente Duplicado', 'conspat-uuid');
-- ❌ Debería fallar con: duplicate key value violates unique constraint

-- TEST 3: Insertar múltiples pacientes sin cédula (debe funcionar)
INSERT INTO patients (cedula, nombre, laboratory_id)
VALUES
  (NULL, 'Paciente Sin Cédula 1', 'conspat-uuid'),
  (NULL, 'Paciente Sin Cédula 2', 'conspat-uuid');
-- ✅ Debería funcionar sin errores

-- TEST 4: Insertar misma cédula en diferente laboratorio (debe funcionar)
INSERT INTO patients (cedula, nombre, laboratory_id)
VALUES ('V-12345678', 'Juan Pérez', 'labtest-uuid');
-- ✅ Debería funcionar (multi-tenancy)
```

---

## 🚀 Impacto en el Sistema

### En el Frontend:

- ✅ **Sin cambios requeridos**
- ✅ Campo `cedula` sigue siendo opcional en formularios
- ✅ Validaciones actuales siguen funcionando

### En la Base de Datos:

- ✅ **Índice más eficiente** (solo indexa registros con cédula)
- ✅ **Menos espacio de almacenamiento** para el índice
- ✅ **Queries más rápidas** en búsquedas por cédula

### Para Multi-tenancy:

- ✅ **Aislamiento correcto** por laboratorio
- ✅ **Flexibilidad** para casos excepcionales
- ✅ **Escalabilidad** sin problemas

---

## 📚 Referencias

- [PostgreSQL Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [PostgreSQL Unique Indexes](https://www.postgresql.org/docs/current/indexes-unique.html)
- Archivo actualizado:
  `supabase/migrations/20251024000001_add_laboratory_id_to_tables.sql`
- Test actualizado: `supabase/migrations/TEST_MULTITENANT.sql`

---

## ✅ Estado

- **Fecha de corrección**: 2025-10-24
- **Migración afectada**: `20251024000001_add_laboratory_id_to_tables.sql`
- **Problemas corregidos**: 2
  - ✅ Corrección 1: Índice único parcial para cédulas (permite NULL)
  - ✅ Corrección 2: Índice con columna correcta (`payment_status`)
- **Estado**: ✅ CORREGIDO y listo para aplicar
- **Validación**: Testing actualizado

---

## 📋 Resumen de Cambios

| Elemento                         | Antes               | Después                  | Razón                            |
| -------------------------------- | ------------------- | ------------------------ | -------------------------------- |
| Constraint de cédula             | CONSTRAINT único    | INDEX parcial            | Permite pacientes sin cédula     |
| Índice de estado medical_records | `status_result`     | `payment_status`         | Columna real en la tabla         |
| Manejo de NULL en cédulas        | Falla con múltiples | Permite múltiples NULL   | Casos excepcionales legítimos    |
| Optimización de queries          | 3 índices           | 4 índices (mejor nombre) | Queries más eficientes filtradas |

---

**Nota**: Estas correcciones adaptan la migración a la realidad de los datos en
producción, haciéndola más robusta y flexible sin comprometer la integridad o
seguridad multi-tenant.
