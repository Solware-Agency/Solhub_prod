import { supabase } from '@lib/supabase/config'
// Legacy imports removed - using new structure

// Usar el tipo unificado de types.ts
export type MedicalRecord = import('@shared/types/types').MedicalRecord

export interface CustomError extends Error {
	code?: string
	details?: unknown
}

export interface ChangeLog {
	id?: string
	medical_record_id?: string | null
	patient_id?: string | null
	entity_type?: string | null
	user_id: string
	user_email: string
	user_display_name: string | null
	field_name: string
	field_label: string
	old_value: string | null
	new_value: string | null
	changed_at: string
	deleted_record_info?: string | null
	created_at?: string
	log?: string | null
}

// Result row type for getAllChangeLogs with joined case info
export interface ChangeLogJoined {
	id: string
	medical_record_id: string | null
	patient_id: string | null // Nueva columna
	entity_type: string | null // Nueva columna: 'patient' o 'medical_case'
	user_id: string
	user_email: string
	user_display_name: string | null
	field_name: string
	field_label: string
	old_value: string | null
	new_value: string | null
	changed_at: string
	created_at: string | null
	deleted_record_info?: string | null
	medical_records_clean?: {
		id: string | null
		code: string | null
		patient_id: string | null
	} | null
	patients?: {
		id: string | null
		nombre: string | null
		cedula: string | null
	} | null
}

// Helper function to format age display
export const getAgeDisplay = (edad: string | null): string => {
	if (!edad) return 'Sin edad'
	return edad
}

// Nombre de la tabla nueva y limpia
const TABLE_NAME = 'medical_records_clean'
const CHANGE_LOG_TABLE = 'change_logs'

export const testConnection = async () => {
	try {
		console.log(`🔍 Probando conexión con Supabase (tabla ${TABLE_NAME})...`)

		const { data, error } = await supabase.from(TABLE_NAME).select('count', { count: 'exact', head: true })

		if (error) {
			console.error('❌ Error en test de conexión:', error)
			return { success: false, error }
		}

		console.log(`✅ Test de conexión exitoso con tabla ${TABLE_NAME}`)
		return { success: true, data }
	} catch (error) {
		console.error('❌ Error inesperado en test de conexión:', error)
		return { success: false, error }
	}
}

