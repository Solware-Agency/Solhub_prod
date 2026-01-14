// =====================================================================
// SERVICIO DE IDENTIFICACIONES - NUEVO SISTEMA
// =====================================================================
// Servicios para manejar la tabla identificaciones
// NO modifica código existente, solo agrega nuevas funciones
// =====================================================================

import { supabase } from '@services/supabase/config/config'

// =====================================================================
// TIPOS
// =====================================================================

export interface Identificacion {
	id: string
	laboratory_id: string
	paciente_id: string
	tipo_documento: 'V' | 'E' | 'J' | 'C' | 'pasaporte'
	numero: string
	created_at: string | null
	updated_at: string | null
}

export interface IdentificacionInsert {
	paciente_id: string
	tipo_documento: 'V' | 'E' | 'J' | 'C' | 'pasaporte'
	numero: string
	laboratory_id?: string // Opcional, se obtiene automáticamente si no se proporciona
}

export interface IdentificacionUpdate {
	tipo_documento?: 'V' | 'E' | 'J' | 'C' | 'pasaporte'
	numero?: string
}

// =====================================================================
// FUNCIONES HELPER
// =====================================================================

/**
 * Obtener laboratory_id del usuario autenticado
 * Helper function para multi-tenant
 */
const getUserLaboratoryId = async (): Promise<string> => {
	try {
		const {
			data: { user },
		} = await supabase.auth.getUser()
		if (!user) throw new Error('Usuario no autenticado')

		const { data: profile, error } = await supabase.from('profiles').select('laboratory_id').eq('id', user.id).single()

		if (error || !profile) {
			throw new Error('Usuario no tiene laboratorio asignado')
		}

		const laboratoryId = (profile as { laboratory_id?: string }).laboratory_id

		if (!laboratoryId) {
			throw new Error('Usuario no tiene laboratorio asignado')
		}

		return laboratoryId
	} catch (error) {
		console.error('Error obteniendo laboratory_id:', error)
		throw error
	}
}

/**
 * Parsear cédula desde formato completo a tipo y número
 * Ejemplo: "V-12345678" -> { tipo: "V", numero: "12345678" }
 */
export const parseCedula = (cedula: string): { tipo: 'V' | 'E' | 'J' | 'C'; numero: string } => {
	// Si ya tiene formato "V-12345678"
	const match = cedula.match(/^([VEJC])-(.+)$/)
	if (match) {
		return {
			tipo: match[1] as 'V' | 'E' | 'J' | 'C',
			numero: match[2],
		}
	}

	// Si solo tiene números, asumir V (Venezolano)
	if (/^[0-9]+$/.test(cedula)) {
		return {
			tipo: 'V',
			numero: cedula,
		}
	}

	// Si empieza con letra pero sin guion
	if (cedula.match(/^[VEJC]/i)) {
		const tipo = cedula[0].toUpperCase() as 'V' | 'E' | 'J' | 'C'
		const numero = cedula.replace(/^[VEJC]-?/i, '')
		return { tipo, numero }
	}

	// Por defecto, asumir V
	return {
		tipo: 'V',
		numero: cedula,
	}
}

// =====================================================================
// FUNCIONES DEL SERVICIO
// =====================================================================

/**
 * Buscar paciente por identificación (tipo + número) - MULTI-TENANT
 * SOLO busca en el laboratorio del usuario autenticado
 */
export const findPatientByIdentification = async (
	numero: string,
	tipo: 'V' | 'E' | 'J' | 'C' | 'pasaporte',
): Promise<Identificacion | null> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		const { data, error } = await supabase
			.from('identificaciones' as any)
			.select('*')
			.eq('laboratory_id', laboratoryId)
			.eq('tipo_documento', tipo)
			.eq('numero', numero)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				return null // No encontrado
			}
			throw error
		}

		return data as unknown as Identificacion
	} catch (error) {
		console.error('Error buscando identificación:', error)
		throw error
	}
}

/**
 * Buscar todas las identificaciones de un paciente - MULTI-TENANT
 */
export const getIdentificacionesByPatient = async (pacienteId: string): Promise<Identificacion[]> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		const { data, error } = await supabase
			.from('identificaciones' as any)
			.select('*')
			.eq('laboratory_id', laboratoryId)
			.eq('paciente_id', pacienteId)
			.order('created_at', { ascending: false })

		if (error) {
			throw error
		}

		return (data || []) as unknown as Identificacion[]
	} catch (error) {
		console.error('Error obteniendo identificaciones del paciente:', error)
		throw error
	}
}

/**
 * Crear nueva identificación - MULTI-TENANT
 * Automáticamente asigna laboratory_id del usuario autenticado
 */
export const createIdentification = async (identificacionData: IdentificacionInsert): Promise<Identificacion> => {
	try {
		const laboratoryId = identificacionData.laboratory_id || (await getUserLaboratoryId())

		const { data, error } = await supabase
			.from('identificaciones' as any)
			.insert({
				...identificacionData,
				laboratory_id: laboratoryId,
			} as any)
			.select('*')
			.single()

		if (error) {
			throw error
		}

		console.log('✅ Identificación creada exitosamente:', data)
		return data as unknown as Identificacion
	} catch (error) {
		console.error('❌ Error creando identificación:', error)
		throw error
	}
}

/**
 * Actualizar identificación existente - MULTI-TENANT
 */
export const updateIdentification = async (id: string, updates: IdentificacionUpdate): Promise<Identificacion> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		const { data, error } = await supabase
			.from('identificaciones' as any)
			.update({
				...updates,
				updated_at: new Date().toISOString(),
			} as any)
			.eq('id', id)
			.eq('laboratory_id', laboratoryId) // Asegurar multi-tenant
			.select('*')
			.single()

		if (error) {
			throw error
		}

		console.log('✅ Identificación actualizada exitosamente:', data)
		return data as unknown as Identificacion
	} catch (error) {
		console.error('❌ Error actualizando identificación:', error)
		throw error
	}
}

