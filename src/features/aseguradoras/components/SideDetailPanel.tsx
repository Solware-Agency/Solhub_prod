import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useBodyScrollLock } from '@shared/hooks/useBodyScrollLock'
import { useGlobalOverlayOpen } from '@shared/hooks/useGlobalOverlayOpen'

interface SideDetailPanelProps {
	isOpen: boolean
	onClose: () => void
	title: string
	subtitle?: string
	actions?: React.ReactNode
	children: React.ReactNode
}

export const SideDetailPanel = ({ isOpen, onClose, title, subtitle, actions, children }: SideDetailPanelProps) => {
	useBodyScrollLock(isOpen)
	useGlobalOverlayOpen(isOpen)

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						viewport={{ margin: '0px' }}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/50 z-[9999999999999999]"
					/>

					<motion.div
						viewport={{ margin: '0px' }}
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', damping: 25, stiffness: 200 }}
						className="fixed right-0 top-0 h-full w-full sm:w-2/3 lg:w-1/2 xl:w-2/5 bg-white/80 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] shadow-2xl z-[9999999999999999] overflow-y-auto overflow-x-hidden rounded-lg border-l border-input flex flex-col"
					>
						<div className="sticky top-0 bg-white/50 dark:bg-background/50 backdrop-blur-[2px] dark:backdrop-blur-[10px] border-b border-input p-3 sm:p-6 z-[9999999999999999] overflow-x-hidden max-w-full">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
									<div className="flex-1 min-w-0">
										<h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
										{subtitle && <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
									</div>
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									{actions}
									<button
										onClick={onClose}
										className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none"
										aria-label="Cerrar"
									>
										<X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
									</button>
								</div>
							</div>
						</div>

						<div className="p-3 sm:p-6 overflow-y-auto flex-1">{children}</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}
