// =====================================================================
// SERVICIO DE PACIENTES - NUEVA ESTRUCTURA
// =====================================================================
// Servicios para manejar la tabla patients de forma independiente

import { supabase } from '@services/supabase/config/config'
import {
	findPatientByIdentificationNumber,
	parseCedula,
	formatCedulaCanonical,
	createIdentification,
	updateIdentification,
	getIdentificacionesByPatient,
} from './identificaciones-service'
import { hasRealChange, formatValueForLog, generateChangeSessionId } from '../shared/change-log-utils'

// =====================================================================
// CLASE DE ERROR CON CÓDIGOS
// =====================================================================

/**
 * Errores específicos que pueden ocurrir al trabajar con pacientes
 */
export class PatientError extends Error {
	constructor(
		message: string,
		public code:
			| 'USER_NOT_AUTHENTICATED'
			| 'USER_NO_LABORATORY'
			| 'PATIENT_NOT_FOUND'
			| 'PATIENT_DUPLICATE'
			| 'PATIENT_REQUIRED_FIELD'
			| 'DATABASE_ERROR'
			| 'UNKNOWN_ERROR',
	) {
		super(message)
		this.name = 'PatientError'
	}
}

// Tipos específicos para pacientes (simplificados para evitar problemas de importación)
export interface Patient {
	id: string
	laboratory_id: string // NUEVO: Multi-tenant
	cedula: string
	nombre: string
	edad: string | null
	telefono: string | null
	email: string | null
	gender: 'Masculino' | 'Femenino' | null
	fecha_nacimiento?: string | null
	tipo_paciente?: 'adulto' | 'menor' | 'animal' | null
	especie?: string | null
	created_at: string | null
	updated_at: string | null
	version: number | null
	is_active?: boolean
	deactivated_at?: string | null
}

export interface PatientInsert {
	id?: string
	laboratory_id: string // NUEVO: Multi-tenant
	cedula: string | null // Puede ser null para dependientes (menores/animales)
	nombre: string
	edad?: string | null
	telefono?: string | null
	email?: string | null
	gender?: 'Masculino' | 'Femenino' | null
	created_at?: string | null
	updated_at?: string | null
	version?: number | null
	is_active?: boolean
	deactivated_at?: string | null
}

export interface PatientUpdate {
	id?: string
	laboratory_id?: string // NUEVO: Multi-tenant
	cedula?: string | null // Puede ser null para dependientes (menores/animales)
	nombre?: string
	edad?: string | null
	telefono?: string | null
	email?: string | null
	gender?: 'Masculino' | 'Femenino' | null
	created_at?: string | null
	updated_at?: string | null
	version?: number | null
	is_active?: boolean
	deactivated_at?: string | null
}

// =====================================================================
// HOMOLOGACIÓN DE CÉDULA (formato canónico TIPO-NUMERO)
// =====================================================================
// Garantiza que patients.cedula siempre se guarde y devuelva con prefijo (V-, E-, etc.)
// para evitar inconsistencia entre registros con/sin prefijo (dual-write, datos legacy).

/** Aplica formato canónico a la cédula de un paciente devuelto por la BD */
const normalizePatientCedula = <T extends { cedula?: string | null }>(patient: T): T => {
	if (!patient || patient.cedula == null || patient.cedula === '') return patient
	const canonical = formatCedulaCanonical(patient.cedula)
	if (canonical === patient.cedula) return patient
	return { ...patient, cedula: canonical }
}

// =====================================================================
// FUNCIONES DEL SERVICIO DE PACIENTES
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
		if (!user) throw new PatientError('Usuario no autenticado', 'USER_NOT_AUTHENTICATED')

		const { data: profile, error } = await supabase.from('profiles').select('laboratory_id').eq('id', user.id).single()

		if (error || !profile) {
			throw new PatientError('Usuario no tiene laboratorio asignado', 'USER_NO_LABORATORY')
		}

		// Type assertion porque sabemos que laboratory_id existe en la BD
		const laboratoryId = (profile as { laboratory_id?: string }).laboratory_id

		if (!laboratoryId) {
			throw new PatientError('Usuario no tiene laboratorio asignado', 'USER_NO_LABORATORY')
		}

		return laboratoryId
	} catch (error) {
		console.error('Error obteniendo laboratory_id:', error)
		// Si ya es un PatientError, re-lanzarlo
		if (error instanceof PatientError) {
			throw error
		}
		// Si es otro error, convertirlo
		throw new PatientError(error instanceof Error ? error.message : 'Error desconocido', 'UNKNOWN_ERROR')
	}
}

/**
 * Buscar paciente por cédula (único) - MULTI-TENANT
 * Busca tanto por formato completo como solo por número para evitar duplicados
 * SOLO busca en el laboratorio del usuario autenticado
 */
export const findPatientByCedula = async (cedula: string): Promise<Patient | null> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		// Primero intentar búsqueda exacta
		const { data: exactMatch, error: exactError } = await supabase
			.from('patients')
			.select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
			.eq('cedula', cedula)
			.eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
			.single()

		if (exactMatch && !exactError) {
			return normalizePatientCedula(exactMatch as unknown as Patient)
		}

		// Si no hay coincidencia exacta, buscar por número de cédula (sin prefijo)
		const cedulaNumber = cedula.replace(/^[VEJC]-/, '')

		// Buscar pacientes que tengan el mismo número pero diferente prefijo
		const { data: numberMatch, error: numberError } = await supabase
			.from('patients')
			.select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
			.like('cedula', `%-${cedulaNumber}`)
			.eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
			.single()

		if (numberMatch && !numberError) {
			const patient = numberMatch as unknown as Patient
			console.log(
				`⚠️ Encontrado paciente con mismo número pero diferente prefijo: ${patient.cedula} (buscando: ${cedula})`,
			)
			return normalizePatientCedula(patient)
		}

		// Si no encuentra nada, retornar null
		if (exactError?.code === 'PGRST116' || numberError?.code === 'PGRST116') {
			return null
		}

		// Si hay otro tipo de error, lanzarlo
		if (exactError) throw exactError
		if (numberError) throw numberError

		return null
	} catch (error) {
		console.error('Error buscando paciente por cédula:', error)
		throw error
	}
}

