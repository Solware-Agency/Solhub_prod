# Solución al Problema de Pantalla Negra en Deploy

## Problema
Cuando se despliega la aplicación, a veces las secciones cargan una pantalla negra al entrar por primera vez, pero funcionan correctamente cuando se recarga la página.

## Causa
Este problema es causado por errores en la carga de chunks de JavaScript (lazy loading) que ocurren por:
- Actualizaciones del código en producción mientras el usuario tiene la app abierta
- Problemas de red intermitentes
- Chunks de código que ya no existen después de un nuevo deploy
- Errores no capturados en componentes lazy-loaded

## Solución Implementada

### 1. Error Boundary con Retry Logic
**Archivo:** `src/shared/components/ErrorBoundary.tsx`

- Captura errores de lazy loading y otros errores de React
- Detecta automáticamente errores de carga de chunks
- Implementa retry automático (3 intentos con backoff exponencial)
- Muestra UI amigable con opciones de recuperación
- Permite recargar la página o volver al inicio

### 2. Lazy Loading con Retry
**Archivos:** 
- `src/app/routes/lazy-routes.tsx`
- `src/shared/components/lazy-components.tsx`

Función `lazyRetry()` que:
- Reintenta cargar un módulo hasta 3 veces si falla
- Usa delay incremental entre intentos (1s, 2s, 3s)
- Registra errores en consola para debugging
- Aplica a TODOS los componentes lazy-loaded

### 3. Integración en App
**Archivo:** `src/App.tsx`

- Envuelve toda la app con `<ErrorBoundary>`
- Maneja errores globalmente
- Preserva el Suspense loading spinner

### 4. Evento vite:preloadError (Vite nativo)
**Archivo:** `src/main.tsx`

- Escucha el evento `vite:preloadError` de Vite
- Recarga la página inmediatamente cuando falla un import dinámico
- Se ejecuta antes del ErrorBoundary, evitando retries innecesarios
- Solo activo en producción

### 5. Cache-Control en index.html
**Archivo:** `vercel.json`

- `Cache-Control: no-cache, must-revalidate` en todas las rutas HTML
- Excluye `/assets/` y `/api/` (se cachean con hash de contenido)
- Evita que el navegador sirva HTML obsoleto con URLs de chunks eliminados

### 6. Estrategia manualChunks
**Archivo:** `vite.config.ts`

- Separa vendors estables en chunks independientes: React, Supabase, Recharts, TanStack Query, React Router
- Los vendors cambian menos que el código de la app, reduciendo 404s tras deploys

## Beneficios

✅ **Auto-recuperación**: Reintenta cargar chunks automáticamente
✅ **Mejor UX**: Usuarios ven loading en vez de pantalla negra
✅ **Información clara**: Mensajes de error comprensibles
✅ **Recuperación fácil**: Botones para recargar o ir al inicio
✅ **Sin cambios de código**: Usuarios no pierden datos al recargar

## Qué Hacer si Ocurre

1. **Usuario ve error**: Puede hacer clic en "Recargar página"
2. **Retry automático**: El sistema intenta 3 veces antes de mostrar error
3. **Fallback**: Si todo falla, puede volver al inicio

## Prevención Futura

- Los chunks se reintentan automáticamente
- Los usuarios verán mensajes claros en vez de pantalla negra
- El error boundary captura cualquier error de React
- Los logs en consola ayudan a debugging en producción

## Testing

Para probar en desarrollo:
1. Abrir DevTools > Network
2. Throttle a "Slow 3G"
3. Navegar entre secciones
4. Verificar que los retries funcionan
5. Simular error: deshabilitar red temporalmente

## Notas Técnicas

- **Retry count**: 3 intentos por chunk
- **Retry interval**: 1000ms con backoff exponencial
- **Error detection**: Detecta "Loading chunk", "Failed to fetch", "ChunkLoadError"
- **React version**: Compatible con React 18+
- **TypeScript**: Totalmente tipado con type-safety
