// =====================================================================
// SERVICIO DE CASOS MÉDICOS - NUEVA ESTRUCTURA
// =====================================================================
// Servicios para manejar medical_records_clean con referencia a patients

import { supabase } from './supabase/config'
// import type { Database } from '@shared/types/types' // No longer used

// Tipos específicos para casos médicos (simplificados para evitar problemas de importación)
export interface MedicalCase {
	id: string
	patient_id: string | null
	exam_type: string
	origin: string
	treating_doctor: string
	sample_type: string
	number_of_samples: number
	relationship: string | null
	branch: string
	date: string
	code: string | null
	total_amount: number
	payment_status: 'Incompleto' | 'Pagado'
	remaining: number | null
	payment_method_1: string | null
	payment_amount_1: number | null
	payment_reference_1: string | null
	payment_method_2: string | null
	payment_amount_2: number | null
	payment_reference_2: string | null
	payment_method_3: string | null
	payment_amount_3: number | null
	payment_reference_3: string | null
	payment_method_4: string | null
	payment_amount_4: number | null
	payment_reference_4: string | null
	comments: string | null
	generated_by: string | null
	created_at: string | null
	updated_at: string | null
	// Campos adicionales del esquema original para compatibilidad
	log: string | null
	diagnostico: string | null
	inmunohistoquimica: string | null
	ims: string | null
	googledocs_url: string | null
	informepdf_url: string | null
	attachment_url: string | null
	doc_aprobado: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | undefined
	// Campos adicionales que existen en la tabla
	exchange_rate: number | null
	created_by: string | null
	created_by_display_name: string | null
	material_remitido: string | null
	informacion_clinica: string | null
	descripcion_macroscopica: string | null
	comentario: string | null
	pdf_en_ready: boolean | null
	informe_qr: string | null
	generated_by_display_name: string | null
	generated_at: string | null
	token: string | null
	cito_status: 'positivo' | 'negativo' | null // Nueva columna para estado citológico
}

export interface MedicalCaseInsert {
	id?: string
	patient_id?: string | null
	exam_type: string
	origin: string
	treating_doctor: string
	sample_type: string
	number_of_samples: number
	relationship?: string | null
	branch: string
	date: string
	code?: string | null
	total_amount: number
	payment_status: 'Incompleto' | 'Pagado'
	remaining?: number
	payment_method_1?: string | null
	payment_amount_1?: number | null
	payment_reference_1?: string | null
	payment_method_2?: string | null
	payment_amount_2?: number | null
	payment_reference_2?: string | null
	payment_method_3?: string | null
	payment_amount_3?: number | null
	payment_reference_3?: string | null
	payment_method_4?: string | null
	payment_amount_4?: number | null
	payment_reference_4?: string | null
	comments?: string | null
	generated_by?: string | null
	created_at?: string
	updated_at?: string
	// Campos adicionales que existen en la tabla
	exchange_rate?: number | null
	created_by?: string | null
	created_by_display_name?: string | null
	material_remitido?: string | null
	informacion_clinica?: string | null
	descripcion_macroscopica?: string | null
	diagnostico?: string | null
	comentario?: string | null
	pdf_en_ready?: boolean | null
	attachment_url?: string | null
	inmunohistoquimica?: string | null
	positivo?: string | null
	negativo?: string | null
	ki67?: string | null
	conclusion_diagnostica?: string | null
	generated_by_display_name?: string | null
	generated_at?: string | null
	log?: string | null
	ims?: string | null
	googledocs_url?: string | null
	informepdf_url?: string | null
	informe_qr?: string | null
	token?: string | null
	doc_aprobado?: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | undefined
	cito_status?: 'positivo' | 'negativo' | null // Nueva columna para estado citológico
}

