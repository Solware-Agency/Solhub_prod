import { useEffect, useRef } from 'react'

// Contador global para manejar múltiples instancias del hook
let lockCount = 0
let originalScrollY = 0
let isInitialized = false

/**
 * Bloquea el scroll del body cuando `isLocked` es true.
 * Úsalo en sidebars, modals, menús, etc.
 * Maneja múltiples instancias correctamente.
 */
export function useBodyScrollLock(isLocked: boolean) {
	const hasLocked = useRef(false)

	useEffect(() => {
		// Inicializar solo una vez
		if (!isInitialized) {
			originalScrollY = window.scrollY
			isInitialized = true
		}

		if (isLocked && !hasLocked.current) {
			lockCount++
			hasLocked.current = true

			// Guardar la posición actual antes de bloquear
			originalScrollY = window.scrollY

			// Bloquear scroll usando position: fixed
			document.body.style.position = 'fixed'
			document.body.style.top = `-${originalScrollY}px`
			document.body.style.left = '0'
			document.body.style.right = '0'
			document.body.style.width = '100%'
			document.body.style.overflow = 'hidden'
		} else if (!isLocked && hasLocked.current) {
			lockCount--
			hasLocked.current = false

			// Solo desbloquear si no hay otros locks activos
			if (lockCount === 0) {
				setTimeout(() => {
					// Restaurar la posición y estilos con valores específicos
					document.body.style.position = 'static'
					document.body.style.top = 'auto'
					document.body.style.left = 'auto'
					document.body.style.right = 'auto'
					document.body.style.width = 'auto'
					document.body.style.overflow = 'auto'

					// Restaurar la posición de scroll
					window.scrollTo(0, originalScrollY)
				}, 0)
			} else {
				console.log('🔒 Other locks still active, lockCount:', lockCount)
			}
		}

		// Limpieza: restaurar al desmontar
		return () => {
			if (hasLocked.current) {
				lockCount--
				hasLocked.current = false

				// Solo restaurar si no hay otros locks activos
				if (lockCount === 0) {
					setTimeout(() => {
						document.body.style.position = 'static'
						document.body.style.top = 'auto'
						document.body.style.left = 'auto'
						document.body.style.right = 'auto'
						document.body.style.width = 'auto'
						document.body.style.overflow = 'auto'
						window.scrollTo(0, originalScrollY)
					}, 0)
				}
			}
		}
	}, [isLocked])

	// Limpieza adicional cuando el componente se desmonta
	useEffect(() => {
		return () => {
			if (hasLocked.current) {
				lockCount--
				hasLocked.current = false

				if (lockCount === 0) {
					setTimeout(() => {
						document.body.style.position = 'static'
						document.body.style.top = 'auto'
						document.body.style.left = 'auto'
						document.body.style.right = 'auto'
						document.body.style.width = 'auto'
						document.body.style.overflow = 'auto'
						window.scrollTo(0, originalScrollY)
					}, 0)
				}
			}
		}
	}, [])
}
