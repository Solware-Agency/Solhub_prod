<!-- ef227574-99fe-44c3-9db9-b9aa31bc1440 53e70af8-5c7d-478f-9b37-bcfb1c1d52cb -->
# Plan: Configuración de Módulos y Campos Personalizados

## 📊 ESTADO ACTUAL DEL PROYECTO

### ✅ FASE 1: COMPLETADA (Solhub)

**Archivos implementados:**

- ✅ `src/shared/hooks/useModuleConfig.ts` - Hook para obtener configuración del módulo
- ✅ `src/shared/hooks/useModuleField.ts` - Hook para obtener configuración de campo específico
- ✅ `src/services/supabase/cases/registration-helpers.ts` - Funciones helper con `getDefaultFieldValue()` y `prepareDefaultValues()`
- ✅ `src/services/supabase/cases/registration-service.ts` - Ya acepta `moduleConfig` y usa `prepareDefaultValues()`
- ✅ `src/features/form/components/MedicalFormContainer.tsx` - Ya pasa `moduleConfig` a `registerMedicalCase()`

**Funcionalidad:**

- ✅ Valores por defecto se asignan automáticamente cuando campos están deshabilitados
- ✅ Campos NOT NULL nunca fallan (string vacío `""` para text, `1` para number_of_samples)
- ✅ Sistema completamente funcional para manejar campos deshabilitados

### ✅ FASE 2: COMPLETADA (Dashboard Admin)

**Archivos implementados:**

- ✅ `dashboard-solhub/app/(dashboard)/laboratories/[id]/edit/page.tsx` - UI completa para gestionar dropdowns
  - ✅ Sección de Tipos de Examen (`examTypes`) con edición, reordenamiento y validaciones
  - ✅ Sección de Sedes (`branches`) mejorada con edición, reordenamiento y validaciones
  - ✅ Sección de Métodos de Pago (`paymentMethods`) mejorada con edición, reordenamiento y validaciones
  - ✅ Validaciones completas en `handleSubmit()` (arrays no vacíos, sin duplicados)
  - ✅ Funciones helper: `addArrayItem()`, `removeArrayItem()`, `moveItemUp()`, `moveItemDown()`
  - ✅ UI mejorada con diseño oscuro consistente y inputs editables

**Funcionalidad:**

- ✅ Admin puede agregar, editar, eliminar y reordenar opciones de dropdowns
- ✅ Validación de duplicados en tiempo real
- ✅ Validación de mínimo requerido (al menos 1 item por array)
- ✅ Cambios se guardan correctamente en `config.examTypes`, `config.branches`, `config.paymentMethods`
- ✅ Los cambios se reflejan automáticamente en el SaaS principal

### ✅ Dropdowns Completamente Implementados (Solhub)

**Estado actual:**

- ✅ `examTypes`: Ya usa `laboratory?.config?.examTypes` en `ServiceSection.tsx` (líneas 119-133)
- ✅ `branches`: Ya usa `laboratory?.config?.branches` en `PaymentHeader.tsx` (líneas 33-41)
- ✅ `paymentMethods`: Ya usa `laboratory?.config?.paymentMethods` en `PaymentMethodItem.tsx` (líneas 30-46)

**Archivos que usan configuración:**

- ✅ `src/features/form/components/ServiceSection.tsx` - Usa `laboratory?.config?.examTypes`
- ✅ `src/features/form/components/payment/PaymentHeader.tsx` - Usa `laboratory?.config?.branches`
- ✅ `src/features/form/components/payment/PaymentMethodItem.tsx` - Usa `laboratory?.config?.paymentMethods`

---

## Problema 1: Campos Deshabilitados y NOT NULL en Supabase

**Situación actual:**

- Campos NOT NULL en `medical_records_clean`: `origin`, `treating_doctor`, `sample_type`, `number_of_samples`, `date`, `laboratory_id`
- Cuando un campo está deshabilitado en la UI pero es NOT NULL en Supabase, el insert falla
- Necesitamos enviar valores por defecto (string vacío "") para campos deshabilitados

**Solución:**

1. ✅ Crear función helper que asigne valores por defecto basándose en configuración del módulo
2. ✅ Modificar `prepareRegistrationData` para usar valores por defecto cuando campos están deshabilitados
3. ✅ Asegurar que todos los campos NOT NULL tengan valores válidos antes del insert

## Problema 2: Administración de Campos Personalizados por Admin

**Situación actual:**