export interface MedicalCaseUpdate {
	id?: string
	patient_id?: string | null
	exam_type?: string
	origin?: string
	treating_doctor?: string
	sample_type?: string
	number_of_samples?: number
	relationship?: string | null
	branch?: string
	date?: string
	code?: string
	total_amount?: number
	payment_status?: 'Incompleto' | 'Pagado'
	remaining?: number
	payment_method_1?: string | null
	payment_amount_1?: number | null
	payment_reference_1?: string | null
	payment_method_2?: string | null
	payment_amount_2?: number | null
	payment_reference_2?: string | null
	payment_method_3?: string | null
	payment_amount_3?: number | null
	payment_reference_3?: string | null
	payment_method_4?: string | null
	payment_amount_4?: number | null
	payment_reference_4?: string | null
	comments?: string | null
	generated_by?: string | null
	created_at?: string
	updated_at?: string
	// Campos adicionales que existen en la tabla
	exchange_rate?: number | null
	created_by?: string | null
	created_by_display_name?: string | null
	material_remitido?: string | null
	informacion_clinica?: string | null
	descripcion_macroscopica?: string | null
	diagnostico?: string | null
	comentario?: string | null
	pdf_en_ready?: boolean | null
	attachment_url?: string | null
	inmunohistoquimica?: string | null
	positivo?: string | null
	negativo?: string | null
	ki67?: string | null
	conclusion_diagnostica?: string | null
	generated_by_display_name?: string | null
	generated_at?: string | null
	log?: string | null
	ims?: string | null
	googledocs_url?: string | null
	informepdf_url?: string | null
	informe_qr?: string | null
	token?: string | null
	doc_aprobado?: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | undefined
	cito_status?: 'positivo' | 'negativo' | null // Nueva columna para estado citológico
}

// Tipo para casos médicos con información del paciente (usando JOIN directo)
export interface MedicalCaseWithPatient {
	// Campos de medical_records_clean
	id: string
	patient_id: string | null
	exam_type: string
	origin: string
	treating_doctor: string
	sample_type: string
	number_of_samples: number
	relationship: string | null
	branch: string
	date: string
	total_amount: number
	exchange_rate: number | null
	payment_status: 'Incompleto' | 'Pagado'
	remaining: number
	payment_method_1: string | null
	payment_amount_1: number | null
	payment_reference_1: string | null
	payment_method_2: string | null
	payment_amount_2: number | null
	payment_reference_2: string | null
	payment_method_3: string | null
	payment_amount_3: number | null
	payment_reference_3: string | null
	payment_method_4: string | null
	payment_amount_4: number | null
	payment_reference_4: string | null
	comments: string | null
	code: string | null
	created_at: string | null
	updated_at: string | null
	created_by: string | null
	created_by_display_name: string | null
	material_remitido: string | null
	informacion_clinica: string | null
	descripcion_macroscopica: string | null
	diagnostico: string | null
	comentario: string | null
	pdf_en_ready: boolean | null
	attachment_url: string | null
	doc_aprobado: 'faltante' | 'pendiente' | 'aprobado' | 'rechazado' | null
	generated_by: string | null
	version: number | null
	cito_status: 'positivo' | 'negativo' | null // Nueva columna para estado citológico
	// Campos de patients
	cedula: string
	nombre: string
	edad: string | null
	telefono: string | null
	patient_email: string | null
}

// =====================================================================
// FUNCIONES DEL SERVICIO DE CASOS MÉDICOS
// =====================================================================

/**
 * Crear nuevo caso médico
 */
