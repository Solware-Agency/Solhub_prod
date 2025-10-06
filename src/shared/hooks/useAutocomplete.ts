import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/services/supabase/config/config'

interface AutocompleteOption {
	value: string
	count: number
}

// Función para normalizar nombres y eliminar duplicados
const normalizeAndDeduplicateNames = (valueCounts: Record<string, number>, fieldName: string): Record<string, number> => {
	// Campos que requieren normalización de nombres
	const nameFields = ['treatingDoctor', 'fullName', 'origin', 'sampleType']
	
	if (!nameFields.includes(fieldName)) {
		return valueCounts // No normalizar otros campos
	}

	const normalizedGroups: Record<string, { values: string[], totalCount: number }> = {}

	// Agrupar valores similares basándose en la versión normalizada
	Object.entries(valueCounts).forEach(([value, count]) => {
		// Normalizar: convertir a mayúsculas, eliminar espacios extra, y caracteres especiales
		const normalized = value
			.toUpperCase()
			.replace(/\s+/g, ' ') // Reemplazar múltiples espacios con uno solo
			.trim()
			.replace(/[^\w\sÑÁÉÍÓÚÜ]/g, '') // Eliminar caracteres especiales excepto letras, espacios y acentos

		if (!normalizedGroups[normalized]) {
			normalizedGroups[normalized] = { values: [], totalCount: 0 }
		}

		normalizedGroups[normalized].values.push(value)
		normalizedGroups[normalized].totalCount += count
	})

	// Seleccionar la mejor versión de cada grupo
	const deduplicatedCounts: Record<string, number> = {}

	Object.entries(normalizedGroups).forEach(([, group]) => {
		if (group.values.length === 1) {
			// Solo una versión, usar tal como está
			deduplicatedCounts[group.values[0]] = group.totalCount
		} else {
			// Múltiples versiones, seleccionar la mejor
			const bestVersion = group.values.reduce((best, current) => {
				// Criterios de selección (en orden de prioridad):
				// 1. Más frecuente
				// 2. Más palabras con primera letra mayúscula
				// 3. Menos caracteres especiales
				// 4. Más corto (sin espacios extra)
				
				const bestCount = valueCounts[best]
				const currentCount = valueCounts[current]
				
				// 1. Prioridad por frecuencia
				if (currentCount > bestCount) return current
				if (bestCount > currentCount) return best
				
				// 2. Prioridad por formato (palabras con primera letra mayúscula)
				const bestCapitalized = countCapitalizedWords(best)
				const currentCapitalized = countCapitalizedWords(current)
				
				if (currentCapitalized > bestCapitalized) return current
				if (bestCapitalized > currentCapitalized) return best
				
				// 3. Prioridad por menos caracteres especiales
				const bestSpecialChars = countSpecialChars(best)
				const currentSpecialChars = countSpecialChars(current)
				
				if (currentSpecialChars < bestSpecialChars) return current
				if (bestSpecialChars < currentSpecialChars) return best
				
				// 4. Prioridad por longitud (sin espacios extra)
				const bestLength = best.replace(/\s+/g, ' ').trim().length
				const currentLength = current.replace(/\s+/g, ' ').trim().length
				
				return currentLength < bestLength ? current : best
			})

			deduplicatedCounts[bestVersion] = group.totalCount
		}
	})

	return deduplicatedCounts
}

// Función auxiliar para contar palabras con primera letra mayúscula
const countCapitalizedWords = (text: string): number => {
	return text.split(/\s+/).filter(word => 
		word.length > 0 && word[0] === word[0].toUpperCase()
	).length
}

// Función auxiliar para contar caracteres especiales
const countSpecialChars = (text: string): number => {
	return (text.match(/[^\w\sÑÁÉÍÓÚÜñáéíóúü]/g) || []).length
}

