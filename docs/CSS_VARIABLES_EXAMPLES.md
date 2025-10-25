# 🎨 Ejemplos de Uso de CSS Variables del Laboratorio

## 🚀 Ejemplos Listos para Usar

### **1. Botón Primario con Color del Lab**

```tsx
<button className="btn-lab-primary">
  Guardar Cambios
</button>
```

### **2. Card con Borde del Lab**

```tsx
<div className="card-lab-primary">
  <h3 className="text-lab-primary font-bold">Título</h3>
  <p>Contenido del card</p>
</div>
```

### **3. Badge con Color del Lab**

```tsx
<span className="badge-lab-primary">Nuevo</span>
```

### **4. Header con Gradiente**

```tsx
<header className="gradient-lab p-6 text-white">
  <h1 className="text-3xl font-bold">Dashboard</h1>
  <p>Bienvenido al sistema</p>
</header>
```

### **5. Estadísticas con Colores del Lab**

```tsx
<div className="grid grid-cols-3 gap-4">
  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-lab-primary">
    <h3 className="text-lab-primary text-lg font-semibold">Total Casos</h3>
    <p className="text-3xl font-bold mt-2">150</p>
  </div>
  
  <div className="bg-lab-primary-light rounded-lg p-6">
    <h3 className="text-lab-primary text-lg font-semibold">Pendientes</h3>
    <p className="text-3xl font-bold mt-2">25</p>
  </div>
  
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-gray-600 text-lg font-semibold">Completados</h3>
    <p className="text-3xl font-bold mt-2 text-lab-primary">125</p>
  </div>
</div>
```

### **6. Tabs con Color del Lab**

```tsx
<div className="flex border-b">
  <button className="px-4 py-2 border-b-2 border-lab-primary text-lab-primary font-medium">
    Activos
  </button>
  <button className="px-4 py-2 text-gray-500 hover:text-lab-primary">
    Archivados
  </button>
  <button className="px-4 py-2 text-gray-500 hover:text-lab-primary">
    Todos
  </button>
</div>
```

### **7. Alert con Color del Lab**

```tsx
<div className="bg-lab-primary-light border-l-4 border-lab-primary p-4 rounded">
  <div className="flex items-center">
    <svg className="w-5 h-5 text-lab-primary mr-3" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z"/>
    </svg>
    <p className="text-lab-primary font-medium">Información importante</p>
  </div>
</div>
```

### **8. Progress Bar con Color del Lab**

```tsx
<div className="w-full bg-gray-200 rounded-full h-2">
  <div 
    className="bg-lab-primary h-2 rounded-full" 
    style={{ width: '75%' }}
  />
</div>
```

### **9. Lista con Items Destacados**

```tsx
<ul className="space-y-2">
  {items.map(item => (
    <li 
      key={item.id}
      className={`p-4 rounded-lg ${
        item.important 
          ? 'card-lab-primary' 
          : 'bg-gray-50'
      }`}
    >
      <h4 className={item.important ? 'text-lab-primary font-semibold' : ''}>
        {item.title}
      </h4>
      <p className="text-gray-600">{item.description}</p>
    </li>
  ))}
</ul>
```

### **10. Modal con Header del Lab**

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center">
  <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
    <div className="gradient-lab p-4 rounded-t-lg">
      <h2 className="text-white text-xl font-bold">Confirmar Acción</h2>
    </div>
    <div className="p-6">
      <p className="text-gray-600 mb-4">¿Estás seguro de continuar?</p>
      <div className="flex gap-3 justify-end">
        <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
          Cancelar
        </button>
        <button className="btn-lab-primary">
          Confirmar
        </button>
      </div>
    </div>
  </div>
</div>
```

---

## 🎨 Cómo Probar

1. **Recarga la aplicación**
2. **Verás los colores de Conspat** (azul #0066cc)
3. **Cambia a Solhub Demo** en Supabase:
   ```sql
   update profiles
   set laboratory_id = (select id from laboratories where slug = 'solhub-demo')
   where email = 'tu-email@ejemplo.com';
   ```
4. **Cierra sesión y vuelve a entrar**
5. **Verás los colores de Solhub Demo** (naranja #ff6b35)

---

## 💡 Clases CSS Disponibles

| Clase | Descripción |
|-------|-------------|
| `text-lab-primary` | Texto con color primario del lab |
| `text-lab-secondary` | Texto con color secundario del lab |
| `bg-lab-primary` | Fondo con color primario del lab |
| `bg-lab-secondary` | Fondo con color secundario del lab |
| `bg-lab-primary-light` | Fondo suave (10% opacity) |
| `bg-lab-primary-lighter` | Fondo más suave (20% opacity) |
| `border-lab-primary` | Borde con color primario del lab |
| `border-lab-secondary` | Borde con color secundario del lab |
| `btn-lab-primary` | Botón con color primario del lab |
| `btn-lab-secondary` | Botón con color secundario del lab |
| `badge-lab-primary` | Badge con color primario del lab |
| `card-lab-primary` | Card con borde lateral del lab |
| `gradient-lab` | Gradiente con colores del lab |

---

**¡Ahora puedes usar los colores del laboratorio en cualquier parte de tu CSS!** 🎨✨