export const createMedicalCase = async (caseData: MedicalCaseInsert): Promise<MedicalCase> => {
	try {
		// Validar que patient_id esté presente
		if (!caseData.patient_id) {
			throw new Error('patient_id es requerido para crear un caso médico')
		}

		// Remove auto-generated fields for insert
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { created_at, updated_at, ...insertData } = caseData
		const { data, error } = await supabase.from('medical_records_clean').insert(insertData).select().single()

		if (error) {
			throw error
		}

		// Registrar la creación en change_logs
		if (data && caseData.created_by) {
			try {
				// Obtener información del usuario
				const { data: user } = await supabase.auth.getUser()
				const { data: profile } = await supabase
					.from('profiles')
					.select('display_name, email')
					.eq('id', caseData.created_by)
					.single()

				const userEmail = profile?.email || user.user?.email || 'unknown@email.com'
				const userDisplayName = profile?.display_name || user.user?.user_metadata?.display_name || 'Usuario'

				const changeLog = {
					medical_record_id: data.id,
					user_id: caseData.created_by,
					user_email: userEmail,
					user_display_name: userDisplayName,
					field_name: 'created_record',
					field_label: 'Registro Creado',
					old_value: null,
					new_value: `Registro médico creado: ${data.code || data.id}`,
					changed_at: new Date().toISOString(),
					entity_type: 'medical_case',
				}

				const { error: logError } = await supabase.from('change_logs').insert(changeLog)
				if (logError) {
					console.error('Error logging case creation:', logError)
				} else {
					console.log('✅ Changelog de creación registrado')
				}
			} catch (logError) {
				console.error('Error logging case creation:', logError)
				// Continue even if logging fails
			}
		}

		console.log('✅ Caso médico creado exitosamente:', data)
		return data as MedicalCase
	} catch (error) {
		console.error('❌ Error creando caso médico:', error)
		throw error
	}
}

/**
 * Obtener casos médicos por patient_id
 */
export const getCasesByPatientId = async (patientId: string): Promise<MedicalCase[]> => {
	try {
		const { data, error } = await supabase
			.from('medical_records_clean')
			.select('*')
			.eq('patient_id', patientId)
			.order('created_at', { ascending: false })

		if (error) {
			throw error
		}

		return (data || []) as MedicalCase[]
	} catch (error) {
		console.error('Error obteniendo casos por paciente:', error)
		throw error
	}
}

/**
 * Obtener caso médico por ID
 */
export const getCaseById = async (caseId: string): Promise<MedicalCase | null> => {
	try {
		const { data, error } = await supabase.from('medical_records_clean').select('*').eq('id', caseId).single()

		if (error) {
			if (error.code === 'PGRST116') {
				return null
			}
			throw error
		}

		return data as MedicalCase
	} catch (error) {
		console.error('Error obteniendo caso por ID:', error)
		throw error
	}
}

/**
 * Obtener casos médicos con información del paciente (usando JOIN directo)
 */
export const getCasesWithPatientInfo = async (
	page = 1,
	limit = 50,
	filters?: {
		searchTerm?: string
		branch?: string
		dateFrom?: string
		dateTo?: string
		examType?: string
		paymentStatus?: 'Incompleto' | 'Pagado'
	},
) => {
	try {
		// Construir la consulta con JOIN directo
		let query = supabase.from('medical_records_clean').select(
			`
				*,
				patients!inner(
					cedula,
					nombre,
					edad,
					telefono,
					email
				)
			`,
			{ count: 'exact' },
		)

		// Aplicar filtros
		if (filters?.searchTerm) {
			// Limpiar y validar el término de búsqueda
			const cleanSearchTerm = filters.searchTerm.trim()
			console.log('🔍 [DEBUG] Término de búsqueda original:', filters.searchTerm)
			console.log('🔍 [DEBUG] Término de búsqueda limpio:', cleanSearchTerm)
			if (cleanSearchTerm) {
				// Escapar caracteres especiales que pueden causar problemas en PostgREST
				const escapedSearchTerm = cleanSearchTerm.replace(/[%_\\]/g, '\\$&')
				console.log('🔍 [DEBUG] Término de búsqueda escapado:', escapedSearchTerm)

				// Usar una aproximación más simple con ilike en lugar de OR complejo
				// Esto evita problemas de parsing en PostgREST
				query = query.or(
					`patients.nombre.ilike.%${escapedSearchTerm}%,patients.cedula.ilike.%${escapedSearchTerm}%,treating_doctor.ilike.%${escapedSearchTerm}%,exam_type.ilike.%${escapedSearchTerm}%,code.ilike.%${escapedSearchTerm}%`,
				)
				console.log('🔍 [DEBUG] Aplicando filtro de búsqueda para:', escapedSearchTerm)
			}
		}

		if (filters?.branch) {
			query = query.eq('branch', filters.branch)
		}

		if (filters?.dateFrom) {
			query = query.gte('date', filters.dateFrom)
		}

		if (filters?.dateTo) {
			query = query.lte('date', filters.dateTo)
		}

		if (filters?.examType) {
			query = query.eq('exam_type', filters.examType)
		}

		if (filters?.paymentStatus) {
			query = query.eq('payment_status', filters.paymentStatus)
		}

		// Paginación
		const from = (page - 1) * limit
		const to = from + limit - 1

		const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })

		if (error) {
			throw error
		}

		// Transformar los datos para que coincidan con la interfaz
		const transformedData = (data || []).map((item: any) => ({
			...item,
			cedula: item.patients?.cedula || '',
			nombre: item.patients?.nombre || '',
			edad: item.patients?.edad || null,
			telefono: item.patients?.telefono || null,
			patient_email: item.patients?.email || null,
			version: item.version || null,
		})) as MedicalCaseWithPatient[]

		return {
			data: transformedData,
			count: count || 0,
			page,
			limit,
			totalPages: Math.ceil((count || 0) / limit),
		}
	} catch (error) {
		console.error('Error obteniendo casos con información del paciente:', error)
		throw error
	}
}

