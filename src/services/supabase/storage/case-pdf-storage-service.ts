import { supabase } from '../config/config'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Servicio para manejar la subida y eliminación de PDFs de casos en Supabase Storage
 * Solo para laboratorio SPT y roles: laboratorio, owner, prueba (godmode)
 */

const BUCKET_NAME = 'case-pdfs'
const MAX_FILE_SIZE = 30 * 1024 * 1024 // 30MB en bytes
const ALLOWED_EXTENSIONS = ['.pdf']
const ALLOWED_MIME_TYPES = ['application/pdf']

/**
 * Valida que el archivo sea PDF y no exceda el tamaño máximo
 */
export function validateCasePDF(file: File): { valid: boolean; error?: string } {
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
			error: `Formato no permitido. Solo se aceptan archivos PDF`,
		}
	}

	// Validar tipo MIME
	const normalizedMimeType = file.type.toLowerCase()
	const isValidMimeType = 
		normalizedMimeType === 'application/pdf' ||
		(normalizedMimeType === '' && fileExtension === '.pdf') // Algunos navegadores no reportan MIME type
	
	if (!isValidMimeType && file.type) {
		return {
			valid: false,
			error: `Tipo de archivo no permitido. Solo se aceptan archivos PDF. Tipo recibido: ${file.type || 'desconocido'}`,
		}
	}

	return { valid: true }
}

/**
 * Sube el PDF del caso a Supabase Storage
 * @param caseId - ID del caso médico
 * @param file - Archivo PDF
 * @param laboratoryId - ID del laboratorio (para organización multi-tenant)
 * @returns URL pública del PDF subido
 */
export async function uploadCasePDF(
	caseId: string,
	file: File,
	laboratoryId: string,
): Promise<{ data: string | null; error: PostgrestError | Error | null }> {
	try {
		// Verificar que el archivo sea válido
		if (!file || !(file instanceof File)) {
			return {
				data: null,
				error: new Error('Archivo inválido: no es una instancia de File'),
			}
		}

		// Validar archivo
		const validation = validateCasePDF(file)
		if (!validation.valid) {
			return {
				data: null,
				error: new Error(validation.error || 'Archivo inválido'),
			}
		}

		// Sanitizar el nombre del archivo original para usarlo en el path
		// Mantener el nombre original pero sanitizar caracteres especiales para seguridad
		const originalFileName = file.name
		// Sanitizar: mantener alfanuméricos, guiones, guiones bajos, puntos y espacios
		// Reemplazar caracteres especiales problemáticos con guiones bajos
		const sanitizedFileName = originalFileName
			.replace(/[^a-zA-Z0-9._\s-]/g, '_') // Reemplazar caracteres especiales
			.replace(/_{2,}/g, '_') // Reemplazar múltiples guiones bajos
			.replace(/^_+|_+$/g, '') // Eliminar guiones bajos al inicio/final
			.trim()
		
		// Asegurar que termine en .pdf
		const finalFileName = sanitizedFileName.endsWith('.pdf') 
			? sanitizedFileName 
			: sanitizedFileName 
				? `${sanitizedFileName}.pdf`
				: 'documento.pdf'

		// Construir path: {laboratory_id}/{case_id}/{nombre_original_sanitizado}
		const filePath = `${laboratoryId}/${caseId}/${finalFileName}`

		// Leer el archivo como ArrayBuffer para validar que sea un PDF válido
		const arrayBuffer = await file.arrayBuffer()
		const uint8Array = new Uint8Array(arrayBuffer)
		
		// Validar magic bytes de PDF
		// Los archivos PDF válidos comienzan con "%PDF" (hex: 25 50 44 46)
		// Puede haber algunos bytes antes del header, así que buscamos "%PDF" en los primeros bytes
		let foundPDFHeader = false
		const searchRange = Math.min(1024, uint8Array.length) // Buscar en los primeros 1024 bytes
		
		for (let i = 0; i <= searchRange - 4; i++) {
			if (
				uint8Array[i] === 0x25 && // '%'
				uint8Array[i + 1] === 0x50 && // 'P'
				uint8Array[i + 2] === 0x44 && // 'D'
				uint8Array[i + 3] === 0x46 // 'F'
			) {
				foundPDFHeader = true
				break
			}
		}

		if (!foundPDFHeader) {
			console.error('Invalid PDF file: File does not contain PDF magic bytes', {
				firstBytes: Array.from(uint8Array.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
				expected: '0x25 0x50 0x44 0x46 (%PDF)'
			})
			return {
				data: null,
				error: new Error('El archivo no es un PDF válido. Por favor, verifica que el archivo no esté corrupto.'),
			}
		}
		
		// Crear un nuevo File con el nombre original sanitizado
		const pdfFile = new File([arrayBuffer], finalFileName, {
			type: 'application/pdf',
			lastModified: file.lastModified
		})
		
		// Log para debugging
		console.log('Uploading case PDF:', {
			filePath,
			fileName: file.name,
			fileSize: file.size,
			fileType: file.type,
			caseId,
			laboratoryId,
			firstBytes: Array.from(uint8Array.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
		})
		
		// Subir archivo usando la API REST directamente
		const { data: { session } } = await supabase.auth.getSession()
		if (!session) {
			return {
				data: null,
				error: new Error('No hay sesión activa. Por favor, inicia sesión.'),
			}
		}

		// Obtener la URL y key de Supabase desde las variables de entorno
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
		const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
		const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`
		
		// Usar fetch directamente para tener control completo sobre los headers
		const uploadResponse = await fetch(uploadUrl, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${session.access_token}`,
				'apikey': supabaseKey || '',
				'Content-Type': 'application/pdf',
				'x-upsert': 'true', // Permitir sobrescribir si existe
				'cache-control': '3600',
			},
			body: pdfFile,
		})

		let uploadData = null
		let uploadError = null

		if (!uploadResponse.ok) {
			const errorText = await uploadResponse.text()
			try {
				const errorJson = JSON.parse(errorText)
				uploadError = {
					message: errorJson.message || errorJson.error || 'Error al subir el archivo',
					statusCode: uploadResponse.status,
					error: errorJson,
				}
			} catch {
				uploadError = {
					message: errorText || 'Error al subir el archivo',
					statusCode: uploadResponse.status,
					error: errorText,
				}
			}
		} else {
			try {
				const responseData = await uploadResponse.json()
				uploadData = responseData
			} catch {
				// Si no hay JSON en la respuesta, crear un objeto de éxito
				uploadData = { path: filePath }
			}
		}

		if (uploadError) {
			console.error('Error uploading case PDF:', uploadError)
			console.error('Error details:', {
				message: uploadError.message,
				statusCode: uploadError.statusCode,
				error: uploadError,
				fullError: JSON.stringify(uploadError, null, 2),
			})
			
			// Mejorar el mensaje de error para debugging
			let errorMessage = 'Error desconocido al subir el PDF'
			if (uploadError.message) {
				errorMessage = uploadError.message
			} else if (typeof uploadError === 'string') {
				errorMessage = uploadError
			} else if (uploadError.error) {
				errorMessage = uploadError.error
			}
			
			return {
				data: null,
				error: new Error(`Error al subir el PDF: ${errorMessage}`),
			}
		}

		// Obtener URL pública
		const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)

		if (!urlData?.publicUrl) {
			return {
				data: null,
				error: new Error('No se pudo obtener la URL pública del PDF'),
			}
		}

		return {
			data: urlData.publicUrl,
			error: null,
		}
	} catch (error) {
		console.error('Error in uploadCasePDF:', error)
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Error desconocido al subir el PDF'),
		}
	}
}

