# Plan de Implementación Segura - Sistema de Gestión de Pacientes Multi-Tipo

## 🎯 Objetivo

Implementar el sistema de pacientes multi-tipo (adultos, menores, animales) de manera **incremental y segura**, sin romper producción y permitiendo rollback en cada fase.

## 📊 Estado Actual del Sistema

- **Pacientes en producción:** 42,214 registros
- **Casos médicos:** 16,981 registros
- **Campo `cedula`:** nullable, formato "V-12345678"
- **Opción "S/C":** Existe para pacientes sin cédula (menores)
- **Multi-tenant:** ✅ Funcionando con `laboratory_id`

## 🛡️ Estrategia de Implementación Segura

### Principios Fundamentales

1. **Compatibilidad hacia atrás:** El sistema actual debe seguir funcionando durante toda la migración
2. **Rollback seguro:** Cada fase debe poder revertirse sin pérdida de datos
3. **Testing exhaustivo:** Validar cada fase antes de continuar
4. **Migración gradual:** No cambiar todo de golpe
5. **Dual-write temporal:** Escribir en ambos sistemas durante transición

---

## 📋 FASES DE IMPLEMENTACIÓN

### **FASE 0: Preparación y Análisis** ⚠️ CRÍTICO

**Objetivo:** Entender el estado actual y preparar el entorno

**Tareas:**

1. ✅ Analizar datos existentes:

   - Contar pacientes con `cedula IS NULL` (menores actuales)
   - Contar pacientes con `cedula NOT NULL` (adultos)
   - Verificar formato de cédulas (V-, E-, J-, C-)
   - Identificar posibles duplicados

2. ✅ Crear script de análisis:

```sql
-- Script de análisis de datos actuales
SELECT
  COUNT(*) as total_pacientes,
  COUNT(cedula) as con_cedula,
  COUNT(*) - COUNT(cedula) as sin_cedula,
  COUNT(DISTINCT laboratory_id) as laboratorios
FROM patients;

-- Ver distribución de tipos de cédula
SELECT
  CASE
    WHEN cedula IS NULL THEN 'SIN_CEDULA'
    WHEN cedula LIKE 'V-%' THEN 'V'
    WHEN cedula LIKE 'E-%' THEN 'E'
    WHEN cedula LIKE 'J-%' THEN 'J'
    WHEN cedula LIKE 'C-%' THEN 'C'
    ELSE 'OTRO'
  END as tipo_documento,
  COUNT(*) as cantidad
FROM patients
GROUP BY tipo_documento;
```

3. ✅ Backup completo de base de datos antes de comenzar

**Criterio de éxito:** Tener análisis completo y backup verificado

**Tiempo estimado:** 1-2 horas

---

### **FASE 1: Crear Tablas Nuevas (Sin Modificar Existente)** ✅ SEGURA

**Objetivo:** Crear tablas `identificaciones` y `responsabilidades` sin tocar `patients`

**Migración SQL:**

```sql
-- =====================================================
-- FASE 1: Crear tablas nuevas (NO modifica patients)
-- =====================================================

-- 1. Tabla identificaciones
CREATE TABLE IF NOT EXISTS identificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('V', 'E', 'J', 'C', 'pasaporte')),
  numero TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(laboratory_id, numero, tipo_documento)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_identificaciones_laboratory
  ON identificaciones(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_identificaciones_paciente
  ON identificaciones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_identificaciones_numero
  ON identificaciones(numero);
CREATE INDEX IF NOT EXISTS idx_identificaciones_tipo_numero
  ON identificaciones(tipo_documento, numero);

-- 2. Tabla responsabilidades
CREATE TABLE IF NOT EXISTS responsabilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  paciente_id_responsable UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  paciente_id_dependiente UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('menor', 'animal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(laboratory_id, paciente_id_responsable, paciente_id_dependiente),
  CHECK (paciente_id_responsable != paciente_id_dependiente)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_responsabilidades_laboratory
  ON responsabilidades(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_responsabilidades_responsable
  ON responsabilidades(paciente_id_responsable);
CREATE INDEX IF NOT EXISTS idx_responsabilidades_dependiente
  ON responsabilidades(paciente_id_dependiente);

-- 3. RLS Policies para identificaciones
ALTER TABLE identificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view identificaciones from their laboratory"
  ON identificaciones FOR SELECT
  USING (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert identificaciones in their laboratory"
  ON identificaciones FOR INSERT
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update identificaciones in their laboratory"
  ON identificaciones FOR UPDATE
  USING (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners can delete identificaciones in their laboratory"
  ON identificaciones FOR DELETE
  USING (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- 4. RLS Policies para responsabilidades
ALTER TABLE responsabilidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responsabilidades from their laboratory"
  ON responsabilidades FOR SELECT
  USING (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert responsabilidades in their laboratory"
  ON responsabilidades FOR INSERT
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update responsabilidades in their laboratory"
  ON responsabilidades FOR UPDATE
  USING (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners can delete responsabilidades in their laboratory"
  ON responsabilidades FOR DELETE
  USING (
    laboratory_id = (SELECT laboratory_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Comentarios
COMMENT ON TABLE identificaciones IS 'Documentos legales (cédulas, pasaportes) separados de pacientes';
COMMENT ON TABLE responsabilidades IS 'Relaciones entre responsables y dependientes (menores/animales)';
```

