# 🎨 Guía de Íconos de Laboratorios

## 📋 Resumen

Sistema para gestionar íconos de laboratorios de forma dinámica. Solo necesitas
agregar el componente del ícono y actualizar Supabase.

---

## 🏗️ Cómo Funciona

### **1. En Supabase (Base de Datos)**

Cada laboratorio tiene un campo `branding.icon` con el **nombre** del ícono:

```json
{
  "logo": null,
  "icon": "conspat",
  "primaryColor": "#0066cc",
  "secondaryColor": "#00cc66"
}
```

**Opciones:**

- `logo`: URL de una imagen (ej: `"/logos/conspat.png"`) - **tiene prioridad**
- `icon`: Nombre del ícono (ej: `"conspat"`, `"solhub"`) - **se usa si no hay
  logo**

---

## 🚀 Cómo Agregar un Nuevo Ícono

### **Paso 1: Crear el componente del ícono**

Crea un archivo en `src/shared/components/icons/`:

```tsx
// src/shared/components/icons/NuevoLabIcon.tsx

export function NuevoLabIcon({
  fill = '#fff',
  className = '',
}: {
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill={fill}
      className={className}
    >
      {/* Tu SVG aquí */}
      <path d='...' />
    </svg>
  );
}

export default NuevoLabIcon;
```

### **Paso 2: Registrar el ícono en el mapeador**

Edita `src/shared/utils/laboratory-icons.tsx`:

```tsx
import ConspatIcon from '@shared/components/icons/ConspatIcon';
import SolHubIcon from '@shared/components/icons/SolHubIcon';
import NuevoLabIcon from '@shared/components/icons/NuevoLabIcon'; // NUEVO

export type LaboratoryIconType = 'conspat' | 'solhub' | 'nuevolab' | 'default'; // AGREGAR

export const LABORATORY_ICONS = {
  conspat: ConspatIcon,
  solhub: SolHubIcon,
  nuevolab: NuevoLabIcon, // NUEVO
  default: SolHubIcon,
} as const;
```

### **Paso 3: Actualizar Supabase**

```sql
-- Opción A: Usar solo el ícono
update laboratories
set branding = jsonb_set(
  jsonb_set(
    branding,
    '{logo}',
    'null'
  ),
  '{icon}',
  '"nuevolab"'
)
where slug = 'nuevo-laboratorio';

-- Opción B: Usar logo + ícono como fallback
update laboratories
set branding = jsonb_set(
  jsonb_set(
    branding,
    '{logo}',
    '"/logos/nuevolab.png"'
  ),
  '{icon}',
  '"nuevolab"'
)
where slug = 'nuevo-laboratorio';
```

---

## 📝 Ejemplos de Uso

### **Ejemplo 1: En cualquier componente**

```tsx
import { LaboratoryIcon } from '@shared/utils/laboratory-icons';
import { useLaboratory } from '@app/providers/LaboratoryContext';

function MyComponent() {
  const { laboratory } = useLaboratory();

  return (
    <div>
      {/* Ícono dinámico */}
      <LaboratoryIcon
        iconName={laboratory?.branding.icon}
        fill={laboratory?.branding.primaryColor}
        className='w-8 h-8'
      />

      {/* O con logo + fallback a ícono */}
      {laboratory?.branding.logo ? (
        <img src={laboratory.branding.logo} alt={laboratory.name} />
      ) : (
        <LaboratoryIcon
          iconName={laboratory?.branding.icon}
          fill={laboratory?.branding.primaryColor}
        />
      )}
    </div>
  );
}
```

### **Ejemplo 2: Ícono específico**

```tsx
import { getLaboratoryIcon } from '@shared/utils/laboratory-icons';

function MyComponent() {
  // Obtener el componente del ícono
  const ConspatIcon = getLaboratoryIcon('conspat');

  return <ConspatIcon fill='#0066cc' className='w-10 h-10' />;
}
```

---

## 🎨 Íconos Actuales

| Laboratorio | Nombre del Ícono | Componente    |
| ----------- | ---------------- | ------------- |
| Conspat     | `"conspat"`      | `ConspatIcon` |
| Solhub Demo | `"solhub"`       | `SolHubIcon`  |
| Por defecto | `"default"`      | `SolHubIcon`  |

---

## 🔧 Configuración en Supabase

### **Estructura del campo `branding`:**

```json
{
  "logo": "/logos/conspat.png", // URL de imagen (opcional)
  "icon": "conspat", // Nombre del ícono (requerido)
  "primaryColor": "#0066cc", // Color primario (hex)
  "secondaryColor": "#00cc66" // Color secundario (hex)
}
```

### **Prioridad:**

1. Si existe `logo` → Muestra la imagen
2. Si no existe `logo` → Muestra el ícono según `icon`
3. Si `icon` no existe o es inválido → Muestra el ícono por defecto

---

## 💡 Tips y Mejores Prácticas

### **1. Formato de SVG**

```tsx
export function MyIcon({ fill = '#fff', className = '' }) {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill={fill} // ← Usar el prop fill
      className={className}
    >
      <path d='...' />
    </svg>
  );
}
```

### **2. Nombres de íconos**

- Usar **minúsculas**
- Sin espacios ni caracteres especiales
- Ejemplos: `"conspat"`, `"labvargas"`, `"clinicasur"`

### **3. Tamaños recomendados**

```tsx
// Pequeño
<LaboratoryIcon className="w-4 h-4" />

// Mediano (Sidebar)
<LaboratoryIcon className="w-8 h-8" />

// Grande
<LaboratoryIcon className="w-16 h-16" />
```

### **4. Colores dinámicos**

```tsx
<LaboratoryIcon
  iconName={laboratory?.branding.icon}
  fill={laboratory?.branding.primaryColor} // Color del lab
  className='w-8 h-8'
/>
```

---

## 🧪 Testing

### **Probar con diferentes laboratorios:**

```sql
-- Ver íconos actuales
select name, branding->>'icon' as icon_name
from laboratories;

-- Cambiar ícono de un laboratorio
update laboratories
set branding = jsonb_set(branding, '{icon}', '"solhub"')
where slug = 'conspat';
```

---

## 🚨 Troubleshooting

### **Problema: El ícono no se muestra**

**Solución:**

1. Verificar que el nombre del ícono en Supabase coincida con el registrado en
   `laboratory-icons.tsx`
2. Verificar que el componente del ícono esté exportado correctamente
3. Verificar que el import en `laboratory-icons.tsx` sea correcto

### **Problema: Aparece el ícono por defecto**

**Causa:** El nombre del ícono no existe en el mapeador

**Solución:** Agregar el ícono al mapeador o corregir el nombre en Supabase

---

## 📁 Estructura de Archivos

```
src/
├── shared/
│   ├── components/
│   │   └── icons/
│   │       ├── ConspatIcon.tsx
│   │       ├── SolHubIcon.tsx
│   │       └── NuevoLabIcon.tsx  ← Agregar aquí
│   └── utils/
│       └── laboratory-icons.tsx  ← Registrar aquí
```

---

**Última actualización**: 2025-01-25 **Versión**: 1.0
