# Plan de Implementación - Sistema de Gestión de Pacientes Multi-Tipo

## Objetivo

Implementar un sistema que permita gestionar pacientes adultos, menores de edad y animales, resolviendo el problema de las cédulas duplicadas mediante:

- Separación de identificación legal (cédula) del paciente como entidad
- Sistema de responsabilidades entre responsables y dependientes
- Autocompletado inteligente que muestra perfiles asociados
- Mantenimiento del aislamiento multi-tenant

## Arquitectura de Datos

### Nuevas Tablas

#### 1. `identificaciones`

Almacena documentos legales (cédulas, pasaportes) separados de los pacientes.

````sql
CREATE TABLE identificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id),
  paciente_id UUID NOT NULL REFERENCES patients(id),
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('V', 'E', 'J', 'C', 'pasaporte')),
  -- V = Venezolano, E = Extranjero, J = Jurídico, C = Comuna
  numero TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(laboratory_id, numero, tipo_documento)
);
```

**Nota:** Los tipos de documento coinciden con el sistema actual de cédulas (V, E, J, C) más el soporte para pasaportes.

#### 2. `responsabilidades`

Relación entre responsables y dependientes (menores/animales).

```sql
CREATE TABLE responsabilidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id),
  paciente_id_responsable UUID NOT NULL REFERENCES patients(id),
  paciente_id_dependiente UUID NOT NULL REFERENCES patients(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('menor', 'animal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(laboratory_id, paciente_id_responsable, paciente_id_dependiente),
  CHECK (paciente_id_responsable != paciente_id_dependiente)
);
```

### Modificaciones a Tabla Existente

#### `patients`

Agregar campos para tipo de paciente, fecha de nacimiento y mantener campo edad para compatibilidad.

```sql
ALTER TABLE patients 
  ADD COLUMN tipo_paciente TEXT CHECK (tipo_paciente IN ('adulto', 'menor', 'animal')),
  ADD COLUMN fecha_nacimiento DATE,
  ADD COLUMN especie TEXT, -- Solo para animales
  -- Mantener campo 'edad' para compatibilidad (permite edad manual O fecha de nacimiento)

-- Índices para performance
CREATE INDEX idx_patients_tipo ON patients(tipo_paciente);
CREATE INDEX idx_patients_fecha_nacimiento ON patients(fecha_nacimiento);
```

**Nota:** El sistema permitirá tanto fecha de nacimiento (para cálculo automático de edad) como edad manual (para casos sin fecha exacta).

## Migración de Datos Existentes

### Estrategia Híbrida

1. **Pacientes con cédula (NOT NULL):**

            - `tipo_paciente` = NULL (requiere clasificación manual posterior)
            - Extraer tipo de documento (V, E, J, C) del formato actual de cédula (ej: "V-12345678" → tipo='V', numero='12345678')
            - Crear registro en `identificaciones` con tipo_documento y número extraídos
            - Mantener campo `cedula` temporalmente para compatibilidad

2. **Pacientes sin cédula (NULL):**

            - `tipo_paciente` = 'menor' (según información del usuario: pacientes sin cédula son menores)
            - No crear identificación (cedula = NULL es válido para menores)
            - Mantener campo `cedula` como NULL

3. **Compatibilidad temporal:**

            - Mantener campo `cedula` en `patients` durante período de transición
            - Crear función de migración que sincronice `cedula` → `identificaciones`
            - Deprecar campo `cedula` gradualmente
            - Eliminar opción "S/C" del formulario (los menores simplemente no tendrán identificación)

## Implementación Frontend

### Componentes Nuevos

1. **`PatientProfileSelector.tsx`**

            - Componente de búsqueda que muestra responsable + perfiles asociados
            - Permite seleccionar perfil antes de crear caso
            - Muestra iconos diferenciados (👤 adulto, 👶 menor, 🐶 animal)

2. **`PatientRelationshipManager.tsx`**

            - UI para agregar nuevos menores/animales a responsables existentes
            - Wizard para registrar responsable nuevo + dependiente nuevo

3. **`PatientSearchAutocomplete.tsx`**

            - Búsqueda mejorada que busca por:
                    - Cédula del responsable
                    - Nombre del responsable
                    - Teléfono del responsable
            - Muestra resultados agrupados por responsable con perfiles asociados

### Modificaciones a Componentes Existentes

1. **`PatientDataSection.tsx`**

            - Modificar para trabajar con `identificaciones` en lugar de `cedula` directa
            - Eliminar opción "S/C" del selector de tipo de cédula
            - Agregar selector de tipo de paciente (adulto/menor/animal) - puede ser NULL inicialmente
            - Agregar campo de fecha de nacimiento (opcional, para cálculo automático de edad)
            - Mantener campo edad manual como alternativa cuando no hay fecha de nacimiento
            - Validar que menores/animales tengan responsable antes de permitir crear caso

2. **`registration-service.ts`**

            - Modificar `registerMedicalCase` para:
                    - Buscar por identificaciones en lugar de `cedula` directa
                    - Crear identificaciones al registrar pacientes
                    - Manejar relaciones de responsabilidad

3. **`patients-service.ts`**

            - Nuevas funciones:
                    - `findPatientByIdentification(numero, tipo, laboratoryId)`
                    - `getPatientWithRelationships(patientId)`
                    - `createResponsibility(responsableId, dependienteId, tipo)`
                    - `getDependentsByResponsable(responsableId)`

## Flujos de Usuario

### Flujo 1: Paciente Recurrente (Responsable Existente)

1. Usuario busca por cédula/nombre/teléfono
2. Sistema muestra responsable + perfiles asociados
3. Usuario selecciona perfil específico
4. Sistema autocompleta datos y crea caso

### Flujo 2: Menor Nuevo (Responsable Existente)

1. Usuario busca responsable existente
2. Sistema muestra perfiles asociados
3. Usuario hace clic en "Agregar nuevo menor"
4. Ingresa nombre y fecha de nacimiento
5. Sistema crea paciente tipo 'menor' y relación de responsabilidad
6. Usuario selecciona el menor y crea caso

### Flujo 3: Responsable Nuevo + Menor Nuevo

1. Búsqueda no encuentra resultados
2. Usuario hace clic en "Registrar nuevo responsable"
3. Registra adulto con cédula
4. Sistema pregunta "¿Para quién es el caso?"
5. Registra menor o animal
6. Sistema crea relación automáticamente
7. Usuario crea caso

## Reglas de Negocio

1. **Un menor o animal SIEMPRE debe tener responsable (OBLIGATORIO)**

            - Validación en frontend y backend
            - No permitir crear caso sin responsable asignado
            - Trigger en PostgreSQL para validar esta regla

2. **No se inventan cédulas**

            - Eliminar lógica de "cedula-1, cedula-2"
            - Eliminar opción "S/C" del formulario
            - Los menores simplemente no tendrán identificación (cedula = NULL es válido)

3. **Tipo de paciente puede ser NULL inicialmente**

            - Los pacientes existentes con cédula se migran con tipo_paciente = NULL
            - Requiere clasificación manual posterior (adulto/menor/animal)
            - Los pacientes sin cédula se marcan automáticamente como 'menor'

4. **Edad: Fecha de nacimiento O edad manual**

            - Permitir ambos métodos según disponibilidad de datos
            - Si hay fecha_nacimiento, calcular edad automáticamente
            - Si no hay fecha_nacimiento, usar campo edad manual

5. **Aislamiento multi-tenant**

            - Todas las queries filtran por `laboratory_id`
            - RLS policies en nuevas tablas

6. **Sin perfil seleccionado NO se puede crear caso**

            - Validación obligatoria antes de submit

## Archivos a Modificar

### Base de Datos

- `supabase/migrations/[timestamp]_patient_management_system.sql` - Nueva migración

### Servicios Backend

- `src/services/supabase/patients/patients-service.ts` - Nuevas funciones
- `src/services/supabase/cases/registration-service.ts` - Modificar registro
- `src/shared/hooks/usePatientAutofill.ts` - Actualizar autofill

### Componentes Frontend

- `src/features/form/components/PatientDataSection.tsx` - Modificar formulario
- `src/shared/components/ui/autocomplete-input.tsx` - Mejorar búsqueda
- `src/shared/hooks/useAutocomplete.ts` - Actualizar lógica

### Componentes Nuevos

- `src/features/patients/components/PatientProfileSelector.tsx` - Nuevo
- `src/features/patients/components/PatientRelationshipManager.tsx` - Nuevo
- `src/features/patients/components/PatientSearchAutocomplete.tsx` - Nuevo

### Tipos TypeScript

- `src/shared/types/types.ts` - Agregar tipos para nuevas tablas

## Consideraciones Técnicas

1. **Performance:**

            - Índices en `identificaciones.numero` y `responsabilidades.paciente_id_responsable`
            - Queries optimizadas con JOINs

2. **Compatibilidad:**

            - Mantener campo `cedula` durante período de transición
            - Función de sincronización bidireccional temporal

3. **Validaciones:**

            - Trigger en PostgreSQL para validar relaciones
            - Validaciones en frontend antes de submit

4. **RLS Policies:**

            - Políticas para `identificaciones` y `responsabilidades`
            - Filtrado automático por `laboratory_id`

## Fases de Implementación

### Fase 1: Base de Datos (Migración)

- Crear tablas nuevas
- Modificar tabla `patients`
- Migrar datos existentes
- Crear índices y constraints

### Fase 2: Backend (Servicios)

- Implementar funciones de búsqueda mejoradas
- Crear servicios de responsabilidades
- Actualizar registro de casos

### Fase 3: Frontend (UI)

- Crear componentes de selección de perfiles
- Modificar formulario de registro
- Implementar autocompletado mejorado

### Fase 4: Testing y Depuración

- Probar todos los flujos
- Validar migración de datos
- Verificar aislamiento multi-tenant

### Fase 5: Deprecación Gradual

- Eliminar uso de campo `cedula` directo
- Migrar completamente a `identificaciones`


````