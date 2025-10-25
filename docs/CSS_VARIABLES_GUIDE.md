# 🎨 Guía de CSS Variables del Laboratorio

## 📋 Resumen

Sistema de CSS Variables dinámicas que permite usar los colores del laboratorio
actual en cualquier parte del CSS global.

---

## 🏗️ Cómo Funciona

### **Variables CSS Disponibles**

```css
:root {
  /* Colores principales */
  --lab-primary-color: #0066cc;
  --lab-secondary-color: #00cc66;

  /* Variantes con opacidad */
  --lab-primary-color-10: #0066cc1a; /* 10% opacity */
  --lab-primary-color-20: #0066cc33; /* 20% opacity */
  --lab-primary-color-50: #0066cc80; /* 50% opacity */

  --lab-secondary-color-10: #00cc661a;
  --lab-secondary-color-20: #00cc6633;
  --lab-secondary-color-50: #00cc6680;
}
```

Estas variables se **actualizan automáticamente** cuando el usuario cambia de
laboratorio.

---

## 🎯 Clases CSS Predefinidas

### **Colores de Texto**

```tsx
<h1 className="text-lab-primary">Título con color del lab</h1>
<p className="text-lab-secondary">Texto secundario</p>
```

### **Colores de Fondo**

```tsx
<div className="bg-lab-primary">Fondo primario</div>
<div className="bg-lab-secondary">Fondo secundario</div>
<div className="bg-lab-primary-light">Fondo suave (10% opacity)</div>
<div className="bg-lab-primary-lighter">Fondo más suave (20% opacity)</div>
```

### **Bordes**

```tsx
<div className='border-2 border-lab-primary'>Borde con color del lab</div>
```

### **Botones**

```tsx
<button className="btn-lab-primary">Botón Primario</button>
<button className="btn-lab-secondary">Botón Secundario</button>
```

### **Badges**

```tsx
<span className='badge-lab-primary'>Nuevo</span>
```

### **Cards**

```tsx
<div className='card-lab-primary'>Card con borde lateral del color del lab</div>
```

### **Gradientes**

```tsx
<div className='gradient-lab p-6 text-white'>Fondo con gradiente del lab</div>
```

---

## 💡 Uso Avanzado

### **En CSS Custom**

```css
/* Usar las variables directamente */
.my-custom-button {
  background-color: var(--lab-primary-color);
  border: 2px solid var(--lab-primary-color);
  color: white;
}

.my-custom-button:hover {
  background-color: var(--lab-primary-color-50);
}

/* Crear variantes personalizadas */
.my-card {
  background: linear-gradient(
    to right,
    var(--lab-primary-color),
    var(--lab-secondary-color)
  );
}

.my-badge {
  background-color: var(--lab-primary-color-10);
  color: var(--lab-primary-color);
  border: 1px solid var(--lab-primary-color-20);
}
```

### **Con Inline Styles (si es necesario)**

```tsx
<div
  style={{
    backgroundColor: 'var(--lab-primary-color)',
    color: 'white',
  }}
>
  Contenido
</div>
```

### **Combinar con Tailwind**

```tsx
<div className='p-4 rounded-lg bg-lab-primary-light border-2 border-lab-primary'>
  <h2 className='text-lab-primary font-bold'>Título</h2>
  <p className='text-gray-600'>Contenido</p>
  <button className='btn-lab-primary mt-4'>Acción</button>
</div>
```

---

## 📝 Ejemplos Prácticos

### **Ejemplo 1: Card de Estadística**

```tsx
<div className='bg-white rounded-lg shadow p-6 border-l-4 border-lab-primary'>
  <h3 className='text-lab-primary text-lg font-semibold'>Total Casos</h3>
  <p className='text-3xl font-bold mt-2'>150</p>
  <span className='badge-lab-primary mt-3'>+12 este mes</span>
</div>
```

### **Ejemplo 2: Header con Gradiente**

