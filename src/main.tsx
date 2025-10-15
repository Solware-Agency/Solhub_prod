import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MockAuthProvider } from '@app/providers/MockAuthContext.tsx'
import { ThemeProvider } from '@app/providers/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ThemeProvider defaultTheme="system" storageKey="ui-theme">
			<MockAuthProvider>
				<App />
			</MockAuthProvider>
		</ThemeProvider>
	</StrictMode>,
)