**Validación:**

- ✅ Verificar que las tablas se crearon correctamente
- ✅ Verificar que RLS está habilitado
- ✅ Verificar que los índices se crearon
- ✅ Probar INSERT/SELECT con usuario de prueba

**Rollback:** Simplemente eliminar las tablas (no afecta `patients`)

**Tiempo estimado:** 30 minutos

---

### **FASE 2: Agregar Campos a `patients` (NULLABLE)** ✅ SEGURA

**Objetivo:** Agregar campos nuevos a `patients` sin romper código existente

**Migración SQL:**

```sql
-- =====================================================
-- FASE 2: Agregar campos nuevos a patients (NULLABLE)
-- =====================================================

-- Agregar campos nuevos (todos NULLABLE para compatibilidad)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS tipo_paciente TEXT
    CHECK (tipo_paciente IN ('adulto', 'menor', 'animal')),
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS especie TEXT; -- Solo para animales

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_patients_tipo_paciente
  ON patients(tipo_paciente);
CREATE INDEX IF NOT EXISTS idx_patients_fecha_nacimiento
  ON patients(fecha_nacimiento);

-- Comentarios
COMMENT ON COLUMN patients.tipo_paciente IS 'Tipo de paciente: adulto, menor o animal';
COMMENT ON COLUMN patients.fecha_nacimiento IS 'Fecha de nacimiento para cálculo automático de edad';
COMMENT ON COLUMN patients.especie IS 'Especie del animal (solo para tipo_paciente = animal)';
```

**Validación:**

- ✅ Verificar que los campos se agregaron
- ✅ Verificar que los registros existentes tienen NULL en campos nuevos
- ✅ Verificar que el código actual sigue funcionando (no usa estos campos)

**Rollback:** Eliminar columnas (pero perder datos si ya se usaron)

**Tiempo estimado:** 15 minutos

---

### **FASE 3: Migrar Datos Existentes (Solo Lectura)** ✅ SEGURA

**Objetivo:** Poblar `identificaciones` con datos de `patients.cedula` existentes

**Migración SQL:**

```sql
-- =====================================================
-- FASE 3: Migrar datos existentes a identificaciones
-- =====================================================

-- Función helper para extraer tipo y número de cédula
CREATE OR REPLACE FUNCTION parse_cedula(cedula_text TEXT)
RETURNS TABLE(tipo TEXT, numero TEXT) AS $$
BEGIN
  IF cedula_text IS NULL THEN
    RETURN; -- No crear identificación si no hay cédula
  END IF;

  -- Extraer tipo y número del formato "V-12345678"
  IF cedula_text ~ '^([VEJC])-(.+)$' THEN
    RETURN QUERY SELECT
      SUBSTRING(cedula_text FROM '^([VEJC])-')::TEXT as tipo,
      SUBSTRING(cedula_text FROM '^[VEJC]-(.+)$')::TEXT as numero;
  ELSE
    -- Si no tiene formato, asumir V- y usar toda la cédula como número
    RETURN QUERY SELECT 'V'::TEXT as tipo, cedula_text as numero;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Migrar pacientes con cédula a identificaciones
INSERT INTO identificaciones (laboratory_id, paciente_id, tipo_documento, numero)
SELECT
  p.laboratory_id,
  p.id as paciente_id,
  parsed.tipo as tipo_documento,
  parsed.numero
FROM patients p
CROSS JOIN LATERAL parse_cedula(p.cedula) parsed
WHERE p.cedula IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM identificaciones i
    WHERE i.paciente_id = p.id
  )
ON CONFLICT (laboratory_id, numero, tipo_documento) DO NOTHING;

-- Marcar pacientes sin cédula como 'menor' (según lógica del plan)
UPDATE patients
SET tipo_paciente = 'menor'
WHERE cedula IS NULL
  AND tipo_paciente IS NULL;

-- Estadísticas de migración
SELECT
  'Pacientes migrados' as descripcion,
  COUNT(*) as cantidad
FROM identificaciones
UNION ALL
SELECT
  'Pacientes sin cédula marcados como menor',
  COUNT(*)
FROM patients
WHERE tipo_paciente = 'menor' AND cedula IS NULL;
```