- `examTypes`, `branches`, `paymentMethods` ya existen en `config` pero necesitan mejor UI en dashboard admin
- El **ADMIN** (desde dashboard-solhub) debe poder configurar las opciones de dropdowns para cada laboratorio
- El **CLIENTE** (en el SaaS principal) solo ve y usa esas opciones, NO las configura
- Actualmente la UI del dashboard admin para gestionar estos arrays es básica o no existe
- **2 de 3 dropdowns ya funcionan en Solhub**, solo falta actualizar `paymentMethods`

**Solución:**

1. Mejorar UI del dashboard admin para que el ADMIN pueda gestionar estos arrays fácilmente
2. Agregar validaciones (no duplicados, no vacíos)
3. Permitir agregar/eliminar/reordenar opciones
4. Los cambios se guardan en `config.examTypes`, `config.branches`, `config.paymentMethods`
5. El cliente solo ve estas opciones en los dropdowns del formulario principal

---

## FASE 1: Valores por Defecto para Campos Deshabilitados ✅ COMPLETADA

### ✅ 1.1 Función helper para valores por defecto - COMPLETADA

**Archivo:** `src/services/supabase/cases/registration-helpers.ts` ✅

- ✅ `getDefaultFieldValue()` - Implementada
- ✅ `prepareDefaultValues()` - Implementada
- ✅ Maneja todos los campos NOT NULL correctamente

### ✅ 1.2 `prepareRegistrationData` actualizado - COMPLETADA

**Archivo:** `src/services/supabase/cases/registration-service.ts` ✅

- ✅ Ya acepta `moduleConfig` como parámetro
- ✅ Ya usa `prepareDefaultValues()` antes de construir `caseData`
- ✅ Aplica valores por defecto a todos los campos NOT NULL

### ✅ 1.3 Llamadas actualizadas - COMPLETADA

**Archivo:** `src/features/form/components/MedicalFormContainer.tsx` ✅

- ✅ Ya obtiene `moduleConfig` usando `useModuleConfig('registrationForm')`
- ✅ Ya pasa `moduleConfig` a `registerMedicalCase()`

---

## FASE 2: Mejorar Administración de Dropdowns en Dashboard Admin ✅ COMPLETADA

**Objetivo:** El ADMIN configura las opciones de dropdowns para cada laboratorio desde el dashboard admin.

**Archivo principal:** `dashboard-solhub/app/(dashboard)/laboratories/[id]/edit/page.tsx`

**Contexto importante:**

- Los arrays `examTypes`, `branches`, `paymentMethods` ya existen en `laboratory.config`
- En Solhub, `examTypes` y `branches` ya usan la configuración del laboratorio
- Solo falta actualizar `paymentMethods` en Solhub después de implementar esta fase
- Los cambios se guardan en `config.examTypes`, `config.branches`, `config.paymentMethods`

### ✅ 2.1 Mejorar UI para gestionar `examTypes` (Tipos de Examen) - COMPLETADA

**Ubicación:** Pestaña "Configuración" en `dashboard-solhub/app/(dashboard)/laboratories/[id]/edit/page.tsx`

**Funcionalidad requerida:**

- ✅ Agregar sección dedicada para `examTypes` en la pestaña de "Configuración"
- ✅ Mostrar lista actual de tipos de examen desde `laboratory.config.examTypes`
- ✅ Permitir al ADMIN agregar nuevo tipo (input + botón "Agregar")
- ✅ Permitir al ADMIN eliminar tipo (botón eliminar por cada item)
- ✅ Permitir al ADMIN reordenar tipos (botones ↑ ↓)
- ✅ Validar que no haya duplicados (mostrar error si intenta agregar duplicado)
- ✅ Validar que el array no esté vacío (al menos 1 tipo, deshabilitar eliminar si solo queda 1)
- ✅ Mostrar preview de opciones que verá el cliente (descripción informativa)
- ✅ Guardar cambios en `config.examTypes` al hacer submit del formulario
- ✅ Inputs editables para modificar tipos existentes directamente

**Estructura de datos:**

```typescript
// En laboratory.config
{
  examTypes: string[]  // Ej: ["Biopsia", "Citología", "Inmunohistoquímica"]
}
```

**UI sugerida:**