/**
 * Obtener TODOS los casos médicos con información del paciente (sin límite de paginación)
 * Esta función maneja automáticamente la paginación para obtener todos los registros
 */
export const getAllCasesWithPatientInfo = async (filters?: {
	searchTerm?: string
	branch?: string
	dateFrom?: string
	dateTo?: string
	examType?: string
	paymentStatus?: 'Incompleto' | 'Pagado'
}) => {
	try {
		// Si hay un término de búsqueda, usar una aproximación diferente para evitar problemas de parsing
		if (filters?.searchTerm) {
			const cleanSearchTerm = filters.searchTerm.trim()
			console.log('🔍 [DEBUG] Término de búsqueda original:', filters.searchTerm)
			console.log('🔍 [DEBUG] Término de búsqueda limpio:', cleanSearchTerm)

			if (cleanSearchTerm) {
				// Escapar caracteres especiales
				const escapedSearchTerm = cleanSearchTerm.replace(/[%_\\]/g, '\\$&')
				console.log('🔍 [DEBUG] Término de búsqueda escapado:', escapedSearchTerm)

				// Hacer múltiples consultas separadas y combinar resultados
				const searchPromises = [
					// Búsqueda por nombre del paciente
					supabase
						.from('medical_records_clean')
						.select(
							`
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
						)
						.ilike('patients.nombre', `%${escapedSearchTerm}%`)
						.order('created_at', { ascending: false }),

					// Búsqueda por cédula del paciente
					supabase
						.from('medical_records_clean')
						.select(
							`
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
						)
						.ilike('patients.cedula', `%${escapedSearchTerm}%`)
						.order('created_at', { ascending: false }),

					// Búsqueda por médico tratante
					supabase
						.from('medical_records_clean')
						.select(
							`
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
						)
						.ilike('treating_doctor', `%${escapedSearchTerm}%`)
						.order('created_at', { ascending: false }),

					// Búsqueda por tipo de examen
					supabase
						.from('medical_records_clean')
						.select(
							`
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
						)
						.ilike('exam_type', `%${escapedSearchTerm}%`)
						.order('created_at', { ascending: false }),

					// Búsqueda por código
					supabase
						.from('medical_records_clean')
						.select(
							`
							*,
							patients!inner(
								cedula,
								nombre,
								edad,
								telefono,
								email
							)
						`,
						)
						.ilike('code', `%${escapedSearchTerm}%`)
						.order('created_at', { ascending: false }),
				]

				// Ejecutar todas las consultas en paralelo
				const results = await Promise.all(searchPromises)

				// Verificar errores
				for (const result of results) {
					if (result.error) {
						throw result.error
					}
				}

				// Combinar y deduplicar resultados
				const allResults = results.flatMap((result) => result.data || [])
				const uniqueResults = new Map()

				for (const item of allResults) {
					uniqueResults.set(item.id, item)
				}

				// Transformar los datos
				const transformedData = Array.from(uniqueResults.values()).map((item: any) => ({
					...item,
					cedula: item.patients?.cedula || '',
					nombre: item.patients?.nombre || '',
					edad: item.patients?.edad || null,
					telefono: item.patients?.telefono || null,
					patient_email: item.patients?.email || null,
					version: item.version || null,
				})) as MedicalCaseWithPatient[]

				// Aplicar otros filtros si existen
				let filteredData = transformedData

				if (filters?.branch) {
					filteredData = filteredData.filter((item) => item.branch === filters.branch)
				}

				if (filters?.dateFrom) {
					filteredData = filteredData.filter((item) => item.date >= filters.dateFrom!)
				}

				if (filters?.dateTo) {
					filteredData = filteredData.filter((item) => item.date <= filters.dateTo!)
				}

				if (filters?.examType) {
					filteredData = filteredData.filter((item) => item.exam_type === filters.examType)
				}

				if (filters?.paymentStatus) {
					filteredData = filteredData.filter((item) => item.payment_status === filters.paymentStatus)
				}

				console.log(`✅ Obtenidos ${filteredData.length} casos médicos con búsqueda`)

				return {
					data: filteredData,
					count: filteredData.length,
					page: 1,
					limit: filteredData.length,
					totalPages: 1,
				}
			}
		}

		// Si no hay término de búsqueda, usar la consulta normal
		const allData: MedicalCaseWithPatient[] = []
		let page = 1
		const pageSize = 1000
		let hasMoreData = true
		let totalCount = 0

		while (hasMoreData) {
			let query = supabase.from('medical_records_clean').select(
				`
					*,
					patients!inner(
						cedula,
						nombre,
						edad,
						telefono,
						email
					)
				`,
				{ count: 'exact' },
			)

			// Aplicar otros filtros
			if (filters?.branch) {
				query = query.eq('branch', filters.branch)
			}

			if (filters?.dateFrom) {
				query = query.gte('date', filters.dateFrom)
			}

			if (filters?.dateTo) {
				query = query.lte('date', filters.dateTo)
			}

			if (filters?.examType) {
				query = query.eq('exam_type', filters.examType)
			}

			if (filters?.paymentStatus) {
				query = query.eq('payment_status', filters.paymentStatus)
			}

			// Paginación
			const from = (page - 1) * pageSize
			const to = from + pageSize - 1

			const { data, error, count } = await query.range(from, to).order('created_at', { ascending: false })

			if (error) {
				throw error
			}

			if (page === 1) {
				totalCount = count || 0
			}

			const transformedData = (data || []).map((item: any) => ({
				...item,
				cedula: item.patients?.cedula || '',
				nombre: item.patients?.nombre || '',
				edad: item.patients?.edad || null,
				telefono: item.patients?.telefono || null,
				patient_email: item.patients?.email || null,
				version: item.version || null,
			})) as MedicalCaseWithPatient[]

			allData.push(...transformedData)
			hasMoreData = transformedData.length === pageSize && allData.length < totalCount
			page++

			if (page > 100) {
				console.warn('Límite de páginas alcanzado para evitar bucles infinitos')
				break
			}
		}

		console.log(`✅ Obtenidos ${allData.length} casos médicos de ${totalCount} totales`)

		return {
			data: allData,
			count: totalCount,
			page: 1,
			limit: allData.length,
			totalPages: 1,
		}
	} catch (error) {
		console.error('Error obteniendo todos los casos con información del paciente:', error)
		throw error
	}
}

