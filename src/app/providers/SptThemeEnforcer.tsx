import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { useLaboratory } from './LaboratoryContext';

/**
 * Componente que establece el modo claro por defecto para usuarios del laboratorio SPT
 * Solo se aplica cuando el usuario entra por primera vez (si no hay tema guardado)
 * Los usuarios pueden cambiar el tema manualmente después y su preferencia se respeta
 */
export function SptThemeEnforcer() {
	const { laboratory } = useLaboratory();
	const { setTheme } = useTheme();
	const hasSetDefault = useRef(false);

	useEffect(() => {
		// Verificar si el usuario pertenece al laboratorio SPT
		const isSpt = laboratory?.slug === 'spt';

		// Solo procesar si es SPT y aún no se ha establecido el default
		if (isSpt && !hasSetDefault.current) {
			// Verificar si hay un tema guardado en localStorage
			const savedTheme = localStorage.getItem('ui-theme');
			
			if (!savedTheme) {
				// Si no hay tema guardado, establecer modo claro por defecto para SPT
				console.log('🌞 Usuario SPT detectado - estableciendo modo claro por defecto (primera vez)');
				setTheme('light');
				hasSetDefault.current = true;
			} else {
				// Si ya hay un tema guardado (usuario lo cambió antes), respetarlo completamente
				console.log('🌞 Usuario SPT detectado - respetando tema guardado:', savedTheme);
				hasSetDefault.current = true;
			}
		}
	}, [laboratory?.slug, setTheme]);

	// Este componente no renderiza nada
	return null;
}
