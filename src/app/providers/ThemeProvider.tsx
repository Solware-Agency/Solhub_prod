import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
	children: React.ReactNode
	defaultTheme?: Theme
	storageKey?: string
	forceTheme?: Theme | null // Nueva prop para forzar un tema específico
}

type ThemeProviderState = {
	theme: Theme
	setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
	theme: 'system',
	setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
	children,
	defaultTheme = 'system',
	storageKey = 'ui-theme',
	forceTheme = null,
	...props
}: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(() => {
		// Si hay un tema forzado, usarlo directamente
		if (forceTheme) {
			return forceTheme
		}
		
		// Migrar de la clave anterior 'theme' a la nueva 'ui-theme' si es necesario
		const savedTheme = localStorage.getItem(storageKey) as Theme
		if (!savedTheme) {
			const oldTheme = localStorage.getItem('theme') as Theme
			if (oldTheme && (oldTheme === 'dark' || oldTheme === 'light')) {
				localStorage.setItem(storageKey, oldTheme)
				localStorage.removeItem('theme') // Limpiar la clave anterior
				return oldTheme
			}
		}
		return savedTheme || defaultTheme
	})

	// Efecto para aplicar el tema forzado cuando cambie
	useEffect(() => {
		if (forceTheme && forceTheme !== theme) {
			setTheme(forceTheme)
		}
	}, [forceTheme])

	useEffect(() => {
		const root = window.document.documentElement

		root.classList.remove('light', 'dark')

		// Si hay un tema forzado, aplicarlo directamente sin verificar sistema
		if (forceTheme) {
			root.classList.add(forceTheme)
			return
		}

		if (theme === 'system') {
			const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

			root.classList.add(systemTheme)
			return
		}

		root.classList.add(theme)
	}, [theme, forceTheme])

	const value = {
		theme: forceTheme || theme,
		setTheme: (newTheme: Theme) => {
			// Si hay un tema forzado, no permitir cambios
			if (forceTheme) {
				return
			}
			localStorage.setItem(storageKey, newTheme)
			setTheme(newTheme)
		},
	}

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	)
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext)

	if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')

	return context
}
