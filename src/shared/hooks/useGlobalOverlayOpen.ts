import { useEffect, useRef } from 'react'

// Contador global para manejar múltiples modales/paneles abiertos a la vez
let openOverlaysCount = 0

/**
 * Marca el <body> con la clase `has-overlay-open` cuando isOpen es true.
 * Funciona de forma segura con múltiples instancias en paralelo.
 */
export function useGlobalOverlayOpen(isOpen: boolean) {
  const isAppliedRef = useRef(false)

  useEffect(() => {
    if (isOpen && !isAppliedRef.current) {
      openOverlaysCount += 1
      isAppliedRef.current = true
      document.body.classList.add('has-overlay-open')
    } else if (!isOpen && isAppliedRef.current) {
      openOverlaysCount = Math.max(0, openOverlaysCount - 1)
      isAppliedRef.current = false
      if (openOverlaysCount === 0) {
        document.body.classList.remove('has-overlay-open')
      }
    }

    return () => {
      if (isAppliedRef.current) {
        openOverlaysCount = Math.max(0, openOverlaysCount - 1)
        isAppliedRef.current = false
        if (openOverlaysCount === 0) {
          document.body.classList.remove('has-overlay-open')
        }
      }
    }
  }, [isOpen])
}


