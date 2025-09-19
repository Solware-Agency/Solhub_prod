# PASOS RESTANTES PARA COMPLETAR LA MIGRACIÓN DEL FRONTEND

## 🎯 ARCHIVOS QUE NECESITAN ACTUALIZACIÓN

### 1. **Dashboard - Lista de Casos Médicos**

**Archivos a modificar:**

- `src/features/dashboard/cases/CasesPage.tsx`
- `src/features/dashboard/cases/MainCases.tsx`
- `src/features/dashboard/cases/MyCases.tsx`

**Cambios necesarios:**

- Cambiar consultas de `medical_records_clean` por `medical_cases_with_patient` (vista)
- Actualizar filtros y búsquedas
- Mostrar información del paciente desde la vista

### 2. **Dashboard - Lista de Pacientes**

**Archivos a modificar:**

- `src/features/dashboard/patients/PatientsList.tsx`
- `src/features/dashboard/patients/PatientsPage.tsx`

**Cambios necesarios:**

- Usar el servicio `patients-service.ts`
- Mostrar estadísticas usando `patient_statistics` (vista)
- Agregar funcionalidad de editar pacientes

### 3. **Dashboard - Historial de Cambios**

**Archivos a modificar:**

- `src/features/dashboard/changelog/ChangelogPage.tsx`
- `src/features/dashboard/changelog/ChangelogTable.tsx`

**Cambios necesarios:**

- Mostrar cambios tanto de pacientes como de casos médicos
- Usar el campo `entity_type` para distinguir
- Filtrar por tipo de entidad

### 4. **Dashboard - Reportes y Estadísticas**

**Archivos a modificar:**

- `src/features/dashboard/stats/StatsPage.tsx`
- `src/features/dashboard/reports/ReportsPage.tsx`
- `src/features/dashboard/components/ExamTypePieChart.tsx`
- `src/features/dashboard/components/BranchRevenueReport.tsx`
- `src/features/dashboard/components/DoctorRevenueReport.tsx`

**Cambios necesarios:**

- Usar `medical_cases_with_patient` para reportes
- Consultas más eficientes con la nueva estructura
- Conteos correctos de pacientes únicos

### 5. **Hooks y Utilidades**

**Archivos a verificar/actualizar:**

- `src/shared/hooks/` - Hooks que consulten medical_records_clean
- `src/lib/supabase-service.ts` - Funciones que no usen la nueva estructura

## 🔧 EJEMPLOS DE CAMBIOS ESPECÍFICOS

### Ejemplo 1: Actualizar lista de casos médicos

```typescript
// ANTES (en CasesPage.tsx)
const { data } = await supabase.from('medical_records_clean').select('*').order('created_at', { ascending: false })

// DESPUÉS
const { data } = await getCasesWithPatientInfo(page, limit, filters)
// O usar la vista directamente:
const { data } = await supabase.from('medical_cases_with_patient').select('*').order('created_at', { ascending: false })
```

### Ejemplo 2: Actualizar búsqueda de pacientes

```typescript
// ANTES (buscar en medical_records_clean por DISTINCT)
const { data } = await supabase
	.from('medical_records_clean')
	.select('DISTINCT ON (id_number) full_name, id_number, phone')

// DESPUÉS
const { data } = await getPatients(page, limit, searchTerm)
// O usar servicio directo:
const patients = await searchPatients(searchTerm)
```

### Ejemplo 3: Actualizar estadísticas

```typescript
// ANTES (conteo con DISTINCT)
const { count } = await supabase.from('medical_records_clean').select('id_number', { count: 'exact' }).distinct()

// DESPUÉS (conteo real)
const { count } = await supabase.from('patients').select('*', { count: 'exact', head: true })
```

## 📝 PASOS PARA CADA ARCHIVO

### Paso A: Identificar consultas actuales

1. Buscar `medical_records_clean` en el archivo
2. Identificar qué datos se consultan
3. Determinar si necesita datos del paciente, del caso, o ambos

### Paso B: Reemplazar con nueva estructura

- Si solo necesita **datos del caso**: usar `medical_records_clean`
- Si necesita **datos del paciente**: usar `patients`
- Si necesita **ambos**: usar `medical_cases_with_patient` (vista)
- Si necesita **estadísticas**: usar `patient_statistics` (vista)

### Paso C: Actualizar imports

```typescript
// Agregar imports necesarios
import { getCasesWithPatientInfo } from '@lib/medical-cases-service'
import { getPatients, searchPatients } from '@lib/patients-service'
```

## 🚀 ORDEN SUGERIDO DE ACTUALIZACIÓN

1. **PRIMERO**: Lista de pacientes (más simple)
2. **SEGUNDO**: Lista de casos médicos (usa las vistas)
3. **TERCERO**: Historial de cambios (nueva estructura)
4. **CUARTO**: Reportes y estadísticas (aprovecha las mejoras)

## ✅ BENEFICIOS DESPUÉS DE LA MIGRACIÓN

- **Consultas más rápidas**: Sin DISTINCT ni duplicados
- **Datos más precisos**: Conteos reales de pacientes
- **Historial más claro**: Separación entre cambios de pacientes y casos
- **Código más limpio**: Servicios especializados por entidad
- **Mejor mantenimiento**: Estructura normalizada y escalable