/**
 * Actualizar caso médico
 */
export const updateMedicalCase = async (
	caseId: string,
	updates: MedicalCaseUpdate,
	userId?: string,
): Promise<MedicalCase> => {
	try {
		// Obtener datos actuales para detectar cambios
		const currentCase = await getCaseById(caseId)
		if (!currentCase) {
			throw new Error('Caso médico no encontrado')
		}

		// Actualizar caso
		const { data, error } = await supabase
			.from('medical_records_clean')
			.update({
				...updates,
				updated_at: new Date().toISOString(),
			})
			.eq('id', caseId)
			.select()
			.single()

		if (error) {
			throw error
		}

		// Registrar cambios en change_logs si hay userId
		if (userId) {
			await logMedicalCaseChanges(caseId, currentCase, updates, userId)
		}

		console.log('✅ Caso médico actualizado exitosamente:', data)
		return data as MedicalCase
	} catch (error) {
		console.error('❌ Error actualizando caso médico:', error)
		throw error
	}
}

/**
 * Registrar cambios de caso médico en change_logs
 */
const logMedicalCaseChanges = async (
	caseId: string,
	oldData: MedicalCase,
	newData: MedicalCaseUpdate,
	userId: string,
) => {
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
			exam_type: 'Tipo de Examen',
			origin: 'Origen',
			treating_doctor: 'Doctor Tratante',
			sample_type: 'Tipo de Muestra',
			number_of_samples: 'Número de Muestras',
			relationship: 'Parentesco',
			branch: 'Sucursal',
			date: 'Fecha',
			total_amount: 'Monto Total',
			exchange_rate: 'Tasa de Cambio',
			payment_status: 'Estado de Pago',
			remaining: 'Monto Restante',
			comments: 'Comentarios',
			material_remitido: 'Material Remitido',
			informacion_clinica: 'Información Clínica',
			descripcion_macroscopica: 'Descripción Macroscópica',
			diagnostico: 'Diagnóstico',
			comentario: 'Comentario',
		}

		// Detectar cambios
		for (const [field, newValue] of Object.entries(newData)) {
			if (field === 'updated_at') continue

			const oldValue = oldData[field as keyof MedicalCase]

			if (oldValue !== newValue) {
				changes.push({
					medical_record_id: caseId,
					entity_type: 'medical_case',
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
				console.error('Error registrando cambios del caso médico:', error)
			} else {
				console.log(`✅ ${changes.length} cambios registrados para el caso médico`)
			}
		}
	} catch (error) {
		console.error('Error en logMedicalCaseChanges:', error)
	}
}

