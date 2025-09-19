import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MonitorCheck } from 'lucide-react';
import { Button } from './button';
import { useSessionTimeout } from '@app/providers/SessionTimeoutProvider'

export function SessionTimeoutWarning() {
	const { showWarning, dismissWarning, resetSessionTimer, formatTimeRemaining } = useSessionTimeout()
	const [progress, setProgress] = useState(100)

	const timeRemaining = formatTimeRemaining()

	// Update progress bar based on time remaining
	useEffect(() => {
		if (!showWarning) return

		const [minutes, seconds] = timeRemaining.split(':').map(Number)
		const totalSeconds = minutes * 60 + seconds

		// Assuming warning shows 30 seconds before timeout
		const percentage = Math.min(100, Math.max(0, (totalSeconds / 30) * 100))
		setProgress(percentage)
	}, [showWarning, timeRemaining])

	return (
		<AnimatePresence>
			{showWarning && (
				<motion.div
					initial={{ opacity: 0, y: 50 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 50 }}
					className="fixed bottom-4 right-4 z-[999999999999] max-w-sm w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
				>
					<div className="p-4">
						<div className="flex items-start gap-3">
							<div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
								<Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
							</div>
							<div className="flex-1">
								<h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Su sesión está por expirar</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
									Por seguridad, su sesión expirará en{' '}
									<span className="font-semibold text-orange-600 dark:text-orange-400">{timeRemaining}</span>. ¿Desea
									continuar conectado?
								</p>

								{/* Progress bar */}
								<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-4">
									<div
										className="bg-orange-500 h-1.5 rounded-full transition-transform duration-1000 ease-linear"
										style={{ width: `${progress}%` }}
									></div>
								</div>

								<div className="flex justify-end gap-2">
									<Button variant="outline" size="sm" onClick={dismissWarning} className="text-xs">
										Cerrar
									</Button>
									<Button
										size="sm"
										onClick={resetSessionTimer}
										className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1 text-xs"
									>
										<MonitorCheck className="h-3 w-3" />
										Continuar sesión
									</Button>
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}