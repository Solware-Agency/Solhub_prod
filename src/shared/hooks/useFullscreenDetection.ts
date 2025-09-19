import { useState, useEffect } from 'react'

export const useFullscreenDetection = () => {
	const [isFullscreenMode, setIsFullscreenMode] = useState(false)

	useEffect(() => {
		const handleFullscreenChange = () => {
			// Verificar si hay un elemento con z-index muy alto (modal de fullscreen)
			const fullscreenElement = document.querySelector('[style*="z-index: 999999"]') || 
									document.querySelector('[class*="z-[999999]"]')
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