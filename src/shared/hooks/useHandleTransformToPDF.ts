import { supabase } from '@/services/supabase/config/config'
import { useToast } from '@shared/hooks/use-toast'
import { useState } from 'react'

interface MedicalRecord {
	id?: string
	informe_qr?: string | null
}

export const useHandleTransformToPDF = (case_: MedicalRecord, handleNext: () => void) => {
	const { toast } = useToast()
	const [, setIsSaving] = useState(false)

	const handleTransformToPDF = async () => {
		if (!case_?.id) {
			toast({
				title: '❌ Error',
				description: 'No se encontró el ID del caso.',
				variant: 'destructive',
			})
			return
		}

		try {
			setIsSaving(true)

			// Verificar si ya existe informe_qr
			console.log('[1] Verificando si ya existe informe_qr para el caso', case_.id)
			const { data: initialData, error: initialError } = await supabase
				.from('medical_records_clean')
				.select('informe_qr')
				.eq('id', case_.id)
				.single<MedicalRecord>()

			if (initialError) {
				console.error('Error al obtener URL del PDF:', initialError)
				toast({
					title: '❌ Error',
					description: 'No se pudo obtener el estado del PDF.',
					variant: 'destructive',
				})
				return
			}

			if (initialData?.informe_qr) {
				console.log('[1] informe_qr ya existe, redirigiendo:', initialData.informe_qr)
				toast({
					title: '✅ PDF ya disponible',
					description: 'El documento ya fue generado previamente.',
					className: 'bg-green-100 border-green-400 text-green-800',
				})
				window.open(initialData.informe_qr, '_blank')
				// Ejecutar handleNext automáticamente después de abrir el QR
				setTimeout(() => {
					handleNext()
				}, 1000)
				return
			}

			console.log('[2] informe_qr no existe, enviando POST a n8n...')
			console.log('Sending request to n8n webhook with case ID:', case_.id)

			const requestBody = {
				caseId: case_.id,
			}

			console.log('Request body:', requestBody)

			const response = await fetch(
				'https://solwareagencia.app.n8n.cloud/webhook/36596a3a-0aeb-4ee1-887f-854324cc785b',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify(requestBody),
				},
			)

			console.log('Response status:', response.status)

			if (!response.ok) {
				let errorMessage = `HTTP ${response.status}: ${response.statusText}`

				try {
					const errorData = await response.text()
					console.log('Error response body:', errorData)
					errorMessage += ` - ${errorData}`
				} catch (e) {
					console.log('Could not read error response body', e)
				}

				throw new Error(errorMessage)
			}

			let responseData
			try {
				responseData = await response.json()
				console.log('Success response:', responseData)
			} catch (e) {
				responseData = await response.text()
				console.log('Success response (text):', responseData, e)
			}

			toast({
				title: '✅ Flujo activado',
				description: 'El flujo de n8n ha sido activado exitosamente.',
				className: 'bg-green-100 border-green-400 text-green-800',
			})

			// ⏱️ Esperar a que se genere el informe_qr
			let attempts = 0
			const maxAttempts = 10
			let pdfUrl: string | null = null

			while (attempts < maxAttempts) {
				const { data, error } = await supabase
					.from('medical_records_clean')
					.select('informe_qr')
					.eq('id', case_.id)
					.single<MedicalRecord>()

				if (error) {
					console.error('Error obteniendo informe_qr:', error)
					break
				}

				// Solo usar informe_qr
				if (data?.informe_qr) {
					console.log('[3] informe_qr generado exitosamente:', data.informe_qr)
					pdfUrl = data.informe_qr
					break
				}

				// Esperar 2 segundos antes del próximo intento
				await new Promise((resolve) => setTimeout(resolve, 2000))
				attempts++
			}

			if (!pdfUrl) {
				toast({
					title: '⏳ Documento no disponible aún',
					description: 'El PDF aún no está listo. Intenta nuevamente en unos segundos.',
					variant: 'destructive',
				})
				return
			}

			// Actualizar el campo pdf_en_ready a true cuando el PDF está listo
			try {
				const { error: updateError } = await supabase
					.from('medical_records_clean')
					.update({ pdf_en_ready: true })
					.eq('id', case_.id)

				if (updateError) {
					console.error('Error actualizando pdf_en_ready:', updateError)
				} else {
					console.log('✅ pdf_en_ready actualizado a true para el caso:', case_.id)
				}
			} catch (updateErr) {
				console.error('Error inesperado actualizando pdf_en_ready:', updateErr)
			}

			try {
				window.open(pdfUrl, '_blank')
				// Ejecutar handleNext automáticamente después de abrir el PDF
				setTimeout(() => {
					handleNext()
				}, 1000) // Pequeño delay para asegurar que el PDF se abra
			} catch (err) {
				console.error('Error al abrir el PDF:', err)
				toast({
					title: '❌ Error',
					description: 'No se pudo acceder al PDF. Intenta nuevamente.',
					variant: 'destructive',
				})
			}
		} catch (error) {
			console.error('Error en handleTransformToPDF:', error)

			let errorMessage = 'Hubo un problema al activar el flujo.'

			if (error instanceof TypeError && error.message === 'Failed to fetch') {
				errorMessage =
					'No se pudo conectar con el servidor. Verifica tu conexión a internet o contacta al administrador.'
			} else if (error instanceof Error && error.message.includes('CORS')) {
				errorMessage = 'Error de configuración del servidor (CORS). Contacta al administrador.'
			} else if (error instanceof Error && error.message.includes('HTTP')) {
				errorMessage = `Error del servidor: ${error.message}`
			}

			toast({
				title: '❌ Error al activar flujo',
				description: errorMessage,
				variant: 'destructive',
			})
		} finally {
			setIsSaving(false)
		}
	}

	return { handleTransformToPDF }
}
