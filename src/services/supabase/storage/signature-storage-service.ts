import { supabase } from '../config/config'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Servicio para manejar la subida y eliminación de firmas de médicos en Supabase Storage.
 * Disponible para laboratorios con feature hasDoctorSignatures activa (dashboard) y roles médicos.
 */

const BUCKET_NAME = 'doctor-signatures'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB en bytes
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png']
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

/**
 * Valida que el archivo sea JPG/JPEG/PNG y no exceda el tamaño máximo
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
			error: `Formato no permitido. Solo se aceptan archivos JPG/JPEG/PNG`,
		}
	}

	// Validar tipo MIME (algunos navegadores reportan 'image/jpg' en lugar de 'image/jpeg')
	const normalizedMimeType = file.type.toLowerCase()
	const isValidMimeType = 
		normalizedMimeType === 'image/jpeg' || 
		normalizedMimeType === 'image/jpg' ||
		normalizedMimeType === 'image/png' ||
		normalizedMimeType.startsWith('image/') && (fileExtension === '.jpg' || fileExtension === '.jpeg' || fileExtension === '.png')
	
	if (!isValidMimeType && file.type) {
		return {
			valid: false,
			error: `Tipo de archivo no permitido. Solo se aceptan imágenes JPG/JPEG/PNG. Tipo recibido: ${file.type}`,
		}
	}

	return { valid: true }
}

/**
 * Sube la firma del médico a Supabase Storage
 * @param userId - ID del usuario médico
 * @param file - Archivo de imagen JPG/JPEG/PNG
 * @param laboratoryId - ID del laboratorio (para organización multi-tenant)
 * @param signatureNumber - Número de firma (1 = principal, 2 = adicional 1, 3 = adicional 2). Por defecto 1 para compatibilidad.
 * @returns URL pública de la imagen subida
 */
