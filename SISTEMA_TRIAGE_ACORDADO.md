# 🏥 Sistema de Triaje - Solhub

## 📋 **DECISIÓN FINAL**

**Implementación:** Tabla separada `triage_records` para almacenar el historial completo de triajes.

**Razón:** El triaje se realiza en **cada visita** del paciente a la clínica, lo que genera muchos registros. Una tabla separada es más escalable, permite queries complejas y análisis estadísticos.

---

## 🗄️ **ESTRUCTURA DE BASE DE DATOS**

### **Tabla: `triage_records`**

```sql
CREATE TABLE public.triage_records (
  id uuid PRIMARY KEY,
  patient_id uuid REFERENCES patients(id),
  laboratory_id uuid REFERENCES laboratories(id), -- Multi-tenant
  
  measurement_date timestamptz NOT NULL, -- Fecha/hora de la medición
  
  -- Campos de triaje (todos opcionales)
  height_cm numeric(5,2),          -- Altura en centímetros
  weight_kg numeric(5,2),          -- Peso en kilogramos
  bmi numeric(4,2),                -- IMC (calculado automáticamente)
  
  blood_pressure_systolic integer,  -- Presión sistólica (mmHg)
  blood_pressure_diastolic integer, -- Presión diastólica (mmHg)
  
  heart_rate integer,              -- Frecuencia cardíaca (lpm)
  respiratory_rate integer,        -- Frecuencia respiratoria (rpm)
  oxygen_saturation integer,       -- Saturación de oxígeno (SpO2 %)
  temperature_celsius numeric(4,2), -- Temperatura (°C)
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text
);
```

**Características:**
- ✅ **Multi-tenant**: Aislado por `laboratory_id`
- ✅ **BMI automático**: Se calcula cuando hay altura y peso
- ✅ **Validaciones**: Constraints para valores razonables
- ✅ **Índices**: Para queries rápidas por paciente y fecha
- ✅ **RLS activo**: Solo usuarios del mismo laboratorio pueden ver/modificar

---

## 🔄 **FLUJO DE TRABAJO**

### **1. Paciente llega a la clínica**

```
Recepcionista busca paciente
    ↓
Sistema muestra información del paciente
    ↓
Recepcionista abre formulario de triaje
    ↓
Ingresa datos de triaje:
  - Altura (cm)
  - Peso (kg)
  - Presión arterial (sistólica/diastólica)
  - Frecuencia cardíaca (lpm)
  - Frecuencia respiratoria (rpm)
  - Saturación de oxígeno (SpO2 %)
  - Temperatura (°C)
  - Notas (opcional)
    ↓
Sistema guarda en triage_records
  - BMI se calcula automáticamente
  - measurement_date = fecha/hora actual
  - laboratory_id = del usuario autenticado
    ↓
✅ Triaje registrado exitosamente
    ↓
Recepcionista continúa con registro del caso médico
```

### **2. Ver historial de triaje del paciente**

```
Médico/Usuario busca paciente
    ↓
Abre perfil del paciente
    ↓
Ve sección "Historial de Triaje"
    ↓
Sistema muestra tabla ordenada por fecha (más reciente primero):
  
  Fecha       | Hora  | Altura | Peso | IMC  | Presión  | FC  | FR  | SpO2 | Temp
  2025-01-26  | 14:30 | 168 cm | 70 kg | 24.8 | 120/80   | 72  | 16  | 98%  | 36.5°C
  2025-01-15  | 09:15 | 168 cm | 72 kg | 25.5 | 125/82   | 75  | 18  | 97%  | 36.8°C
  2025-01-01  | 08:00 | 168 cm | 70 kg | 24.8 | 118/78   | 70  | 16  | 98%  | 36.5°C
```

### **3. Ver último triaje (vista rápida)**

```
En la tarjeta del paciente se muestra:
  
  📋 Último Triaje
  Fecha: 26/01/2025
  
  Altura: 168 cm  |  Peso: 70 kg  |  IMC: 24.8
  Presión: 120/80  |  FC: 72 lpm  |  Temp: 36.5°C
```

---

## 💻 **SERVICIOS DISPONIBLES**

### **1. Crear registro de triaje**

```typescript
import { createTriageRecord } from '@/services/supabase/triage/triage-service'

await createTriageRecord({
  patient_id: 'paciente-123',
  height_cm: 168,
  weight_kg: 70,
  blood_pressure_systolic: 120,
  blood_pressure_diastolic: 80,
  heart_rate: 72,
  respiratory_rate: 16,
  oxygen_saturation: 98,
  temperature_celsius: 36.5,
  notes: 'Paciente en buen estado general'
})
// BMI se calcula automáticamente: 24.8
```

### **2. Obtener historial completo**

```typescript
import { getTriageHistoryByPatient } from '@/services/supabase/triage/triage-service'

const historial = await getTriageHistoryByPatient('paciente-123')
// Retorna array ordenado por fecha (más reciente primero)
```

### **3. Obtener último triaje**

```typescript
import { getLatestTriageRecord } from '@/services/supabase/triage/triage-service'

const ultimoTriaje = await getLatestTriageRecord('paciente-123')
// Retorna el registro más reciente o null
```

