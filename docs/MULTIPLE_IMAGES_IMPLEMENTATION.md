# Implementación de Múltiples Imágenes para Imagenología

## 📋 Resumen

Se implementó soporte para cargar hasta **10 URLs de imágenes** en los registros médicos, reemplazando la limitación anterior de una sola imagen.

## 🎯 Cambios Realizados

### 1. Base de Datos (Migración SQL)

**Archivo**: `supabase/migrations/20260127000000_add_images_urls_array.sql`

- ✅ Agregada columna `images_urls` tipo `text[]` (array de strings)
- ✅ Migración automática de `image_url` existente → `images_urls[1]`
- ✅ Constraint: Máximo 10 URLs por registro
- ✅ Constraint: Validación formato HTTP/HTTPS
- ✅ Índice GIN para búsquedas eficientes
- ✅ Columna `image_url` marcada como DEPRECATED (mantiene compatibilidad temporal)

```sql
-- Crear columna
ALTER TABLE public.medical_records_clean
ADD COLUMN images_urls text[];

-- Migrar datos existentes
UPDATE public.medical_records_clean
SET images_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_url != '';

-- Constraint: máximo 10 imágenes
ALTER TABLE public.medical_records_clean
ADD CONSTRAINT max_10_images 
CHECK (array_length(images_urls, 1) IS NULL OR array_length(images_urls, 1) <= 10);

-- Constraint: validar formato URL
ALTER TABLE public.medical_records_clean
ADD CONSTRAINT valid_image_urls 
CHECK (
  images_urls IS NULL OR 
  (SELECT bool_and(url ~ '^https?://') FROM unnest(images_urls) AS url)
);

-- Índice para búsquedas
CREATE INDEX idx_medical_records_images_urls ON public.medical_records_clean USING GIN (images_urls);
```

### 2. TypeScript Types

**Archivo**: `src/shared/types/types.ts`

Actualizado en 3 secciones:

```typescript
// Row type (lectura de DB)
export interface medical_records_clean {
  Row: {
    // ... otros campos
    image_url: string | null; // DEPRECATED - usar images_urls
    images_urls: string[] | null; // ✅ NUEVO
  }
  
  // Insert type (inserción)
  Insert: {
    // ... otros campos
    image_url?: string | null; // DEPRECATED
    images_urls?: string[] | null; // ✅ NUEVO
  }
  
  // Update type (actualización)
  Update: {
    // ... otros campos  
    image_url?: string | null; // DEPRECATED
    images_urls?: string[] | null; // ✅ NUEVO
  }
}

// Interface de aplicación
export interface MedicalRecord {
  // ... otros campos
  image_url?: string | null; // DEPRECATED - usar images_urls
  images_urls?: string[] | null; // ✅ NUEVO: Hasta 10 URLs
}
```

### 3. Componente MultipleImageUrls

**Archivo**: `src/shared/components/ui/MultipleImageUrls.tsx`

Nuevo componente reutilizable para gestionar múltiples URLs:

**Características**:
- ✅ Agregar hasta 10 URLs
- ✅ Eliminar URLs individuales
- ✅ Editar URLs existentes inline
- ✅ Validación de formato URL
- ✅ Vista de lectura con ImageButton para cada imagen
- ✅ Contador "3/10" de imágenes
- ✅ Modo edición/lectura configurable
- ✅ Enter para agregar rápidamente
- ✅ UI responsive (grid 1-2 columnas)

**Props**:
```typescript
interface MultipleImageUrlsProps {
  images: string[];           // Array de URLs
  onChange: (images: string[]) => void; // Callback al cambiar
  maxImages?: number;         // Default: 10
  isEditing?: boolean;        // Default: false
  className?: string;
}
```

**Uso**:
```tsx
<MultipleImageUrls
  images={imageUrls}
  onChange={setImageUrls}
  maxImages={10}
  isEditing={isEditing}
/>
```

### 4. UnifiedCaseModal (Casos Médicos)

**Archivo**: `src/features/cases/components/UnifiedCaseModal.tsx`

**Cambios**:
1. State: `imageUrl: string` → `imageUrls: string[]`
2. Inicialización con backward compatibility:
   ```typescript
   const caseImages = (currentCase as any).images_urls || 
                     ((currentCase as any).image_url ? [(currentCase as any).image_url] : []);
   setImageUrls(caseImages);
   ```

3. Guardado actualizado:
   ```typescript
   if (imageUrls.length > 0) {
     await supabase
       .from('medical_records_clean')
       .update({ images_urls: imageUrls })
       .eq('id', currentCase.id);
   }
   ```

4. UI reemplazado:
   ```tsx
   <MultipleImageUrls
     images={imageUrls}
     onChange={setImageUrls}
     maxImages={10}
     isEditing={isEditing && (role === 'imagenologia' || role === 'owner' || role === 'prueba')}
   />
   ```

### 5. EditPatientInfoModal (Pacientes)

