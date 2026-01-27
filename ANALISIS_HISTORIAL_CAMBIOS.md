# 📊 Análisis y Solución: Historial de Cambios Agrupados

## 🔍 Problemas Identificados

### 1. **Cambios Duplicados**
- **Causa**: Registro doble en componentes (EditPatientInfoModal, UnifiedCaseModal) + servicios
- **Ejemplo**: `updatePatient()` registra cambios + componente registra manualmente = 2 entradas

### 2. **Cambios Falsos (Sin Cambio Real)**
- **Causa**: Comparación sin normalización (`null !== ''`, `undefined !== null`, espacios en blanco)
- **Ejemplo**: Campo vacío → campo vacío = se registra como cambio

### 3. **Múltiples Filas por Sesión de Edición**
- **Problema**: Editar nombre + teléfono = 2 filas separadas en el historial
- **UX Deseada**: 1 fila agrupada con modal de detalles

---

## ✅ Solución Propuesta

### **Fase 1: Agregar Agrupación por Sesión**

#### 1.1 Migración: Agregar `change_session_id`
```sql
-- Agregar columna para agrupar cambios de la misma sesión
ALTER TABLE change_logs 
ADD COLUMN IF NOT EXISTS change_session_id UUID;

-- Crear índice para agrupación rápida
CREATE INDEX IF NOT EXISTS idx_change_logs_session_id 
ON change_logs(change_session_id);

-- Comentario
COMMENT ON COLUMN change_logs.change_session_id IS 
'ID de sesión para agrupar múltiples cambios realizados en el mismo momento por el mismo usuario en la misma entidad';
```

#### 1.2 Lógica de Agrupación
**Criterios para agrupar cambios:**
- Mismo `user_id`
- Mismo `entity_type` (patient o medical_case)
- Mismo `patient_id` o `medical_record_id`
- `changed_at` dentro de la misma ventana de tiempo (ej: ±2 segundos)

**Algoritmo:**
```typescript
// Generar session_id único por "batch" de cambios
const changeSessionId = crypto.randomUUID()

// Todos los cambios del mismo batch usan el mismo session_id
changes.forEach(change => {
  change.change_session_id = changeSessionId
  change.changed_at = new Date().toISOString() // Mismo timestamp
})
```

---

### **Fase 2: Normalización de Valores**

#### 2.1 Función de Normalización
```typescript
/**
 * Normaliza valores para comparación precisa
 * - null, undefined, '' → null
 * - Trim espacios en blanco
 * - Convierte a string para comparación
 */
function normalizeValue(value: any): string | null {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str === '' ? null : str
}

/**
 * Verifica si hay un cambio real entre dos valores
 */
function hasRealChange(oldValue: any, newValue: any): boolean {
  const normalizedOld = normalizeValue(oldValue)
  const normalizedNew = normalizeValue(newValue)
  
  // No hay cambio si ambos son null después de normalizar
  if (normalizedOld === null && normalizedNew === null) return false
  
  // Hay cambio si son diferentes
  return normalizedOld !== normalizedNew
}
```

#### 2.2 Aplicar en Servicios
- `logPatientChanges()` → usar `hasRealChange()`
- `logMedicalCaseChanges()` → usar `hasRealChange()`

---

### **Fase 3: Eliminar Registro Duplicado**

#### 3.1 Remover Registro Manual en Componentes
- ❌ **Eliminar** líneas 199-217 en `EditPatientInfoModal.tsx`
- ❌ **Eliminar** líneas 976-996 y 1010-1029 en `UnifiedCaseModal.tsx`
- ✅ **Dejar solo** la llamada al servicio (`updatePatient`, `updateMedicalCase`)

---

### **Fase 4: Mejorar UI - Agrupación y Modal**

#### 4.1 Modificar ChangelogTable
**Cambios necesarios:**

1. **Agrupar logs por `change_session_id`**
```typescript
// Agrupar logs por sesión
const groupedLogs = useMemo(() => {
  const groups = new Map<string, ChangeLogData[]>()
  
  filteredLogs.forEach(log => {
    const sessionId = log.change_session_id || log.id // Fallback si no hay session_id
    if (!groups.has(sessionId)) {
      groups.set(sessionId, [])
    }
    groups.get(sessionId)!.push(log)
  })
  
  return Array.from(groups.values())
}, [filteredLogs])
```

2. **Mostrar Resumen en Tabla**
```typescript
// Para cada grupo, mostrar:
- Fecha/Hora (del primer cambio)
- Usuario
- Entidad (Paciente/Caso)
- Resumen: "3 campos modificados" o "Nombre, Teléfono"
- Botón "Ver Detalles" → abre modal
```

3. **Modal de Detalles**
```typescript
// Modal muestra:
- Título: "Detalles de Edición - [Fecha]"
- Usuario que realizó los cambios
- Lista de todos los campos modificados:
  * Campo: Nombre
    Antes: Juan Pérez
    Ahora: Juan Carlos Pérez
  * Campo: Teléfono
    Antes: 04121234567
    Ahora: 04129876543
```

---

## 🎯 Opinión: Triggers vs Frontend

### **Recomendación: HÍBRIDO (Mejor de ambos mundos)**

