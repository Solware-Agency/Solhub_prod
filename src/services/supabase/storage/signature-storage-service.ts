import { supabase } from '../config/config'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Servicio para manejar la subida y eliminación de firmas de médicos en Supabase Storage
 * Solo para laboratorio SPT y roles médicos
 */

const BUCKET_NAME = 'doctor-signatures'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB en bytes
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg']
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg']

/**
 * Valida que el archivo sea JPG/JPEG y no exceda el tamaño máximo
 */
export function validateSignatureFile(file: File): { valid: boolean; error?: string } {
	// Validar tamaño
	if (file.size > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `El archivo es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
		}
	}

	// Validar extensión
	const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
	if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
		return {
			valid: false,
			error: `Formato no permitido. Solo se aceptan archivos JPG/JPEG`,
		}
	}

	// Validar tipo MIME
	if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
		return {
			valid: false,
			error: `Tipo de archivo no permitido. Solo se aceptan imágenes JPG/JPEG`,
		}
	}

	return { valid: true }
}

/**
 * Sube la firma del médico a Supabase Storage
 * @param userId - ID del usuario médico
 * @param file - Archivo de imagen JPG/JPEG
 * @param laboratoryId - ID del laboratorio (para organización multi-tenant)
 * @returns URL pública de la imagen subida
 */
export async function uploadDoctorSignature(
	userId: string,
	file: File,
	laboratoryId: string,
): Promise<{ data: string | null; error: PostgrestError | Error | null }> {
	try {
		// Validar archivo
		const validation = validateSignatureFile(file)
		if (!validation.valid) {
			return {
				data: null,
				error: new Error(validation.error || 'Archivo inválido'),
			}
		}

		// Generar path único: {laboratory_id}/{user_id}/signature.jpg
		const fileExtension = file.name.toLowerCase().endsWith('.jpeg') ? '.jpeg' : '.jpg'
		const filePath = `${laboratoryId}/${userId}/signature${fileExtension}`

		// Subir archivo a Supabase Storage
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from(BUCKET_NAME)
			.upload(filePath, file, {
				cacheControl: '3600',
				upsert: true, // Reemplazar si ya existe
			})

		if (uploadError) {
			console.error('Error uploading signature:', uploadError)
			return {
				data: null,
				error: uploadError,
			}
		}

		// Obtener URL pública
		const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)

		if (!urlData?.publicUrl) {
			return {
				data: null,
				error: new Error('No se pudo obtener la URL pública de la imagen'),
			}
		}

		return {
			data: urlData.publicUrl,
			error: null,
		}
	} catch (error) {
		console.error('Error in uploadDoctorSignature:', error)
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Error desconocido al subir la firma'),
		}
	}
}

/**
 * Elimina la firma del médico de Supabase Storage
 * @param userId - ID del usuario médico
 * @param signatureUrl - URL de la firma a eliminar
 * @param laboratoryId - ID del laboratorio
 */
export async function deleteDoctorSignature(
	userId: string,
	signatureUrl: string,
	laboratoryId: string,
): Promise<{ error: PostgrestError | Error | null }> {
	try {
		// Extraer el path del archivo desde la URL
		// Formato esperado: https://[project].supabase.co/storage/v1/object/public/doctor-signatures/{laboratory_id}/{user_id}/signature.jpg
		const urlParts = signatureUrl.split('/')
		const bucketIndex = urlParts.findIndex((part) => part === BUCKET_NAME)
		
		if (bucketIndex === -1) {
			return {
				error: new Error('URL de firma inválida'),
			}
		}

		// Reconstruir el path: {laboratory_id}/{user_id}/signature.jpg
		const filePath = urlParts.slice(bucketIndex + 1).join('/')

		// Eliminar archivo de Supabase Storage
		const { error: deleteError } = await supabase.storage
			.from(BUCKET_NAME)
			.remove([filePath])

		if (deleteError) {
			console.error('Error deleting signature:', deleteError)
			return { error: deleteError }
		}

		return { error: null }
	} catch (error) {
		console.error('Error in deleteDoctorSignature:', error)
		return {
			error: error instanceof Error ? error : new Error('Error desconocido al eliminar la firma'),
		}
	}
}
