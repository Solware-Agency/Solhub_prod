# 🎨 Guía de Branding Multi-tenant

## 📋 Resumen

Cada laboratorio en Solhub tiene su propio branding personalizado (logo,
colores) que se aplica automáticamente en toda la aplicación.

---

## 🏗️ Estructura del Branding

### En la Base de Datos (Supabase)

Cada laboratorio tiene un campo `branding` en la tabla `laboratories`:

```json
{
  "logo": "/logos/conspat.png",
  "primaryColor": "#0066cc",
  "secondaryColor": "#00cc66"
}
```

### En TypeScript

```typescript
export interface LaboratoryBranding {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
}
```

---

## 🎯 Cómo Usar el Branding

### Opción 1: Con el hook `useLaboratory()`

```tsx
import { useLaboratory } from '@/app/providers/LaboratoryContext';

function MyComponent() {
  const { laboratory } = useLaboratory();

  return (
    <div>
      {/* Logo */}
      {laboratory?.branding.logo && (
        <img src={laboratory.branding.logo} alt={laboratory.name} />
      )}

      {/* Nombre con color primario */}
      <h1 style={{ color: laboratory?.branding.primaryColor }}>
        {laboratory?.name}
      </h1>

      {/* Botón con color secundario */}
      <button style={{ backgroundColor: laboratory?.branding.secondaryColor }}>
        Acción
      </button>
    </div>
  );
}
```

### Opción 2: En estilos CSS/Tailwind

```tsx
function MyComponent() {
  const { laboratory } = useLaboratory();

  return (
    <div
      className='p-4 rounded'
      style={{
        borderColor: laboratory?.branding.primaryColor,
        backgroundColor: `${laboratory?.branding.primaryColor}10`, // 10% opacity
      }}
    >
      Contenido
    </div>
  );
}
```

---

## 📝 Ejemplos Implementados

### 1. Sidebar (✅ Implementado)

**Ubicación**: `src/shared/components/layout/Sidebar.tsx`

```tsx
// Logo dinámico
{
  laboratory?.branding.logo ? (
    <img
      src={laboratory.branding.logo}
      alt={laboratory.name}
      className='size-8 shrink-0 -ml-1 rounded object-contain'
    />
  ) : (
    <ConspatIcon fill={laboratory?.branding.primaryColor || '#e82084'} />
  );
}

// Nombre con color primario
<p style={{ color: laboratory?.branding.primaryColor }}>
  {laboratory?.name || 'Solhub'}
</p>;
```

### 2. Header (✅ Implementado)

**Ubicación**: `src/features/dashboard/layouts/Header.tsx`

```tsx
{
  laboratory?.branding.logo && (
    <img
      src={laboratory.branding.logo}
      alt={laboratory.name}
      className='w-6 h-6 rounded'
    />
  );
}
<h1>{laboratory?.name}</h1>;
```

---

## 🔧 Cómo Cambiar el Branding de un Laboratorio

### Opción A: Desde SQL (Supabase)

```sql
-- Actualizar logo
update laboratories
set branding = jsonb_set(
  branding,
  '{logo}',
  '"/logos/nuevo-logo.png"'
)
where slug = 'conspat';

-- Actualizar color primario
update laboratories
set branding = jsonb_set(
  branding,
  '{primaryColor}',
  '"#ff0000"'
)
where slug = 'conspat';

-- Actualizar color secundario
update laboratories
set branding = jsonb_set(
  branding,
  '{secondaryColor}',
  '"#00ff00"'
)
where slug = 'conspat';
```

### Opción B: Desde el Dashboard Admin (Futuro - Fase 3)

En el futuro, habrá un dashboard administrativo donde podrás:

- Subir logos
- Seleccionar colores con un color picker
- Vista previa en tiempo real

---

## 🎨 Branding Actual por Laboratorio

### Conspat

```json
{
  "logo": "/logos/conspat.png",
  "primaryColor": "#0066cc",
  "secondaryColor": "#00cc66"
}
```

### Solhub Demo

```json
{
  "logo": "/logos/solhub-demo.png",
  "primaryColor": "#ff6b35",
  "secondaryColor": "#f7931e"
}
```

---

## 📁 Ubicación de Logos

Los logos deben estar en la carpeta `public/logos/`:

```
public/
└── logos/
    ├── conspat.png
    ├── solhub-demo.png
    └── nuevo-lab.png
```

**Recomendaciones:**

- Formato: PNG con fondo transparente
- Tamaño: 256x256px o 512x512px
- Peso: < 100KB

---

## 🚀 Próximos Pasos

### Áreas donde aplicar branding:

1. ✅ **Sidebar** - Logo y nombre dinámico
2. ✅ **Header** - Logo y nombre
3. ⏳ **Login Page** - Logo del laboratorio
4. ⏳ **PDFs** - Logo en reportes
5. ⏳ **Emails** - Logo en emails automáticos
6. ⏳ **Favicon** - Icono del navegador
7. ⏳ **Theme Colors** - Colores globales de la app

---

## 💡 Tips y Mejores Prácticas

1. **Siempre usar fallbacks**:
   `laboratory?.branding.logo || '/default-logo.png'`
2. **Verificar contraste**: Asegurar que los colores tengan buen contraste para
   accesibilidad
3. **Optimizar imágenes**: Comprimir logos para carga rápida
4. **Cachear logos**: Los logos se cargan una vez al iniciar sesión
5. **Colores en formato HEX**: Usar siempre formato `#RRGGBB`

---

## 🔍 Testing del Branding

### Cómo probar:

1. Cambiar el `laboratory_id` del usuario en la base de datos
2. Cerrar sesión y volver a entrar
3. Verificar que el logo y colores cambien correctamente

```sql
-- Cambiar usuario a Solhub Demo
update profiles
set laboratory_id = (select id from laboratories where slug = 'solhub-demo')
where email = 'tu-email@ejemplo.com';

-- Cambiar usuario a Conspat
update profiles
set laboratory_id = (select id from laboratories where slug = 'conspat')
where email = 'tu-email@ejemplo.com';
```

---

**Última actualización**: 2025-01-25 **Versión**: 1.0
