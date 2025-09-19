import { useState } from 'react'
import { supabase } from '@lib/supabase/config'
import { type UseFormSetValue } from 'react-hook-form'
import type { FormValues } from '@lib/registration-service'

export const usePatientAutofill = (setValue: UseFormSetValue<FormValues>) => {
	const [isLoading, setIsLoading] = useState(false)
	const [lastFilledPatient, setLastFilledPatient] = useState<string | null>(null)

	const fillPatientData = async (idNumber: string, silent: boolean = false) => {
		if (!idNumber || idNumber.length < 6) return // Mínimo 6 dígitos para buscar

		setIsLoading(true)

		try {
			// Buscar el paciente en la nueva tabla patients
			const { data, error } = await supabase
				.from('patients')
				.select('nombre, telefono, edad, email')
				.eq('cedula', idNumber)
				.single()

			if (error) {
				// Si no se encuentra, no hacer nada (no es un error crítico)
				if (error.code === 'PGRST116') {
					console.log('No se encontraron registros previos para esta cédula')
				}
				return
			}

			if (data) {
				// Primero, ocultar todas las sugerencias de autocompletado
				window.dispatchEvent(new CustomEvent('hideAllAutocompleteSuggestions'))

				// Pequeño delay para asegurar que las sugerencias se oculten antes de llenar
				setTimeout(() => {
					// Llenar automáticamente los campos del paciente
					setValue('fullName', data.nombre)
					setValue('phone', data.telefono || '')
					setValue('email', data.email || '')

					// Parsear la edad del paciente para extraer valor y unidad
					if (data.edad) {
						const match = data.edad.match(/^(\d+)\s*(AÑOS|MESES)$/i)
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