```
┌─────────────────────────────────────────────────────────┐
│ Tipos de Examen (Configurados por Admin)                │
├─────────────────────────────────────────────────────────┤
│ Estas opciones aparecerán en el dropdown "Tipo de       │
│ Examen" del formulario de registro del cliente.         │
│                                                          │
│ [➕ Agregar Tipo]                                       │
│                                                          │
│ Lista de Tipos:                                         │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 1. [Biopsia              ] [↑] [↓] [🗑️ Eliminar]  │ │
│ │ 2. [Citología            ] [↑] [↓] [🗑️ Eliminar]  │ │
│ │ 3. [Inmunohistoquímica   ] [↑] [↓] [🗑️ Eliminar]  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ℹ️ Mínimo 1 tipo requerido                              │
└─────────────────────────────────────────────────────────┘
```

**Código de ejemplo:**

```typescript
// Estado local para examTypes
const [examTypes, setExamTypes] = useState<string[]>(
  laboratory?.config?.examTypes || ['Biopsia', 'Citología', 'Inmunohistoquímica']
)

// Agregar nuevo tipo
const handleAddExamType = (newType: string) => {
  if (!newType.trim()) return
  if (examTypes.includes(newType.trim())) {
    // Mostrar error: duplicado
    return
  }
  setExamTypes([...examTypes, newType.trim()])
}

// Eliminar tipo
const handleRemoveExamType = (index: number) => {
  if (examTypes.length <= 1) {
    // Mostrar error: mínimo 1 tipo requerido
    return
  }
  setExamTypes(examTypes.filter((_, i) => i !== index))
}

// Reordenar (mover arriba)
const handleMoveUp = (index: number) => {
  if (index === 0) return
  const newTypes = [...examTypes]
  ;[newTypes[index - 1], newTypes[index]] = [newTypes[index], newTypes[index - 1]]
  setExamTypes(newTypes)
}

// Reordenar (mover abajo)
const handleMoveDown = (index: number) => {
  if (index === examTypes.length - 1) return
  const newTypes = [...examTypes]
  ;[newTypes[index], newTypes[index + 1]] = [newTypes[index + 1], newTypes[index]]
  setExamTypes(newTypes)
}

// Al guardar, actualizar config.examTypes
const handleSave = async () => {
  const updatedConfig = {
    ...laboratory.config,
    examTypes: examTypes
  }
  // Llamar a API para actualizar laboratory
}
```

### ✅ 2.2 Mejorar gestión de `branches` (Sedes) - COMPLETADA

**Ubicación:** Pestaña "Configuración" en `dashboard-solhub/app/(dashboard)/laboratories/[id]/edit/page.tsx`

**Funcionalidad requerida:**

- ✅ Verificar si ya existe UI para `branches` (ya existía, ahora mejorada)
- ✅ Sección dedicada similar a `examTypes` con mejoras
- ✅ Mostrar lista actual de sedes desde `laboratory.config.branches`
- ✅ Permitir al ADMIN agregar nueva sede (input + botón "Agregar")
- ✅ Permitir al ADMIN eliminar sede (botón eliminar por cada item)
- ✅ Permitir al ADMIN reordenar sedes (botones ↑ ↓)
- ✅ Validar que no haya duplicados
- ✅ Validar que el array no esté vacío (al menos 1 sede)
- ✅ Mostrar preview de opciones que verá el cliente (descripción informativa)
- ✅ Guardar cambios en `config.branches` al hacer submit del formulario
- ✅ Inputs editables para modificar sedes existentes directamente

**Estructura de datos:**

```typescript
// En laboratory.config
{
  branches: string[]  // Ej: ["Principal", "Sucursal 2"]
}
```

**UI sugerida:**

```
┌─────────────────────────────────────────────────────────┐
│ Sedes (Configuradas por Admin)                           │
├─────────────────────────────────────────────────────────┤
│ Estas opciones aparecerán en el dropdown "Sede" del     │
│ formulario de registro del cliente.                      │
│                                                          │
│ [➕ Agregar Sede]                                       │
│                                                          │
│ Lista de Sedes:                                         │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 1. [Principal            ] [↑] [↓] [🗑️ Eliminar]  │ │
│ │ 2. [Sucursal 2           ] [↑] [↓] [🗑️ Eliminar]  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ℹ️ Mínimo 1 sede requerida                              │
└─────────────────────────────────────────────────────────┘
```

**Nota:** Si ya existe UI para `branches`, mejorarla con las mismas funcionalidades (agregar/eliminar/reordenar).

### ✅ 2.3 Mejorar gestión de `paymentMethods` (Métodos de Pago) - COMPLETADA

