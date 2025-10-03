import { supabase, REDIRECT_URL } from './config'
import type { User, AuthError } from '@supabase/supabase-js'
import { SESSION_TIMEOUT_OPTIONS } from '@shared/hooks/useSessionTimeout'

// Normaliza nombres propios: trim, colapsa espacios y capitaliza cada palabra
function normalizeDisplayName(rawName?: string | null): string | null {
  if (rawName == null) return null
  const trimmed = String(rawName).trim().replace(/\s+/g, ' ')
  if (trimmed === '') return null
  return trimmed
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
}

export interface AuthResponse {
	user: User | null
	error: AuthError | null
}

export interface UserProfile {
	id: string
	email: string
	role: 'owner' | 'employee' | 'residente'
	created_at: string
	updated_at: string
	assigned_branch?: string | null
	display_name?: string | null
	estado?: 'pendiente' | 'aprobado'
	// Debe alinear con BD (text)
	phone?: string | null
}

// Sign up with email and password - ENHANCED WITH PROPER EMAIL VERIFICATION
export const signUp = async (
	email: string,
	password: string,
	displayName?: string,
	phone?: string,
): Promise<AuthResponse> => {
	try {
		console.log('Attempting to sign up user:', email)
		console.log('Using redirect URL:', `${REDIRECT_URL}/auth/callback`)

		const normalizedDisplayName = normalizeDisplayName(displayName ?? null)

		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				// Email confirmation is required
				emailRedirectTo: `${REDIRECT_URL}/auth/callback`,
				data: {
					email_confirm: true,
					display_name: normalizedDisplayName,
					phone: phone || null,
				},
			},
		})

		if (error) {
			console.error('Signup error:', error)
			return { user: null, error }
		}

		console.log('Signup successful, user created:', data.user?.email)
		console.log('Email confirmed at signup:', data.user?.email_confirmed_at)
		console.log('User confirmation sent at:', data.user?.confirmation_sent_at)

		// Note: Profile creation is handled by the database trigger
		// No need to manually create profile here

		return { user: data.user, error: null }
	} catch (err: unknown) {
		console.error('Unexpected signup error:', err)
		return {
			user: null,
			error: {
				message: 'An unexpected error occurred during signup',
				name: 'UnexpectedError',
			} as AuthError,
		}
	}
}

// Sign in with email and password - ENHANCED WITH EMAIL VERIFICATION CHECK
export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
	try {
		console.log('Attempting to sign in user:', email)

		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		})

		if (error) {
			console.error('Signin error:', error)
			return { user: null, error }
		}

		// CRITICAL: Check if email is verified
		if (data.user && !data.user.email_confirmed_at) {
			console.log('User email not confirmed:', email)
			// Return the user but with a custom error to indicate email not confirmed
			return {
				user: data.user,
				error: {
					message: 'Email not confirmed. Please check your email and click the confirmation link.',
					name: 'EmailNotConfirmed',
				} as AuthError,
			}
		}

		console.log('Signin successful for verified user:', email)
		return { user: data.user, error: null }
	} catch (err) {
		console.error('Unexpected signin error:', err)
		return {
			user: null,
			error: {
				message: 'An unexpected error occurred during signin',
				name: 'UnexpectedError',
			} as AuthError,
		}
	}
}

// Sign out
export const signOut = async (): Promise<{ error: AuthError | null }> => {
	try {
		console.log('🧹 Iniciando limpieza de storage...')

		// Limpiar TODO el sessionStorage
		sessionStorage.clear()
		console.log('✅ sessionStorage completamente limpiado')

		// Limpiar cookies
		document.cookie.split(';').forEach(function (c) {
			document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
		})
		console.log('✅ Cookies limpiadas')

		// Intentar logout con Supabase
		console.log('🔐 Intentando logout con Supabase...')
		const { error } = await supabase.auth.signOut()

		// Limpiar sessionStorage nuevamente después del logout
		sessionStorage.clear()
		console.log('✅ sessionStorage limpiado nuevamente')

		if (error) {
			console.log('⚠️ Logout error (but continuing cleanup):', error)
		}

		return { error: null }
	} catch (err) {
		console.error('💥 Unexpected signout error:', err)
		// Aún así, limpiar todo
		sessionStorage.clear()
		return { error: null }
	}
}

