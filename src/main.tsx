import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@app/providers/AuthContext.tsx'
import { LaboratoryProvider } from '@app/providers/LaboratoryContext.tsx';
import { LaboratoryThemeProvider } from '@app/providers/LaboratoryThemeProvider.tsx';
import { SessionTimeoutProvider } from '@app/providers/SessionTimeoutProvider.tsx';
import { SessionTimeoutWarning } from '@shared/components/ui/session-timeout-warning.tsx';
import { ThemeProvider } from '@app/providers/ThemeProvider.tsx';
import { SptThemeEnforcer } from '@app/providers/SptThemeEnforcer.tsx';

// Crear contenedor para tooltips que se renderice después de los modales
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