### **4. Obtener estadísticas**

```typescript
import { getTriageStatistics } from '@/services/supabase/triage/triage-service'

const stats = await getTriageStatistics('paciente-123')
// Retorna:
// {
//   total_measurements: 3,
//   latest: { ... },
//   averages: { height_cm: 168.3, weight_kg: 71.0, ... },
//   trends: { weight_change: -1, height_change: 1, ... }
// }
```

---

## 🎨 **COMPONENTES DE UI**

### **1. Formulario de Triaje**

- **Ubicación:** Modal o sección en el registro de caso médico
- **Campos:** Todos los campos de triaje (altura, peso, presión, etc.)
- **Validación:** Valores razonables (presión no puede ser 500, etc.)
- **Acción:** Guarda en `triage_records` y muestra confirmación

### **2. Historial de Triaje**

- **Ubicación:** Sección en el perfil del paciente
- **Vista:** Tabla ordenada por fecha (más reciente primero)
- **Funcionalidad:** Ver todos los triajes del paciente, editar/eliminar si es necesario

### **3. Tarjeta de Último Triaje**

- **Ubicación:** En la tarjeta/resumen del paciente
- **Vista:** Muestra solo el último triaje registrado
- **Funcionalidad:** Vista rápida sin necesidad de abrir historial completo

---

## 🔗 **INTEGRACIÓN CON SISTEMA ACTUAL**

### **Relación con otras tablas:**

```
patients (tabla de pacientes)
    │
    ├──► triage_records (historial de triajes)
    │     └──► Un paciente puede tener muchos triajes
    │
    └──► medical_records_clean (casos médicos)
          └──► Un paciente puede tener muchos casos
```

### **Flujo de registro completo:**

```
1. Paciente llega a la clínica
   ↓
2. Recepcionista busca/crea paciente en tabla `patients`
   ↓
3. Recepcionista registra triaje en tabla `triage_records`
   ↓
4. Recepcionista registra caso médico en tabla `medical_records_clean`
   ↓
5. Sistema completo: paciente + triaje + caso médico
```

**Nota:** El triaje es **opcional** - no es obligatorio para crear un caso médico, pero se recomienda hacerlo en cada visita.

---

## 📊 **QUERIES ÚTILES**

### **1. Buscar pacientes con presión alta este mes**

```sql
SELECT DISTINCT p.nombre, tr.blood_pressure_systolic, tr.measurement_date
FROM triage_records tr
JOIN patients p ON tr.patient_id = p.id
WHERE tr.blood_pressure_systolic > 140
  AND tr.measurement_date >= '2025-01-01'
  AND tr.laboratory_id = 'lab-id'
ORDER BY tr.measurement_date DESC;
```

### **2. Ver evolución de peso de un paciente**

```sql
SELECT measurement_date, weight_kg, height_cm, bmi
FROM triage_records
WHERE patient_id = 'paciente-123'
ORDER BY measurement_date DESC;
```

### **3. Estadísticas del mes (promedios)**

```sql
SELECT 
  AVG(blood_pressure_systolic) as avg_systolic,
  AVG(heart_rate) as avg_heart_rate,
  AVG(weight_kg) as avg_weight,
  COUNT(*) as total_triages
FROM triage_records
WHERE measurement_date >= '2025-01-01'
  AND laboratory_id = 'lab-id';
```

---

## ✅ **VENTAJAS DE ESTA IMPLEMENTACIÓN**

1. **✅ Historial completo**: Cada visita es un registro independiente
2. **✅ Orden cronológico**: Fácil obtener "último" o "historial completo"
3. **✅ Queries poderosas**: Análisis estadísticos, tendencias, promedios
4. **✅ Escalable**: Maneja millones de registros sin problemas
5. **✅ Multi-tenant**: Automáticamente aislado por laboratorio
6. **✅ BMI automático**: Se calcula cuando hay altura y peso
7. **✅ Validaciones**: Constraints en BD (valores razonables)
8. **✅ Performance**: Índices para queries rápidas
9. **✅ RLS activo**: Seguridad multi-tenant integrada

---

## 🚀 **PRÓXIMOS PASOS**

1. ✅ **Migración aplicada**: Tabla `triage_records` creada
2. ⏳ **Servicio TypeScript**: Crear `triage-service.ts` con funciones
3. ⏳ **Componentes UI**: Formulario de triaje, historial, tarjeta
4. ⏳ **Integración**: Conectar con flujo de registro de casos
5. ⏳ **Testing**: Validar funcionamiento completo

---

## 📝 **NOTAS IMPORTANTES**

- **Triaje es opcional**: No es obligatorio para crear un caso médico
- **Cada visita = nuevo triaje**: Se registra en cada visita del paciente
- **BMI se calcula automáticamente**: No es necesario ingresarlo manualmente
- **Multi-tenant**: Todo está aislado por `laboratory_id`
- **RLS activo**: Solo usuarios del mismo laboratorio pueden ver/modificar

---

**Última actualización:** 2025-01-26  
**Estado:** ✅ Acordado y listo para implementación