**Validación:**

- ✅ Verificar que todas las cédulas se migraron correctamente
- ✅ Verificar que pacientes sin cédula se marcaron como 'menor'
- ✅ Comparar conteos: `COUNT(DISTINCT paciente_id)` en `identificaciones` = `COUNT(*)` de pacientes con cédula

**Rollback:** Eliminar registros de `identificaciones` (no afecta `patients`)

**Tiempo estimado:** 30-60 minutos (depende de volumen)

---

### **FASE 4: Crear Funciones Helper (Backend)** ✅ SEGURA

**Objetivo:** Crear funciones en backend para trabajar con nuevo sistema, sin modificar código existente

**Archivo:** `src/services/supabase/patients/identificaciones-service.ts` (NUEVO)

```typescript
// Servicio para trabajar con identificaciones (nuevo sistema)
// NO modifica código existente, solo agrega nuevas funciones

export const findPatientByIdentification = async (
	numero: string,
	tipo: 'V' | 'E' | 'J' | 'C' | 'pasaporte',
	laboratoryId: string,
) => {
	// Buscar paciente por identificación
	// ...
}

export const createIdentification = async (pacienteId: string, tipo: string, numero: string) => {
	// Crear identificación
	// ...
}
```

**Archivo:** `src/services/supabase/patients/responsabilidades-service.ts` (NUEVO)

```typescript
// Servicio para trabajar con responsabilidades (nuevo sistema)
// NO modifica código existente, solo agrega nuevas funciones

export const createResponsibility = async (responsableId: string, dependienteId: string, tipo: 'menor' | 'animal') => {
	// Crear responsabilidad
	// ...
}

export const getDependentsByResponsable = async (responsableId: string) => {
	// Obtener dependientes
	// ...
}
```

**Validación:**

- ✅ Compilar sin errores
- ✅ No romper imports existentes
- ✅ Funciones nuevas no se usan todavía (solo preparadas)

**Rollback:** Eliminar archivos nuevos

**Tiempo estimado:** 1-2 horas

---

### **FASE 5: Dual-Write en Registro de Casos** ⚠️ CRÍTICA

**Objetivo:** Escribir en ambos sistemas (antiguo y nuevo) simultáneamente

**Modificación:** `src/services/supabase/cases/registration-service.ts`

**Estrategia:**

1. Mantener lógica actual intacta (escribe en `patients.cedula`)
2. Agregar lógica adicional que también escriba en `identificaciones`
3. Si falla la escritura en `identificaciones`, NO fallar el registro (solo log)

```typescript
// En registerMedicalCase, después de crear/actualizar paciente:

// DUAL-WRITE: Escribir en ambos sistemas
try {
	// 1. Sistema antiguo (actual, sigue funcionando)
	// ... código existente ...

	// 2. Sistema nuevo (adicional, no crítico)
	if (patientData.cedula) {
		const { tipo, numero } = parseCedula(patientData.cedula)
		await createIdentification(patient.id, tipo, numero, laboratoryId).catch((err) => {
			// NO fallar si falla, solo loggear
			console.warn('⚠️ No se pudo crear identificación (no crítico):', err)
		})
	}
} catch (error) {
	// Si falla el sistema nuevo, el antiguo ya funcionó
	console.warn('⚠️ Dual-write falló en sistema nuevo:', error)
}
```

**Validación:**

- ✅ Verificar que registros nuevos crean identificación
- ✅ Verificar que si falla identificación, el registro sigue funcionando
- ✅ Verificar que sistema antiguo sigue funcionando igual

**Rollback:** Revertir cambios en `registration-service.ts`

**Tiempo estimado:** 2-3 horas

---

### **FASE 6: Crear Componentes Nuevos (UI)** ✅ SEGURA

**Objetivo:** Crear componentes nuevos para nuevo sistema, sin modificar existentes

**Componentes nuevos:**

- `PatientProfileSelector.tsx` - Selección de perfiles
- `PatientRelationshipManager.tsx` - Gestión de responsabilidades
- `PatientSearchAutocomplete.tsx` - Búsqueda mejorada