**Ubicación:** Pestaña "Configuración" en `dashboard-solhub/app/(dashboard)/laboratories/[id]/edit/page.tsx`

**Funcionalidad requerida:**

- ✅ Verificar si ya existe UI para `paymentMethods` (ya existía, ahora mejorada)
- ✅ Sección dedicada similar a `examTypes` y `branches` con mejoras
- ✅ Mostrar lista actual de métodos desde `laboratory.config.paymentMethods`
- ✅ Permitir al ADMIN agregar nuevo método (input + botón "Agregar")
- ✅ Permitir al ADMIN eliminar método (botón eliminar por cada item)
- ✅ Permitir al ADMIN reordenar métodos (botones ↑ ↓)
- ✅ Validar que no haya duplicados
- ✅ Validar que el array no esté vacío (al menos 1 método)
- ✅ Mostrar preview de opciones que verá el cliente (descripción informativa)
- ✅ Guardar cambios en `config.paymentMethods` al hacer submit del formulario
- ✅ Inputs editables para modificar métodos existentes directamente

**Estructura de datos:**

```typescript
// En laboratory.config
{
  paymentMethods: string[]  // Ej: ["Efectivo", "Zelle", "Pago Móvil", "Transferencia"]
}
```

**UI sugerida:**

```
┌─────────────────────────────────────────────────────────┐
│ Métodos de Pago (Configurados por Admin)                 │
├─────────────────────────────────────────────────────────┤
│ Estas opciones aparecerán en el dropdown "Método de     │
│ Pago" del formulario de registro del cliente.            │
│                                                          │
│ [➕ Agregar Método]                                     │
│                                                          │
│ Lista de Métodos:                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 1. [Efectivo            ] [↑] [↓] [🗑️ Eliminar]  │ │
│ │ 2. [Zelle                ] [↑] [↓] [🗑️ Eliminar]  │ │
│ │ 3. [Pago Móvil           ] [↑] [↓] [🗑️ Eliminar]  │ │
│ │ 4. [Transferencia        ] [↑] [↓] [🗑️ Eliminar]  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ ℹ️ Mínimo 1 método requerido                            │
└─────────────────────────────────────────────────────────┘
```

**Valores por defecto sugeridos:**

```typescript
// Si el laboratorio no tiene paymentMethods configurados, usar estos:
const defaultPaymentMethods = [
  'Punto de venta',
  'Dólares en efectivo',
  'Zelle',
  'Pago móvil',
  'Bs en efectivo'
]
```

### ✅ 2.4 Validar sincronización y guardado - COMPLETADA

**Archivo:** `dashboard-solhub/app/(dashboard)/laboratories/[id]/edit/page.tsx`

**Funcionalidad requerida:**

- ✅ Asegurar que cambios se guarden correctamente en `config.examTypes`, `config.branches`, `config.paymentMethods`
- ✅ Validar que los arrays no estén vacíos antes de guardar (mostrar error si están vacíos)
- ✅ Validar que no haya duplicados antes de guardar
- ✅ Mostrar mensaje de confirmación al guardar exitosamente (alert con ✅)
- ✅ Mostrar mensaje de error si falla el guardado (alert con ❌)
- ✅ Los cambios se reflejan automáticamente en el SaaS principal (el cliente ve las nuevas opciones sin necesidad de recargar)
- ✅ Funciones helper implementadas: `addArrayItem()`, `removeArrayItem()`, `moveItemUp()`, `moveItemDown()`
- ✅ Validación completa en `handleSubmit()` antes de guardar

**Estructura de datos completa al guardar:**

```typescript
const updatedConfig = {
  ...laboratory.config,  // Mantener otros valores de config
  examTypes: examTypes,
  branches: branches,
  paymentMethods: paymentMethods
}

// Llamar a API para actualizar
await updateLaboratory(laboratoryId, {
  config: updatedConfig
})
```

**Validaciones antes de guardar:**

```typescript
const validateBeforeSave = () => {
  const errors: string[] = []
  
  if (examTypes.length === 0) {
    errors.push('Debe haber al menos 1 tipo de examen')
  }
  
  if (branches.length === 0) {
    errors.push('Debe haber al menos 1 sede')
  }
  
  if (paymentMethods.length === 0) {
    errors.push('Debe haber al menos 1 método de pago')
  }
  
  // Validar duplicados
  if (new Set(examTypes).size !== examTypes.length) {
    errors.push('Hay tipos de examen duplicados')
  }
  
  if (new Set(branches).size !== branches.length) {
    errors.push('Hay sedes duplicadas')
  }
  
  if (new Set(paymentMethods).size !== paymentMethods.length) {
    errors.push('Hay métodos de pago duplicados')
  }
  
  return errors
}
```

