import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Manejo de errores de carga de chunks (lazy loading) - recarga inmediata en producción
// Evita que el usuario vea el ErrorBoundary cuando Vite falla al cargar un chunk obsoleto
// (ej: después de un deploy mientras tenía la app abierta)
if (import.meta.env.PROD && typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    window.location.reload()
  })
}
import { AuthProvider } from '@app/providers/AuthContext.tsx'
import { LaboratoryProvider } from '@app/providers/LaboratoryContext.tsx';
import { LaboratoryThemeProvider } from '@app/providers/LaboratoryThemeProvider.tsx';
import { SessionTimeoutProvider } from '@app/providers/SessionTimeoutProvider.tsx';
import { SessionTimeoutWarning } from '@shared/components/ui/session-timeout-warning.tsx';
import { ThemeProvider } from '@app/providers/ThemeProvider.tsx';
import { SptThemeEnforcer } from '@app/providers/SptThemeEnforcer.tsx';

// Contenedores para portales que deben quedar por encima de modales (z-index máximo)
if (typeof document !== 'undefined') {
  let tooltipContainer = document.getElementById('tooltip-portal-container');
  if (!tooltipContainer) {
    tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'tooltip-portal-container';
    tooltipContainer.style.position = 'fixed';
    tooltipContainer.style.top = '0';
    tooltipContainer.style.left = '0';
    tooltipContainer.style.width = '0';
    tooltipContainer.style.height = '0';
    tooltipContainer.style.pointerEvents = 'none';
    tooltipContainer.style.zIndex = '2147483647';
    document.body.appendChild(tooltipContainer);
  }
  let selectContainer = document.getElementById('select-portal-container');
  if (!selectContainer) {
    selectContainer = document.createElement('div');
    selectContainer.id = 'select-portal-container';
    selectContainer.style.position = 'fixed';
    selectContainer.style.inset = '0';
    selectContainer.style.pointerEvents = 'none';
    selectContainer.style.zIndex = '2147483647';
    selectContainer.style.overflow = 'visible';
    document.body.appendChild(selectContainer);
  }
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider defaultTheme='system' storageKey='ui-theme'>
    <AuthProvider>
      <LaboratoryProvider>
        <SptThemeEnforcer />
        <LaboratoryThemeProvider>
          <SessionTimeoutProvider>
            <App />
            <SessionTimeoutWarning />
          </SessionTimeoutProvider>
        </LaboratoryThemeProvider>
      </LaboratoryProvider>
    </AuthProvider>
  </ThemeProvider>,
);
