import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ShieldCheck, RefreshCw } from 'lucide-react'
import { updatePassword, supabase } from '@/services/supabase/auth/auth'
import Aurora from '@shared/components/ui/Aurora'
import FadeContent from '@shared/components/ui/FadeContent'

function NewPasswordForm() {
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const [sessionStatus, setSessionStatus] = useState<'checking' | 'valid' | 'invalid'>('checking')
	const navigate = useNavigate()
	const location = useLocation()
	
	// Get recovery data from location state if available
	const recoveryMode = location.state?.recoveryMode
	const recoveryCode = location.state?.recoveryCode

	// Check if user has an active session
	useEffect(() => {
		const checkSession = async () => {
			try {
				console.log('Checking session for password reset...')
				const { data, error } = await supabase.auth.getSession()
				
				if (error) {
					console.error('Session check error:', error)
					setError('Error al verificar la sesión.')
					setSessionStatus('invalid')
					return
				}
				
				if (data.session) {
					console.log('Active session found for password reset')
					setSessionStatus('valid')
					return
				}
				
				// If no session but we have a recovery code, try to exchange it
				if (recoveryMode && recoveryCode) {
					console.log('No session found, but recovery code is available. Attempting to exchange...')
					try {
						const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(recoveryCode)
						
						if (exchangeError) {
							console.error('Error exchanging recovery code for session:', exchangeError)
							// Check if it's a PKCE/grant_type error
							if (exchangeError.message.includes('grant_type') || exchangeError.message.includes('PKCE')) {
								setError('El enlace de recuperación ha expirado o es inválido. Por favor, solicita un nuevo enlace.')
							} else {
								setError('Error al procesar el código de recuperación. Por favor, solicita un nuevo enlace.')
							}
							setSessionStatus('invalid')
							return
						}
						
						if (exchangeData.session) {
							console.log('Successfully exchanged recovery code for session')
							setSessionStatus('valid')
							return
						}
						
						console.error('No session returned after code exchange')
						setError('No se pudo establecer una sesión. Por favor, solicita un nuevo enlace.')
						setSessionStatus('invalid')
					} catch (err) {
						console.error('Unexpected error exchanging code:', err)
						setError('Error inesperado. Por favor, solicita un nuevo enlace de restablecimiento.')
						setSessionStatus('invalid')
					}
					return
				}
				
				console.log('No active session found and no recovery code available')
				setError('No hay una sesión activa. Por favor, solicita un nuevo enlace de restablecimiento.')
				setSessionStatus('invalid')
			} catch (err) {
				console.error('Unexpected error checking session:', err)
				setError('Error inesperado. Por favor, intenta de nuevo.')
				setSessionStatus('invalid')
			}
		}
		
		checkSession()
	}, [recoveryMode, recoveryCode])

	// Redirect to reset password page if session is invalid
	useEffect(() => {
		if (sessionStatus === 'invalid') {
			const timer = setTimeout(() => {
				navigate('/reset-password', { replace: true })
			}, 3000)
			
			return () => clearTimeout(timer)
		}
	}, [sessionStatus, navigate])

	const handlePasswordUpdate = async (e: React.FormEvent) => {
		e.preventDefault()

		if (sessionStatus !== 'valid') {
			setError('No hay una sesión válida para actualizar la contraseña.')
			return
		}

		if (newPassword !== confirmPassword) {
			setError('Las contraseñas no coinciden.')
			return
		}

		if (newPassword.length < 6) {
			setError('La contraseña debe tener al menos 6 caracteres.')
			return
		}

		try {
			setError('')
			setMessage('')
			setLoading(true)

			console.log('Updating password...')
			const { error } = await updatePassword(newPassword)

			if (error) {
				console.error('Password update error:', error)
				if (error.message.includes('Auth session missing')) {
					setError('La sesión ha expirado. Por favor, solicita un nuevo enlace de restablecimiento.')
					setSessionStatus('invalid')
					return
				}
				setError('Error al actualizar la contraseña. Inténtalo de nuevo.')
				return
			}

			console.log('Password updated successfully')
			setMessage('¡Contraseña actualizada exitosamente! Redirigiendo...')

			// Sign out the user after successful password reset
			setTimeout(async () => {
				await supabase.auth.signOut().catch((error) => {
					console.error("Error en signOut:", error);
				});
				navigate('/', { replace: true })
			}, 2000)
		} catch (err) {
			console.error('Password update error:', err)
			setError('Error inesperado al actualizar la contraseña.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="w-screen h-screen relative overflow-hidden bg-gradient-to-br from-black via-black to-black">
			{/* Aurora Background with New Color Palette */}
			<Aurora colorStops={['#ec4699', '#750c41', '#ec4699']} blend={0.7} amplitude={1.3} speed={0.3} />

			{/* Content Container with FadeContent Animation */}
			<div className="relative z-10 w-screen h-screen bg-gradient-to-br from-black/20 via-transparent to-black/30 flex items-center justify-center">
				<FadeContent
					blur={true}
					duration={1000}
					easing="ease-out"
					initialOpacity={0}
					delay={200}
					className="w-full h-full flex items-center justify-center"
				>
					<div className="flex flex-col items-center justify-center md:rounded-xl w-screen h-screen md:h-auto md:w-full md:max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
						<div className="text-center mb-6 flex flex-col items-center justify-center">
							<div
								className="p-4 bg-[#9e1157] rounded-full mb-4 shadow-[0_0_15px_rgba(158,17,87,0.4)] hover:shadow-[0_0_25px_rgba(158,17,87,0.7)] transition-transform duration-1000"
								style={{
									animation: 'slowPulse 3s ease-in-out infinite',
								}}
							>
								<Lock className="text-white size-12" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Nueva Contraseña</h1>
							</div>
							<p className="text-slate-300 text-center">
								Ingresa tu nueva contraseña para completar el restablecimiento.
							</p>
						</div>

						{sessionStatus === 'checking' ? (
							<div className="w-full flex flex-col items-center justify-center">
								<RefreshCw className="text-primary size-12 animate-spin mb-4" />
								<p className="text-slate-300">Verificando sesión...</p>
							</div>
						) : sessionStatus === 'invalid' ? (
							<div className="w-full">
								<div className="bg-red-900/80 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 flex items-center gap-2">
									<AlertCircle className="size-5 flex-shrink-0" />
									<span>{error || 'No hay una sesión válida. Redirigiendo...'}</span>
								</div>
								<div className="w-full flex justify-center">
									<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
								</div>
							</div>
						) : (
							<form onSubmit={handlePasswordUpdate} className="w-full">
								<div className="flex flex-col gap-4 mb-4">
									<div>
										<p className="text-sm text-slate-300">Nueva Contraseña:</p>
										<div className="relative">
											<input
												type={showPassword ? 'text' : 'password'}
												id="newPassword"
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												required
												className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
												placeholder="••••••••••••••••••••"
												autoComplete="new-password"
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-300 hover:text-white disabled:opacity-50 transition-none"
											>
												{showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
											</button>
										</div>
									</div>

									<div>
										<p className="text-sm text-slate-300">Confirmar Contraseña:</p>
										<div className="relative">
											<input
												type={showConfirmPassword ? 'text' : 'password'}
												id="confirmPassword"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												required
												className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
												placeholder="••••••••••••••••••••"
												autoComplete="new-password"
											/>
											<button
												type="button"
												onClick={() => setShowConfirmPassword(!showConfirmPassword)}
												className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-300 hover:text-white disabled:opacity-50 transition-none"
											>
												{showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
											</button>
										</div>
									</div>
								</div>

								{error && (
									<div className="bg-red-900/80 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 flex items-center gap-2">
										<AlertCircle className="size-5 flex-shrink-0" />
										<span>{error}</span>
									</div>
								)}

								{message && (
									<div className="bg-green-900/80 border border-green-700 text-green-200 px-4 py-3 rounded mb-4 flex items-center gap-2">
										<CheckCircle className="size-5 flex-shrink-0" />
										<span>{message}</span>
									</div>
								)}

								<button
									type="submit"
									disabled={loading}
									className="w-full bg-transparent border border-primary text-white rounded-md p-2 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm transform hover:scale-[1.02] active:scale-[0.98]"
								>
									{loading ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											Actualizando...
										</>
									) : (
										'Actualizar Contraseña'
									)}
								</button>
							</form>
						)}

						<div className="mt-4 text-xs text-slate-300">
							<div className="flex items-center gap-2 justify-center">
								<ShieldCheck className="size-4 text-primary" />
								<p>Tu contraseña debe tener al menos 6 caracteres.</p>
							</div>
						</div>
						
						{/* Footer */}
						<div className="mt-6 text-center flex flex-col gap-2">
							<p className="text-white text-sm">
								Desarrollado por{' '}
								<a href="https://www.solware.agency/" className="text-blue-500">
									Solware
								</a>
							</p>
						</div>
					</div>
				</FadeContent>
			</div>
		</div>
	)
}

export default NewPasswordForm