/**
 * Elimina el PDF del caso de Supabase Storage
 * @param caseId - ID del caso médico
 * @param pdfUrl - URL del PDF a eliminar
 * @param laboratoryId - ID del laboratorio
 */
export async function deleteCasePDF(
	caseId: string,
	pdfUrl: string,
	laboratoryId: string,
): Promise<{ error: PostgrestError | Error | null }> {
	try {
		// Extraer el path del archivo desde la URL
		// Formato esperado: https://[project].supabase.co/storage/v1/object/public/case-pdfs/{laboratory_id}/{case_id}/uploaded.pdf
		const urlParts = pdfUrl.split('/')
		const bucketIndex = urlParts.findIndex((part) => part === BUCKET_NAME)
		
		if (bucketIndex === -1) {
			return {
				error: new Error('URL de PDF inválida'),
			}
		}

		// Reconstruir el path: {laboratory_id}/{case_id}/{nombre_archivo}
		const filePath = urlParts.slice(bucketIndex + 1).join('/')
		
		// Verificar que el path comience con el laboratorio y caso correctos
		const expectedPathPrefix = `${laboratoryId}/${caseId}/`
		if (!filePath.startsWith(expectedPathPrefix)) {
			console.warn(`Advertencia: El path del archivo (${filePath}) no coincide con el prefijo esperado (${expectedPathPrefix})`)
		}

		// Eliminar archivo de Supabase Storage
		const { error: deleteError } = await supabase.storage
			.from(BUCKET_NAME)
			.remove([filePath])

		if (deleteError) {
			console.error('Error deleting case PDF:', deleteError)
			return { error: deleteError }
		}

		return { error: null }
	} catch (error) {
		console.error('Error in deleteCasePDF:', error)
		return {
			error: error instanceof Error ? error : new Error('Error desconocido al eliminar el PDF'),
		}
	}
}
