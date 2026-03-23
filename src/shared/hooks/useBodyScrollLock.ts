import { useEffect, useRef } from 'react'

// Contador global para manejar múltiples instancias del hook
let lockCount = 0
let originalScrollY = 0
let isInitialized = false

function getScrollbarWidthPx(): number {
	return Math.max(0, window.innerWidth - document.documentElement.clientWidth)
}

/** Bloqueo de scroll sin tocar padding (el padding solo aplica en el primer lock global). */
function applyFixedBodyLock(scrollY: number) {
	document.body.style.position = 'fixed'
	document.body.style.top = `-${scrollY}px`
	document.body.style.left = '0'
	document.body.style.right = '0'
	document.body.style.width = '100%'
	document.body.style.overflow = 'hidden'
}

function clearBodyScrollLockStyles() {
	document.body.style.position = 'static'
	document.body.style.top = 'auto'
	document.body.style.left = 'auto'
	document.body.style.right = 'auto'
	document.body.style.width = 'auto'
	document.body.style.overflow = 'auto'
	document.body.style.paddingRight = ''
}

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
			const isFirstGlobalLock = lockCount === 0
			// Medir solo con el scrollbar aún visible (primer lock)
			const scrollbarPadPx = isFirstGlobalLock ? getScrollbarWidthPx() : 0

			lockCount++
			hasLocked.current = true

			originalScrollY = window.scrollY

			applyFixedBodyLock(originalScrollY)
			if (isFirstGlobalLock) {
				document.body.style.paddingRight = scrollbarPadPx > 0 ? `${scrollbarPadPx}px` : ''
			}
		} else if (!isLocked && hasLocked.current) {
			lockCount--
			hasLocked.current = false

			if (lockCount === 0) {
				setTimeout(() => {
					clearBodyScrollLockStyles()
					window.scrollTo(0, originalScrollY)
				}, 0)
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
						clearBodyScrollLockStyles()
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
						clearBodyScrollLockStyles()
						window.scrollTo(0, originalScrollY)
					}, 0)
				}
			}
		}
	}, [])
}