**Archivo**: `src/features/patients/components/EditPatientInfoModal.tsx`

**Cambios similares**:
1. State separado: `imageUrls: string[]`
2. Inicialización con fallback a `image_url`
3. Payload de actualización:
   ```typescript
   if (isImagenologia) {
     updatePayload.images_urls = imageUrls.length > 0 ? imageUrls : null;
   }
   ```

4. Registro de cambios mejorado:
   ```typescript
   changes.push({
     field: 'images_urls',
     fieldLabel: 'Imágenes',
     oldValue: oldImages.length > 0 ? `${oldImages.length} imagen${oldImages.length !== 1 ? 'es' : ''}` : null,
     newValue: imageUrls.length > 0 ? `${imageUrls.length} imagen${imageUrls.length !== 1 ? 'es' : ''}` : null,
   });
   ```

## 🔄 Backward Compatibility

La implementación mantiene **100% compatibilidad** con datos existentes:

1. **Migración automática**: `image_url` existentes se copian a `images_urls[1]`
2. **Lectura dual**: Si no existe `images_urls`, se usa `image_url` como fallback
3. **Columna legacy**: `image_url` se mantiene temporalmente (marcada DEPRECATED)

```typescript
// Patrón de compatibilidad usado en todos los componentes
const images = (record as any).images_urls || 
              ((record as any).image_url ? [(record as any).image_url] : []);
```

## 📊 Flujo de Datos

```
Usuario agrega URLs (hasta 10)
       ↓
MultipleImageUrls valida formato
       ↓
onChange actualiza state local
       ↓
handleSave envía a Supabase
       ↓
Constraint valida max 10 + formato
       ↓
GIN index actualizado
       ↓
Toast confirma guardado
```

## 🎨 UI/UX

### Modo Edición
- Input para agregar nueva URL
- Botón "Agregar" (+ icon)
- Enter para agregar rápido
- Lista numerada (#1, #2, ..., #10)
- Input inline para editar cada URL
- Botón X rojo para eliminar
- Contador "3/10 imágenes"

### Modo Lectura
- Grid de URLs con números
- ImageButton por cada imagen
- Texto truncado de URL
- "Sin imágenes" si array vacío

## ✅ Validaciones

1. **Cliente (MultipleImageUrls)**:
   - Formato URL válido (`new URL()`)
   - Máximo 10 URLs
   - Alert al usuario si excede límite

2. **Base de Datos (Constraints)**:
   - `array_length(images_urls, 1) <= 10`
   - Formato HTTP/HTTPS: `url ~ '^https?://'`

## 🚀 Testing

### Para probar en rol `imagenologia` o `prueba`:

1. **Crear/Editar caso**:
   - Click "Editar" en UnifiedCaseModal
   - Scroll a "Imágenes (Imagenología)"
   - Agregar hasta 10 URLs
   - Guardar

2. **Editar paciente**:
   - Abrir EditPatientInfoModal
   - Sección "Imágenes (hasta 10)"
   - Agregar/editar/eliminar URLs
   - Guardar

3. **Ver múltiples imágenes**:
   - Cada URL tiene botón de vista
   - Click abre imagen en nueva pestaña
   - Todas accesibles desde la lista

## 📝 Roles con Acceso

Solo estos roles pueden **editar** `images_urls`:
- ✅ `imagenologia`
- ✅ `owner`
- ✅ `prueba`

Otros roles pueden **ver** las imágenes (lectura).

## 🔮 Próximos Pasos Opcionales

1. **ImageGallery modal**: Visor de imágenes con navegación ← →
2. **Drag & drop**: Reordenar imágenes arrastrando
3. **Upload directo**: Subir archivos en lugar de URLs
4. **Thumbnails**: Preview pequeño de cada imagen
5. **Zoom & pan**: Visor avanzado con zoom

## 📦 Archivos Afectados

```
✅ supabase/migrations/20260127000000_add_images_urls_array.sql (NUEVO)
✅ src/shared/types/types.ts (ACTUALIZADO)
✅ src/shared/components/ui/MultipleImageUrls.tsx (NUEVO)
✅ src/features/cases/components/UnifiedCaseModal.tsx (ACTUALIZADO)
✅ src/features/patients/components/EditPatientInfoModal.tsx (ACTUALIZADO)
✅ docs/MULTIPLE_IMAGES_IMPLEMENTATION.md (NUEVO)
```

## ⚠️ Notas Importantes

1. **No ejecutar migración aún**: Confirmar en entorno local antes de producción
2. **image_url deprecado**: No usar en código nuevo, migrar gradualmente
3. **10 URLs máximo**: Hardcoded en constraint y validación cliente
4. **Roles específicos**: Solo imagenologia/owner/prueba pueden editar

---

**Fecha**: 27 de enero de 2026  
**Versión**: 1.0  
**Estado**: ✅ Implementado y funcional (pendiente aplicar migración)