export const useAutocomplete = (fieldName: string) => {
	const [suggestions, setSuggestions] = useState<AutocompleteOption[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const abortControllerRef = useRef<AbortController | null>(null)
	const [allFieldValues, setAllFieldValues] = useState<AutocompleteOption[]>([])
	const [hasPreloadedData, setHasPreloadedData] = useState(false)

	// Preload all values for the field when the hook initializes - ONLY ONCE
	useEffect(() => {
		let isMounted = true

		const preloadFieldValues = async () => {
			if (hasPreloadedData) return // Prevent multiple loads

			try {
				setIsLoading(true)

				// Updated field mapping to match the actual database schema
				const fieldMapping: Record<string, string> = {
					// Datos del paciente (ahora en tabla patients)
					fullName: 'nombre',
					idNumber: 'cedula',
					phone: 'telefono',
					email: 'email',

					// Datos del servicio
					examType: 'exam_type',
					origin: 'origin',
					treatingDoctor: 'treating_doctor',
					sampleType: 'sample_type',
					relationship: 'relationship',

					// Otros campos
					branch: 'branch',
					comments: 'comments',

					// Additional fields that might be used
					paymentMethod1: 'payment_method_1',
					paymentMethod2: 'payment_method_2',
					paymentMethod3: 'payment_method_3',
					paymentMethod4: 'payment_method_4',
					paymentReference1: 'payment_reference_1',
					paymentReference2: 'payment_reference_2',
					paymentReference3: 'payment_reference_3',
					paymentReference4: 'payment_reference_4',
					paymentStatus: 'payment_status',
				}

				const dbFieldName = fieldMapping[fieldName] || fieldName

				// Determinar qué tabla usar según el campo
				const patientFields = ['nombre', 'cedula', 'telefono', 'email'] // Campos en tabla patients
				const caseFields = [
					'exam_type',
					'origin',
					'treating_doctor',
					'sample_type',
					'relationship',
					'branch',
					'comments',
					'payment_method_1',
					'payment_method_2',
					'payment_method_3',
					'payment_method_4',
					'payment_reference_1',
					'payment_reference_2',
					'payment_reference_3',
					'payment_reference_4',
					'payment_status',
				] // Campos en tabla medical_records_clean

				const isPatientField = patientFields.includes(dbFieldName)
				const isCaseField = caseFields.includes(dbFieldName)

				if (!isPatientField && !isCaseField) {
					console.warn(`Field '${dbFieldName}' is not a valid field in any table`)
					setIsLoading(false)
					return
				}

				// Seleccionar la tabla correcta
				const tableName = isPatientField ? 'patients' : 'medical_records_clean'

				const { data, error } = await supabase
					.from(tableName)
					.select(dbFieldName)
					.not(dbFieldName, 'is', null)
					.not(dbFieldName, 'eq', '')

				if (error) {
					console.error('Error preloading field values:', error)
					return
				}

				if (!isMounted) return

				// Count frequency of each value
				const valueCounts: Record<string, number> = {}
				data?.forEach((record: any) => {
					const value = record[dbFieldName]?.toString()?.trim()
					if (value) {
						valueCounts[value] = (valueCounts[value] || 0) + 1
					}
				})

				// Aplicar normalización y deduplicación
				const normalizedCounts = normalizeAndDeduplicateNames(valueCounts, fieldName)

				// Convert to array and sort by frequency
				const allValues = Object.entries(normalizedCounts)
					.map(([value, count]) => ({ value, count }))
					.sort((a, b) => b.count - a.count)

				setAllFieldValues(allValues)
				setHasPreloadedData(true)
			} catch (error) {
				console.error('Error preloading field values:', error)
			} finally {
				if (isMounted) {
					setIsLoading(false)
				}
			}
		}

		preloadFieldValues()

		return () => {
			isMounted = false
		}
	}, [fieldName]) // Only depend on fieldName, not hasPreloadedData

	// Function to get filtered suggestions based on search term - memoized with useCallback
	const getFilteredSuggestions = useCallback(
		(searchTerm: string): AutocompleteOption[] => {
			if (!searchTerm || searchTerm.length === 0) {
				return [] // No mostrar sugerencias aleatorias cuando el campo está vacío
			}

			const filtered = allFieldValues.filter((item) => {
				// Para el campo idNumber, buscar tanto en el formato completo como solo en el número
				if (fieldName === 'idNumber') {
					const fullCedula = item.value.toLowerCase()
					const cedulaNumber = fullCedula.replace(/^[vejc]-/, '') // Remover prefijo V-, E-, J-, C-
					const searchLower = searchTerm.toLowerCase()

					return fullCedula.includes(searchLower) || cedulaNumber.includes(searchLower)
				}

				// Para otros campos, búsqueda normal
				return item.value.toLowerCase().includes(searchTerm.toLowerCase())
			})

			// Sort filtered results by relevance
			return filtered
				.sort((a, b) => {
					// Para idNumber, priorizar coincidencias exactas del número
					if (fieldName === 'idNumber') {
						const aNumber = a.value.replace(/^[VEJC]-/, '')
						const bNumber = b.value.replace(/^[VEJC]-/, '')
						const searchLower = searchTerm.toLowerCase()

						const aExactMatch = aNumber.toLowerCase() === searchLower
						const bExactMatch = bNumber.toLowerCase() === searchLower

						if (aExactMatch && !bExactMatch) return -1
						if (!aExactMatch && bExactMatch) return 1

						const aStartsWith = aNumber.toLowerCase().startsWith(searchLower)
						const bStartsWith = bNumber.toLowerCase().startsWith(searchLower)

						if (aStartsWith && !bStartsWith) return -1
						if (!aStartsWith && bStartsWith) return 1
					} else {
						// Para otros campos, priorizar items que empiecen con el término de búsqueda
						const aStartsWith = a.value.toLowerCase().startsWith(searchTerm.toLowerCase())
						const bStartsWith = b.value.toLowerCase().startsWith(searchTerm.toLowerCase())

						if (aStartsWith && !bStartsWith) return -1
						if (!aStartsWith && bStartsWith) return 1
					}

					// Then by frequency
					return b.count - a.count
				})
				.slice(0, 8)
		},
		[allFieldValues, fieldName],
	)

	// getSuggestions now only processes preloaded data, no async calls - memoized with useCallback
	const getSuggestions = useCallback((searchTerm: string = '') => {
		// Cancel any previous abort controller
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		// Only process if we have preloaded data
		if (!hasPreloadedData || allFieldValues.length === 0) {
			setSuggestions([])
			return
		}

		// Process suggestions synchronously from preloaded data
		const filteredSuggestions = getFilteredSuggestions(searchTerm)
		setSuggestions(filteredSuggestions)
	}, [hasPreloadedData, allFieldValues, getFilteredSuggestions])

	// Clean up AbortController on unmount
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	return {
		suggestions,
		isLoading,
		getSuggestions,
		hasPreloadedData,
	}
}