// Get user session timeout setting
export const getUserSessionTimeout = async (userId: string): Promise<number> => {
	try {
		const { data, error } = await supabase
			.from('user_settings')
			.select('session_timeout')
			.eq('id', userId)
			.maybeSingle()

		if (error) {
			// If no settings found, create with default timeout
			if (error.code === 'PGRST116') {
				const defaultTimeout = 15 // 15 minutes default
				const { error: insertError } = await supabase
					.from('user_settings')
					.insert({ id: userId, session_timeout: defaultTimeout })

				if (insertError) {
					console.error('Error creating user settings:', insertError)
				}
				return defaultTimeout
			}
			console.error('Error fetching user session timeout:', error)
			return 15 // Default to 15 minutes
		}

		// Validate the timeout value
		if (data && SESSION_TIMEOUT_OPTIONS.includes(data.session_timeout)) {
			return data.session_timeout
		}

		return 15 // Default to 15 minutes
	} catch (err) {
		console.error('Error getting user session timeout:', err)
		return 15 // Default to 15 minutes
	}
}

// Update user session timeout setting
export const updateUserSessionTimeout = async (userId: string, minutes: number): Promise<{ error: unknown | null }> => {
	try {
		// Validate the timeout value
		if (!SESSION_TIMEOUT_OPTIONS.includes(minutes)) {
			return { error: new Error('Invalid session timeout value') }
		}

		const { error } = await supabase.from('user_settings').upsert({
			id: userId,
			session_timeout: minutes,
			updated_at: new Date().toISOString(),
		})

		return { error }
	} catch (err) {
		console.error('Error updating user session timeout:', err)
		return { error: err }
	}
}