export async function uploadDoctorSignature(
	userId: string,
	file: File,
	laboratoryId: string,
	signatureNumber: number = 1,
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
		const validation = validateSignatureFile(file)
		if (!validation.valid) {
			return {
				data: null,
				error: new Error(validation.error || 'Archivo inválido'),
			}
		}

		// Validar número de firma
		if (signatureNumber < 1 || signatureNumber > 3) {
			return {
				data: null,
				error: new Error('Número de firma inválido. Debe ser 1, 2 o 3'),
			}
		}

		// Determinar extensión y tipo de contenido basado en el archivo
		const fileName = file.name.toLowerCase()
		let fileExtension: string
		let contentType: string
		
		if (fileName.endsWith('.png')) {
			fileExtension = '.png'
			contentType = 'image/png'
		} else if (fileName.endsWith('.jpeg')) {
			fileExtension = '.jpeg'
			contentType = 'image/jpeg'
		} else {
			fileExtension = '.jpg'
			contentType = 'image/jpeg'
		}
		
		const signatureFileName = signatureNumber === 1 
			? `signature${fileExtension}` 
			: `signature_${signatureNumber}${fileExtension}`
		const filePath = `${laboratoryId}/${userId}/${signatureFileName}`

		// Leer el archivo como ArrayBuffer para validar que sea una imagen válida
		const arrayBuffer = await file.arrayBuffer()
		const uint8Array = new Uint8Array(arrayBuffer)
		
		// Validar magic bytes según el tipo de archivo
		if (fileExtension === '.png') {
			// Los archivos PNG válidos comienzan con los bytes 89 50 4E 47 0D 0A 1A 0A
			if (uint8Array.length < 8 || 
				uint8Array[0] !== 0x89 || 
				uint8Array[1] !== 0x50 || 
				uint8Array[2] !== 0x4E || 
				uint8Array[3] !== 0x47) {
				console.error('Invalid PNG file: File does not start with PNG magic bytes', {
					firstBytes: Array.from(uint8Array.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
					expected: '0x89 0x50 0x4E 0x47'
				})
				return {
					data: null,
					error: new Error('El archivo no es una imagen PNG válida. Por favor, verifica que el archivo no esté corrupto.'),
				}
			}
		} else {
			// Validar que el archivo realmente sea una imagen JPEG válida
			// Los archivos JPEG válidos comienzan con los bytes FF D8 FF
			if (uint8Array.length < 3 || uint8Array[0] !== 0xFF || uint8Array[1] !== 0xD8 || uint8Array[2] !== 0xFF) {
				console.error('Invalid JPEG file: File does not start with JPEG magic bytes', {
					firstBytes: Array.from(uint8Array.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
					expected: '0xFF 0xD8 0xFF'
				})
				return {
					data: null,
					error: new Error('El archivo no es una imagen JPEG válida. Por favor, verifica que el archivo no esté corrupto.'),
				}
			}
		}
		
		// Crear un nuevo File con el tipo correcto para asegurar que se suba correctamente
		// Esto es más confiable que usar Blob porque File preserva mejor el tipo MIME
		const imageFile = new File([arrayBuffer], signatureFileName, {
			type: contentType,
			lastModified: file.lastModified
		})
		
		// Log para debugging
		console.log('Uploading signature:', {
			filePath,
			fileName: file.name,
			signatureFileName,
			fileSize: file.size,
			fileType: file.type,
			newFileType: imageFile.type,
			contentType,
			fileExtension,
			userId,
			laboratoryId,
			firstBytes: Array.from(uint8Array.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
		})
		
		// Subir archivo usando la API REST directamente para tener control total sobre los headers
		// Esto evita que el header global 'Content-Type: application/json' interfiera
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
		// NOTA: No especificamos 'Content-Type' aquí porque el navegador lo maneja automáticamente
		// cuando usamos File como body, y luego corregimos el mimetype en la BD después
		const uploadResponse = await fetch(uploadUrl, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${session.access_token}`,
				'apikey': supabaseKey || '',
				// NO especificar Content-Type aquí - el navegador lo maneja automáticamente
				'x-upsert': 'true', // Permitir sobrescribir si existe
				'cache-control': '3600',
			},
			body: imageFile, // Enviar el File directamente (el navegador establecerá el Content-Type correcto)
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

		// Si el upload fue exitoso, asegurar que el mimetype sea correcto en la BD
		// Esto es un workaround para cuando Supabase detecta incorrectamente el tipo
		if (uploadData && !uploadError) {
			// Esperar un momento para que el archivo se procese completamente
			await new Promise(resolve => setTimeout(resolve, 500))
			
			try {
				// Primero, verificar el mimetype actual
				const { data: fileInfo, error: infoError } = await supabase.storage
					.from(BUCKET_NAME)
					.list(filePath.split('/').slice(0, -1).join('/'), {
						limit: 1,
						search: filePath.split('/').pop()
					})
				
				// Forzar la actualización del mimetype usando la función RPC
				const { error: fixError } = await supabase.rpc('fix_signature_mimetype', {
					file_path: filePath,
					correct_mimetype: contentType
				})
				
				if (fixError) {
					console.warn('Warning: Could not fix file mimetype (non-critical):', fixError)
				} else {
					console.log('File mimetype corrected successfully')
					
					// Verificar que se corrigió correctamente
					await new Promise(resolve => setTimeout(resolve, 200))
					const { data: verifyInfo } = await supabase.storage
						.from(BUCKET_NAME)
						.list(filePath.split('/').slice(0, -1).join('/'), {
							limit: 1,
							search: filePath.split('/').pop()
						})
					
					if (verifyInfo && verifyInfo.length > 0) {
						console.log('Verified file metadata:', verifyInfo[0])
					}
				}
			} catch (fixErr) {
				console.warn('Warning: Error fixing file mimetype (non-critical):', fixErr)
			}
		}

		if (uploadError) {
			console.error('Error uploading signature:', uploadError)
			console.error('Error details:', {
				message: uploadError.message,
				statusCode: uploadError.statusCode,
				error: uploadError,
				fullError: JSON.stringify(uploadError, null, 2),
			})
			
			// Mejorar el mensaje de error para debugging
			let errorMessage = 'Error desconocido al subir la firma'
			if (uploadError.message) {
				errorMessage = uploadError.message
			} else if (typeof uploadError === 'string') {
				errorMessage = uploadError
			} else if (uploadError.error) {
				errorMessage = uploadError.error
			}
			
			return {
				data: null,
				error: new Error(`Error al subir la firma: ${errorMessage}`),
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
 * @param signatureNumber - Número de firma (1 = principal, 2 = adicional 1, 3 = adicional 2). Opcional, se puede inferir de la URL.
 */
export async function deleteDoctorSignature(
	userId: string,
	signatureUrl: string,
	laboratoryId: string,
	signatureNumber?: number,
): Promise<{ error: PostgrestError | Error | null }> {
	try {
		// Extraer el path del archivo desde la URL
		// Formato esperado: https://[project].supabase.co/storage/v1/object/public/doctor-signatures/{laboratory_id}/{user_id}/signature.jpg
		// o signature_2.jpg, signature_3.jpg, signature.png, signature_2.png, signature_3.png
		const urlParts = signatureUrl.split('/')
		const bucketIndex = urlParts.findIndex((part) => part === BUCKET_NAME)
		
		if (bucketIndex === -1) {
			return {
				error: new Error('URL de firma inválida'),
			}
		}

		// Reconstruir el path: {laboratory_id}/{user_id}/signature.jpg o signature_2.jpg o signature_3.jpg
		// o signature.png o signature_2.png o signature_3.png
		const filePath = urlParts.slice(bucketIndex + 1).join('/')
		
		// Si se proporciona signatureNumber, validar que coincida con el path
		if (signatureNumber !== undefined) {
			if (signatureNumber < 1 || signatureNumber > 3) {
				return {
					error: new Error('Número de firma inválido. Debe ser 1, 2 o 3'),
				}
			}
			const expectedFileName = signatureNumber === 1 ? 'signature' : `signature_${signatureNumber}`
			if (!filePath.includes(expectedFileName)) {
				console.warn(`Advertencia: El número de firma (${signatureNumber}) no coincide con el path del archivo (${filePath})`)
			}
		}

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