// LEGACY FUNCTION - NO LONGER USED WITH NEW STRUCTURE
// Using registration-service.ts instead
/*
export const insertMedicalRecord = async (
	formData: FormValues,
	exchangeRate?: number,
): Promise<{ data: MedicalRecord | null; error: CustomError | null }> => {
	try {
		console.log(`🚀 Iniciando inserción en tabla ${TABLE_NAME}...`)

		// Primero probamos la conexión
		const connectionTest = await testConnection()
		if (!connectionTest.success) {
			console.error('❌ Fallo en test de conexión:', connectionTest.error)
			return {
				data: null,
				error: {
					name: 'CustomError',
					message: 'No se pudo conectar con la base de datos. Verifica tu conexión a internet.',
					code: 'CONNECTION_FAILED',
					details: connectionTest.error,
				},
			}
		}

		const submissionData = prepareSubmissionData(formData, exchangeRate)
		console.log(`📋 Datos preparados para ${TABLE_NAME}:`, submissionData)

		// Ensure total_amount is at least 0.01 to comply with database constraint
		if (submissionData.total_amount <= 0) {
			submissionData.total_amount = 0.01
			console.log('⚠️ Total amount was 0 or negative, adjusted to 0.01 to comply with database constraint')
		}

		// El código ahora lo genera la BD vía trigger BEFORE INSERT
		console.log('🔢 Código se generará en la BD (trigger)')

		// Get current user info for tracking who created the record
		const {
			data: { user },
		} = await supabase.auth.getUser()

		// Get user's display name from profiles
		let displayName = null
		if (user) {
			const { data: profileData } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()

			displayName = profileData?.display_name || user.user_metadata?.display_name || null
		}

		// Convertir los datos preparados para que coincidan con el esquema de la base de datos
		const recordData: MedicalRecordInsert = {
			full_name: submissionData.full_name,
			id_number: submissionData.id_number,
			phone: submissionData.phone,
			edad: submissionData.edad,
			email: submissionData.email || undefined,
			date: submissionData.date,
			exam_type: submissionData.exam_type,
			origin: submissionData.origin,
			treating_doctor: submissionData.treating_doctor,
			sample_type: submissionData.sample_type,
			number_of_samples: submissionData.number_of_samples,
			relationship: submissionData.relationship || undefined,
			branch: submissionData.branch,
			total_amount: submissionData.total_amount,
			exchange_rate: submissionData.exchange_rate || undefined,
			payment_status: submissionData.payment_status as 'Incompleto' | 'Pagado',
			remaining: submissionData.remaining,
			payment_method_1: submissionData.payment_method_1,
			payment_amount_1: submissionData.payment_amount_1,
			payment_reference_1: submissionData.payment_reference_1,
			payment_method_2: submissionData.payment_method_2,
			payment_amount_2: submissionData.payment_amount_2,
			payment_reference_2: submissionData.payment_reference_2,
			payment_method_3: submissionData.payment_method_3,
			payment_amount_3: submissionData.payment_amount_3,
			payment_reference_3: submissionData.payment_reference_3,
			payment_method_4: submissionData.payment_method_4,
			payment_amount_4: submissionData.payment_amount_4,
			payment_reference_4: submissionData.payment_reference_4,
			comments: submissionData.comments || undefined,
			// code: lo generará la BD mediante trigger
			created_by: user?.id || undefined,
			created_by_display_name: displayName || undefined,
			material_remitido: undefined,
			informacion_clinica: undefined,
			descripcion_macroscopica: undefined,
			diagnostico: undefined,
			comentario: undefined,
			pdf_en_ready: false,
		}

		console.log(`💾 Insertando datos en tabla ${TABLE_NAME}:`, recordData)

		const { data, error } = await supabase.from(TABLE_NAME).insert([recordData]).select().single()

		if (error) {
			console.error(`❌ Error insertando en ${TABLE_NAME}:`, error)

			// Manejo específico de errores
			if (error.code === 'PGRST116') {
				return {
					data: null,
					error: {
						name: 'CustomError',
						message: `La tabla ${TABLE_NAME} no existe. Ejecuta la migración create_medical_records_clean.sql`,
						code: 'TABLE_NOT_EXISTS',
						details: error,
					},
				}
			}

			if (error.code === '42P01') {
				return {
					data: null,
					error: {
						name: 'CustomError',
						message: `Error de base de datos: tabla ${TABLE_NAME} no encontrada.`,
						code: 'TABLE_NOT_FOUND',
						details: error,
					},
				}
			}

			if (error.code === '23514') {
				// Check if it's specifically the total_amount constraint
				if (error.message.includes('medical_records_clean_total_amount_check')) {
					return {
						data: null,
						error: {
							name: 'CustomError',
							message: 'Error: El monto total debe ser mayor a cero. Por favor ingresa un valor válido.',
							code: 'TOTAL_AMOUNT_CONSTRAINT',
							details: error,
						},
					}
				}

				return {
					data: null,
					error: {
						name: 'CustomError',
						message: 'Error de validación: verifica que todos los campos cumplan las restricciones.',
						code: 'VALIDATION_ERROR',
						details: error,
					},
				}
			}

			// Check for unique constraint violation on code
			if (error.code === '23505' && error.message.includes('code')) {
				return {
					data: null,
					error: {
						name: 'CustomError',
						message: 'Error: Se generó un código duplicado. Inténtalo de nuevo.',
						code: 'DUPLICATE_CODE',
						details: error,
					},
				}
			}

			const customError = error as CustomError
			return { data: null, error: customError }
		}
		console.log(`✅ Registro médico insertado exitosamente en ${TABLE_NAME}:`, data)
		console.log(`🎯 Código asignado: ${data.code}`)

		// If user is available, log the creation in change_logs
		if (user) {
			try {
				await saveChangeLog(data.id, user.id, user.email || 'unknown@email.com', [
					{
						field: 'created_record',
						fieldLabel: 'Registro Creado',
						oldValue: null,
						newValue: `Registro médico creado: ${data.code || data.id}`,
					},
				])
			} catch (logError) {
				console.error('Error logging record creation:', logError)
				// Continue even if logging fails
			}
		}

		return { data: data as MedicalRecord, error: null }
	} catch (error) {
		console.error(`❌ Error inesperado insertando en ${TABLE_NAME}:`, error)

		// Si es un error de red
		if (error instanceof TypeError && String(error).includes('fetch')) {
			return {
				data: null,
				error: {
					name: 'CustomError',
					message: 'Error de conexión de red. Verifica tu conexión a internet.',
					code: 'NETWORK_ERROR',
					details: error,
				},
			}
		}

		return { data: null, error: error as CustomError }
	}
}
*/

