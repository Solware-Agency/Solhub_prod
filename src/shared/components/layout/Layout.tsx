import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDarkMode } from '@shared/hooks/useDarkMode'
import { useFullscreenDetection } from '@shared/hooks/useFullscreenDetection'
import Sidebar from '@shared/components/layout/Sidebar'
import { Menu } from 'lucide-react'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'
import ChatButton from '@features/ChatAI/components/ChatButton'
import { FeatureGuard } from '@shared/components/FeatureGuard'

const Layout: React.FC = () => {
	const { isDark, toggleDarkMode } = useDarkMode()
	const isFullscreenMode = useFullscreenDetection()

	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [sidebarExpanded, setSidebarExpanded] = useState(false) // New state for hover expansion
	const [hasOverlayOpen, setHasOverlayOpen] = useState(false)

	// Verificar si hay un overlay abierto (modal, etc.)
	useEffect(() => {
		const checkOverlay = () => {
			// Verificar clase has-overlay-open
			const hasOverlayClass = document.body.classList.contains('has-overlay-open')
			
			// Verificar si hay algún Dialog de Radix abierto
			const hasRadixDialog = document.querySelector('[data-radix-dialog-content][data-state="open"]') !== null ||
			                         document.querySelector('[data-state="open"][role="dialog"]') !== null
			
			// Verificar si el modal de detalles del caso está visible (buscar el panel con z-index muy alto)
			const hasCaseModal = document.querySelector('[class*="z-[9999999999999999"]') !== null ||
			                      document.querySelector('[class*="z-\\[99999999999999999\\]"]') !== null
			
			setHasOverlayOpen(hasOverlayClass || hasRadixDialog || hasCaseModal)
		}
		
		// Verificar inicialmente
		checkOverlay()
		
		// Observar cambios en las clases del body y en el DOM para detectar cambios en modales
		const observer = new MutationObserver(() => {
			// Usar setTimeout para asegurar que se detecte después de que se actualice la clase
			setTimeout(checkOverlay, 0)
		})
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class'],
			subtree: true,
			childList: true
		})
		
		// También verificar periódicamente como fallback
		const interval = setInterval(checkOverlay, 100)
		
		return () => {
			observer.disconnect()
			clearInterval(interval)
		}
	}, [])

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen)
	}

	const handleSidebarMouseEnter = () => {
		if (!isFullscreenMode) {
			setSidebarExpanded(true)
		}
	}

	const handleSidebarMouseLeave = () => {
		setSidebarExpanded(false)
	}

	// Contar sidebar móvil como overlay abierto para ocultar hamburguesa
	useGlobalOverlayOpen(sidebarOpen)

	return (
		<div className="min-h-screen bg-white dark:bg-background">
			{/* Mobile overlay */}
			<AnimatePresence>
				{sidebarOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden transition-all duration-300 ease-in-out"
						onClick={() => setSidebarOpen(false)}
					/>
				)}
			</AnimatePresence>

			{/* Sidebar - Now overlays content instead of pushing it */}
			{!isFullscreenMode && (
				<div
					className={`fixed top-0 left-0 h-screen z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
						sidebarOpen ? 'translate-x-0' : '-translate-x-full'
					} ${
						// On desktop: collapsed by default (w-16), expanded on hover (w-56)
						sidebarExpanded ? 'lg:w-56' : 'lg:w-16'
					}`}
					onMouseEnter={handleSidebarMouseEnter}
					onMouseLeave={handleSidebarMouseLeave}
				>
					<Sidebar
						onClose={() => setSidebarOpen(false)}
						isExpanded={sidebarExpanded}
						isMobile={sidebarOpen}
						isDark={isDark}
						toggleDarkMode={toggleDarkMode}
					/>
				</div>
			)}

			{/* Mobile menu button - hidden in fullscreen mode and when overlay is open */}
			{!isFullscreenMode && !hasOverlayOpen && (
				<button
					onClick={toggleSidebar}
					className="mobile-hamburger lg:hidden flex fixed items-center justify-center p-2 bg-white/80 dark:bg-background/80 backdrop-blur-sm border border-input rounded-lg shadow-lg top-4 right-4 z-20"
				>
					<Menu className="h-5 w-5 text-gray-600 dark:text-gray-400 " />
				</button>
			)}

			{/* Main content - Adjusted z-index and positioning */}
			<main className={`min-h-screen flex flex-col relative z-10 ${!isFullscreenMode ? 'lg:pl-16' : ''}`}>
				<div className="flex-1 overflow-x-hidden overflow-y-auto" data-main-scroll>
					<div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
						<Outlet />
					</div>
				</div>
			</main>
			<FeatureGuard feature='hasChatAI'>
				<ChatButton />
			</FeatureGuard>
		</div>
	)
}

export default Layout
