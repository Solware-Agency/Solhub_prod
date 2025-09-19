import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@app/providers/AuthContext.tsx'
import { SessionTimeoutProvider } from '@app/providers/SessionTimeoutProvider.tsx'
import { SessionTimeoutWarning } from '@shared/components/ui/session-timeout-warning.tsx'
import { ThemeProvider } from '@app/providers/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ThemeProvider defaultTheme="system" storageKey="ui-theme">
			<AuthProvider>
				<SessionTimeoutProvider>
					<App />
					<SessionTimeoutWarning />
				</SessionTimeoutProvider>
			</AuthProvider>
		</ThemeProvider>
	</StrictMode>,
)