/**
 * Función unificada para buscar paciente por cédula - FASE 8
 * Usa feature flag para decidir entre sistema nuevo (identificaciones) o antiguo (patients.cedula)
 * Implementa dual-read: intenta ambos sistemas y combina resultados
 */
export const findPatientUnified = async (cedula: string): Promise<Patient | null> => {
	try {
		// Obtener laboratory_id y verificar feature flag
		const laboratoryId = await getUserLaboratoryId()

		// Obtener configuración del laboratorio para verificar feature flag
		// Usar 'as any' porque 'laboratories' puede no estar en tipos generados de Supabase
		let useNewSystem = false
		try {
			const result = await supabase
				.from('laboratories' as any)
				.select('features')
				.eq('id', laboratoryId)
				.single()

			const laboratory = result.data as any
			useNewSystem = (laboratory?.features as any)?.hasNewPatientSystem === true
		} catch (error) {
			// Si falla al obtener el laboratorio, asumir que no hay feature flag (sistema antiguo)
			console.warn('⚠️ No se pudo obtener configuración del laboratorio, usando sistema antiguo:', error)
		}

		// =====================================================================
		// NUEVO SISTEMA: Buscar en identificaciones (si feature flag activo)
		// =====================================================================
		if (useNewSystem) {
			try {
				// Parsear cédula para obtener tipo y número
				const { tipo, numero } = parseCedula(cedula)

				// Buscar en identificaciones
				const result = await findPatientByIdentificationNumber(numero, tipo)

				if (result && result.paciente) {
					// Convertir a formato Patient (cedula ya en formato canónico desde identificaciones)
					const patient: Patient = {
						id: result.paciente.id,
						laboratory_id: result.paciente.laboratory_id,
						cedula: `${result.identificacion.tipo_documento}-${result.identificacion.numero}`,
						nombre: result.paciente.nombre,
						edad: result.paciente.edad,
						telefono: result.paciente.telefono,
						email: result.paciente.email,
						gender: result.paciente.gender,
						fecha_nacimiento: result.paciente.fecha_nacimiento,
						tipo_paciente: result.paciente.tipo_paciente,
						especie: result.paciente.especie,
						created_at: result.paciente.created_at,
						updated_at: result.paciente.updated_at,
						version: result.paciente.version,
					}
					return normalizePatientCedula(patient)
				}
			} catch (newSystemError) {
				// FALLBACK: Si falla el nuevo sistema, usar el antiguo
				console.warn('⚠️ Nuevo sistema falló, usando fallback:', newSystemError)
			}
		}

		// =====================================================================
		// SISTEMA ANTIGUO: Buscar en patients.cedula (siempre disponible como fallback)
		// =====================================================================
		return await findPatientByCedula(cedula)
	} catch (error) {
		console.error('Error en findPatientUnified:', error)
		// Último fallback: intentar sistema antiguo directamente
		return await findPatientByCedula(cedula)
	}
}

/**
 * Buscar paciente por ID - MULTI-TENANT
 * SOLO busca en el laboratorio del usuario autenticado
 */
export const findPatientById = async (id: string): Promise<Patient | null> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		const { data, error } = await supabase
			.from('patients')
			.select(
				'id, laboratory_id, cedula, nombre, edad, telefono, email, gender, fecha_nacimiento, tipo_paciente, especie, created_at, updated_at, version',
			)
			.eq('id', id)
			.eq('laboratory_id', laboratoryId) // FILTRO MULTI-TENANT
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				return null
			}
			throw error
		}

		return normalizePatientCedula(data as unknown as Patient)
	} catch (error) {
		console.error('Error buscando paciente por ID:', error)
		throw error
	}
}

/**
 * Crear nuevo paciente - MULTI-TENANT
 * Automáticamente asigna laboratory_id del usuario autenticado
 * Homologación: cedula se guarda siempre en formato canónico (TIPO-NUMERO)
 */