```tsx
<header className='gradient-lab p-6 text-white'>
  <h1 className='text-3xl font-bold'>Dashboard</h1>
  <p className='text-white/80'>Bienvenido al sistema</p>
</header>
```

### **Ejemplo 3: Botones de Acción**

```tsx
<div className='flex gap-3'>
  <button className='btn-lab-primary'>Guardar</button>
  <button className='btn-lab-secondary'>Cancelar</button>
</div>
```

### **Ejemplo 4: Lista con Items Destacados**

```tsx
<ul className='space-y-2'>
  <li className='card-lab-primary'>
    <h4 className='text-lab-primary font-semibold'>Item Importante</h4>
    <p>Descripción del item</p>
  </li>
  <li className='bg-gray-50 p-4 rounded'>
    <h4>Item Normal</h4>
    <p>Descripción</p>
  </li>
</ul>
```

### **Ejemplo 5: Tabs con Color del Lab**

```css
.tab-active {
  border-bottom: 3px solid var(--lab-primary-color);
  color: var(--lab-primary-color);
}

.tab-inactive {
  color: #6b7280;
}

.tab-inactive:hover {
  color: var(--lab-primary-color-50);
}
```

---

## 🔧 Cómo se Actualiza

El componente `LaboratoryThemeProvider` se encarga de:

1. **Detectar** el laboratorio actual del usuario
2. **Inyectar** las variables CSS en el `:root`
3. **Actualizar** automáticamente cuando cambia el laboratorio

```tsx
// src/app/providers/LaboratoryThemeProvider.tsx
useEffect(() => {
  if (laboratory?.branding) {
    document.documentElement.style.setProperty(
      '--lab-primary-color',
      laboratory.branding.primaryColor,
    );
    // ... más variables
  }
}, [laboratory]);
```

---

## 🎨 Valores por Laboratorio

### **Conspat**

- Primary: `#0066cc` (azul)
- Secondary: `#00cc66` (verde)

### **Solhub Demo**

- Primary: `#ff6b35` (naranja)
- Secondary: `#f7931e` (naranja claro)

---

## 💡 Tips y Mejores Prácticas

### **1. Preferir clases predefinidas**

✅ **Bueno:**

```tsx
<button className='btn-lab-primary'>Guardar</button>
```

❌ **Evitar:**

```tsx
<button style={{ backgroundColor: 'var(--lab-primary-color)' }}>Guardar</button>
```

### **2. Usar variantes con opacidad**

```css
/* Para fondos suaves */
.my-alert {
  background-color: var(--lab-primary-color-10);
  border: 1px solid var(--lab-primary-color-20);
  color: var(--lab-primary-color);
}
```

### **3. Combinar con colores estáticos**

```css
.my-button {
  background: linear-gradient(
    to right,
    var(--lab-primary-color),
    #1e40af /* Azul estático */
  );
}
```

### **4. Fallbacks para navegadores antiguos**

```css
.my-element {
  background-color: #0066cc; /* Fallback */
  background-color: var(--lab-primary-color);
}
```

---

## 🧪 Testing

### **Ver variables actuales en DevTools:**

1. Abre las DevTools (F12)
2. Ve a la pestaña "Elements"
3. Selecciona el elemento `<html>`
4. En "Styles", busca `:root`
5. Verás las variables CSS actuales

### **Cambiar laboratorio y ver cambios:**

```sql
-- Cambiar a Solhub Demo
update profiles
set laboratory_id = (select id from laboratories where slug = 'solhub-demo')
where email = 'tu-email@ejemplo.com';
```

Luego cierra sesión y vuelve a entrar. Las variables CSS cambiarán
automáticamente.

---

## 🚀 Próximos Pasos

### **Áreas donde aplicar:**

1. ✅ Botones principales
2. ✅ Cards de estadísticas
3. ✅ Badges de estado
4. ⏳ Formularios
5. ⏳ Tablas
6. ⏳ Modales
7. ⏳ Notificaciones

---

**Última actualización**: 2025-01-25 **Versión**: 1.0
