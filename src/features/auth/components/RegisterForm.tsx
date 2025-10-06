import { UserRound, Eye, EyeOff, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '@/services/supabase/auth/auth'
import { emailExists as getUserByEmail } from '@/services/supabase/auth/user-management' // debe devolver { exists: boolean, error: any }
import Aurora from '@shared/components/ui/Aurora'
import FadeContent from '@shared/components/ui/FadeContent'
import type { User } from '@supabase/supabase-js'

function RegisterForm() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [phone, setPhone] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const [rateLimitError, setRateLimitError] = useState(false)
	const [retryCountdown, setRetryCountdown] = useState(0)

	// UX: pre-check de email
	const [checkingEmail, setCheckingEmail] = useState(false)
	const [emailTaken, setEmailTaken] = useState<boolean | null>(null)
	const lastCheckedRef = useRef<string>('')

	const navigate = useNavigate()

	const normalizePhone = (value: string) => value.replace(/\D/g, '')
	const normalizeEmail = (v: string) => v.trim().toLowerCase()

	const startRetryCountdown = (seconds: number) => {
		setRetryCountdown(seconds)
		const interval = setInterval(() => {
			setRetryCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(interval)
					setRateLimitError(false)
					return 0
				}
				return prev - 1
			})
		}, 1000)
	}

	// Pre-check en blur (rápido, sin spam)
	const checkEmail = useCallback(async (value: string) => {
		const cleaned = normalizeEmail(value)
		if (!cleaned || cleaned === lastCheckedRef.current) return
		setCheckingEmail(true)
		setEmailTaken(null)
		try {
			const { exists, error: preErr } = await getUserByEmail(cleaned)
			if (preErr) {
				// No reveles nada si falla el pre-check
				setEmailTaken(null)
			} else {
				setEmailTaken(!!exists)
			}
			lastCheckedRef.current = cleaned
		} catch {
			setEmailTaken(null)
		} finally {
			setCheckingEmail(false)
		}
	}, [])

	const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		// Reset
		setError('')
		setMessage('')
		setRateLimitError(false)

		// Validar nombre de display obligatorio
		if (!displayName.trim()) {
			setError('El nombre para mostrar es obligatorio.')
			return
		}

		// Validar teléfono obligatorio
		const normalizedPhone = normalizePhone(phone)
		if (!normalizedPhone) {
			setError('El número de teléfono es obligatorio.')
			return
		}

		if (password !== confirmPassword) {
			setError('Las contraseñas no coinciden.')
			return
		}
		if (password.length < 6) {
			setError('La contraseña debe tener al menos 6 caracteres.')
			return
		}

		try {
			setLoading(true)

			const cleanedEmail = normalizeEmail(email)
			console.log('Attempting to register user:', cleanedEmail)

			// Pre-check de UX (opcional, pero útil). No es seguridad, el hook es quien manda.
			try {
				const { exists, error: precheckErr } = await getUserByEmail(cleanedEmail)
				if (precheckErr) {
					setError('No se pudo validar el correo en este momento. Inténtalo de nuevo.')
					setLoading(false)
					return
				}
				if (exists) {
					setError('Ya existe una cuenta con este correo electrónico.')
					setLoading(false)
					return
				}
			} catch (checkErr) {
				console.error('Unexpected error on email existence check:', checkErr)
				setError('No se pudo validar el correo en este momento. Inténtalo de nuevo.')
				setLoading(false)
				return
			}

			// Signup — aquí el HOOK bloqueará duplicados reales con un 400 "User already registered"
			const { user, error: signUpError } = await signUp(cleanedEmail, password, displayName.trim(), normalizedPhone)

			if (signUpError) {
				console.error('Registration error:', signUpError)

				const msg = signUpError.message || ''
				if (msg.includes('User already registered')) {
					// Este viene DIRECTO del hook before-user-created
					setError('Ya existe una cuenta con este correo electrónico.')
				} else if (msg.includes('Password should be at least')) {
					setError('La contraseña es muy débil.')
				} else if (msg.includes('Unable to validate email address') || msg.includes('Invalid email')) {
					setError('Correo electrónico inválido.')
				} else if (msg.includes('Signup is disabled')) {
					setError('El registro está temporalmente deshabilitado. Contacta al administrador.')
				} else if (msg.includes('email rate limit exceeded') || msg.includes('over_email_send_rate_limit')) {
					setRateLimitError(true)
					setError(
						'Se ha alcanzado el límite de envío de correos electrónicos. Este es un límite temporal del servicio de email.',
					)
					startRetryCountdown(300)
				} else if (msg.includes('Error sending confirmation email') || msg.includes('535 5.7.8')) {
					setError(
						'Error temporal del servicio de email. Por favor, contacta al administrador o intenta de nuevo más tarde.',
					)
				} else {
					setError('Error al crear la cuenta. Inténtalo de nuevo.')
				}
				return
			}

			// Si llegamos aquí, NO hubo error => registro válido (pendiente de verificación)
			if (user) {
				console.log('User registered successfully:', user.email)
				console.log('Email confirmed at registration:', (user as User).email_confirmed_at)
				console.log('Confirmation sent at:', (user as User).confirmation_sent_at)

				setMessage(
					'¡Cuenta creada exitosamente! Se ha enviado un correo de verificación a tu email. Revisa tu bandeja de entrada y carpeta de spam.',
				)

				try {
					localStorage.setItem('pending_verification_email', cleanedEmail)
				} catch {
					// ignore storage errors
				}

				setTimeout(() => {
					navigate('/email-verification-notice')
				}, 2000)
			} else {
				// Ultra defensivo: si no hay user ni error, algo raro pasó
				setError('No se pudo crear la cuenta. Inténtalo de nuevo.')
			}
		} catch (err: unknown) {
			console.error('Registration error:', err)
			const msg = err instanceof Error ? err.message : ''
			if (msg.includes('email rate limit exceeded') || msg.includes('over_email_send_rate_limit')) {
				setRateLimitError(true)
				setError(
					'Se ha alcanzado el límite de envío de correos electrónicos. Este es un límite temporal del servicio de email.',
				)
				startRetryCountdown(300)
			} else if (msg.includes('Error sending confirmation email') || msg.includes('535 5.7.8')) {
				setError(
					'Error temporal del servicio de email. Por favor, contacta al administrador o intenta de nuevo más tarde.',
				)
			} else {
				setError('Error al crear la cuenta. Inténtalo de nuevo.')
			}
		} finally {
			setLoading(false)
		}
	}

	const formatTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	return (
		<div className="w-screen h-screen relative overflow-hidden bg-gradient-to-br from-black via-black to-black">
			{/* Aurora Background */}
			<Aurora colorStops={['#ec4699', '#750c41', '#ec4699']} blend={0.7} amplitude={1.3} speed={0.3} />

			<div className="relative z-10 w-screen h-screen bg-gradient-to-br from-black/20 via-transparent to-black/30 flex items-center justify-center">
				<FadeContent
					blur={true}
					duration={1000}
					easing="ease-out"
					initialOpacity={0}
					delay={200}
					className="w-full h-full flex items-center justify-center"
				>
					<div className="flex flex-col items-center justify-center md:rounded-xl w-screen h-screen md:h-auto md:w-full md:max-w-xl bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
						<div className="text-center mb-4 flex flex-col items-center justify-center">
							<div
								className="p-4 bg-[#9e1157] rounded-full mb-4 shadow-[0_0_15px_rgba(158,17,87,0.4)] hover:shadow-[0_0_25px_rgba(158,17,87,0.7)] transition-transform duration-1000"
								style={{ animation: 'slowPulse 3s ease-in-out infinite' }}
							>
								<UserRound className="text-white size-16" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Bienvenido a SolHub</h1>
							</div>
							<p className="text-slate-300">Crea una cuenta para continuar</p>
						</div>

						<form className="w-full" onSubmit={handleRegister}>
							<div className="flex flex-col gap-2 mb-4 w-full">
								<p className="text-sm text-slate-300">Correo electrónico: <span className="text-red-400">*</span></p>
								<input
									type="email"
									name="email"
									placeholder="tu@email.com"
									value={email}
									onChange={(e) => {
										setEmail(e.target.value)
										setEmailTaken(null)
									}}
									onBlur={(e) => checkEmail(e.target.value)}
									required
									disabled={loading || rateLimitError}
									className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
									autoComplete="email"
									aria-invalid={emailTaken === true}
									aria-describedby="email-help"
								/>
								<div id="email-help" aria-live="polite" className="text-xs h-5">
									{checkingEmail && <span className="text-slate-300">Verificando…</span>}
									{emailTaken === true && <span className="text-red-300">Ese correo ya está registrado</span>}
									{emailTaken === false && <span className="text-green-300">Disponible</span>}
								</div>

															<div className="flex items-center gap-2">
								<div className="w-full">
									<p className="text-sm text-slate-300">Nombre para mostrar: <span className="text-red-400">*</span></p>
									<input
										type="text"
										name="displayName"
										placeholder="Tu nombre"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										required
										disabled={loading || rateLimitError}
										className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
										autoComplete="name"
									/>
								</div>
								<div className="w-full">
									<p className="text-sm text-slate-300">Número de teléfono: <span className="text-red-400">*</span></p>
									<input
										type="tel"
										name="phone"
										placeholder="04121234567"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										required
										disabled={loading || rateLimitError}
										className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
										autoComplete="tel"
									/>
								</div>
							</div>

								<p className="text-sm text-slate-300">Contraseña: <span className="text-red-400">*</span></p>
								<div className="relative">
									<input
										type={showPassword ? 'text' : 'password'}
										name="password"
										placeholder="••••••••••••••"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										disabled={loading || rateLimitError}
										className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
										autoComplete="new-password"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										disabled={loading || rateLimitError}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-300 hover:text-white disabled:opacity-50 transition-none"
									>
										{showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
									</button>
								</div>

								<p className="text-sm text-slate-300">Confirmar contraseña: <span className="text-red-400">*</span></p>
								<div className="relative">
									<input
										type={showConfirmPassword ? 'text' : 'password'}
										name="confirmPassword"
										placeholder="••••••••••••••"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										required
										disabled={loading || rateLimitError}
										className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
										autoComplete="new-password"
									/>
									<button
										type="button"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										disabled={loading || rateLimitError}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-300 hover:text-white disabled:opacity-50 transition-none"
									>
										{showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
									</button>
								</div>
							</div>

							{error && (
								<div
									className={`border px-4 py-3 rounded mb-4 flex items-start gap-2 ${
										rateLimitError
											? 'bg-yellow-900/80 border-yellow-700 text-yellow-200'
											: 'bg-red-900/80 border-red-700 text-red-200'
									}`}
								>
									{rateLimitError ? (
										<Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
									) : (
										<AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
									)}
									<div className="flex-1">
										<p className="font-medium">{error}</p>
										{rateLimitError && (
											<div className="mt-2 text-sm">
												<p>Esto puede suceder cuando:</p>
												<ul className="list-disc list-inside mt-1 space-y-1">
													<li>Se han enviado muchos correos en poco tiempo</li>
													<li>El servicio de email está temporalmente limitado</li>
												</ul>
												<p className="mt-2 font-medium">Soluciones recomendadas:</p>
												<ul className="list-disc list-inside mt-1 space-y-1">
													<li>Espera unos minutos e intenta de nuevo</li>
													<li>Verifica si ya recibiste un correo de confirmación</li>
													<li>Contacta al administrador si el problema persiste</li>
												</ul>
												{retryCountdown > 0 && (
													<p className="mt-3 font-medium text-yellow-200">
														Podrás intentar de nuevo en: {formatTime(retryCountdown)}
													</p>
												)}
											</div>
										)}
									</div>
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
								disabled={loading || rateLimitError || checkingEmail}
								className="w-full bg-transparent border border-primary text-white rounded-md p-2 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm transform hover:scale-[1.02] active:scale-[0.98]"
							>
								{loading ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										Creando cuenta...
									</>
								) : rateLimitError ? (
									<>
										<Clock className="w-4 h-4" />
										{retryCountdown > 0 ? `Espera ${formatTime(retryCountdown)}` : 'Límite de email alcanzado'}
									</>
								) : checkingEmail ? (
									'Verificando correo…'
								) : (
									'Registrarse'
								)}
							</button>
						</form>

						{/* Footer */}
						<div className="mt-6 text-center flex flex-col gap-2">
							<p className="text-sm text-slate-300">
								¿Ya tienes una cuenta?{' '}
								<Link
									to="/"
									className={`font-medium text-blue-500 hover:text-blue-400 transition-none ${
										loading || rateLimitError ? 'pointer-events-none opacity-50' : ''
									}`}
								>
									Inicia sesión aquí
								</Link>
							</p>
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

export default RegisterForm