export const getMedicalRecords = async () => {
	try {
		// Fetch all records without pagination
		const { data, error } = await supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false })

		return { data, error }
	} catch (error) {
		console.error(`Error fetching ${TABLE_NAME}:`, error)
		return { data: null, error }
	}
}

export const getMedicalRecordById = async (id: string) => {
	try {
		const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('id', id).maybeSingle()

		return { data, error }
	} catch (error) {
		console.error(`Error fetching record from ${TABLE_NAME}:`, error)
		return { data: null, error }
	}
}

export const searchMedicalRecords = async (searchTerm: string) => {
	try {
		// Search all records without pagination
		const { data, error } = await supabase
			.from(TABLE_NAME)
			.select('*')
			.or(
				`full_name.ilike.%${searchTerm}%, id_number.ilike.%${searchTerm}%, phone.ilike.%${searchTerm}%, code.ilike.%${searchTerm}%, treating_doctor.ilike.%${searchTerm}%`,
			)
			.order('created_at', { ascending: false })

		return { data, error }
	} catch (error) {
		console.error(`Error searching ${TABLE_NAME}:`, error)
		return { data: null, error }
	}
}

// LEGACY FUNCTION - NO LONGER USED WITH NEW STRUCTURE  
// Using medical-cases-service.ts instead
/*
export const updateMedicalRecord = async (id: string, updates: Partial<MedicalRecord>) => {
	try {
		console.log(`🔄 Updating medical record ${id} in ${TABLE_NAME}:`, updates)

		// Get the current record to calculate payment status
		const { data: currentRecord, error: fetchError } = await getMedicalRecordById(id)
		if (fetchError || !currentRecord) {
			console.error(`❌ Error fetching current record:`, fetchError)
			return { data: null, error: fetchError }
		}

		// Merge current record with updates to get the complete updated record
		const updatedRecord = { ...currentRecord, ...updates }

		// Calculate payment status and remaining amount based on the updated payment information
		const { paymentStatus, missingAmount } = calculatePaymentDetailsFromRecord(updatedRecord)

		// Add calculated fields and timestamp to updates
		const updatesWithCalculations = {
			...updates,
			payment_status: 'Incompleto',
			remaining: missingAmount,
			updated_at: new Date().toISOString(),
		}

		console.log(`💰 Calculated payment status: ${paymentStatus}, remaining: ${missingAmount}`)

		const { data, error } = await supabase
			.from(TABLE_NAME)
			.update(updatesWithCalculations)
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error(`❌ Error updating record in ${TABLE_NAME}:`, error)
			return { data: null, error }
		}

			console.log(`✅ Medical record updated successfully in ${TABLE_NAME}:`, data)
	return { data, error: null }
} catch (error) {
	console.error(`❌ Error updating record in ${TABLE_NAME}:`, error)
	return { data: null, error }
}
}
*/

