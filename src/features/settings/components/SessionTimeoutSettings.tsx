import { Card } from '@shared/components/ui/card'
import { Clock, Shield, Info } from 'lucide-react'
import { useAuth } from '@app/providers/MockAuthContext'
import { SESSION_TIMEOUT_OPTIONS } from '@shared/hooks/useSessionTimeoutSettings'
import { RadioGroup, RadioGroupItem } from '@shared/components/ui/radio-group'
import { Label } from '@shared/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'

export function SessionTimeoutSettings() {
	const { sessionTimeout, updateUserTimeout, isLoadingTimeout } = useAuth()

	const handleTimeoutChange = (value: string) => {
		const minutes = parseInt(value, 10)
		if (!isNaN(minutes)) {
			updateUserTimeout(minutes)
		}
	}

	const formatMinutes = (minutes: number) => {
		if (minutes < 60) return `${minutes} minutos`
		return `${minutes / 60} hora${minutes > 60 ? 's' : ''}`
	}

	return (
		<Card className="w-full mx-auto mt-6">
			<div className="p-6">
				<div className="flex items-center space-x-3">
					<Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
					<h3 className="text-lg font-semibold">Tiempo de inactividad</h3>
					<Tooltip>
						<TooltipTrigger>
							<Info className="size-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
						</TooltipTrigger>
						<TooltipContent>
							<p>Su sesión actual está configurada para expirar después de {formatMinutes(sessionTimeout)} de inactividad.</p>
						</TooltipContent>
					</Tooltip>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Columna izquierda - Configuración principal */}
					<div>
						<div className="flex items-start space-x-3 mb-4"></div>

					{/* Subtitle removed per request */}
						{isLoadingTimeout ? (
							<div className="animate-pulse space-y-2">
								{[1, 2, 3, 4, 5].map((i) => (
									<div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
								))}
							</div>
						) : (
							<RadioGroup value={sessionTimeout.toString()} onValueChange={handleTimeoutChange} className="space-y-1.5">
								{SESSION_TIMEOUT_OPTIONS.map((minutes) => (
									<div
										key={minutes}
										className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer ${
											sessionTimeout === minutes
												? 'border-primary bg-primary/5'
												: 'border-gray-200 dark:border-gray-700'
										} hover:border-primary hover:bg-primary/5 transition-none`}
										onClick={() => handleTimeoutChange(minutes.toString())}
									>
										<RadioGroupItem value={minutes.toString()} id={`timeout-${minutes}`} />
										<Label htmlFor={`timeout-${minutes}`} className="flex items-center space-x-2 cursor-pointer flex-1">
											<span className="text-sm">{formatMinutes(minutes)}</span>
										</Label>
									</div>
								))}
							</RadioGroup>
						)}
					</div>

					{/* Columna derecha - Información de seguridad */}
					<div className="lg:border-l lg:border-gray-200 dark:border-gray-700 lg:pl-6">
						<div className="space-y-4">
							<div className="flex flex-col gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
								<p className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300 font-medium">
									<Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
									Configuración de seguridad
								</p>
								<p className="text-xs text-blue-700 dark:text-blue-400">
									Por su seguridad, su sesión se cerrará automáticamente después del tiempo de inactividad seleccionado.
									Un tiempo más corto proporciona mayor seguridad, mientras que un tiempo más largo ofrece mayor
									comodidad.
								</p>
							</div>

							{/* Notas importantes */}
							<div className="text-xs text-gray-500 dark:text-gray-400 space-y-2">
								<div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
									<p className="font-medium text-blue-700 dark:text-blue-300 mb-2">Notas importantes:</p>
									<p className="mb-1">• Los cambios en esta configuración se aplicarán inmediatamente.</p>
									<p>
										• Si cierra sesión manualmente, deberá iniciar sesión nuevamente independientemente de esta
										configuración.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Card>
	)
}