#### ✅ **Triggers para Auditoría Crítica**
**Ventajas:**
- ✅ **100% confiable**: No se puede omitir, siempre se ejecuta
- ✅ **Atómico**: Parte de la transacción, rollback automático si falla
- ✅ **Seguridad**: No depende del código del frontend
- ✅ **Auditoría legal**: Cumple requisitos de compliance médico

**Desventajas:**
- ❌ Menos flexible para lógica compleja
- ❌ Más difícil de depurar
- ❌ No puede acceder fácilmente a contexto del frontend (ej: display_name)

#### ✅ **Frontend para UX y Detalles**
**Ventajas:**
- ✅ Control total sobre qué registrar
- ✅ Puede agregar contexto rico (display_name, metadata)
- ✅ Fácil de testear y depurar
- ✅ Permite agrupación inteligente

**Desventajas:**
- ❌ Puede omitirse si hay bugs
- ❌ No es atómico con el UPDATE

---

### **Solución Híbrida Recomendada:**

```sql
-- Trigger básico que SIEMPRE registra cambios críticos
CREATE OR REPLACE FUNCTION log_critical_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si es un cambio crítico (ej: eliminación)
  IF TG_OP = 'DELETE' THEN
    INSERT INTO change_logs (
      entity_type,
      patient_id,
      medical_record_id,
      user_id,
      user_email,
      field_name,
      field_label,
      old_value,
      new_value,
      changed_at,
      is_automatic -- Nueva columna para distinguir
    ) VALUES (
      'medical_case',
      OLD.patient_id,
      OLD.id,
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'deleted_record',
      'Eliminación de Registro',
      OLD.code || ' - ' || OLD.full_name,
      NULL,
      NOW(),
      true -- Marcado como automático
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

**Frontend registra:**
- Cambios de edición normales (con agrupación, normalización, UX)
- Metadata rica (display_name, contexto)

**Trigger registra:**
- Eliminaciones (crítico, no se puede omitir)
- Cambios de seguridad (ej: cambio de rol)

---

## 📋 Plan de Implementación

### **Paso 1: Migración de Base de Datos**
1. Agregar `change_session_id` a `change_logs`
2. Agregar `is_automatic` (boolean) para distinguir trigger vs frontend
3. Crear índices necesarios

### **Paso 2: Normalización en Servicios**
1. Crear función `normalizeValue()` y `hasRealChange()`
2. Aplicar en `logPatientChanges()` y `logMedicalCaseChanges()`
3. Agregar generación de `change_session_id`

### **Paso 3: Eliminar Duplicados**
1. Remover registro manual en `EditPatientInfoModal.tsx`
2. Remover registro manual en `UnifiedCaseModal.tsx`

### **Paso 4: UI - Agrupación**
1. Modificar `ChangelogTable.tsx` para agrupar por `change_session_id`
2. Crear componente `ChangeDetailsModal.tsx`
3. Actualizar visualización para mostrar resumen + botón "Ver Detalles"

### **Paso 5: Testing**
1. Test: Editar paciente (nombre + teléfono) → debe aparecer 1 fila agrupada
2. Test: Cambios falsos (null → null) → no deben registrarse
3. Test: Cambios duplicados → no deben aparecer

---

## 🎨 Mockup UI Propuesto

### **Tabla Principal (Agrupada)**
```
┌─────────────────────────────────────────────────────────────┐
│ Fecha      │ Usuario    │ Entidad    │ Resumen        │ Acción │
├─────────────────────────────────────────────────────────────┤
│ 12/01/2026 │ solware... │ Paciente   │ 2 campos       │ [Ver]  │
│ 11:54:58   │            │ Prueba D.  │ modificados    │        │
└─────────────────────────────────────────────────────────────┘
```

### **Modal de Detalles**
```
┌─────────────────────────────────────────────────────┐
│ Detalles de Edición - 12/01/2026 11:54:58      [X] │
├─────────────────────────────────────────────────────┤
│ Usuario: solwareve@gmail.com                        │
│ Entidad: Paciente - Prueba Diego (V-31164483)      │
│                                                      │
│ Cambios realizados:                                  │
│                                                      │
│ 📝 Nombre                                            │
│    Antes: Juan Pérez                                 │
│    Ahora: Juan Carlos Pérez                          │
│                                                      │
│ 📞 Teléfono                                          │
│    Antes: 04121234567                                │
│    Ahora: 04129876543                                │
│                                                      │
│                    [Cerrar]                          │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Resumen de Mejoras

1. ✅ **Agrupación**: Cambios de la misma sesión → 1 fila
2. ✅ **Normalización**: No más cambios falsos (null → null)
3. ✅ **Sin Duplicados**: Eliminar registro manual en componentes
4. ✅ **UX Mejorada**: Resumen + modal de detalles
5. ✅ **Híbrido**: Triggers para crítico, frontend para UX

---

## 🚀 ¿Proceder con la Implementación?

¿Quieres que implemente estas mejoras ahora? Puedo empezar por:
1. Migración de base de datos
2. Normalización en servicios
3. Eliminación de duplicados
4. UI con agrupación y modal
