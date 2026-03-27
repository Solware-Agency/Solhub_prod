import { supabase } from '../config/config'
import type { PostgrestError } from '@supabase/supabase-js'
import { getUserLaboratoryId } from '../aseguradoras/aseguradoras-utils'

const BUCKET_NAME = 'aseguradora-recibos'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB (alineado con bucket aseguradora-recibos)

/**
 * Valida tamaño del comprobante (cualquier tipo de archivo permitido en storage).
 */
export function validateReciboFile(file: File): { valid: boolean; error?: string } {
	if (file.size > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `El archivo es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
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

		const dot = file.name.lastIndexOf('.')
		const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : ''
		const baseName = file.name
			.replace(/[^a-zA-Z0-9._\s-]/g, '_')
			.replace(/_{2,}/g, '_')
			.replace(/^_+|_+$/g, '')
			.trim() || 'recibo'
		const sanitizedName = !ext || baseName.toLowerCase().endsWith(ext) ? baseName : `${baseName}${ext}`
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

/** Resultado de subir un adjunto de asegurado: url pública y nombre para mostrar */
export interface AseguradoAttachmentResult {
	url: string
	name: string
}

const MAX_ASEGURADO_ATTACHMENTS = 3

/**
 * Sube un adjunto de asegurado (PDF/imagen) al bucket aseguradora-recibos.
 * Path: {laboratory_id}/asegurados/{asegurado_id}/{timestamp}_{nombre_sanitizado}
 * Máximo 3 adjuntos por asegurado (validar en UI antes de llamar).
 */
export async function uploadAseguradoAttachment(
	file: File,
	aseguradoId: string
): Promise<{ data: AseguradoAttachmentResult | null; error: PostgrestError | Error | null }> {
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
			.trim() || 'adjunto'
		const sanitizedName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`
		const timestamp = Date.now()
		const fileName = `${timestamp}_${sanitizedName}`
		const filePath = `${laboratoryId}/asegurados/${aseguradoId}/${fileName}`

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
			console.error('Error uploading asegurado attachment:', errMsg)
			return { data: null, error: new Error(errMsg) }
		}

		const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
		return {
			data: { url: urlData.publicUrl, name: file.name },
			error: null,
		}
	} catch (err) {
		console.error('Error in uploadAseguradoAttachment:', err)
		return {
			data: null,
			error: err instanceof Error ? err : new Error('Error al subir el archivo'),
		}
	}
}

export { MAX_ASEGURADO_ATTACHMENTS }

/** Resultado de subir un documento de póliza */
export interface DocumentoPolizaResult {
	url: string
	name: string
}

const MAX_DOCUMENTOS_POLIZA = 3

/**
 * Sube un documento de póliza (PDF/imagen). Path: {lab_id}/polizas_docs/{poliza_id}/{timestamp}_{nombre}.
 * Máximo 3 por póliza (validar en UI).
 */
export async function uploadDocumentoPoliza(
	file: File,
	polizaId: string
): Promise<{ data: DocumentoPolizaResult | null; error: PostgrestError | Error | null }> {
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
			.trim() || 'documento'
		const sanitizedName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`
		const timestamp = Date.now()
		const fileName = `${timestamp}_${sanitizedName}`
		const filePath = `${laboratoryId}/polizas_docs/${polizaId}/${fileName}`

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
			console.error('Error uploading documento poliza:', errMsg)
			return { data: null, error: new Error(errMsg) }
		}

		const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
		return {
			data: { url: urlData.publicUrl, name: file.name },
			error: null,
		}
	} catch (err) {
		console.error('Error in uploadDocumentoPoliza:', err)
		return {
			data: null,
			error: err instanceof Error ? err : new Error('Error al subir el archivo'),
		}
	}
}

export { MAX_DOCUMENTOS_POLIZA }