export const createPatient = async (patientData: Omit<PatientInsert, 'laboratory_id'>): Promise<Patient> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		// Homologar cédula: siempre guardar en formato canónico (V-12345678)
		const payload = {
			...patientData,
			cedula: patientData.cedula ? (formatCedulaCanonical(patientData.cedula) ?? patientData.cedula) : null,
			laboratory_id: laboratoryId,
		}

		// SIEMPRE incluir laboratory_id al insertar
		// Usar 'as any' porque los tipos generados pueden no incluir laboratory_id
		const { data, error } = await supabase
			.from('patients')
			.insert(payload as any)
			.select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
			.single()

		if (error) {
			// Convertir errores de Supabase a códigos de error
			const errorMessage = error.message || ''
			const errorCode = error.code || ''

			// Error de duplicado (unique constraint)
			if (errorCode === '23505' || errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
				throw new PatientError('Ya existe un paciente con esta cédula', 'PATIENT_DUPLICATE')
			}

			// Error de campo requerido (not null)
			if (errorCode === '23502' || errorMessage.includes('null value')) {
				throw new PatientError('Falta un campo obligatorio', 'PATIENT_REQUIRED_FIELD')
			}

			// Error genérico de base de datos
			throw new PatientError(errorMessage || 'Error al crear paciente', 'DATABASE_ERROR')
		}

		console.log('✅ Paciente creado exitosamente:', data)

		// =====================================================================
		// DUAL-WRITE: Escribir en sistema nuevo (identificaciones)
		// =====================================================================
		// Esto es NO-CRÍTICO: si falla, solo loggear pero no fallar la creación
		// El sistema antiguo (patients.cedula) ya funcionó correctamente
		// =====================================================================
		const createdCedula = (data as any).cedula
		// Usar el laboratoryId que ya tenemos (se insertó en la línea 304)

		if (createdCedula && createdCedula !== 'S/C') {
			try {
				console.log('🔄 Dual-write: Creando identificación en sistema nuevo...')

				// Parsear cédula para obtener tipo y número
				const { tipo, numero } = parseCedula(createdCedula)

				if (!laboratoryId) {
					console.warn('⚠️ Dual-write: No se pudo obtener laboratory_id, omitiendo identificación')
				} else {
					// Verificar si ya existe identificación para este paciente
					const existingIdentificaciones = await getIdentificacionesByPatient((data as any).id)

					// Buscar si ya existe una identificación con el mismo tipo y número
					const matchingIdentificacion = existingIdentificaciones.find(
						(ident) => ident.tipo_documento === tipo && ident.numero === numero,
					)

					if (matchingIdentificacion) {
						// Ya existe, no hacer nada
						console.log('ℹ️ Dual-write: Identificación ya existe, omitiendo creación')
					} else {
						// Crear nueva identificación
						await createIdentification({
							paciente_id: (data as any).id,
							tipo_documento: tipo,
							numero: numero,
							laboratory_id: laboratoryId,
						})
						console.log('✅ Dual-write: Identificación creada exitosamente')
					}
				}
			} catch (error) {
				// NO fallar si falla el sistema nuevo, solo loggear
				console.warn('⚠️ Dual-write: No se pudo crear identificación (no crítico):', error)
				console.warn('⚠️ La creación del paciente se completó exitosamente en el sistema antiguo')
			}
		} else {
			console.log('ℹ️ Dual-write: Paciente sin cédula (S/C o null), omitiendo identificación')
		}

		return normalizePatientCedula(data as unknown as Patient)
	} catch (error) {
		console.error('❌ Error creando paciente:', error)
		// Si ya es un PatientError, re-lanzarlo
		if (error instanceof PatientError) {
			throw error
		}
		// Si es otro error, convertirlo
		throw new PatientError(
			error instanceof Error ? error.message : 'Error desconocido al crear paciente',
			'UNKNOWN_ERROR',
		)
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

		// Homologar cédula al actualizar: siempre formato canónico (TIPO-NUMERO) cuando se envía
		const normalizedCedula =
			updates.cedula !== undefined ? (formatCedulaCanonical(updates.cedula) ?? updates.cedula) : undefined

		// Si se está actualizando la cédula, verificar si ya existe otro paciente con esa cédula
		if (normalizedCedula !== undefined && normalizedCedula !== currentPatient.cedula) {
			const existingPatient = await findPatientByCedula(normalizedCedula)
			if (existingPatient && existingPatient.id !== id) {
				throw new Error(`Ya existe un paciente con la cédula ${normalizedCedula}`)
			}
		}

		// Preparar datos de actualización
		const updateData: PatientUpdate = {
			...updates,
			...(normalizedCedula !== undefined && { cedula: normalizedCedula }),
			updated_at: new Date().toISOString(),
			version: (currentPatient.version || 1) + 1,
		}

		// Actualizar paciente (cedula ya normalizada en updateData)
		// Usar 'as any' porque los tipos generados pueden no permitir null en cedula
		const { data, error } = await supabase
			.from('patients')
			.update(updateData as any)
			.eq('id', id)
			.select('id, laboratory_id, cedula, nombre, edad, telefono, email, gender, created_at, updated_at, version')
			.single()

		if (error) {
			throw error
		}

		// Registrar cambios en change_logs si hay userId
		if (userId) {
			await logPatientChanges(id, currentPatient, updates, userId)
		}

		// =====================================================================
		// DUAL-WRITE: Escribir en sistema nuevo (identificaciones)
		// =====================================================================
		// Esto es NO-CRÍTICO: si falla, solo loggear pero no fallar la actualización
		// El sistema antiguo (patients.cedula) ya funcionó correctamente
		// =====================================================================
		const updatedCedula = (data as any).cedula
		const previousCedula = currentPatient.cedula

		// Solo hacer dual-write si la cédula cambió o se agregó
		if (updatedCedula && updatedCedula !== 'S/C' && updatedCedula !== previousCedula) {
			try {
				console.log('🔄 Dual-write: Actualizando identificación en sistema nuevo...')

				// Parsear cédula para obtener tipo y número
				const { tipo, numero } = parseCedula(updatedCedula)

				// Obtener laboratory_id del paciente actualizado
				const laboratoryId = (data as any).laboratory_id

				if (!laboratoryId) {
					console.warn('⚠️ Dual-write: No se pudo obtener laboratory_id, omitiendo identificación')
				} else {
					// Buscar identificaciones existentes del paciente
					const existingIdentificaciones = await getIdentificacionesByPatient(id)

					// Buscar si ya existe una identificación con el mismo tipo y número
					const matchingIdentificacion = existingIdentificaciones.find(
						(ident) => ident.tipo_documento === tipo && ident.numero === numero,
					)

					if (matchingIdentificacion) {
						// Ya existe, no hacer nada (ya está actualizada)
						console.log('ℹ️ Dual-write: Identificación ya existe con estos datos, omitiendo actualización')
					} else {
						// Buscar si hay una identificación del mismo tipo (para actualizar)
						const sameTypeIdentificacion = existingIdentificaciones.find((ident) => ident.tipo_documento === tipo)

						if (sameTypeIdentificacion) {
							// Actualizar la identificación existente del mismo tipo
							await updateIdentification(sameTypeIdentificacion.id, {
								tipo_documento: tipo,
								numero: numero,
							})
							console.log('✅ Dual-write: Identificación actualizada exitosamente')
						} else {
							// Crear nueva identificación
							await createIdentification({
								paciente_id: id,
								tipo_documento: tipo,
								numero: numero,
								laboratory_id: laboratoryId,
							})
							console.log('✅ Dual-write: Identificación creada exitosamente')
						}
					}
				}
			} catch (error) {
				// NO fallar si falla el sistema nuevo, solo loggear
				console.warn('⚠️ Dual-write: No se pudo actualizar/crear identificación (no crítico):', error)
				console.warn('⚠️ La actualización del paciente se completó exitosamente en el sistema antiguo')
			}
		} else if (updatedCedula === null || updatedCedula === 'S/C') {
			// Si se eliminó la cédula, intentar eliminar identificaciones (opcional, no crítico)
			try {
				console.log('🔄 Dual-write: Cédula eliminada, verificando identificaciones...')
				const existingIdentificaciones = await getIdentificacionesByPatient(id)
				if (existingIdentificaciones.length > 0) {
					console.log(
						`ℹ️ Dual-write: Paciente tiene ${existingIdentificaciones.length} identificación(es) pero cédula fue eliminada. Se mantienen las identificaciones por seguridad.`,
					)
					// NO eliminamos las identificaciones automáticamente por seguridad
					// El usuario puede eliminarlas manualmente si es necesario
				}
			} catch (error) {
				// No crítico, solo loggear
				console.warn('⚠️ Dual-write: No se pudo verificar identificaciones (no crítico):', error)
			}
		} else {
			console.log('ℹ️ Dual-write: Cédula no cambió, omitiendo actualización de identificación')
		}

		console.log('✅ Paciente actualizado exitosamente:', data)
		return normalizePatientCedula(data as unknown as Patient)
	} catch (error) {
		console.error('❌ Error actualizando paciente:', error)
		throw error
	}
}