export const deleteMedicalRecord = async (id: string) => {
	try {
		console.log(`🗑️ Deleting medical record ${id} from ${TABLE_NAME}`)

		// Get record details before deleting for the log
		const { error: fetchError } = await getMedicalRecordById(id)

		// If record doesn't exist, treat as successful deletion
		if (fetchError && typeof fetchError === 'object' && 'code' in fetchError && fetchError.code === 'PGRST116') {
			console.log(`⚠️ Record ${id} not found, treating as already deleted`)
			return { data: null, error: null }
		}

		if (fetchError) {
			console.error(`❌ Error fetching record before deletion:`, fetchError)
			return { data: null, error: fetchError }
		}

		// The trigger will automatically create the deletion log
		// No need to manually log the deletion here

		// Perform the actual deletion
		const { data, error } = await supabase.from(TABLE_NAME).delete().eq('id', id).select()

		if (error) {
			console.error(`❌ Error deleting record from ${TABLE_NAME}:`, error)
			return { data: null, error }
		}

		// Check if any records were deleted
		if (!data || data.length === 0) {
			console.log(`⚠️ No records were deleted for ID ${id} - record may not exist`)
			return { data: null, error: null }
		}

		console.log(`✅ Medical record deleted successfully from ${TABLE_NAME}:`, data[0])
		return { data: data[0], error: null }
	} catch (error) {
		console.error(`❌ Error deleting record from ${TABLE_NAME}:`, error)
		return { data: null, error }
	}
}

// Function to save change logs
export const saveChangeLog = async (
	medicalRecordId: string,
	userId: string,
	userEmail: string,
	changes: Array<{
		field: string
		fieldLabel: string
		oldValue: string | number | boolean | null
		newValue: string | number | boolean | null
	}>,
) => {
	try {
		console.log('💾 Saving change logs for record:', medicalRecordId)

		// Fetch display name to store alongside logs (best-effort; optional)
		let userDisplayName: string | null = null
		try {
			const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).single()
			userDisplayName = profile?.display_name ?? null
		} catch {
			// ignore profile lookup errors
		}

		const changeLogEntries = changes.map((change) => ({
			medical_record_id: medicalRecordId,
			user_id: userId,
			user_email: userEmail,
			user_display_name: userDisplayName,
			field_name: change.field,
			field_label: change.fieldLabel,
			old_value: change.oldValue === null || change.oldValue === undefined ? null : String(change.oldValue),
			new_value: change.newValue === null || change.newValue === undefined ? null : String(change.newValue),
			changed_at: new Date().toISOString(),
		}))

		const { data, error } = await supabase.from(CHANGE_LOG_TABLE).insert(changeLogEntries).select()

		if (error) {
			console.error('❌ Error saving change logs:', error)
			return { data: null, error }
		}

		console.log('✅ Change logs saved successfully:', data)
		return { data, error: null }
	} catch (error) {
		console.error('❌ Unexpected error saving change logs:', error)
		return { data: null, error }
	}
}

// Function to get change logs for a medical record
export const getChangeLogsForRecord = async (medicalRecordId: string) => {
	try {
		const { data, error } = await supabase
			.from(CHANGE_LOG_TABLE)
			.select('*')
			.eq('medical_record_id', medicalRecordId)
			.order('changed_at', { ascending: false })

		return { data, error }
	} catch (error) {
		console.error(`Error fetching change logs for record ${medicalRecordId}:`, error)
		return { data: null, error }
	}
}

