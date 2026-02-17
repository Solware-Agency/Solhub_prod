import { supabase } from '../config/config'
import type { PostgrestError } from '@supabase/supabase-js'
import { getUserLaboratoryId } from '../aseguradoras/aseguradoras-utils'

const BUCKET_NAME = 'aseguradora-recibos'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']

/**
 * Valida el archivo de recibo (PDF o imagen)
 */
export function validateReciboFile(file: File): { valid: boolean; error?: string } {
	if (file.size > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `El archivo es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
		}
	}

	const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
	if (!ALLOWED_EXTENSIONS.includes(ext)) {
		return {
			valid: false,
			error: 'Formato no permitido. Solo PDF, JPG, JPEG o PNG.',
		}
	}

	return { valid: true }
}

/**
 * Sube el recibo de pago a Storage.
 * Path: {laboratory_id}/{poliza_id}/{timestamp}_{nombre_sanitizado}
 */
export async function uploadReciboPago(
	file: File,
	polizaId: string
): Promise<{ data: string | null; error: PostgrestError | Error | null }> {
	try {
		if (!file || !(file instanceof File)) {
			return { data: null, error: new Error('Archivo inválido') }
		}

		const validation = validateReciboFile(file)
		if (!validation.valid) {
			return { data: null, error: new Error(validation.error) }
		}

		const laboratoryId = await getUserLaboratoryId()

		const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.')) || '.pdf'
		const baseName = file.name
			.replace(/[^a-zA-Z0-9._\s-]/g, '_')
			.replace(/_{2,}/g, '_')
			.replace(/^_+|_+$/g, '')
			.trim() || 'recibo'
		const sanitizedName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`
		const timestamp = Date.now()
		const fileName = `${timestamp}_${sanitizedName}`
		const filePath = `${laboratoryId}/${polizaId}/${fileName}`

		// Usar fetch directamente para evitar Content-Type: application/json del cliente Supabase
		const { data: { session } } = await supabase.auth.getSession()
		if (!session) {
			return { data: null, error: new Error('No hay sesión activa. Por favor, inicia sesión.') }
		}

		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
		const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
		const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`

		const uploadResponse = await fetch(uploadUrl, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${session.access_token}`,
				'apikey': supabaseKey || '',
				'x-upsert': 'true',
				'cache-control': '3600',
			},
			body: file,
		})

		if (!uploadResponse.ok) {
			const errorText = await uploadResponse.text()
			let errMsg = 'Error al subir el archivo'
			try {
				const errJson = JSON.parse(errorText)
				errMsg = errJson.message || errJson.error || errMsg
			} catch {
				if (errorText) errMsg = errorText
			}
			console.error('Error uploading recibo:', errMsg)
			return { data: null, error: new Error(errMsg) }
		}

		const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
		return { data: urlData.publicUrl, error: null }
	} catch (err) {
		console.error('Error in uploadReciboPago:', err)
		return {
			data: null,
			error: err instanceof Error ? err : new Error('Error al subir el archivo'),
		}
	}
}

/**
 * Sube el PDF de póliza a Storage.
 * Path: {laboratory_id}/polizas/{asegurado_id}_{timestamp}_{filename}
 */
export async function uploadPolizaPdf(
	file: File,
	aseguradoId: string
): Promise<{ data: string | null; error: PostgrestError | Error | null }> {
	try {
		if (!file || !(file instanceof File)) {
			return { data: null, error: new Error('Archivo inválido') }
		}

		const validation = validateReciboFile(file)
		if (!validation.valid) {
			return { data: null, error: new Error(validation.error) }
		}

		const laboratoryId = await getUserLaboratoryId()

		const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.')) || '.pdf'
		const baseName = file.name
			.replace(/[^a-zA-Z0-9._\s-]/g, '_')
			.replace(/_{2,}/g, '_')
			.replace(/^_+|_+$/g, '')
			.trim() || 'poliza'
		const sanitizedName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`
		const timestamp = Date.now()
		const fileName = `${aseguradoId}_${timestamp}_${sanitizedName}`
		const filePath = `${laboratoryId}/polizas/${fileName}`

		const { data: { session } } = await supabase.auth.getSession()
		if (!session) {
			return { data: null, error: new Error('No hay sesión activa. Por favor, inicia sesión.') }
		}

		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
		const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
		const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`

		const uploadResponse = await fetch(uploadUrl, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${session.access_token}`,
				'apikey': supabaseKey || '',
				'x-upsert': 'true',
				'cache-control': '3600',
			},
			body: file,
		})

		if (!uploadResponse.ok) {
			const errorText = await uploadResponse.text()
			let errMsg = 'Error al subir el archivo'
			try {
				const errJson = JSON.parse(errorText)
				errMsg = errJson.message || errJson.error || errMsg
			} catch {
				if (errorText) errMsg = errorText
			}
			console.error('Error uploading poliza PDF:', errMsg)
			return { data: null, error: new Error(errMsg) }
		}

		const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
		return { data: urlData.publicUrl, error: null }
	} catch (err) {
		console.error('Error in uploadPolizaPdf:', err)
		return {
			data: null,
			error: err instanceof Error ? err : new Error('Error al subir el archivo'),
		}
	}
}
