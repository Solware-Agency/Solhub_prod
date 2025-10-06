import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { resetPassword } from '@/services/supabase/auth/auth'
import Aurora from '@shared/components/ui/Aurora'
import FadeContent from '@shared/components/ui/FadeContent'

function PasswordResetForm() {
	const [email, setEmail] = useState('')
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const navigate = useNavigate()

	const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		try {
			setMessage('')
			setError('')
			setLoading(true)

			console.log('Sending password reset email to:', email)

			const { error: resetError } = await resetPassword(email)

			if (resetError) {
				console.error('Reset password error:', resetError)
				if (resetError.message.includes('Unable to validate email address')) {
					setError('Correo electrónico inválido.')
				} else if (resetError.message.includes('For security purposes')) {
					setError('Por seguridad, solo se puede enviar un correo de restablecimiento cada 60 segundos.')
				} else if (resetError.message.includes('Email rate limit exceeded')) {
					setError('Demasiados intentos. Espera un momento antes de intentar de nuevo.')
				} else if (resetError.message.includes('User not found')) {
					setError('No existe una cuenta con este correo electrónico.')
				} else {
					setError('Error al enviar el correo de restablecimiento. Inténtalo de nuevo.')
				}
				return
			}

			setMessage('Revisa tu correo electrónico para obtener instrucciones de restablecimiento de contraseña.')
		} catch (err: any) {
			console.error('Reset password error:', err)
			setError('Error al enviar el correo de restablecimiento. Inténtalo de nuevo.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="w-screen h-screen relative overflow-hidden bg-gradient-to-br from-black via-black to-black">
			{/* Aurora Background with New Color Palette */}
			<Aurora colorStops={['#ec4699', '#750c41', '#ec4699']} blend={0.7} amplitude={1.3} speed={0.3} />

			{/* Login Form Container with FadeContent Animation */}
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
						<div className="text-center mb-4 flex flex-col items-center justify-center">
							<div
								className="p-4 bg-[#9e1157] rounded-full mb-4 shadow-[0_0_15px_rgba(158,17,87,0.4)] hover:shadow-[0_0_25px_rgba(158,17,87,0.7)] transition-transform duration-1000"
								style={{
									animation: 'slowPulse 3s ease-in-out infinite',
								}}
							>
								<Lock className="text-white size-16" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Restablecer Contraseña</h1>
							</div>
							<p className="text-slate-300">Ingresa tu correo electrónico para recibir instrucciones</p>
						</div>

						<form className="w-full" onSubmit={handleResetPassword}>
							<div className="flex flex-col gap-2 mb-4 w-full">
								<p className="text-sm text-slate-300">Correo electrónico:</p>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-300" />
									<input
										type="email"
										name="email"
										placeholder="tu@email.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										disabled={loading}
										className="w-full px-4 py-3 pl-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
										autoComplete="email"
									/>
								</div>
							</div>

							{error && (
								<div className="bg-red-900/80 border border-red-700 text-red-200 px-4 py-3 rounded mb-4 backdrop-blur-sm flex items-center gap-2">
									<AlertCircle className="size-5 flex-shrink-0" />
									<span>{error}</span>
								</div>
							)}

							{message && (
								<div className="bg-green-900/80 border border-green-700 text-green-200 px-4 py-3 rounded mb-4 backdrop-blur-sm flex items-center gap-2">
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
										Enviando...
									</>
								) : (
									'Enviar Correo de Restablecimiento'
								)}
							</button>
						</form>

						{/* Footer */}
						<div className="mt-6 text-center flex flex-col gap-2">
							<button
								onClick={() => navigate('/')}
								className={`flex items-center justify-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-none ${
									loading ? 'pointer-events-none opacity-50' : ''
								}`}
							>
								<ArrowLeft size={16} />
								Volver al inicio de sesión
							</button>
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

export default PasswordResetForm