// Function to get all change logs with pagination
export const getAllChangeLogs = async (limit = 50, offset = 0) => {
	try {
		const { data, error } = await supabase
			.from(CHANGE_LOG_TABLE)
			.select(
				`
				*,
				medical_records_clean(
					id,
					code,
					patient_id
				),
				patients(
					id,
					nombre,
					cedula
				)
			`,
			)
			.order('changed_at', { ascending: false })
			.range(offset, offset + limit - 1)

		if (error) {
			console.error('Error fetching all change logs:', error)
			return { data: null, error }
		}

		// Transform the data to handle deleted records and return a strongly-typed array
		const transformedData: ChangeLogJoined[] | undefined = data?.map((row: unknown) => {
			const log = row as Record<string, unknown>
			const result: ChangeLogJoined = {
				id: String(log['id'] ?? ''),
				medical_record_id: (log['medical_record_id'] as string | null) ?? null,
				patient_id: (log['patient_id'] as string | null) ?? null,
				entity_type: (log['entity_type'] as string | null) ?? null,
				user_id: String(log['user_id'] ?? ''),
				user_email: String(log['user_email'] ?? ''),
				user_display_name: (log['user_display_name'] as string | null) ?? null,
				field_name: String(log['field_name'] ?? ''),
				field_label: String(log['field_label'] ?? ''),
				old_value: (log['old_value'] as string | null) ?? null,
				new_value: (log['new_value'] as string | null) ?? null,
				changed_at: String(log['changed_at'] ?? ''),
				created_at: (log['created_at'] as string | null) ?? null,
				deleted_record_info: (log['deleted_record_info'] as string | null) ?? null,
				medical_records_clean:
					(log['medical_records_clean'] as
						| {
								id: string | null
								code: string | null
								patient_id: string | null
						  }
						| null
						| undefined) ?? undefined,
				patients:
					(log['patients'] as
						| {
								id: string | null
								nombre: string | null
								cedula: string | null
						  }
						| null
						| undefined) ?? undefined,
			}

			if (!result.medical_record_id && !result.patient_id && result.deleted_record_info) {
				// Handle deleted records - try to determine if it was a patient or medical case
				if (result.entity_type === 'patient') {
					return {
						...result,
						patients: {
							id: null,
							nombre: result.deleted_record_info,
							cedula: null,
						},
					}
				} else {
					return {
						...result,
						medical_records_clean: {
							id: null,
							code: result.deleted_record_info,
							patient_id: null,
						},
					}
				}
			}
			return result
		})

		return { data: transformedData, error: null }
	} catch (error) {
		console.error('Error fetching all change logs:', error)
		return { data: null, error }
	}
}

// Combined function to update medical record and save change log
export const updateMedicalRecordWithLog = async (
	id: string,
	updates: Partial<MedicalRecord>,
	changes: Array<{
		field: string
		fieldLabel: string
		oldValue: string | number | boolean | null
		newValue: string | number | boolean | null
	}>,
	userId: string,
	userEmail: string,
) => {
	try {
		console.log('🔄 Starting medical record update with change log...')
		console.log('Updates to apply:', updates)
		console.log('Changes to log:', changes)

		// Update the medical record first (this now includes payment status calculation)
		// Legacy function call removed - using medical-cases-service instead
		// const { data: updatedRecord, error: updateError } = await updateMedicalRecord(id, updates)
		throw new Error('Use medical-cases-service for updates')

		// if (updateError) {
		//	console.error('❌ Error updating medical record:', updateError)
		//	return { data: null, error: updateError }
		// }

		// console.log('✅ Medical record updated successfully:', updatedRecord)

		// Save change logs
		const { error: logError } = await saveChangeLog(id, userId, userEmail, changes)

		if (logError) {
			console.error('❌ Error saving change logs (record was updated):', logError)
			// Note: The record was already updated, so we don't return an error here
			// but we should log this for monitoring
		} else {
			console.log('✅ Change logs saved successfully')
		}

		console.log('✅ Medical record updated and change logs saved successfully')
		// return { data: updatedRecord, error: null }
	return { data: null, error: new Error('Use medical-cases-service for updates') }
	} catch (error) {
		console.error('❌ Unexpected error in updateMedicalRecordWithLog:', error)
		return { data: null, error }
	}
}

// Función para obtener estadísticas
export const getMedicalRecordsStats = async () => {
	try {
		const { data, error } = await supabase.from(TABLE_NAME).select('total_amount, payment_status, created_at')

		if (error) return { data: null, error }

        const stats = {
					total: data.length,
					totalAmount: data.reduce((sum, record) => sum + record.total_amount, 0),
					completed: data.filter((record) => record.payment_status === 'Pagado').length,
					pending: data.filter((record) => record.payment_status === 'Incompleto').length,
					incomplete: data.filter((record) => record.payment_status === 'Incompleto').length,
				}

		return { data: stats, error: null }
	} catch (error) {
		console.error(`Error getting stats from ${TABLE_NAME}:`, error)
		return { data: null, error }
	}
}