/**
 * Registrar cambios de paciente en change_logs
 *
 * IMPORTANTE: Esta función se ejecuta dentro de la misma promesa del update
 * para mitigar fallos parciales (si el update falla, el log no se registra)
 */
const logPatientChanges = async (patientId: string, oldData: Patient, newData: PatientUpdate, userId: string) => {
	try {
		// Obtener información del usuario
		const { data: user } = await supabase.auth.getUser()
		const { data: profile } = await supabase.from('profiles').select('display_name, email').eq('id', userId).single()

		const userEmail = profile?.email || user.user?.email || 'unknown'
		const userDisplayName = profile?.display_name || 'Usuario'

		// Generar session_id único para esta sesión de edición (por submit, no por modal)
		// Esto agrupa todos los cambios del mismo submit en una sola sesión
		const changeSessionId = generateChangeSessionId()
		const changedAt = new Date().toISOString()

		// Crear logs para cada campo que cambió
		const changes = []

		// Mapeo de campos para nombres legibles
		const fieldLabels: Record<string, string> = {
			cedula: 'Cédula',
			nombre: 'Nombre',
			edad: 'Edad',
			telefono: 'Teléfono',
			email: 'Email',
			gender: 'Género',
		}

		// Detectar cambios con normalización (evita falsos positivos)
		for (const [field, newValue] of Object.entries(newData)) {
			if (field === 'updated_at' || field === 'version') continue

			const oldValue = oldData[field as keyof Patient]

			// Usar hasRealChange para evitar registrar cambios falsos (null → null, '' → '', etc)
			if (hasRealChange(oldValue, newValue)) {
				changes.push({
					patient_id: patientId,
					entity_type: 'patient',
					field_name: field,
					field_label: fieldLabels[field] || field,
					old_value: formatValueForLog(oldValue),
					new_value: formatValueForLog(newValue),
					user_id: userId,
					user_email: userEmail,
					user_display_name: userDisplayName,
					change_session_id: changeSessionId, // Mismo session_id para todos los cambios del submit
					changed_at: changedAt, // Mismo timestamp para todos
				})
			}
		}

		// Insertar cambios si hay alguno
		if (changes.length > 0) {
			const { error } = await supabase.from('change_logs').insert(changes)

			if (error) {
				console.error('Error registrando cambios del paciente:', error)
				// No lanzar error para no romper el flujo del update
			} else {
				console.log(`✅ ${changes.length} cambios registrados para el paciente (session: ${changeSessionId})`)
			}
		}
	} catch (error) {
		console.error('Error en logPatientChanges:', error)
		// No lanzar error para no romper el flujo del update
	}
}

/** Máximo de IDs a enviar en un solo .in() para evitar URL demasiado larga (400 Bad Request) */
const MAX_IDS_IN_QUERY = 80

/**
 * Obtener todos los pacientes con paginación - MULTI-TENANT
 * SOLO muestra pacientes del laboratorio del usuario autenticado
 */
