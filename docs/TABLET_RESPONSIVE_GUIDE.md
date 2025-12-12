# Guía de Responsive Design para Tablets

## Breakpoints de Tailwind CSS

```
sm: 640px   - Móviles grandes / Tablets pequeñas (portrait)
md: 768px   - Tablets (portrait) ⭐ PRINCIPAL PARA TABLET
lg: 1024px  - Tablets grandes (landscape) / Laptops pequeñas
xl: 1280px  - Laptops / Desktops
2xl: 1536px - Desktops grandes
```

## Patrón Consistente para Tablet (md: 768px+)

### 1. **Contenedores y Espaciado**
```tsx
// ✅ CORRECTO - Espaciado progresivo
<div className="p-3 sm:p-4 md:p-6">
<div className="gap-2 sm:gap-3 md:gap-4">
<div className="mb-3 sm:mb-4 md:mb-6">

// ❌ INCORRECTO - Saltos bruscos
<div className="p-2 md:p-8">
```

### 2. **Tipografía**
```tsx
// Títulos
<h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl">

// Subtítulos
<h2 className="text-lg sm:text-xl md:text-2xl">

// Texto body
<p className="text-sm sm:text-base md:text-lg">

// Texto pequeño
<span className="text-xs sm:text-sm">
```

### 3. **Grids**
```tsx
// Cards/Items
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

// Stats Cards
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">

// 2 columnas max
<div className="grid grid-cols-1 md:grid-cols-2">
```

### 4. **Botones y Acciones**
```tsx
// Tamaño de botones
<button className="px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-3">

// Iconos
<Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
```

### 5. **Tablas**
```tsx
// Ocultar columnas en móvil, mostrar en tablet
<th className="hidden md:table-cell">

// Stack en móvil, tabla en tablet
<div className="flex flex-col md:table-row">
```

### 6. **Modales**
```tsx
// Fullscreen en móvil, modal en tablet
<div className="w-full h-full md:w-auto md:h-auto md:max-w-4xl md:rounded-xl">

// Padding de modales
<div className="p-4 sm:p-6 md:p-8">
```

### 7. **Sidebar/Navigation**
```tsx
// Oculto en móvil, fijo en tablet
<aside className="hidden md:flex md:w-64 lg:w-72">

// Hamburger solo en móvil
<button className="md:hidden">
```

## Checklist de Revisión

- [ ] Títulos y textos son legibles en 768px-1024px
- [ ] Espaciados no son demasiado apretados ni espaciosos
- [ ] Cards/Items no se ven aplastados
- [ ] Botones son tocables (min 44x44px)
- [ ] Tablas no tienen scroll horizontal innecesario
- [ ] Modales no ocupan toda la pantalla en tablet
- [ ] Navegación es accesible sin hamburger
- [ ] Imágenes/iconos tienen buen tamaño
- [ ] Forms tienen campos de buen tamaño
- [ ] Grid layouts aprovechan el espacio disponible

## Ejemplos Aplicados

### RecordsSection (Lista de Casos)
```tsx
// Header
<div className="flex flex-col sm:flex-row md:items-center md:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">

// Search bar
<div className="w-full sm:w-auto md:w-96">

// Cards grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
```

### PatientsList
```tsx
// Table container
<div className="overflow-x-auto md:overflow-x-visible">

// Table
<table className="text-xs sm:text-sm md:text-base">

// Actions column (siempre visible en tablet)
<td className="md:table-cell">
```

### Dashboard Stats
```tsx
// Stats grid
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">

// Stat card
<div className="p-3 sm:p-4 md:p-6">
  <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl">
</div>
```