// Function to update PDF ready status
export const updatePdfReadyStatus = async (id: string, isReady: boolean) => {
	try {
		const { data, error } = await supabase
			.from(TABLE_NAME)
			.update({ pdf_en_ready: isReady })
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('❌ Error updating PDF ready status:', error)
			return { data: null, error }
		}

		console.log('✅ PDF ready status updated successfully:', data)
		return { data, error: null }
	} catch (error) {
		console.error('❌ Unexpected error updating PDF ready status:', error)
		return { data: null, error }
	}
}

// Function to create or update immuno request
export const createOrUpdateImmunoRequest = async (
	caseId: string,
	inmunorreacciones: string[],
	precioUnitario: number = 18.00
) => {
	try {
		const inmunorreaccionesString = inmunorreacciones.join(',')
		const nReacciones = inmunorreacciones.length
		const total = nReacciones * precioUnitario

		const { data, error } = await supabase
			.from('immuno_requests')
			.upsert({
				case_id: caseId,
				inmunorreacciones: inmunorreaccionesString,
				n_reacciones: nReacciones,
				precio_unitario: precioUnitario,
				total: total,
				pagado: false,
			}, {
				onConflict: 'case_id'
			})
			.select()
			.single()

		if (error) {
			console.error('❌ Error creating/updating immuno request:', error)
			return { data: null, error }
		}

		console.log('✅ Immuno request created/updated successfully:', data)
		return { data, error: null }
	} catch (error) {
		console.error('❌ Unexpected error creating/updating immuno request:', error)
		return { data: null, error }
	}
}

// Function to get immuno requests
export const getImmunoRequests = async () => {
	try {
		const { data, error } = await supabase
			.from('immuno_requests')
			.select(`
				*,
				medical_records_clean!inner(
					code,
					full_name
				)
			`)
			.order('created_at', { ascending: false })

		if (error) {
			console.error('❌ Error fetching immuno requests:', error)
			return { data: null, error }
		}

		console.log('✅ Immuno requests fetched successfully:', data)
		return { data, error: null }
	} catch (error) {
		console.error('❌ Unexpected error fetching immuno requests:', error)
		return { data: null, error }
	}
}

// Function to update immuno request payment status
export const updateImmunoRequestPaymentStatus = async (requestId: string, pagado: boolean) => {
	try {
		const { data, error } = await supabase
			.from('immuno_requests')
			.update({ pagado })
			.eq('id', requestId)
			.select()
			.single()

		if (error) {
			console.error('❌ Error updating immuno request payment status:', error)
			return { data: null, error }
		}

		console.log('✅ Immuno request payment status updated successfully:', data)
		return { data, error: null }
	} catch (error) {
		console.error('❌ Unexpected error updating immuno request payment status:', error)
		return { data: null, error }
	}
}

// Function to update immuno request price
export const updateImmunoRequestPrice = async (requestId: string, precioUnitario: number) => {
	try {
		// First get the current request to calculate new total
		const { data: currentRequest, error: fetchError } = await supabase
			.from('immuno_requests')
			.select('n_reacciones')
			.eq('id', requestId)
			.single()

		if (fetchError) {
			console.error('❌ Error fetching current immuno request:', fetchError)
			return { data: null, error: fetchError }
		}

		const newTotal = currentRequest.n_reacciones * precioUnitario

		const { data, error } = await supabase
			.from('immuno_requests')
			.update({ 
				precio_unitario: precioUnitario,
				total: newTotal
			})
			.eq('id', requestId)
			.select()
			.single()

		if (error) {
			console.error('❌ Error updating immuno request price:', error)
			return { data: null, error }
		}

		console.log('✅ Immuno request price updated successfully:', data)
		return { data, error: null }
	} catch (error) {
		console.error('❌ Unexpected error updating immuno request price:', error)
		return { data: null, error }
	}
}
// Mantener compatibilidad con nombres anteriores
// Legacy function removed
// export const insertCliente = insertMedicalRecord
export const getClientes = getMedicalRecords
export const getClienteById = getMedicalRecordById
export const searchClientes = searchMedicalRecords
export type Cliente = MedicalRecord