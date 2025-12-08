---
name: Códigos personalizados por laboratorio
overview: "Implementar sistema de generación de códigos de casos personalizado por laboratorio, permitiendo que cada cliente tenga su propio formato de códigos (ej: SPT usa formato diferente a Conspat)."
todos:
  - id: "1"
    content: Crear migración SQL para agregar codeFormat a laboratories.config y tabla code_mappings
    status: pending
  - id: "2"
    content: Crear función genérica generate_medical_record_code_v2() en Supabase que lea configuración del laboratorio
    status: pending
  - id: "3"
    content: Actualizar trigger set_medical_record_code() para usar la nueva función genérica
    status: pending
  - id: "4"
    content: Actualizar configuración de laboratorios existentes (conspat, spt, solhub-demo) con sus codeFormat
    status: pending
  - id: "5"
    content: Actualizar code-generator.ts en frontend para soportar múltiples formatos
    status: pending
  - id: "6"
    content: Probar generación de códigos para ambos formatos (conspat y spt)
    status: pending
---

# Plan: Sistema de Códigos Personalizados por Laboratorio

## Contexto

Actualmente todos los laboratorios usan el mismo formato de código de Conspat: `[tipo][año][contador][mes] `(ej: `125001K`). El cliente SPT necesita un formato diferente: `[EXAMEN][contador][MES][año] `(ej: `CI0001K25`). Otros clientes futuros pueden tener formatos completamente diferentes (solo números, sin año, diferentes tipos de exámenes, etc.).

## Solución Propuesta: Sistema Basado en Plantillas

Implementaremos un sistema flexible basado en plantillas que:

1. Almacena la plantilla de código en `laboratories.config.codeTemplate` (formato tipo "printf")
2. Almacena mapeos de exámenes en `laboratories.config.codeMappings`
3. Usa una función genérica en Supabase que interpreta la plantilla
4. **Mantiene verificación de unicidad** usando constraint UNIQUE (code, laboratory_id) + verificación antes de insertar
5. Soporta cualquier formato futuro sin modificar código

## Verificación de Unicidad (Respuesta a tu pregunta)

✅ **SÍ, la verificación seguirá funcionando:**

- La constraint `UNIQUE (code, laboratory_id)` en la BD previene duplicados
- La función verifica antes de generar si el código ya existe
- Si hay colisión, incrementa el contador automáticamente
- El trigger valida antes de insertar

## Orden de Implementación Recomendado

### FASE 1: Base de Datos y Backend (SaaS) ⭐ EMPEZAR AQUÍ

**Razón:** Necesitamos que la funcionalidad funcione primero. Podemos configurar manualmente en BD.

#### 1.1 Migración SQL - Estructura Base

**Archivo:** `supabase/migrations/[timestamp]_flexible_code_generation.sql`

- Crear función genérica `generate_medical_record_code_flexible()` que:
  - Recibe `exam_type`, `case_date`, `laboratory_id`
  - Lee `config->>'codeTemplate'` del laboratorio
  - Si no existe plantilla, usa formato Conspat (retrocompatibilidad)
  - Interpreta la plantilla usando placeholders
  - Busca el siguiente contador basado en el patrón
  - **Verifica unicidad** antes de retornar
  - Usa `pg_advisory_xact_lock` para evitar condiciones de carrera

- Actualizar trigger `set_medical_record_code()` para usar la nueva función
- Mantener función antigua para retrocompatibilidad

#### 1.2 Configuración Manual Inicial

**Archivo:** `supabase/migrations/[timestamp]_set_initial_code_configs.sql`

- Actualizar laboratorios existentes con sus configuraciones:
  - **Conspat**: Formato actual (o null para default)
  - **SPT**: Formato nuevo con plantilla y mapeos
  - **Solhub Demo**: Formato Conspat

**Estructura de configuración:**

```json
{
  "codeTemplate": "{examCode}{counter:4}{month}{year:2}",
  "codeMappings": {
    "Citología": "CI",
    "Mamografía": "MA",
    "Tomografía": "TO",
    "Rayos X": "RX",
    "Ecografía": "EC",
    "Laboratorio": "LA"
  },
  "counterPattern": "{examCode}*{month}{year:2}",
  "counterStart": 1,
  "counterPadding": 4
}
```

