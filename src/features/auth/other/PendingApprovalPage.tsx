import { Clock, ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '@/services/supabase/auth/auth'
import Aurora from '@shared/components/ui/Aurora'
import FadeContent from '@shared/components/ui/FadeContent'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useSecureRedirect } from '@shared/hooks/useSecureRedirect'
import { supabase } from '@/services/supabase/config/config'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Tables } from '@shared/types/types'
import { useQueryClient } from '@tanstack/react-query'

function PendingApprovalPage() {
	const navigate = useNavigate()
	const { profile, isLoading } = useUserProfile()
	const { redirectUser } = useSecureRedirect({ redirectOnMount: false })
	const queryClient = useQueryClient()
	const redirectedRef = useRef(false)

	const handleLogout = async () => {
		await signOut()
		navigate('/')
	}

	// Auto-redirect when the account gets approved (Realtime will update profile)
	useEffect(() => {
		if (!isLoading && profile?.estado === 'aprobado') {
			redirectUser()
		}
	}, [isLoading, profile?.estado, redirectUser])

	// Realtime directo: si el estado cambia a aprobado, redirige
	useEffect(() => {
		if (!profile?.id) return
		const channel = supabase
			.channel(`realtime-pending-approval-${profile.id}`)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
				(payload: RealtimePostgresChangesPayload<Tables<'profiles'>>) => {
					console.log('[RT][PendingApproval] change payload:', payload)
					const next = (payload?.new as Tables<'profiles'>) ?? null
					if (next?.estado === 'aprobado') {
						// Actualizamos la caché antes de redirigir para que useSecureRedirect vea el estado correcto
						queryClient.setQueryData(['userProfile', profile.id], next)
						if (!redirectedRef.current) {
							redirectedRef.current = true
							setTimeout(() => redirectUser(), 0)
						}
					}
				},
			)
			.subscribe((status) => console.log('[RT][PendingApproval] channel status:', status))

		return () => {
			supabase.removeChannel(channel)
		}
	}, [profile?.id, redirectUser])

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
								className="p-4 bg-orange-500 rounded-full mb-4 shadow-[0_0_15px_rgba(245,101,101,0.4)] hover:shadow-[0_0_25px_rgba(245,101,101,0.7)] transition-transform duration-1000"
								style={{
									animation: 'slowPulse 3s ease-in-out infinite',
								}}
							>
								<Clock className="text-white size-12" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Cuenta Pendiente de Aprobación</h1>
							</div>
							<p className="text-slate-300 text-center">Tu cuenta está pendiente de aprobación por un administrador.</p>
						</div>

						<div className="w-full mb-6">
							<div className="bg-orange-900/50 border border-orange-700/50 text-orange-200 px-4 py-3 rounded mb-4">
								<p className="text-sm">
									Aunque hayas verificado tu correo electrónico, necesitas la aprobación de un administrador para
									acceder al sistema.
								</p>
							</div>

							<div className="space-y-4 text-slate-300 text-sm">
								<p>
									<strong>¿Qué significa esto?</strong>
								</p>
								<ul className="list-disc list-inside space-y-2">
									<li>Tu cuenta ha sido creada correctamente</li>
									<li>Un administrador debe aprobar tu acceso al sistema</li>
									<li>Recibirás acceso una vez que tu cuenta sea aprobada</li>
									<li>Puedes contactar al administrador para acelerar el proceso</li>
								</ul>
							</div>
						</div>

						<div className="text-center space-y-3">
							<button
								onClick={handleLogout}
								className="flex items-center justify-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-none mx-auto"
							>
								<ArrowLeft size={16} />
								Cerrar sesión e intentar más tarde
							</button>
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

export default PendingApprovalPage