---

## FASE 3: Actualizar PaymentMethodItem en Solhub ✅ COMPLETADA

**Objetivo:** Actualizar `PaymentMethodItem.tsx` para usar `config.paymentMethods` en lugar de valores hardcodeados.

**Archivo:** `src/features/form/components/payment/PaymentMethodItem.tsx`

**Estado actual:**

- ✅ Ya usa `laboratory?.config?.paymentMethods` (líneas 30-46)
- ✅ Implementado con `useMemo` para optimización
- ✅ Fallback a valores por defecto si no hay configuración
- ✅ Compatible con laboratorios que no tengan `paymentMethods` configurados

**Cambios implementados:**

- ✅ Importado `useLaboratory` hook
- ✅ Obtenido `laboratory` del contexto
- ✅ Obtenido `paymentMethods` desde `laboratory?.config?.paymentMethods`
- ✅ Usa `paymentMethods` configurados si existen, sino usa valores por defecto
- ✅ Mantiene compatibilidad con laboratorios que no tengan `paymentMethods` configurados

**Código a implementar:**

```typescript
import { useLaboratory } from '@/app/providers/LaboratoryContext'

// Dentro del componente PaymentMethodItem:
const { laboratory } = useLaboratory()

// Obtener métodos de pago desde la configuración del laboratorio
const paymentMethodsOptions = useMemo(() => {
  const paymentMethods = laboratory?.config?.paymentMethods || []
  // Si hay métodos configurados, usarlos; si no, usar valores por defecto
  if (paymentMethods.length > 0) {
    return createDropdownOptions(
      paymentMethods.map((method) => ({ value: method, label: method }))
    )
  }
  // Fallback a valores por defecto si no hay configuración
  return createDropdownOptions([
    { value: 'Punto de venta', label: 'Punto de venta' },
    { value: 'Dólares en efectivo', label: 'Dólares en efectivo' },
    { value: 'Zelle', label: 'Zelle' },
    { value: 'Pago móvil', label: 'Pago móvil' },
    { value: 'Bs en efectivo', label: 'Bs en efectivo' },
  ])
}, [laboratory?.config?.paymentMethods])

// Usar paymentMethodsOptions en lugar de valores hardcodeados
<FormDropdown
  options={paymentMethodsOptions}  // ← Cambiar aquí
  value={field.value}
  onChange={field.onChange}
  placeholder="Método"
  className={inputStyles}
  id={`payment-method-${index}`}
/>
```

**Referencia:** Ver cómo se implementó en `ServiceSection.tsx` (líneas 119-133) para `examTypes` y `PaymentHeader.tsx` (líneas 33-41) para `branches`.

---

## FASE 4: Validación y Testing

### 4.1 Testing de valores por defecto ✅ COMPLETADO

- ✅ Probar registro con todos los campos deshabilitados
- ✅ Verificar que el insert no falle
- ✅ Verificar que valores por defecto se asignen correctamente

### 4.2 Testing de campos personalizados ⚠️ PENDIENTE

**Después de completar FASE 2 y FASE 3:**

- [ ] Probar que el ADMIN pueda agregar/eliminar `examTypes`, `branches`, `paymentMethods` desde dashboard
- [ ] Verificar que cambios se guarden correctamente en `config`
- [ ] Verificar que el CLIENTE vea las nuevas opciones en los dropdowns del formulario
- [ ] Probar con diferentes laboratorios (cada uno con sus propias opciones)
- [ ] Verificar que el cliente NO pueda modificar estas opciones (solo el admin)
- [ ] Verificar que los cambios se reflejen inmediatamente sin necesidad de recargar

---

## Archivos a Modificar

### ✅ COMPLETADOS (Solhub)

1. ✅ `src/services/supabase/cases/registration-helpers.ts` - Creado e implementado
2. ✅ `src/services/supabase/cases/registration-service.ts` - Actualizado para usar `moduleConfig`
3. ✅ `src/features/form/components/MedicalFormContainer.tsx` - Actualizado para pasar `moduleConfig`
4. ✅ `src/shared/hooks/useModuleConfig.ts` - Creado e implementado
5. ✅ `src/shared/hooks/useModuleField.ts` - Creado e implementado
6. ✅ `src/features/form/components/ServiceSection.tsx` - Ya usa `config.examTypes`
7. ✅ `src/features/form/components/payment/PaymentHeader.tsx` - Ya usa `config.branches`
8. ✅ `src/features/form/components/payment/PaymentMethodItem.tsx` - Ya usa `config.paymentMethods`

