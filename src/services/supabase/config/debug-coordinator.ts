import { supabase } from './config'

/**
 * Utility temporal para debuggear permisos RLS del rol coordinador
 * Solo para desarrollo - remover en producción
 */
export const debugCoordinadorPermissions = async () => {
	try {
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) {
			console.log('❌ [Debug RLS] No hay usuario autenticado')
			return
		}

		// Obtener perfil del usuario
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('id, role, laboratory_id, display_name')
			.eq('id', user.id)
			.single()

		if (profileError) {
			console.error('❌ [Debug RLS] Error obteniendo perfil:', profileError)
			return
		}

		console.log('👤 [Debug RLS] Usuario actual:', {
			id: profile.id,
			role: profile.role,
			laboratory_id: profile.laboratory_id,
			display_name: profile.display_name
		})

		if (profile.role !== 'coordinador') {
			console.log('ℹ️ [Debug RLS] Usuario no es coordinador, saltando verificación')
			return
		}

		console.log('🔍 [Debug RLS] Verificando permisos de coordinador...')

		// Test 1: SELECT en medical_records_clean
		const { data: records, error: recordsError } = await supabase
			.from('medical_records_clean')
			.select('id')
			.limit(1)

		if (recordsError) {
			console.error('❌ [Debug RLS] Error SELECT medical_records:', recordsError.message)
		} else {
			console.log('✅ [Debug RLS] SELECT medical_records: OK')
		}

		// Test 2: COUNT en medical_records_clean (la que estava fallando)
		const { count, error: countError } = await supabase
			.from('medical_records_clean')
			.select('*', { count: 'exact', head: true })

		if (countError) {
			console.error('❌ [Debug RLS] Error COUNT medical_records:', countError.message)
		} else {
			console.log(`✅ [Debug RLS] COUNT medical_records: ${count} registros`)
		}

		// Test 3: SELECT en patients
		const { data: patients, error: patientsError } = await supabase
			.from('patients')
			.select('id')
			.limit(1)

		if (patientsError) {
			console.error('❌ [Debug RLS] Error SELECT patients:', patientsError.message)
		} else {
			console.log('✅ [Debug RLS] SELECT patients: OK')
		}

		// Test 4: SELECT en profiles (otros usuarios del lab)
		const { data: otherProfiles, error: otherProfilesError } = await supabase
			.from('profiles')
			.select('id, role')
			.neq('id', user.id)
			.limit(3)

		if (otherProfilesError) {
			console.error('❌ [Debug RLS] Error SELECT profiles:', otherProfilesError.message)
		} else {
			console.log(`✅ [Debug RLS] SELECT profiles: ${otherProfiles?.length || 0} otros usuarios`)
		}

		console.log('🏁 [Debug RLS] Verificación de permisos completada')

	} catch (error) {
		console.error('💥 [Debug RLS] Error inesperado:', error)
	}
}

/**
 * Función para limpiar canales de realtime conflictivos
 */
export const cleanupRealtimeChannels = () => {
	try {
		// Obtener todos los canales activos
		const channels = supabase.getChannels()
		console.log(`🧹 [Realtime] Limpiando ${channels.length} canales activos`)
		
		// Cerrar todos los canales
		channels.forEach(channel => {
			console.log(`🧹 [Realtime] Cerrando canal: ${channel.topic}`)
			supabase.removeChannel(channel)
		})
		
		console.log('✅ [Realtime] Limpieza completada')
		
		// Verificar estado de conexión
		console.log('📡 [Realtime] Estado después de limpieza:', {
			isConnected: supabase.realtime.isConnected(),
			channels: supabase.getChannels().length
		})
		
	} catch (error) {
		console.error('❌ [Realtime] Error en limpieza:', error)
	}
}

// Solo ejecutar en desarrollo
if (process.env.NODE_ENV === 'development') {
	// Debug automático después de autenticación
	setTimeout(() => {
		debugCoordinadorPermissions()
	}, 2000)
	
	// Limpiar canales huérfanos cada 30 segundos
	setInterval(() => {
		const channelCount = supabase.getChannels().length
		if (channelCount > 10) {
			console.warn(`⚠️ [Realtime] Demasiados canales activos (${channelCount}), limpiando...`)
			cleanupRealtimeChannels()
		}
	}, 30000)
}

// Exportar para uso manual
if (typeof window !== 'undefined') {
	(window as any).debugCoordinadorRLS = debugCoordinadorPermissions
	(window as any).cleanupRealtime = cleanupRealtimeChannels
}