/** branchFilter: string para una sede, string[] para variantes (ej. SPT: ['Paseo Hatillo','Paseo El Hatillo']) */
export const getPatients = async (
	page = 1,
	limit = 50,
	searchTerm?: string,
	branchFilter?: string | string[],
	sortField: string = 'created_at',
	sortDirection: 'asc' | 'desc' = 'desc',
) => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		// Si hay término de búsqueda, usar función optimizada primero
		if (searchTerm && searchTerm.trim().length >= 2) {
			try {
				// Usar búsqueda optimizada con pg_trgm (límite razonable para no sobrecargar)
				const optimizedResults = await searchPatientsOptimized(searchTerm.trim(), 500)

				if (optimizedResults && optimizedResults.length > 0) {
					// IDs en orden de relevancia
					let orderedIds = optimizedResults.map((p) => p.id)

					// Aplicar filtro de branch si existe
					if (branchFilter && branchFilter !== 'all') {
						const branchList = Array.isArray(branchFilter) ? branchFilter : [branchFilter]
						const casesQuery = supabase
							.from('medical_records_clean')
							.select('patient_id')
							.eq('laboratory_id', laboratoryId)
						const { data: casesData, error: casesError } = branchList.length === 1
							? await casesQuery.eq('branch', branchList[0])
							: await casesQuery.in('branch', branchList)

						if (casesError) {
							console.error('Error obteniendo casos por branch:', casesError)
						} else if (casesData) {
							const uniquePatientIds = [...new Set(casesData.map((c) => c.patient_id).filter(Boolean))]

							if (uniquePatientIds.length > 0) {
								orderedIds = orderedIds.filter((id) => uniquePatientIds.includes(id))
							} else {
								return {
									data: [],
									count: 0,
									page,
									limit,
									totalPages: 0,
								}
							}
						}
					}

					if (orderedIds.length === 0) {
						return {
							data: [],
							count: 0,
							page,
							limit,
							totalPages: 0,
						}
					}

					// Solo pedir los IDs de la página actual para evitar URL demasiado larga (400 Bad Request)
					const from = (page - 1) * limit
					const pageIds = orderedIds.slice(from, from + limit)

					if (pageIds.length === 0) {
						return {
							data: [],
							count: orderedIds.length,
							page,
							limit,
							totalPages: Math.ceil(orderedIds.length / limit),
						}
					}

					const { data: pageData, error } = await supabase
						.from('patients')
						.select('*')
						.eq('laboratory_id', laboratoryId)
						.eq('is_active', true)
						.in('id', pageIds)

					if (error) {
						throw error
					}

					// Ordenar por relevancia (orden en pageIds)
					const byRelevanceOrder = (pageData || []).sort(
						(a: any, b: any) => pageIds.indexOf(a.id) - pageIds.indexOf(b.id),
					)

					return {
						data: byRelevanceOrder.map((p: any) => normalizePatientCedula(p)),
						count: orderedIds.length,
						page,
						limit,
						totalPages: Math.ceil(orderedIds.length / limit),
					}
				}
			} catch (optimizedError) {
				console.warn('⚠️ Búsqueda optimizada falló, usando método tradicional:', optimizedError)
				// Continuar con método tradicional como fallback
			}
		}

		// MÉTODO TRADICIONAL (fallback o cuando no hay searchTerm)
		let query = supabase
			.from('patients')
			.select('*', { count: 'exact' })
			.eq('laboratory_id', laboratoryId)
			.eq('is_active', true) // Solo pacientes activos (soft delete)

		// Filtro de búsqueda tradicional (solo si no se usó la optimizada)
		if (searchTerm) {
			query = query.or(`cedula.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
		}

		// Si hay filtro de branch, necesitamos obtener los patient_ids de medical_records_clean
		if (branchFilter && branchFilter !== 'all') {
			const branchList = Array.isArray(branchFilter) ? branchFilter : [branchFilter]
			const casesQuery = supabase
				.from('medical_records_clean')
				.select('patient_id')
				.eq('laboratory_id', laboratoryId)
			const { data: casesData, error: casesError } = branchList.length === 1
				? await casesQuery.eq('branch', branchList[0])
				: await casesQuery.in('branch', branchList)

			if (casesError) {
				console.error('Error obteniendo casos por branch:', casesError)
			} else if (casesData) {
				// Extraer IDs únicos de pacientes (filtrar nulls y convertir a string[])
				const uniquePatientIds = [
					...new Set(casesData.map((c) => c.patient_id).filter((id): id is string => id !== null)),
				]

				if (uniquePatientIds.length === 0) {
					return {
						data: [],
						count: 0,
						page,
						limit,
						totalPages: 0,
					}
				}

				// Si hay demasiados IDs, la URL del .in() puede superar el límite (400). Fetch por lotes.
				if (uniquePatientIds.length > MAX_IDS_IN_QUERY) {
					const chunks: string[][] = []
					for (let i = 0; i < uniquePatientIds.length; i += MAX_IDS_IN_QUERY) {
						chunks.push(uniquePatientIds.slice(i, i + MAX_IDS_IN_QUERY))
					}
					const batchResults = await Promise.all(
						chunks.map((chunk) =>
							supabase
								.from('patients')
								.select('*')
								.eq('laboratory_id', laboratoryId)
								.eq('is_active', true)
								.in('id', chunk),
						),
					)
					const byId = new Map<string, any>()
					for (const res of batchResults) {
						if (res.data) for (const row of res.data) byId.set(row.id, row)
					}
					const allPatients = uniquePatientIds.map((id) => byId.get(id)).filter(Boolean)

					const extractAgeValue = (edad: string | null | undefined): number => {
						if (!edad || String(edad).trim() === '') return -1
						const edadStr = String(edad).trim().toUpperCase()
						const match = edadStr.match(/(\d+)/)
						if (!match) return -1
						const number = parseInt(match[1], 10)
						if (isNaN(number)) return -1
						if (edadStr.includes('AÑO') || edadStr.includes('AÑOS')) return number * 365
						if (edadStr.includes('MES') || edadStr.includes('MESES')) return number * 30
						if (
							edadStr.includes('DÍA') ||
							edadStr.includes('DÍAS') ||
							edadStr.includes('DIA') ||
							edadStr.includes('DIAS')
						)
							return number
						return number * 365
					}

					const cmp = (a: any, b: any): number => {
						if (sortField === 'edad') {
							const aV = extractAgeValue(a.edad)
							const bV = extractAgeValue(b.edad)
							if (aV === -1 && bV === -1) return 0
							if (aV === -1) return 1
							if (bV === -1) return -1
							return sortDirection === 'asc' ? aV - bV : bV - aV
						}
						const aVal = a[sortField]
						const bVal = b[sortField]
						if (aVal == null && bVal == null) return 0
						if (aVal == null) return 1
						if (bVal == null) return -1
						if (typeof aVal === 'string' && typeof bVal === 'string') {
							return sortDirection === 'asc'
								? aVal.localeCompare(bVal)
								: bVal.localeCompare(aVal)
						}
						const order = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
						return sortDirection === 'asc' ? order : -order
					}
					allPatients.sort(cmp)
					const from = (page - 1) * limit
					const to = from + limit
					const pageData = allPatients.slice(from, to).map((p: any) => normalizePatientCedula(p))
					return {
						data: pageData,
						count: allPatients.length,
						page,
						limit,
						totalPages: Math.ceil(allPatients.length / limit),
					}
				}

				query = query.in('id', uniquePatientIds)
			}
		}

		// Si el campo de ordenamiento es 'edad', necesitamos ordenar en el cliente
		// porque es un campo de texto que contiene "25 AÑOS", "10 MESES", etc.
		if (sortField === 'edad') {
			// Obtener todos los datos sin paginación
			const { data: allData, error, count } = await query

			if (error) {
				throw error
			}

			// Función helper para extraer valor numérico de edad
			const extractAgeValue = (edad: string | null | undefined): number => {
				if (!edad || edad.trim() === '') return -1 // Vacíos al final

				const edadStr = String(edad).trim().toUpperCase()
				const match = edadStr.match(/(\d+)/)
				if (!match) return -1

				const number = parseInt(match[1], 10)
				if (isNaN(number)) return -1

				// Convertir a días para comparación uniforme
				// 1 año = 365 días, 1 mes = 30 días, 1 día = 1 día
				if (edadStr.includes('AÑO') || edadStr.includes('AÑOS')) {
					return number * 365 // Años a días
				} else if (edadStr.includes('MES') || edadStr.includes('MESES')) {
					return number * 30 // Meses a días
				} else if (
					edadStr.includes('DÍA') ||
					edadStr.includes('DÍAS') ||
					edadStr.includes('DIA') ||
					edadStr.includes('DIAS')
				) {
					return number // Días
				}

				// Si no especifica unidad, asumir años
				return number * 365
			}

			// Ordenar en el cliente
			const sortedData = (allData || []).sort((a: any, b: any) => {
				const aValue = extractAgeValue(a.edad)
				const bValue = extractAgeValue(b.edad)

				// Valores vacíos van al final
				if (aValue === -1 && bValue === -1) return 0
				if (aValue === -1) return 1
				if (bValue === -1) return -1

				return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
			})

			// Aplicar paginación después del ordenamiento
			const from = (page - 1) * limit
			const to = from + limit
			const paginatedData = sortedData.slice(from, to).map((p: any) => normalizePatientCedula(p))

			return {
				data: paginatedData,
				count: count || 0,
				page,
				limit,
				totalPages: Math.ceil((count || 0) / limit),
			}
		}

		// Para otros campos, ordenar en la base de datos
		query = query.order(sortField, { ascending: sortDirection === 'asc' })

		// Paginación
		const from = (page - 1) * limit
		const to = from + limit - 1

		const { data, error, count } = await query.range(from, to)

		if (error) {
			throw error
		}

		return {
			data: (data || []).map((p: any) => normalizePatientCedula(p)),
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
 * Resultado del conteo de pacientes por sede
 */
export interface PatientsCountByBranchResult {
	/** Conteo por sede (solo pacientes activos con casos en esa sede) */
	byBranch: Record<string, number>
	/** Total de pacientes activos únicos con al menos un caso en alguna sede */
	totalUnique: number
}

/**
 * Obtener conteo de pacientes por branch (sede/sucursal)
 * Usa RPC con SECURITY DEFINER para evitar que RLS devuelva 0 filas incorrectamente.
 * Fallback a query directa si la RPC no existe (ej. migración pendiente).
 */
export const getPatientsCountByBranch = async (): Promise<PatientsCountByBranchResult> => {
	try {
		// Intentar RPC primero (bypassa RLS, evita el bug de conteo 0)
		const { data: rpcData, error: rpcError } = await supabase.rpc('get_patients_count_by_branch')

		if (!rpcError && rpcData && typeof rpcData === 'object') {
			const byBranch = (rpcData as { byBranch?: Record<string, number> }).byBranch ?? {}
			const totalUnique = Number((rpcData as { totalUnique?: number }).totalUnique ?? 0)
			return { byBranch, totalUnique }
		}

		// Fallback: query directa (puede devolver 0 por RLS en algunos roles)
		const laboratoryId = await getUserLaboratoryId()

		const { data, error } = await supabase
			.from('medical_records_clean')
			.select('branch, patient_id')
			.eq('laboratory_id', laboratoryId)
			.not('branch', 'is', null)

		if (error) throw error

		const countMap: Record<string, Set<string>> = {}
		const allPatientIds = new Set<string>()
		data?.forEach((record) => {
			if (record.branch && record.patient_id) {
				if (!countMap[record.branch]) countMap[record.branch] = new Set()
				countMap[record.branch].add(record.patient_id)
				allPatientIds.add(record.patient_id)
			}
		})

		let activePatientIds = new Set<string>()
		if (allPatientIds.size > 0) {
			const { data: activePatients } = await supabase
				.from('patients')
				.select('id')
				.eq('laboratory_id', laboratoryId)
				.eq('is_active', true)
				.in('id', [...allPatientIds])
			activePatientIds = new Set((activePatients || []).map((p) => p.id))
		}

		const byBranch: Record<string, number> = {}
		Object.entries(countMap).forEach(([branch, patientIds]) => {
			byBranch[branch] = [...patientIds].filter((id) => activePatientIds.has(id)).length
		})
		
		// Total único: TODOS los pacientes activos (igual que en estadísticas y RPC)
		const { count: totalUniqueCount } = await supabase
			.from('patients')
			.select('*', { count: 'exact', head: true })
			.eq('laboratory_id', laboratoryId)
			.eq('is_active', true)
		
		const totalUnique = totalUniqueCount || 0

		return { byBranch, totalUnique }
	} catch (error) {
		console.error('Error obteniendo conteo de pacientes por branch:', error)
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
			gender: patient.gender,
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
 * Buscar pacientes por nombre o cédula (para autocomplete) - MULTI-TENANT
 * SOLO busca en el laboratorio del usuario autenticado
 *
 * @deprecated Usar searchPatientsOptimized para mejor rendimiento
 * Esta función se mantiene para compatibilidad y como fallback
 */
export const searchPatients = async (searchTerm: string, limit = 10) => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		const { data, error } = await supabase
			.from('patients')
			.select('id, cedula, nombre, telefono, gender')
			.eq('laboratory_id', laboratoryId)
			.eq('is_active', true)
			.or(`cedula.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
			.limit(limit)
			.order('nombre')

		if (error) {
			throw error
		}

		return (data || []).map((p: any) => normalizePatientCedula(p))
	} catch (error) {
		console.error('Error buscando pacientes:', error)
		throw error
	}
}

