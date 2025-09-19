import React, { useState, useEffect } from 'react'
import { Card } from '@shared/components/ui/card'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import { useAuth } from '@app/providers/AuthContext'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { updatePassword, updateUserProfile, updateUserMetadata } from '@lib/supabase/auth'
import { useToast } from '@shared/hooks/use-toast'
import { Eye, EyeOff, User, Key, Save, Loader2, CheckCircle, AlertCircle, Phone as PhoneIcon } from 'lucide-react'
import { SessionTimeoutSettings } from '@features/dashboard/settings/SessionTimeoutSettings'

export const SettingsSection: React.FC = () => {
	const { user, refreshUser } = useAuth()
	const { profile, refetch: refetchProfile } = useUserProfile()
	const { toast } = useToast()

	const [email, setEmail] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [phone, setPhone] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')

	const [showNewPassword, setShowNewPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
	const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

	const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false)
	const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false)

	const [profileError, setProfileError] = useState('')
	const [passwordError, setPasswordError] = useState('')

	// Load user data
	useEffect(() => {
		if (user) {
			setEmail(user.email || '')
			// Check if display_name exists in user metadata
			const userDisplayName = user.user_metadata?.display_name
			if (userDisplayName && (!profile?.display_name || userDisplayName !== displayName)) {
				setDisplayName(userDisplayName)
			}
		}

		if (profile?.display_name && profile.display_name !== displayName) {
			setDisplayName(profile.display_name)
		}

		if (profile && (profile as any).phone != null && String((profile as any).phone) !== phone) {
			setPhone(String((profile as any).phone))
		}
	}, [user, profile])

	const handleProfileUpdate = async (e: React.FormEvent) => {
		e.preventDefault()
		setProfileError('')
		setProfileUpdateSuccess(false)

		if (!user) return

		setIsUpdatingProfile(true)

		try {
			// Update profile in Supabase - this will trigger the synchronization
			const normalizedPhone = phone.replace(/\D/g, '')
			const { error } = await updateUserProfile(user.id, {
				display_name: displayName,
				phone: normalizedPhone,
			})

			if (error) {
				throw error
			}

			// Also update the user metadata directly to ensure both are in sync
			const { error: metadataError } = await updateUserMetadata({
				display_name: displayName,
				phone: phone.replace(/\D/g, ''),
			})

			if (metadataError) {
				console.warn('Warning: User metadata update failed, but profile was updated:', metadataError)
				// Continue anyway since the database trigger should handle the sync
			}

			// Refresh user data
			await refreshUser()
			await refetchProfile()

			setProfileUpdateSuccess(true)
			toast({
				title: '✅ Perfil actualizado',
				description: 'Tu información de perfil ha sido actualizada exitosamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// Reset success message after 3 seconds
			setTimeout(() => {
				setProfileUpdateSuccess(false)
			}, 3000)
		} catch (error) {
			console.error('Error updating profile:', error)
			setProfileError('Error al actualizar el perfil. Inténtalo de nuevo.')
			toast({
				title: '❌ Error al actualizar',
				description: 'Hubo un problema al actualizar tu perfil. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setIsUpdatingProfile(false)
		}
	}

	const handlePasswordUpdate = async (e: React.FormEvent) => {
		e.preventDefault()
		setPasswordError('')
		setPasswordUpdateSuccess(false)

		// Validate passwords
		if (newPassword.length < 6) {
			setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.')
			return
		}

		if (newPassword !== confirmPassword) {
			setPasswordError('Las contraseñas no coinciden.')
			return
		}

		setIsUpdatingPassword(true)

		try {
			// Update password in Supabase
			const { error } = await updatePassword(newPassword)

			if (error) {
				throw error
			}

			setPasswordUpdateSuccess(true)
			setNewPassword('')
			setConfirmPassword('')

			toast({
				title: '✅ Contraseña actualizada',
				description: 'Tu contraseña ha sido actualizada exitosamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// Reset success message after 3 seconds
			setTimeout(() => {
				setPasswordUpdateSuccess(false)
			}, 3000)
		} catch (error) {
			console.error('Error updating password:', error)
			setPasswordError('Error al actualizar la contraseña. Verifica tu contraseña actual e inténtalo de nuevo.')
			toast({
				title: '❌ Error al actualizar',
				description: 'Hubo un problema al actualizar tu contraseña. Inténtalo de nuevo.',
				variant: 'destructive',
			})
		} finally {
			setIsUpdatingPassword(false)
		}
	}

	return (
		<div>
			<div className="mb-4 sm:mb-6">
				<h1 className="text-2xl sm:text-3xl font-bold mb-2">Ajustes de Usuario</h1>
				<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full" />
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Profile Information */}
				<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg">
					<div className="p-6">
						<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
							<User className="text-primary" />
							Información de Perfil
						</h2>

						<form onSubmit={handleProfileUpdate} className="space-y-4">
							<div>
								<Label htmlFor="email">Correo Electrónico</Label>
								<div className="relative">
									<Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
								</div>
								<p className="text-xs text-gray-500 mt-1">El correo electrónico no se puede cambiar.</p>
							</div>

							<div>
								<Label htmlFor="displayName">Nombre para mostrar</Label>
								<div className="relative">
									<User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
									<Input
										id="displayName"
										type="text"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										placeholder="Tu nombre para mostrar"
									/>
								</div>
								<p className="text-xs text-gray-500 mt-1">Este nombre se mostrará en toda la aplicación.</p>
							</div>

							<div>
								<Label htmlFor="phone">Teléfono</Label>
								<div className="relative">
									<PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
									<Input
										id="phone"
										type="tel"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										placeholder="Ej: 0412-1234567 o +584121234567"
									/>
								</div>
								<p className="text-xs text-gray-500 mt-1">Se usará para contacto interno.</p>
							</div>

							{profileError && (
								<div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded flex items-center gap-2">
									<AlertCircle className="h-5 w-5" />
									<span>{profileError}</span>
								</div>
							)}

							{profileUpdateSuccess && (
								<div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded flex items-center gap-2">
									<CheckCircle className="h-5 w-5" />
									<span>Perfil actualizado exitosamente</span>
								</div>
							)}

							<Button type="submit" className="w-full bg-primary hover:bg-primary/80" disabled={isUpdatingProfile}>
								{isUpdatingProfile ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Actualizando...
									</>
								) : (
									<>
										<Save className="mr-2 h-4 w-4" />
										Guardar Cambios
									</>
								)}
							</Button>
						</form>
					</div>
				</Card>

				{/* Password Update */}
				<Card className="hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 transition-transform duration-300 shadow-lg">
					<div className="p-6">
						<h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
							<Key className="text-primary" />
							Cambiar Contraseña
						</h2>

						<form onSubmit={handlePasswordUpdate} className="space-y-4">
							{/* Hidden username field for accessibility and password managers */}
							<input
								type="text"
								name="username"
								value={email}
								autoComplete="username"
								style={{ display: 'none' }}
								readOnly
							/>

							<div>
								<Label htmlFor="newPassword">Nueva Contraseña</Label>
								<div className="relative">
									<Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
									<Input
										id="newPassword"
										type={showNewPassword ? 'text' : 'password'}
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										placeholder="Nueva contraseña"
										autoComplete="new-password"
									/>
									<button
										type="button"
										onClick={() => setShowNewPassword(!showNewPassword)}
										className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
									>
										{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>
								<p className="text-xs text-gray-500 mt-1">Debe tener al menos 6 caracteres para mayor seguridad.</p>
							</div>

							<div>
								<Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
								<div className="relative">
									<Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" />
									<Input
										id="confirmPassword"
										type={showConfirmPassword ? 'text' : 'password'}
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										placeholder="Confirmar nueva contraseña"
										autoComplete="new-password"
									/>
									<button
										type="button"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
										className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
									>
										{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>
								<p className="text-xs text-gray-500 mt-1">Repite la contraseña para confirmar que es correcta.</p>
							</div>

							{passwordError && (
								<div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded flex items-center gap-2">
									<AlertCircle className="h-5 w-5" />
									<span>{passwordError}</span>
								</div>
							)}

							{passwordUpdateSuccess && (
								<div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded flex items-center gap-2">
									<CheckCircle className="h-5 w-5" />
									<span>Contraseña actualizada exitosamente</span>
								</div>
							)}

							<Button type="submit" className="w-full bg-primary hover:bg-primary/80" disabled={isUpdatingPassword}>
								{isUpdatingPassword ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Actualizando...
									</>
								) : (
									<>
										<Save className="mr-2 h-4 w-4" />
										Actualizar Contraseña
									</>
								)}
							</Button>
						</form>
						<div className="mt-2">
							<ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-400 text-sm">
								<li>Utiliza contraseñas fuertes con al menos incluyendo números y símbolos.</li>
								<li>No compartas tu contraseña con nadie.</li>
								<li>Cambia tu contraseña regularmente para mayor seguridad.</li>
								<li>Cierra sesión cuando utilices dispositivos compartidos.</li>
							</ul>
						</div>
					</div>
				</Card>
			</div>

			{/* Session Timeout Settings */}
			<div className="mt-6">
				<SessionTimeoutSettings />
			</div>
		</div>
	)
}
