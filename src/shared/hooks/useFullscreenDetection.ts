import { useState, useEffect } from 'react'

export const useFullscreenDetection = () => {
	const [isFullscreenMode, setIsFullscreenMode] = useState(false)

	useEffect(() => {
		const handleFullscreenChange = () => {
			// Solo considerar fullscreen a modales/paneles que usan z-index muy alto (16+ nueves).
			// No incluir dropdowns como Select (z-[9999999]) ni modales pequeños (z-[99999999]).
			const fullscreenElement =
				document.querySelector('[style*="z-index: 9999999999999999"]') ||
				document.querySelector('[class*="z-[9999999999999999"]')
			setIsFullscreenMode(!!fullscreenElement)
		}

		// Observar cambios en el DOM
		const observer = new MutationObserver(handleFullscreenChange)
		observer.observe(document.body, { 
			childList: true, 
			subtree: true,
			attributes: true,
			attributeFilter: ['style', 'class']
		})

		// Verificación inicial
		handleFullscreenChange()

		return () => observer.disconnect()
	}, [])

	return isFullscreenMode
} 