/**
 * Búsqueda optimizada usando pg_trgm (método GitHub/GitLab)
 * 10-100x más rápida que ILIKE en tablas grandes
 *
 * Usa índices GIN con trigramas para búsqueda parcial rápida
 * Retorna resultados ordenados por relevancia (similarity_score)
 *
 * @param searchTerm - Término de búsqueda (nombre, teléfono o cédula)
 * @param limit - Límite de resultados (default: 10)
 * @returns Array de pacientes ordenados por relevancia
 */
export const searchPatientsOptimized = async (searchTerm: string, limit = 10): Promise<Patient[]> => {
	let laboratoryId: string
	try {
		laboratoryId = await getUserLaboratoryId()
	} catch (error) {
		console.error('Error obteniendo laboratory_id:', error)
		// Fallback a búsqueda tradicional sin laboratory_id
		const fallbackResults = await searchPatients(searchTerm, limit)
		return fallbackResults.map((p: any) => ({
			id: p.id,
			laboratory_id: '', // No disponible
			cedula: p.cedula || '',
			nombre: p.nombre || '',
			edad: null,
			telefono: p.telefono || null,
			email: null,
			gender: p.gender || null,
			created_at: null,
			updated_at: null,
			version: null,
		})) as Patient[]
	}

	try {
		// Usar función SQL optimizada con pg_trgm
		const { data, error } = await (supabase.rpc as any)('search_patients_optimized', {
			search_term: searchTerm.trim(),
			lab_id: laboratoryId,
			result_limit: limit,
		})

		if (error) {
			// Fallback a búsqueda tradicional si falla
			console.warn('⚠️ Búsqueda optimizada falló, usando fallback:', error)
			const fallbackResults = await searchPatients(searchTerm, limit)
			// Convertir resultados del fallback a formato Patient completo
			return fallbackResults.map((p: any) => ({
				id: p.id,
				laboratory_id: laboratoryId,
				cedula: p.cedula || '',
				nombre: p.nombre || '',
				edad: null,
				telefono: p.telefono || null,
				email: null,
				gender: p.gender || null,
				created_at: null,
				updated_at: null,
				version: null,
			})) as Patient[]
		}

		// Mapear resultados a formato Patient y homologar cédula (formato canónico)
		const results = (data as any) || []
		return results.map((row: any) =>
			normalizePatientCedula({
				id: row.id,
				nombre: row.nombre,
				cedula: row.cedula || null,
				telefono: row.telefono || null,
				email: row.email || null,
				gender: (row.gender as 'Masculino' | 'Femenino' | null) || null,
				tipo_paciente: (row.tipo_paciente as 'adulto' | 'menor' | 'animal' | null) || null,
				edad: row.edad || null,
				fecha_nacimiento: row.fecha_nacimiento || null,
				especie: row.especie || null,
				laboratory_id: laboratoryId,
				created_at: null,
				updated_at: null,
				version: null,
			} as Patient),
		)
	} catch (error) {
		console.error('Error en búsqueda optimizada:', error)
		// Fallback a búsqueda tradicional
		try {
			const fallbackResults = await searchPatients(searchTerm, limit)
			// Convertir resultados del fallback a formato Patient completo
			return fallbackResults.map((p: any) => ({
				id: p.id,
				laboratory_id: laboratoryId,
				cedula: p.cedula || '',
				nombre: p.nombre || '',
				edad: null,
				telefono: p.telefono || null,
				email: null,
				gender: p.gender || null,
				created_at: null,
				updated_at: null,
				version: null,
			})) as Patient[]
		} catch (fallbackError) {
			console.error('Error en fallback de búsqueda:', fallbackError)
			return []
		}
	}
}

