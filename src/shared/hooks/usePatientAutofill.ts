import { useState } from 'react'
import { supabase } from '@/services/supabase/config/config'
import { useLaboratory } from '@/app/providers/LaboratoryContext'
import {
	findPatientByNumberOnly,
	findPatientByIdentificationNumber,
} from '@services/supabase/patients/identificaciones-service'

export const usePatientAutofill = (setValue: any) => {
	const [isLoading, setIsLoading] = useState(false)
	const [lastFilledPatient, setLastFilledPatient] = useState<string | null>(null)
	const { laboratory } = useLaboratory()
	const useNewSystem = laboratory?.features?.hasNewPatientSystem === true

	const fillPatientData = async (idNumber: string, silent: boolean = false) => {
		if (!idNumber || idNumber.length < 6) return // Mínimo 6 dígitos para buscar

		setIsLoading(true)

		try {
			let data: any = null
			let cedulaFormatted: string | null = null

			// =====================================================================
			// FASE 8: Búsqueda con feature flag - Dual-read
			// =====================================================================
			if (useNewSystem) {
				// NUEVO SISTEMA: Buscar en identificaciones
				try {
					// Detectar si tiene prefijo (V-, E-, J-, C-) o solo número
					const numeroMatch = idNumber.trim().match(/^([VEJC])[-]?([0-9]+)$/i)

					let result: { paciente: any; identificacion: any } | null = null

					if (numeroMatch) {
						// Tiene prefijo: buscar específicamente por tipo
						const tipoPrefijo = numeroMatch[1].toUpperCase() as 'V' | 'E' | 'J' | 'C'
						const numero = numeroMatch[2]
						result = await findPatientByIdentificationNumber(numero, tipoPrefijo)
					} else {
						// Solo número: buscar en todos los tipos
						result = await findPatientByNumberOnly(idNumber.trim())
					}

					if (result && result.paciente) {
						data = result.paciente
						// Construir cédula en formato completo para compatibilidad
						cedulaFormatted = `${result.identificacion.tipo_documento}-${result.identificacion.numero}`
					}
				} catch (newSystemError) {
					// FALLBACK: Si falla el nuevo sistema, usar el antiguo
					console.warn('⚠️ Nuevo sistema falló, usando fallback:', newSystemError)
				}
			}

			// SISTEMA ANTIGUO: Buscar en patients.cedula (siempre disponible como fallback)
			if (!data) {
				// Construir cédula completa si solo tenemos el número
				const cedulaToSearch = cedulaFormatted || (idNumber.includes('-') ? idNumber : `V-${idNumber}`)

				const { data: oldData, error } = await supabase
					.from('patients')
					.select('nombre, telefono, edad, email, cedula, gender')
					.eq('cedula', cedulaToSearch)
					.eq('is_active', true)
					.single()

				if (error) {
					// Si no se encuentra, no hacer nada (no es un error crítico)
					if (error.code === 'PGRST116') {
						if (!silent) {
							console.log('No se encontraron registros previos para esta cédula')
						}
					}
					return
				}

				if (oldData) {
					data = oldData
					cedulaFormatted = oldData.cedula
				}
			}

			// Si encontramos datos (de cualquier sistema), llenar el formulario
			if (data && cedulaFormatted) {
				// Primero, ocultar todas las sugerencias de autocompletado
				window.dispatchEvent(new CustomEvent('hideAllAutocompleteSuggestions'))

				// Pequeño delay para asegurar que las sugerencias se oculten antes de llenar
				setTimeout(() => {
					// Parsear la cédula para extraer tipo y número
					const cedulaMatch = cedulaFormatted.match(/^([VEJC])-(.+)$/)
					if (cedulaMatch) {
						setValue('idType', cedulaMatch[1] as 'V' | 'E' | 'J' | 'C')
						setValue('idNumber', cedulaMatch[2])
					} else {
						// Si no tiene formato, asumir V- y usar toda la cédula como número
						setValue('idType', 'V')
						setValue('idNumber', cedulaFormatted)
					}

					// Llenar automáticamente los campos del paciente
					setValue('fullName', data.nombre)
					setValue('phone', data.telefono || '')
					setValue('email', data.email || '')

					// Llenar gender solo si el paciente ya tiene un género asignado
					if (data.gender && data.gender !== null) {
						setValue('gender', data.gender)
					}
					// Si no tiene género (null), dejar placeholder

					// Parsear la edad del paciente para extraer valor y unidad
					if (data.edad) {
						const match = data.edad.match(/^(\d+)\s*(AÑOS|MESES|DÍAS)$/i)
						if (match) {
							const ageValue = Number(match[1])
							setValue('ageValue', ageValue)
							// Nota: ageUnit no está en FormValues, se asume Años por defecto
						}
					}

					setLastFilledPatient(data.nombre)

					// Solo mostrar notificación si no es silencioso
					if (!silent) {
						console.log('✅ Datos del paciente cargados automáticamente:', data)
					}
				}, 100)
			}
		} catch (error) {
			console.error('Error al buscar datos del paciente:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		fillPatientData,
		isLoading,
		lastFilledPatient,
	}
}