#### 1.3 Frontend SaaS - Generador de Códigos

**Archivo:** `src/services/utils/code-generator.ts`

- Crear función `generateCodeFromTemplate()` que:
  - Obtiene configuración del laboratorio desde BD
  - Interpreta la plantilla igual que en Supabase
  - Genera código en el frontend (para preview/validación)
  - **Verifica unicidad** consultando la BD antes de retornar
- Mantener `generateMedicalRecordCode()` como wrapper que usa la nueva función
- Actualizar llamadas existentes si es necesario

### FASE 2: Dashboard Admin (UI de Configuración)

**Razón:** Una vez que funciona, agregamos UI para facilitar la configuración.

#### 2.1 UI en Dashboard Admin

**Archivo:** Dashboard admin (repositorio separado o módulo en este)

- Agregar sección "Configuración de Códigos" en edición de laboratorio:
  - Campo para `codeTemplate` (input de texto con ejemplos)
  - Tabla para `codeMappings` (examen → código)
  - Preview del código generado
  - Validación de plantilla
  - Botón "Usar formato Conspat" (default)

**Ejemplos de plantillas para diferentes clientes:**

- **Conspat**: `"{type}{year:2}{counter:3}{month}"` → `125001K`
- **SPT**: `"{examCode}{counter:4}{month}{year:2}"` → `CI0001K25`
- **Cliente futuro (solo números)**: `"{type}{year:4}{counter:5}"` → `1202500001`
- **Cliente sin año**: `"{examCode}{counter:6}"` → `CI000001`

## Ventajas de este Orden

✅ **Funcionalidad primero**: El sistema funciona aunque no haya UI

✅ **Configuración manual**: Podemos configurar SPT manualmente en BD mientras desarrollamos

✅ **Testing temprano**: Probamos la lógica antes de hacer UI

✅ **UI después**: Agregamos UI cuando ya sabemos que funciona

✅ **Menos riesgo**: Si hay problemas, los detectamos en el backend primero

## Placeholders Soportados en Plantillas

- `{examCode}`: Código del examen desde `codeMappings` (ej: "CI", "MA")
- `{type}`: Número de tipo (1, 2, 3) - para Conspat
- `{counter:N}`: Contador con N dígitos (ej: `{counter:4}` → "0001")
- `{month}`: Letra del mes (A-L)
- `{year:2}`: Año con 2 dígitos desde 2000 (25, 26, ...)
- `{year:4}`: Año completo (2025, 2026, ...)
- `{day:2}`: Día con 2 dígitos (01-31)
- Texto literal: Cualquier texto sin `{}` se mantiene tal cual

## Flujo de Verificación de Unicidad

1. **En Supabase (Trigger):**

   - Función genera código según plantilla
   - Busca máximo contador existente que coincida con el patrón
   - Incrementa contador
   - Genera código final
   - **Verifica si existe** con `SELECT ... WHERE code = ... AND laboratory_id = ...`
   - Si existe, incrementa contador y repite (máx 10 intentos)
   - Si no existe, retorna código
   - El trigger inserta con el código
   - La constraint `UNIQUE (code, laboratory_id)` es la última línea de defensa

2. **En Frontend:**

   - Genera código usando la misma lógica
   - Verifica unicidad consultando BD antes de mostrar
   - Si hay colisión, muestra advertencia

## Ventajas de este Enfoque

✅ **Extensible**: Agregar nuevo formato = solo actualizar JSON en BD

✅ **Flexible**: Soporta cualquier combinación de componentes

✅ **Seguro**: Múltiples capas de verificación de unicidad

✅ **Mantenible**: Un solo código para todos los formatos

✅ **Retrocompatible**: Conspat sigue funcionando sin cambios

## Consideraciones

- El trigger en Supabase seguirá generando códigos automáticamente
- La verificación de unicidad funciona en múltiples niveles (función, constraint, frontend)
- Fácil agregar nuevos formatos: solo actualizar `config.codeTemplate` en la BD
- Los códigos siguen siendo únicos por `(code, laboratory_id)`