/**
 * Eliminar identificación - MULTI-TENANT
 * Solo owners/admins pueden eliminar (según RLS)
 */
export const deleteIdentification = async (id: string): Promise<void> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		const { error } = await supabase
			.from('identificaciones' as any)
			.delete()
			.eq('id', id)
			.eq('laboratory_id', laboratoryId) // Asegurar multi-tenant

		if (error) {
			throw error
		}

		console.log('✅ Identificación eliminada exitosamente')
	} catch (error) {
		console.error('❌ Error eliminando identificación:', error)
		throw error
	}
}

/**
 * Buscar paciente por número de identificación (sin importar el tipo) - MULTI-TENANT
 * Busca en todos los tipos de documento (V, E, J, C) usando índices para eficiencia
 * Útil cuando el usuario solo ingresa el número sin el prefijo
 * 
 * OPTIMIZACIÓN: Usa el índice compuesto (laboratory_id, numero) para búsqueda rápida
 * 
 * @deprecated Para mejor rendimiento, usar findPatientByNumberOnlyOptimized
 * Esta función se mantiene para compatibilidad
 */
export const findPatientByNumberOnly = async (
	numero: string,
): Promise<{ paciente: any; identificacion: Identificacion } | null> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		// Buscar usando el índice compuesto (laboratory_id, numero)
		// Esto es más eficiente que filtrar por tipo_documento
		// El índice idx_identificaciones_lab_numero optimiza esta query
		const { data, error } = await supabase
			.from('identificaciones' as any)
			.select('*')
			.eq('laboratory_id', laboratoryId)
			.eq('numero', numero.trim())
			.in('tipo_documento', ['V', 'E', 'J', 'C'])
			.limit(1) // Solo necesitamos el primero (debería ser único por lab)

		if (error) {
			if (error.code === 'PGRST116') {
				return null // No encontrado
			}
			throw error
		}

		if (!data || data.length === 0) {
			return null
		}

		const identificacion = data[0] as unknown as Identificacion

		// Obtener el paciente asociado usando índice en patients.id
		const { data: paciente, error: pacienteError } = await supabase
			.from('patients')
			.select('*')
			.eq('id', identificacion.paciente_id)
			.single()

		if (pacienteError || !paciente) {
			throw new Error('Paciente no encontrado')
		}

		return {
			paciente,
			identificacion,
		}
	} catch (error) {
		console.error('Error buscando paciente por número:', error)
		throw error
	}
}

/**
 * Búsqueda optimizada de identificación usando pg_trgm
 * Permite búsqueda parcial y aproximada de números
 * 
 * @param numero - Número de identificación a buscar
 * @param tipoDocumento - Tipo opcional para filtrar (V, E, J, C)
 * @returns Resultado con paciente e identificación, o null si no se encuentra
 */
export const findPatientByNumberOnlyOptimized = async (
	numero: string,
	tipoDocumento?: 'V' | 'E' | 'J' | 'C',
): Promise<{ paciente: any; identificacion: Identificacion } | null> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		// Intentar usar función SQL optimizada
		const { data, error } = await supabase.rpc('search_identifications_optimized', {
			search_numero: numero.trim(),
			lab_id: laboratoryId,
			tipo_documento_filter: tipoDocumento || null,
		})

		if (error) {
			// Fallback a búsqueda tradicional
			console.warn('⚠️ Búsqueda optimizada de identificación falló, usando fallback:', error)
			return await findPatientByNumberOnly(numero)
		}

		if (!data || data.length === 0) {
			return null
		}

		// Tomar el primer resultado (mayor similitud)
		const identificacionData = data[0]
		const identificacion: Identificacion = {
			id: identificacionData.id,
			laboratory_id: laboratoryId,
			paciente_id: identificacionData.paciente_id,
			tipo_documento: identificacionData.tipo_documento as 'V' | 'E' | 'J' | 'C' | 'pasaporte',
			numero: identificacionData.numero,
			created_at: null,
			updated_at: null,
		}

		// Obtener el paciente asociado
		const { data: paciente, error: pacienteError } = await supabase
			.from('patients')
			.select('*')
			.eq('id', identificacion.paciente_id)
			.single()

		if (pacienteError || !paciente) {
			throw new Error('Paciente no encontrado')
		}

		return {
			paciente,
			identificacion,
		}
	} catch (error) {
		console.error('Error en búsqueda optimizada de identificación:', error)
		// Fallback a búsqueda tradicional
		return await findPatientByNumberOnly(numero)
	}
}

/**
 * Buscar paciente por identificación (devuelve el paciente completo)
 * Útil para autocomplete y búsquedas
 * Si no se especifica tipo, busca en todos los tipos
 */
export const findPatientByIdentificationNumber = async (
	numero: string,
	tipo?: 'V' | 'E' | 'J' | 'C' | 'pasaporte',
): Promise<{ paciente: any; identificacion: Identificacion } | null> => {
	try {
		// Si no se especifica tipo, buscar en todos los tipos
		if (!tipo) {
			return await findPatientByNumberOnly(numero)
		}

		const identificacion = await findPatientByIdentification(numero, tipo)

		if (!identificacion) {
			return null
		}

		// Obtener el paciente asociado
		const { data: paciente, error } = await supabase
			.from('patients')
			.select('*')
			.eq('id', identificacion.paciente_id)
			.single()

		if (error || !paciente) {
			throw new Error('Paciente no encontrado')
		}

		return {
			paciente,
			identificacion,
		}
	} catch (error) {
		console.error('Error buscando paciente por identificación:', error)
		throw error
	}
}