**Estrategia:**

- Crear componentes nuevos en carpeta separada
- NO modificar `PatientDataSection.tsx` todavía
- Componentes nuevos pueden usarse en modo "experimental" o "beta"

**Validación:**

- ✅ Componentes compilan sin errores
- ✅ No rompen imports existentes
- ✅ Pueden usarse opcionalmente

**Rollback:** Eliminar componentes nuevos

**Tiempo estimado:** 4-6 horas

---

### **FASE 7: Modificar UI Gradualmente** ⚠️ CRÍTICA

**Objetivo:** Modificar `PatientDataSection.tsx` para usar nuevo sistema, manteniendo compatibilidad

**Estrategia:**

1. Agregar feature flag: `useNewPatientSystem`
2. Si flag = false: usar sistema antiguo (actual)
3. Si flag = true: usar sistema nuevo
4. Permitir cambiar flag por laboratorio

**Modificación:** `PatientDataSection.tsx`

```typescript
const useNewPatientSystem = useFeatureFlag('hasNewPatientSystem') // Feature flag

if (useNewPatientSystem) {
	// Usar nuevo sistema (identificaciones, responsabilidades)
	return <NewPatientDataSection />
} else {
	// Usar sistema antiguo (actual, sin cambios)
	return <OldPatientDataSection />
}
```

**Validación:**

- ✅ Con flag = false: funciona igual que antes
- ✅ Con flag = true: nuevo sistema funciona
- ✅ Puede cambiar flag sin problemas

**Rollback:** Cambiar feature flag a false

**Tiempo estimado:** 4-6 horas

---

### **FASE 8: Migrar Lecturas (Búsquedas)** ⚠️ CRÍTICA

**Objetivo:** Modificar búsquedas para usar `identificaciones` en lugar de `patients.cedula`

**Modificación:** `patients-service.ts` y `usePatientAutofill.ts`

**Estrategia:**

1. Crear función nueva: `findPatientByIdentificationNew()`
2. Mantener función antigua: `findPatientByCedula()` (compatibilidad)
3. Usar feature flag para decidir cuál usar
4. Dual-read: leer de ambos sistemas y combinar resultados

```typescript
// Función nueva (usa identificaciones)
const findPatientByIdentificationNew = async (numero: string, tipo: string) => {
	// Buscar en identificaciones
	// ...
}

// Función antigua (mantiene compatibilidad)
const findPatientByCedula = async (cedula: string) => {
	// Sistema actual, sigue funcionando
	// ...
}

// Función unificada con feature flag
const findPatient = async (cedula: string) => {
	if (useNewSystem) {
		const { tipo, numero } = parseCedula(cedula)
		return await findPatientByIdentificationNew(numero, tipo)
	} else {
		return await findPatientByCedula(cedula)
	}
}
```

**Validación:**

- ✅ Búsquedas funcionan con ambos sistemas
- ✅ Feature flag permite cambiar entre sistemas
- ✅ No se rompen búsquedas existentes

**Rollback:** Cambiar feature flag a false

**Tiempo estimado:** 3-4 horas

---

### **FASE 9: Testing Exhaustivo** ⚠️ CRÍTICO

**Objetivo:** Probar todos los flujos con ambos sistemas

**Checklist de Testing:**

1. **Registro de casos:**

   - ✅ Paciente nuevo con cédula
   - ✅ Paciente existente con cédula
   - ✅ Paciente sin cédula (menor)
   - ✅ Verificar que dual-write funciona

2. **Búsquedas:**

   - ✅ Autocomplete por cédula
   - ✅ Autocomplete por nombre
   - ✅ Búsqueda en ambos sistemas

3. **Multi-tenant:**

   - ✅ Aislamiento entre laboratorios
   - ✅ RLS policies funcionan

4. **Responsabilidades:**
   - ✅ Crear relación responsable-dependiente
   - ✅ Ver dependientes de un responsable
   - ✅ Validar que menor tiene responsable

**Tiempo estimado:** 4-6 horas

---

### **FASE 10: Activar Feature Flag en Producción** ⚠️ CRÍTICA

**Objetivo:** Activar nuevo sistema en producción gradualmente

**Estrategia:**

1. Activar en 1 laboratorio de prueba primero
2. Monitorear por 1 semana
3. Si todo bien, activar en más laboratorios
4. Finalmente activar en todos

**Validación:**

- ✅ Monitorear logs de errores
- ✅ Verificar que dual-write funciona
- ✅ Verificar que no hay regresiones

**Rollback:** Desactivar feature flag