// Send password reset email - FIXED WITH PROPER REDIRECT URL
export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
	try {
		console.log('Sending password reset email to:', email)
		console.log('Using redirect URL:', `${REDIRECT_URL}/auth/callback?type=recovery`)

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${REDIRECT_URL}/auth/callback?type=recovery`,
		})

		if (error) {
			console.error('Reset password error:', error)
		} else {
			console.log('Password reset email sent successfully')
		}

		return { error }
	} catch (err) {
		console.error('Unexpected reset password error:', err)
		return {
			error: {
				message: 'An unexpected error occurred while sending reset email',
				name: 'UnexpectedError',
			} as AuthError,
		}
	}
}

// Resend email confirmation - IMPROVED VERSION WITH PROPER REDIRECT
export const resendConfirmation = async (email: string): Promise<{ error: AuthError | null }> => {
	try {
		console.log('Attempting to resend confirmation email to:', email)
		console.log('Using redirect URL:', `${REDIRECT_URL}/auth/callback`)

		const { error } = await supabase.auth.resend({
			type: 'signup',
			email,
			options: {
				emailRedirectTo: `${REDIRECT_URL}/auth/callback`,
			},
		})

		if (error) {
			console.error('Resend confirmation error:', error)
		} else {
			console.log('Confirmation email resent successfully')
		}

		return { error }
	} catch (err) {
		console.error('Unexpected resend confirmation error:', err)
		return {
			error: {
				message: 'An unexpected error occurred while resending confirmation',
				name: 'UnexpectedError',
			} as AuthError,
		}
	}
}

// Update password after reset - NEW FUNCTION
export const updatePassword = async (newPassword: string): Promise<{ error: AuthError | null }> => {
	try {
		console.log('Attempting to update password')

		const { error } = await supabase.auth.updateUser({
			password: newPassword,
		})

		if (error) {
			console.error('Update password error:', error)
		} else {
			console.log('Password updated successfully')
		}

		return { error }
	} catch (err) {
		console.error('Unexpected update password error:', err)
		return {
			error: {
				message: 'An unexpected error occurred while updating password',
				name: 'UnexpectedError',
			} as AuthError,
		}
	}
}

// Update user metadata including display name
export const updateUserMetadata = async (metadata: {
	[key: string]: unknown
}): Promise<{ error: AuthError | null }> => {
	try {
		console.log('Attempting to update user metadata:', metadata)

		const { error } = await supabase.auth.updateUser({
			data: metadata,
		})

		if (error) {
			console.error('Update user metadata error:', error)
		} else {
			console.log('User metadata updated successfully')
		}

		return { error }
	} catch (err) {
		console.error('Unexpected update user metadata error:', err)
		return {
			error: {
				message: 'An unexpected error occurred while updating user metadata',
				name: 'UnexpectedError',
			} as AuthError,
		}
	}
}

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
	try {
		const {
			data: { user },
		} = await supabase.auth.getUser()
		return user
	} catch (err) {
		console.error('Error getting current user:', err)
		return null
	}
}

// Get user profile with role - ENHANCED WITH BETTER ERROR HANDLING AND CACHING
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
	try {
		console.log('Fetching profile for user ID:', userId)

		const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

		if (error) {
			console.error('Error fetching user profile:', error)

			// If profile doesn't exist, this might be a new user
			if (error.code === 'PGRST116') {
				console.warn('Profile not found for user:', userId)
				return null
			}

			// For other errors, throw to be handled by the calling code
			throw error
		}

		console.log('Profile fetched successfully:', data)
		return data as UserProfile
	} catch (err) {
		console.error('Error fetching user profile:', err)
		// Return null instead of throwing to prevent crashes
		return null
	}
}

// Update user profile
export const updateUserProfile = async (
	userId: string,
	updates: Partial<Omit<UserProfile, 'id' | 'created_at'>>,
): Promise<{ error: AuthError | null }> => {
	try {
		// Normalizar phone si viene presente
		let normalizedPhone: string | null | undefined = updates.phone
		if (typeof normalizedPhone !== 'undefined') {
			normalizedPhone = normalizedPhone === null ? null : String(normalizedPhone).replace(/\D/g, '')
		}

		// Normalizar display_name si viene presente
		const normalizedDisplayName =
			updates.display_name !== undefined ? normalizeDisplayName(updates.display_name ?? null) : undefined

		// First update the profile in the profiles table
		const { error: profileError } = await supabase
			.from('profiles')
			.update({
				...updates,
				...(normalizedDisplayName !== undefined ? { display_name: normalizedDisplayName } : {}),
				...(typeof normalizedPhone !== 'undefined' ? { phone: normalizedPhone } : {}),
				updated_at: new Date().toISOString(),
			})
			.eq('id', userId)

		if (profileError) {
			console.error('Error updating profile:', profileError)
			return { error: profileError as unknown as AuthError }
		}

		// If display_name or phone is being updated, also update it in auth.users metadata
		if (updates.display_name !== undefined || typeof normalizedPhone !== 'undefined') {
			// Get current user metadata
			const { data: userData } = await supabase.auth.getUser()

			if (userData?.user) {
				// Update the display_name in user metadata
				const { error: metadataError } = await updateUserMetadata({
					...userData.user.user_metadata,
					display_name:
						normalizedDisplayName !== undefined
							? normalizedDisplayName
							: userData.user.user_metadata?.display_name ?? null,
					phone: typeof normalizedPhone !== 'undefined' ? normalizedPhone : userData.user.user_metadata?.phone ?? null,
				})

				if (metadataError) {
					console.error('Error updating user metadata:', metadataError)
					return { error: metadataError }
				}
			}
		}

		return { error: null }
	} catch (err) {
		console.error('Unexpected error updating profile:', err)
		return {
			error: {
				message: 'An unexpected error occurred while updating profile',
				name: 'UnexpectedError',
			} as AuthError,
		}
	}
}

// Check if user has specific role
export const hasRole = async (userId: string, role: 'owner' | 'employee' | 'residente'): Promise<boolean> => {
	try {
		const profile = await getUserProfile(userId)
		return profile?.role === role || false
	} catch (err) {
		console.error('Error checking user role:', err)
		return false
	}
}

// Check if user is owner
export const isOwner = async (userId: string): Promise<boolean> => {
	return hasRole(userId, 'owner')
}

// Check if user is employee
export const isEmployee = async (userId: string): Promise<boolean> => {
	return hasRole(userId, 'employee')
}

// Check if user is admin
export const isResidente = async (userId: string): Promise<boolean> => {
	return hasRole(userId, 'residente')
}

// Admin function to completely delete a user (for development/testing)
export const adminDeleteUser = async (email: string): Promise<{ error: AuthError | null }> => {
	try {
		console.log('Admin deleting user:', email)

		// This requires admin privileges and should only be used in development
		// In production, use Supabase dashboard or admin API
		const { error } = await supabase.auth.admin.deleteUser(
			email, // This should be the user ID, but we're using email for simplicity
		)

		if (error) {
			console.error('Admin delete user error:', error)
		} else {
			console.log('User deleted successfully')
		}

		return { error }
	} catch (err) {
		console.error('Unexpected admin delete user error:', err)
		return {
			error: {
				message: 'An unexpected error occurred while deleting user',
				name: 'UnexpectedError',
			} as AuthError,
		}
	}
}

// Export supabase for direct access in components that need it
export { supabase }
