// =====================================================================
// SERVICIO DE PACIENTES - NUEVA ESTRUCTURA
// =====================================================================
// Servicios para manejar la tabla patients de forma independiente

import { supabase } from './supabase/config'

// Tipos específicos para pacientes (simplificados para evitar problemas de importación)
export interface Patient {
	id: string
	cedula: string
	nombre: string
	edad: string | null
	telefono: string | null
	email: string | null
	created_at: string | null
	updated_at: string | null
	version: number | null
}

export interface PatientInsert {
	id?: string
	cedula: string
	nombre: string
	edad?: string | null
	telefono?: string | null
	email?: string | null
	created_at?: string | null
	updated_at?: string | null
	version?: number | null
}

export interface PatientUpdate {
	id?: string
	cedula?: string
	nombre?: string
	edad?: string | null
	telefono?: string | null
	email?: string | null
	created_at?: string | null
	updated_at?: string | null
	version?: number | null
}

// =====================================================================
// FUNCIONES DEL SERVICIO DE PACIENTES
// =====================================================================

/**
 * Buscar paciente por cédula (único)
 */
export const findPatientByCedula = async (cedula: string): Promise<Patient | null> => {
	try {
		const { data, error } = await supabase.from('patients').select('*').eq('cedula', cedula).single()

		if (error) {
			// Si no encuentra el paciente, es normal
			if (error.code === 'PGRST116') {
				return null
			}
			throw error
		}

		return data
	} catch (error) {
		console.error('Error buscando paciente por cédula:', error)
		throw error
	}
}

/**
 * Buscar paciente por ID
 */
export const findPatientById = async (id: string): Promise<Patient | null> => {
	try {
		const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()

		if (error) {
			if (error.code === 'PGRST116') {
				return null
			}
			throw error
		}

		return data
	} catch (error) {
		console.error('Error buscando paciente por ID:', error)
		throw error
	}
}

/**
 * Crear nuevo paciente
 */
export const createPatient = async (patientData: PatientInsert): Promise<Patient> => {
	try {
		const { data, error } = await supabase.from('patients').insert(patientData).select().single()

		if (error) {
			throw error
		}

		console.log('✅ Paciente creado exitosamente:', data)
		return data
	} catch (error) {
		console.error('❌ Error creando paciente:', error)
		throw error
	}
}

/**
 * Actualizar paciente existente
 */
export const updatePatient = async (id: string, updates: PatientUpdate, userId?: string): Promise<Patient> => {
	try {
		// Obtener datos actuales para detectar cambios
		const currentPatient = await findPatientById(id)
		if (!currentPatient) {
			throw new Error('Paciente no encontrado')
		}

		// Preparar datos de actualización
		const updateData: PatientUpdate = {
			...updates,
			updated_at: new Date().toISOString(),
			version: (currentPatient.version || 1) + 1,
		}

		// Actualizar paciente
		const { data, error } = await supabase.from('patients').update(updateData).eq('id', id).select().single()

		if (error) {
			throw error
		}

		// Registrar cambios en change_logs si hay userId
		if (userId) {
			await logPatientChanges(id, currentPatient, updates, userId)
		}

		console.log('✅ Paciente actualizado exitosamente:', data)
		return data
	} catch (error) {
		console.error('❌ Error actualizando paciente:', error)
		throw error
	}
}

/**
 * Registrar cambios de paciente en change_logs
 */
const logPatientChanges = async (patientId: string, oldData: Patient, newData: PatientUpdate, userId: string) => {
	try {
		// Obtener información del usuario
		const { data: user } = await supabase.auth.getUser()
		const { data: profile } = await supabase.from('profiles').select('display_name, email').eq('id', userId).single()

		const userEmail = profile?.email || user.user?.email || 'unknown'
		const userDisplayName = profile?.display_name || 'Usuario'

		// Crear logs para cada campo que cambió
		const changes = []

		// Mapeo de campos para nombres legibles
		const fieldLabels: Record<string, string> = {
			cedula: 'Cédula',
			nombre: 'Nombre',
			edad: 'Edad',
			telefono: 'Teléfono',
			email: 'Email',
		}

		// Detectar cambios
		for (const [field, newValue] of Object.entries(newData)) {
			if (field === 'updated_at' || field === 'version') continue

			const oldValue = oldData[field as keyof Patient]

			if (oldValue !== newValue) {
				changes.push({
					patient_id: patientId,
					entity_type: 'patient',
					field_name: field,
					field_label: fieldLabels[field] || field,
					old_value: String(oldValue || ''),
					new_value: String(newValue || ''),
					user_id: userId,
					user_email: userEmail,
					user_display_name: userDisplayName,
				})
			}
		}

		// Insertar cambios si hay alguno
		if (changes.length > 0) {
			const { error } = await supabase.from('change_logs').insert(changes)

			if (error) {
				console.error('Error registrando cambios del paciente:', error)
			} else {
				console.log(`✅ ${changes.length} cambios registrados para el paciente`)
			}
		}
	} catch (error) {
		console.error('Error en logPatientChanges:', error)
	}
}

/**
 * Obtener todos los pacientes con paginación
 */
export const getPatients = async (page = 1, limit = 50, searchTerm?: string) => {
	try {
		let query = supabase.from('patients').select('*', { count: 'exact' })

		// Filtro de búsqueda
		if (searchTerm) {
			query = query.or(`cedula.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
		}

		// Paginación
		const from = (page - 1) * limit
		const to = from + limit - 1

		const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })

		if (error) {
			throw error
		}

		return {
			data: data || [],
			count: count || 0,
			page,
			limit,
			totalPages: Math.ceil((count || 0) / limit),
		}
	} catch (error) {
		console.error('Error obteniendo pacientes:', error)
		throw error
	}
}

/**
 * Obtener estadísticas de un paciente usando consultas directas
 */
export const getPatientStatistics = async (patientId: string) => {
	try {
		// Obtener información del paciente
		const { data: patient, error: patientError } = await supabase
			.from('patients')
			.select('*')
			.eq('id', patientId)
			.single()

		if (patientError) {
			throw patientError
		}

		// Obtener casos médicos del paciente
		const { data: cases, error: casesError } = await supabase
			.from('medical_records_clean')
			.select('total_amount, date')
			.eq('patient_id', patientId)
			.order('date', { ascending: false })

		if (casesError) {
			throw casesError
		}

		// Calcular estadísticas
		const totalCases = cases?.length || 0
		const totalSpent = cases?.reduce((sum, case_) => sum + (case_.total_amount || 0), 0) || 0
		const lastVisit = cases?.[0]?.date || null

		return {
			id: patient.id,
			cedula: patient.cedula,
			nombre: patient.nombre,
			edad: patient.edad,
			telefono: patient.telefono,
			email: patient.email,
			total_cases: totalCases,
			total_spent: totalSpent,
			last_visit: lastVisit,
		}
	} catch (error) {
		console.error('Error obteniendo estadísticas del paciente:', error)
		throw error
	}
}

/**
 * Buscar pacientes por nombre o cédula (para autocomplete)
 */
export const searchPatients = async (searchTerm: string, limit = 10) => {
	try {
		const { data, error } = await supabase
			.from('patients')
			.select('id, cedula, nombre, telefono')
			.or(`cedula.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
			.limit(limit)
			.order('nombre')

		if (error) {
			throw error
		}

		return data || []
	} catch (error) {
		console.error('Error buscando pacientes:', error)
		throw error
	}
}