/**
 * Encontrar pacientes duplicados por número de cédula
 * Útil para limpiar duplicados existentes
 */
export const findDuplicatePatients = async () => {
	try {
		// Obtener todos los pacientes
		const { data: allPatients, error } = await supabase
			.from('patients')
			.select('id, cedula, nombre, created_at')
			.order('created_at', { ascending: true })

		if (error) {
			throw error
		}

		// Agrupar por número de cédula (sin prefijo)
		const groupedByNumber: Record<
			string,
			Array<{ id: string; cedula: string; nombre: string; created_at: string | null }>
		> = {}

		;(allPatients || [])
			.filter((p) => p.cedula != null && p.cedula !== '')
			.forEach((patient) => {
				const cedulaNumber = patient.cedula!.replace(/^[VEJC]-/, '')
				if (!groupedByNumber[cedulaNumber]) {
					groupedByNumber[cedulaNumber] = []
				}
				groupedByNumber[cedulaNumber].push(patient)
			})

		// Encontrar duplicados
		const duplicates: Array<{
			cedulaNumber: string
			patients: Array<{ id: string; cedula: string; nombre: string; created_at: string | null }>
		}> = []

		Object.entries(groupedByNumber).forEach(([cedulaNumber, patients]) => {
			if (patients.length > 1) {
				duplicates.push({ cedulaNumber, patients })
			}
		})

		return duplicates
	} catch (error) {
		console.error('Error buscando pacientes duplicados:', error)
		throw error
	}
}

/**
 * Consolidar pacientes duplicados
 * Mantiene el paciente más reciente y elimina los duplicados
 */
