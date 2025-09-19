import { Toaster as Sonner } from '@shared/components/ui/sonner'
import { useState } from 'react'
import Sidebar from '@shared/components/Sidebar'
import { useDarkMode } from '@shared/hooks/useDarkMode'
import { AnimatePresence, motion } from 'framer-motion'
import { useFullscreenDetection } from '@shared/hooks/useFullscreenDetection'
import { Menu } from 'lucide-react'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'
import ChangelogTable from './ChangelogTable'

function ChangelogContent() {
	const { isDark, toggleDarkMode } = useDarkMode()
	const isFullscreenMode = useFullscreenDetection()
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [sidebarExpanded, setSidebarExpanded] = useState(false)

	// Si el sidebar móvil está abierto, ocultar el botón hamburguesa globalmente
	useGlobalOverlayOpen(sidebarOpen)

	const handleSidebarMouseEnter = () => {
		if (!isFullscreenMode) {
			setSidebarExpanded(true)
		}
	}

	const handleSidebarMouseLeave = () => {
		setSidebarExpanded(false)
	}

	return (
		<>
			<Sonner />
			<div className="fixed top-4 right-4 z-50 flex items-center gap-2">
				{!isFullscreenMode && (
					<button
						onClick={() => setSidebarOpen(!sidebarOpen)}
						className="mobile-hamburger lg:hidden flex items-center justify-center p-2 bg-white/80 dark:bg-background/80 backdrop-blur-sm border border-input rounded-lg shadow-lg"
					>
						<Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
					</button>
				)}
			</div>

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
						onClose={() => {
							setSidebarOpen(false)
							setSidebarExpanded(false)
						}}
						isExpanded={sidebarExpanded}
						isMobile={sidebarOpen}
						isDark={isDark}
						toggleDarkMode={toggleDarkMode}
					/>
				</div>
			)}
			<div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
				<main
					className={`min-h-screen flex flex-col relative z-10 ${
						!isFullscreenMode ? 'lg:pl-16' : ''
					} transition-transform duration-300 ease-in-out overflow-y-auto`}
				>
					<ChangelogTable />
				</main>
			</div>
		</>
	)
}

export default function StandaloneChangelogPage() {
	return (
		<div className="overflow-x-hidden">
			<ChangelogContent />
		</div>
	)
}
