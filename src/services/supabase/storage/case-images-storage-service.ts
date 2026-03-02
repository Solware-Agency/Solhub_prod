import { supabase } from '../config/config'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Servicio para subir imágenes de casos en Supabase Storage (bucket case-images)
 * En SPT todos los roles pueden subir imágenes en detalles del caso.
 */

const BUCKET_NAME = 'case-images'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']

export function validateCaseImage(file: File): { valid: boolean; error?: string } {
	if (file.size > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `La imagen es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
		}
	}
	const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
	if (!ALLOWED_EXTENSIONS.includes(ext)) {
		return {
			valid: false,
			error: 'Formato no permitido. Solo se aceptan JPG, PNG o WebP.',
		}
	}
	const mime = (file.type || '').toLowerCase()
	const validMime =
		ALLOWED_MIME_TYPES.includes(mime) ||
		(mime === '' && ALLOWED_EXTENSIONS.some((e) => ext === e))
	if (!validMime && file.type) {
		return {
			valid: false,
			error: `Tipo de archivo no permitido. Recibido: ${file.type || 'desconocido'}`,
		}
	}
	return { valid: true }
}

/**
 * Sube una imagen del caso a Supabase Storage.
 * Path: {laboratory_id}/{case_id}/{nombre_unico}.ext
 */
export async function uploadCaseImage(
	caseId: string,
	file: File,
	laboratoryId: string,
): Promise<{ data: string | null; error: PostgrestError | Error | null }> {
	try {
		if (!file || !(file instanceof File)) {
			return { data: null, error: new Error('Archivo inválido') }
		}
		const validation = validateCaseImage(file)
		if (!validation.valid) {
			return { data: null, error: new Error(validation.error || 'Archivo inválido') }
		}

		const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.')) || '.jpg'
		const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._\s-]/g, '_').trim() || 'imagen'
		const uniqueName = `${base}_${Date.now()}${ext}`
		const filePath = `${laboratoryId}/${caseId}/${uniqueName}`

		const { data: { session } } = await supabase.auth.getSession()
		if (!session) {
			return { data: null, error: new Error('No hay sesión activa. Inicia sesión.') }
		}

		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
		const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
		const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`

		const uploadResponse = await fetch(uploadUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${session.access_token}`,
				apikey: supabaseKey || '',
				'Content-Type': file.type || 'image/jpeg',
				'x-upsert': 'true',
				'cache-control': '3600',
			},
			body: file,
		})

		if (!uploadResponse.ok) {
			const errorText = await uploadResponse.text()
			let msg = 'Error al subir la imagen'
			try {
				const err = JSON.parse(errorText)
				msg = err.message || err.error || msg
			} catch {
				if (errorText) msg = errorText
			}
			return { data: null, error: new Error(msg) }
		}

		const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
		if (!urlData?.publicUrl) {
			return { data: null, error: new Error('No se pudo obtener la URL de la imagen') }
		}
		return { data: urlData.publicUrl, error: null }
	} catch (error) {
		console.error('Error in uploadCaseImage:', error)
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Error al subir la imagen'),
		}
	}
}
