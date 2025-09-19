import { useTheme } from '@app/providers/ThemeProvider'

export const useDarkMode = () => {
	const { theme, setTheme } = useTheme()

	// Determinar si está en modo oscuro basado en el tema actual
	const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

	const toggleDarkMode = () => {
		if (theme === 'dark') {
			setTheme('light')
		} else {
			setTheme('dark')
		}
	}

	const setIsDark = (dark: boolean) => {
		setTheme(dark ? 'dark' : 'light')
	}

	return { isDark, setIsDark, toggleDarkMode }
}