/**
 * Buscar casos médicos por código
 */
export const findCaseByCode = async (code: string): Promise<MedicalCaseWithPatient | null> => {
	try {
		const { data, error } = await supabase
			.from('medical_records_clean')
			.select(
				`
				*,
				patients(
					id,
					cedula,
					nombre,
					edad,
					telefono,
					email
				)
			`,
			)
			.eq('code', code)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				return null
			}
			throw error
		}

		// Transformar los datos para que coincidan con la interfaz
		const transformedData = {
			...data,
			patient_id: (data as any).patients?.id || data.patient_id,
			cedula: (data as any).patients?.cedula || '',
			nombre: (data as any).patients?.nombre || '',
			edad: (data as any).patients?.edad || null,
			telefono: (data as any).patients?.telefono || null,
			patient_email: (data as any).patients?.email || null,
			version: (data as any).version || null,
			// Asegurar que todas las propiedades requeridas estén presentes
			material_remitido: (data as any).material_remitido || null,
			informacion_clinica: (data as any).informacion_clinica || null,
			descripcion_macroscopica: (data as any).descripcion_macroscopica || null,
			diagnostico: (data as any).diagnostico || null,
			comentario: (data as any).comentario || null,
		} as MedicalCaseWithPatient

		return transformedData
	} catch (error) {
		console.error('Error buscando caso por código:', error)
		throw error
	}
}

/**
 * Obtener estadísticas de casos médicos
 */