**Tiempo estimado:** 1 semana de monitoreo

---

### **FASE 11: Deprecar Sistema Antiguo** ⚠️ CRÍTICA

**Objetivo:** Eliminar código del sistema antiguo después de validar que nuevo funciona

**Estrategia:**

1. Esperar 1 mes con nuevo sistema activo
2. Verificar que no hay problemas
3. Eliminar código antiguo gradualmente:
   - Eliminar dual-write (solo escribir en nuevo)
   - Eliminar funciones antiguas
   - Eliminar campo `cedula` de `patients` (último paso)

**Migración final:**

```sql
-- SOLO después de validar que todo funciona
-- Eliminar campo cedula de patients (último paso)
ALTER TABLE patients DROP COLUMN IF EXISTS cedula;
```

**Validación:**

- ✅ Verificar que no hay código usando `cedula` directamente
- ✅ Verificar que todas las búsquedas usan `identificaciones`
- ✅ Backup antes de eliminar campo

**Rollback:** Restaurar backup (último recurso)

**Tiempo estimado:** 2-4 horas (después de 1 mes de validación)

---

## 📊 Resumen de Fases

| Fase | Descripción               | Riesgo | Tiempo   | Rollback     |
| ---- | ------------------------- | ------ | -------- | ------------ |
| 0    | Preparación               | Bajo   | 1-2h     | N/A          |
| 1    | Crear tablas nuevas       | Bajo   | 30m      | Fácil        |
| 2    | Agregar campos a patients | Bajo   | 15m      | Fácil        |
| 3    | Migrar datos              | Medio  | 30-60m   | Fácil        |
| 4    | Funciones helper          | Bajo   | 1-2h     | Fácil        |
| 5    | Dual-write                | Medio  | 2-3h     | Fácil        |
| 6    | Componentes UI nuevos     | Bajo   | 4-6h     | Fácil        |
| 7    | Modificar UI              | Medio  | 4-6h     | Fácil (flag) |
| 8    | Migrar lecturas           | Medio  | 3-4h     | Fácil (flag) |
| 9    | Testing                   | Bajo   | 4-6h     | N/A          |
| 10   | Activar en producción     | Alto   | 1 semana | Fácil (flag) |
| 11   | Deprecar antiguo          | Alto   | 2-4h     | Backup       |

**Tiempo total estimado:** 2-3 semanas (con testing y monitoreo)

---

## 🛡️ Estrategias de Seguridad

### 1. Feature Flags

- Usar feature flags para activar/desactivar nuevo sistema
- Permitir activar por laboratorio
- Rollback instantáneo cambiando flag

### 2. Dual-Write/Dual-Read

- Escribir en ambos sistemas durante transición
- Leer de ambos sistemas y combinar resultados
- Si falla nuevo sistema, antiguo sigue funcionando

### 3. Validaciones en Cada Fase

- Testing exhaustivo antes de continuar
- Verificar que no se rompe funcionalidad existente
- Monitorear logs y errores

### 4. Rollback Plan

- Cada fase tiene plan de rollback
- Backups antes de cambios críticos
- Feature flags permiten rollback instantáneo

### 5. Monitoreo

- Logs detallados de cada operación
- Alertas si hay errores
- Métricas de uso de nuevo vs antiguo sistema

---

## ✅ Checklist Pre-Implementación

- [ ] Backup completo de base de datos
- [ ] Análisis de datos existentes completado
- [ ] Feature flag `hasNewPatientSystem` creado en `feature_catalog`
- [ ] Entorno de testing configurado
- [ ] Plan de rollback documentado
- [ ] Equipo informado del plan

---

## 🚨 Señales de Alerta

Si ocurre alguno de estos, **DETENER** y revisar:

1. ❌ Errores en registro de casos
2. ❌ Búsquedas no encuentran pacientes existentes
3. ❌ Duplicados en `identificaciones`
4. ❌ Problemas de performance
5. ❌ Violaciones de RLS
6. ❌ Pérdida de datos

---

## 📝 Notas Finales

- **NUNCA** eliminar campo `cedula` hasta que nuevo sistema esté 100% validado
- **SIEMPRE** mantener compatibilidad hacia atrás durante transición
- **SIEMPRE** usar feature flags para controlar activación
- **SIEMPRE** hacer backup antes de cambios críticos
- **SIEMPRE** probar en ambiente de desarrollo primero

---

**Última actualización:** 2025-01-26  
**Estado:** Plan listo para implementación  
**Próximo paso:** FASE 0 - Preparación y Análisis