### ✅ COMPLETADOS (Dashboard Admin - FASE 2)

1. ✅ `dashboard-solhub/app/(dashboard)/laboratories/[id]/edit/page.tsx `- UI completa para gestionar `examTypes`, `branches`, `paymentMethods`

   - ✅ Sección de Tipos de Examen con edición, reordenamiento y validaciones
   - ✅ Sección de Sedes mejorada con edición, reordenamiento y validaciones
   - ✅ Sección de Métodos de Pago mejorada con edición, reordenamiento y validaciones
   - ✅ Validaciones completas en `handleSubmit()`
   - ✅ Funciones helper para agregar, eliminar y reordenar items
   - ✅ UI mejorada con diseño oscuro consistente

### ✅ COMPLETADOS (Solhub - FASE 3)

1. ✅ `src/features/form/components/payment/PaymentMethodItem.tsx` - Actualizado para usar `config.paymentMethods`

---

## Consideraciones Importantes

### 1. Valores por defecto ✅ IMPLEMENTADO

- ✅ String vacío `""` para campos text NOT NULL
- ✅ `1` para `number_of_samples` (cumple CHECK > 0)
- ✅ Fecha actual para `date`
- ✅ Estos valores permiten el insert sin romper constraints

### 2. Validación secundaria ✅ IMPLEMENTADO

- ✅ La validación de "required" en el frontend es independiente
- ✅ El sistema puede enviar datos incluso si campos están deshabilitados
- ✅ La validación de negocio se puede hacer después del insert

### 3. Compatibilidad ✅ IMPLEMENTADO

- ✅ Mantener compatibilidad con código existente
- ✅ Si `moduleConfig` es null, usar valores por defecto seguros
- ✅ No romper funcionalidad existente

### 4. Dropdowns personalizados ✅ IMPLEMENTADO EN FASE 2

**Estructura de datos en Supabase:**

```typescript
// En tabla laboratories, columna config (jsonb)
{
  branches: string[]           // Ej: ["Principal", "Sucursal 2"]
  paymentMethods: string[]    // Ej: ["Efectivo", "Zelle", "Pago Móvil"]
  examTypes: string[]          // Ej: ["Biopsia", "Citología"]
  // ... otros campos de config
}
```

**Valores por defecto si no hay configuración:**

- `examTypes`: `["Inmunohistoquímica", "Biopsia", "Citología"]` (ver `ServiceSection.tsx` línea 128-132)
- `branches`: `["PMG", "CPC", "CNX", "STX", "MCY"]` (ver `PaymentHeader.tsx` línea 40)
- `paymentMethods`: `["Punto de venta", "Dólares en efectivo", "Zelle", "Pago móvil", "Bs en efectivo"]` (ver `PaymentMethodItem.tsx` línea 56-62)

**Flujo de trabajo:**

1. Admin configura opciones en dashboard → Se guarda en `config.examTypes/branches/paymentMethods`
2. Cliente abre formulario → Lee `laboratory.config.examTypes/branches/paymentMethods`
3. Si no hay configuración → Usa valores por defecto (fallback)
4. Cliente ve opciones personalizadas → Selecciona y envía formulario

### 5. Referencias de código existente

**Para ver cómo se implementó en Solhub:**

- `examTypes`: Ver `src/features/form/components/ServiceSection.tsx` líneas 119-133
- `branches`: Ver `src/features/form/components/payment/PaymentHeader.tsx` líneas 33-41
- `paymentMethods`: Ver `src/features/form/components/payment/PaymentMethodItem.tsx` líneas 30-46 (implementado con configuración del laboratorio)

**Patrón a seguir:**

```typescript
const { laboratory } = useLaboratory()

const options = useMemo(() => {
  const configArray = laboratory?.config?.arrayName || []
  if (configArray.length > 0) {
    return createDropdownOptions(
      configArray.map((item) => ({ value: item, label: item }))
    )
  }
  // Fallback a valores por defecto
  return createDropdownOptions([...defaultValues])
}, [laboratory?.config?.arrayName])
```