export const getMedicalCasesStats = async (filters?: { dateFrom?: string; dateTo?: string; branch?: string }) => {
	try {
		let query = supabase.from('medical_records_clean').select('total_amount, payment_status, exam_type, branch, date')

		// Aplicar filtros
		if (filters?.dateFrom) {
			query = query.gte('date', filters.dateFrom)
		}

		if (filters?.dateTo) {
			query = query.lte('date', filters.dateTo)
		}

		if (filters?.branch) {
			query = query.eq('branch', filters.branch)
		}

		const { data, error } = await query

		if (error) {
			throw error
		}

		// Calcular estadísticas
		const stats = {
			totalCases: data?.length || 0,
			totalRevenue: data?.reduce((sum, case_) => sum + (case_.total_amount || 0), 0) || 0,
			paidCases: data?.filter((case_) => case_.payment_status === 'Pagado').length || 0,
			pendingCases: data?.filter((case_) => case_.payment_status === 'Incompleto').length || 0,
			examTypeBreakdown: {} as Record<string, number>,
			branchBreakdown: {} as Record<string, number>,
		}

		// Agrupar por tipo de examen
		data?.forEach((case_) => {
			if (case_.exam_type) {
				stats.examTypeBreakdown[case_.exam_type] = (stats.examTypeBreakdown[case_.exam_type] || 0) + 1
			}
		})

		// Agrupar por sucursal
		data?.forEach((case_) => {
			if (case_.branch) {
				stats.branchBreakdown[case_.branch] = (stats.branchBreakdown[case_.branch] || 0) + 1
			}
		})

		return stats
	} catch (error) {
		console.error('Error obteniendo estadísticas de casos médicos:', error)
		throw error
	}
}

/**
 * Eliminar un caso médico
 */
export const deleteMedicalCase = async (caseId: string): Promise<{ success: boolean; error?: string }> => {
	try {
		if (!caseId) {
			return { success: false, error: 'ID del caso requerido' }
		}

		// Primero verificar que el caso existe y obtener más información
		const { data: existingCase, error: fetchError } = await supabase
			.from('medical_records_clean')
			.select('id, code, patient_id, exam_type')
			.eq('id', caseId)
			.single()

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				return { success: false, error: 'Caso no encontrado' }
			}
			throw fetchError
		}

		// Obtener información del usuario actual
		const {
			data: { user },
		} = await supabase.auth.getUser()
		if (!user) {
			return { success: false, error: 'Usuario no autenticado' }
		}

		// Obtener información del perfil del usuario
		const { data: profile } = await supabase.from('profiles').select('display_name, email').eq('id', user.id).single()

		const userEmail = profile?.email || user.email || 'unknown@email.com'
		const userDisplayName = profile?.display_name || user.user_metadata?.display_name || 'Usuario'

		// Crear el log de eliminación ANTES de eliminar el caso
		const recordInfo = `${existingCase.code || 'Sin código'} - ${existingCase.exam_type || 'Sin tipo de examen'}`

		const changeLog = {
			medical_record_id: existingCase.id,
			patient_id: existingCase.patient_id,
			user_id: user.id,
			user_email: userEmail,
			user_display_name: userDisplayName,
			field_name: 'deleted_record',
			field_label: 'Registro Eliminado',
			old_value: recordInfo,
			new_value: null,
			deleted_record_info: recordInfo,
			changed_at: new Date().toISOString(),
			entity_type: 'medical_case',
		}

		// Insertar el log de eliminación
		const { error: logError } = await supabase.from('change_logs').insert(changeLog)
		if (logError) {
			console.error('Error logging case deletion:', logError)
			// Continue with deletion even if logging fails
		} else {
			console.log('✅ Changelog de eliminación registrado')
		}

		// Eliminar el caso médico
		const { error: deleteError } = await supabase.from('medical_records_clean').delete().eq('id', caseId)

		if (deleteError) {
			throw deleteError
		}

		console.log(`✅ Caso médico ${existingCase.code || caseId} eliminado exitosamente`)
		return { success: true }
	} catch (error) {
		console.error('Error eliminando caso médico:', error)
		const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
		return { success: false, error: errorMessage }
	}
}