export const consolidateDuplicatePatients = async (
	duplicates: Array<{
		cedulaNumber: string
		patients: Array<{ id: string; cedula: string; nombre: string; created_at: string | null }>
	}>,
) => {
	try {
		const results = []

		for (const { cedulaNumber, patients } of duplicates) {
			// Ordenar por fecha de creación (más reciente primero)
			const sortedPatients = patients.sort((a, b) => {
				const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
				const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
				return dateB - dateA
			})

			const keepPatient = sortedPatients[0] // El más reciente
			const deletePatients = sortedPatients.slice(1) // Los duplicados

			console.log(`🔄 Consolidando cédula ${cedulaNumber}:`)
			console.log(`   ✅ Mantener: ${keepPatient.cedula} (${keepPatient.nombre})`)

			// Eliminar duplicados
			for (const patient of deletePatients) {
				console.log(`   ❌ Eliminar: ${patient.cedula} (${patient.nombre})`)

				const { error: deleteError } = await supabase.from('patients').delete().eq('id', patient.id)

				if (deleteError) {
					console.error(`Error eliminando paciente ${patient.id}:`, deleteError)
				} else {
					results.push({
						action: 'deleted',
						patient: patient,
						kept: keepPatient,
					})
				}
			}
		}

		return results
	} catch (error) {
		console.error('Error consolidando pacientes duplicados:', error)
		throw error
	}
}

/**
 * Activar o desactivar paciente (soft delete) - MULTI-TENANT
 * No elimina datos; solo oculta el paciente de listados cuando active = false
 * Registra en change_logs la desactivación/activación (quién y cuándo)
 */
export const setPatientActive = async (patientId: string, active: boolean): Promise<void> => {
	const laboratoryId = await getUserLaboratoryId()
	const updateData: { is_active: boolean; updated_at: string; deactivated_at?: string | null } = {
		is_active: active,
		updated_at: new Date().toISOString(),
	}
	if (!active) {
		updateData.deactivated_at = new Date().toISOString()
	} else {
		updateData.deactivated_at = null
	}
	const { data, error } = await supabase
		.from('patients')
		.update(updateData as any)
		.eq('id', patientId)
		.eq('laboratory_id', laboratoryId)
		.select('id')
		.single()

	if (error) {
		throw error
	}
	if (!data) {
		throw new PatientError('Paciente no encontrado o no pertenece al laboratorio', 'PATIENT_NOT_FOUND')
	}

	// Auditoría: registrar en change_logs (quién y cuándo activó/desactivó)
	try {
		const {
			data: { user },
		} = await supabase.auth.getUser()
		if (!user) return

		const { data: profile } = await supabase
			.from('profiles')
			.select('display_name, email')
			.eq('id', user.id)
			.single()

		const userEmail = profile?.email ?? user.email ?? 'unknown'
		const userDisplayName = profile?.display_name ?? 'Usuario'
		const changedAt = new Date().toISOString()

		const { error: logError } = await supabase.from('change_logs').insert({
			patient_id: patientId,
			laboratory_id: laboratoryId,
			entity_type: 'patient',
			field_name: 'is_active',
			field_label: 'Estado (activo/inactivo)',
			old_value: active ? 'Eliminado' : 'Activo',
			new_value: active ? 'Activo' : 'Eliminado',
			user_id: user.id,
			user_email: userEmail,
			user_display_name: userDisplayName,
			changed_at: changedAt,
			change_session_id: generateChangeSessionId(),
		})

		if (logError) {
			console.error('Error registrando en change_logs la activación/desactivación del paciente:', logError)
		}
	} catch (err) {
		console.error('Error en auditoría setPatientActive:', err)
		// No lanzar para no romper el flujo
	}
}

/**
 * Eliminar paciente - MULTI-TENANT
 * Verifica casos médicos y dependientes antes de eliminar
 * Retorna información sobre qué se eliminará
 */
export const deletePatient = async (
	patientId: string,
): Promise<{
	deleted: boolean
	casesCount: number
	dependentsCount: number
}> => {
	try {
		const laboratoryId = await getUserLaboratoryId()

		// Verificar casos médicos del paciente
		const { count: casesCount } = await supabase
			.from('medical_records_clean')
			.select('*', { count: 'exact', head: true })
			.eq('patient_id', patientId)
			.eq('laboratory_id', laboratoryId)

		// Verificar si es responsable (tiene dependientes)
		const { count: dependentsCount } = await supabase
			.from('responsabilidades' as any)
			.select('*', { count: 'exact', head: true })
			.eq('paciente_id_responsable', patientId)
			.eq('laboratory_id', laboratoryId)

		// Eliminar responsabilidades donde este paciente es dependiente
		await supabase
			.from('responsabilidades' as any)
			.delete()
			.eq('paciente_id_dependiente', patientId)
			.eq('laboratory_id', laboratoryId)

		// Eliminar responsabilidades donde este paciente es responsable (cascada)
		if (dependentsCount && dependentsCount > 0) {
			await supabase
				.from('responsabilidades' as any)
				.delete()
				.eq('paciente_id_responsable', patientId)
				.eq('laboratory_id', laboratoryId)
		}

		// Eliminar identificaciones del paciente
		await supabase
			.from('identificaciones' as any)
			.delete()
			.eq('paciente_id', patientId)
			.eq('laboratory_id', laboratoryId)

		// Eliminar el paciente (los casos se eliminan en cascada si hay FK constraint)
		const { error } = await supabase.from('patients').delete().eq('id', patientId).eq('laboratory_id', laboratoryId)

		if (error) {
			throw error
		}

		console.log('✅ Paciente eliminado exitosamente')
		return {
			deleted: true,
			casesCount: casesCount || 0,
			dependentsCount: dependentsCount || 0,
		}
	} catch (error) {
		console.error('❌ Error eliminando paciente:', error)
		throw error
	}
}
