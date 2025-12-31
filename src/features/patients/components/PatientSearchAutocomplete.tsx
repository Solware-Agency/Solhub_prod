// =====================================================================
// PATIENT SEARCH AUTOCOMPLETE - NUEVO SISTEMA
// =====================================================================
// Componente de búsqueda mejorada que busca por cédula/nombre/teléfono
// y muestra responsable + dependientes asociados
// =====================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@shared/components/ui/input'
import { cn } from '@shared/lib/cn'
import { Loader2, Search, User, Baby, Dog } from 'lucide-react'
import {
	findPatientByIdentificationNumber,
	findPatientByNumberOnly,
} from '@services/supabase/patients/identificaciones-service'
import { getDependentsByResponsable } from '@services/supabase/patients/responsabilidades-service'
import { searchPatients } from '@services/supabase/patients/patients-service'

// =====================================================================
// TIPOS
// =====================================================================

export interface PatientProfile {
	id: string
	nombre: string
	cedula: string | null
	tipo_paciente?: 'adulto' | 'menor' | 'animal' | null
	edad?: string | null
	telefono?: string | null
	fecha_nacimiento?: string | null
	especie?: string | null
}

export interface SearchResult {
	responsable: PatientProfile
	dependientes: PatientProfile[]
}

interface PatientSearchAutocompleteProps {
	onSelect?: (profile: PatientProfile) => void
	onSelectResponsable?: (responsable: PatientProfile) => void
	placeholder?: string
	className?: string
	minSearchLength?: number
	disabled?: boolean
}

// =====================================================================
// COMPONENTE
// =====================================================================

export const PatientSearchAutocomplete = ({
	onSelect,
	onSelectResponsable,
	placeholder = 'Buscar por cédula, nombre o teléfono...',
	className,
	minSearchLength = 2,
	disabled = false,
}: PatientSearchAutocompleteProps) => {
	const [inputValue, setInputValue] = useState('')
	const [results, setResults] = useState<SearchResult[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const [error, setError] = useState<string | null>(null)

	const inputRef = useRef<HTMLInputElement>(null)
	const suggestionsRef = useRef<HTMLDivElement>(null)
	const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// =====================================================================
	// BÚSQUEDA
	// =====================================================================

	const performSearch = useCallback(
		async (searchTerm: string) => {
			if (searchTerm.length < minSearchLength) {
				setResults([])
				setShowSuggestions(false)
				return
			}

			setIsLoading(true)
			setError(null)

			try {
				const searchResults: SearchResult[] = []

				// 1. Buscar por número de identificación (cédula) - BÚSQUEDA OPTIMIZADA
				// Detectar si es un número (con o sin prefijo)
				const numeroMatch = searchTerm.trim().match(/^([VEJC])?[-]?([0-9]+)$/i)
				if (numeroMatch) {
					try {
						const tipoPrefijo = numeroMatch[1]?.toUpperCase() as 'V' | 'E' | 'J' | 'C' | undefined
						const numero = numeroMatch[2]

						// Si tiene prefijo, buscar específicamente por ese tipo
						// Si no tiene prefijo, buscar en todos los tipos (más eficiente)
						let result: { paciente: any; identificacion: any } | null = null

						if (tipoPrefijo) {
							// Búsqueda específica por tipo (usa índice compuesto)
							result = await findPatientByIdentificationNumber(numero, tipoPrefijo)
						} else {
							// Búsqueda por número en todos los tipos (usa índice en numero)
							result = await findPatientByNumberOnly(numero)
						}

						if (result && result.paciente) {
							const paciente = result.paciente
							// Solo incluir adultos como responsables
							const tipoPaciente = (paciente as any).tipo_paciente
							if (!tipoPaciente || tipoPaciente === 'adulto') {
								// Buscar dependientes de este responsable
								const dependientes = await getDependentsByResponsable(paciente.id)

								searchResults.push({
									responsable: {
										id: paciente.id,
										nombre: paciente.nombre,
										cedula: paciente.cedula,
										tipo_paciente: tipoPaciente || 'adulto',
										edad: (paciente as any).edad || null,
										telefono: paciente.telefono || null,
									},
								dependientes: dependientes.map((dep: any) => ({
									id: dep.dependiente.id,
									nombre: dep.dependiente.nombre,
									cedula: dep.dependiente.cedula || null, // Mantener null si no tiene cédula
									tipo_paciente: dep.dependiente.tipo_paciente || dep.tipo,
									edad: dep.dependiente.edad || null,
									telefono: dep.dependiente.telefono || null,
									fecha_nacimiento: dep.dependiente.fecha_nacimiento || null,
									especie: dep.dependiente.especie || null,
								})),
								})
							}
						}
					} catch (err) {
						console.warn('Error buscando por identificación:', err)
					}
				}

				// 2. Buscar por nombre o teléfono
				const patients = await searchPatients(searchTerm)

				for (const patient of patients) {
					// Solo incluir adultos como responsables
					const tipoPaciente = (patient as any).tipo_paciente
					if (!tipoPaciente || tipoPaciente === 'adulto') {
						// Verificar si ya está en resultados
						const exists = searchResults.some((r) => r.responsable.id === patient.id)
						if (!exists) {
							// Buscar dependientes
							const dependientes = await getDependentsByResponsable(patient.id)

							searchResults.push({
								responsable: {
									id: patient.id,
									nombre: patient.nombre,
									cedula: patient.cedula,
									tipo_paciente: tipoPaciente || 'adulto',
									edad: (patient as any).edad || null,
									telefono: patient.telefono || null,
								},
								dependientes: dependientes.map((dep: any) => ({
									id: dep.dependiente.id,
									nombre: dep.dependiente.nombre,
									cedula: dep.dependiente.cedula || null, // Mantener null si no tiene cédula
									tipo_paciente: dep.dependiente.tipo_paciente || dep.tipo,
									edad: dep.dependiente.edad,
									telefono: dep.dependiente.telefono,
									fecha_nacimiento: dep.dependiente.fecha_nacimiento,
									especie: dep.dependiente.especie,
								})),
							})
						}
					}
				}

				setResults(searchResults)
				setShowSuggestions(searchResults.length > 0)
			} catch (err) {
				console.error('Error en búsqueda:', err)
				setError('Error al buscar pacientes')
				setResults([])
			} finally {
				setIsLoading(false)
			}
		},
		[minSearchLength],
	)

	// =====================================================================
	// DEBOUNCE
	// =====================================================================

	useEffect(() => {
		if (debounceTimeoutRef.current) {
			clearTimeout(debounceTimeoutRef.current)
		}

		debounceTimeoutRef.current = setTimeout(() => {
			if (inputValue.trim().length >= minSearchLength) {
				performSearch(inputValue.trim())
			} else {
				setResults([])
				setShowSuggestions(false)
			}
		}, 500) // 500ms de debounce para esperar a que el usuario termine de escribir

		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current)
			}
		}
	}, [inputValue, performSearch, minSearchLength])

	// =====================================================================
	// SELECCIÓN
	// =====================================================================

	const handleSelect = useCallback(
		(profile: PatientProfile, responsable: PatientProfile) => {
			setInputValue('')
			setResults([])
			setShowSuggestions(false)
			setSelectedIndex(-1)

			// Si hay callback para seleccionar responsable, llamarlo primero
			if (onSelectResponsable && responsable) {
				onSelectResponsable(responsable)
			}

			// Luego llamar al callback de selección del perfil
			if (onSelect) {
				onSelect(profile)
			}
		},
		[onSelect, onSelectResponsable],
	)

	const handleSelectResponsable = useCallback(
		(responsable: PatientProfile) => {
			setInputValue('')
			setResults([])
			setShowSuggestions(false)
			setSelectedIndex(-1)

			if (onSelectResponsable) {
				onSelectResponsable(responsable)
			}
		},
		[onSelectResponsable],
	)

	// =====================================================================
	// NAVEGACIÓN CON TECLADO
	// =====================================================================

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!showSuggestions || results.length === 0) return

		const totalItems = results.reduce((acc, r) => acc + 1 + r.dependientes.length, 0)

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev))
				break
			case 'ArrowUp':
				e.preventDefault()
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
				break
			case 'Enter':
				e.preventDefault()
				if (selectedIndex >= 0) {
					// Calcular qué perfil seleccionar
					let currentIndex = 0
					for (const result of results) {
						if (currentIndex === selectedIndex) {
							handleSelectResponsable(result.responsable)
							return
						}
						currentIndex++
						for (const dep of result.dependientes) {
							if (currentIndex === selectedIndex) {
								handleSelect(dep, result.responsable)
								return
							}
							currentIndex++
						}
					}
				}
				break
			case 'Escape':
				setShowSuggestions(false)
				setSelectedIndex(-1)
				break
		}
	}

	// =====================================================================
	// ICONOS
	// =====================================================================

	const getProfileIcon = (tipo?: string | null) => {
		switch (tipo) {
			case 'menor':
				return <Baby className="w-4 h-4 text-blue-500" />
			case 'animal':
				return <Dog className="w-4 h-4 text-green-500" />
			default:
				return <User className="w-4 h-4 text-gray-500" />
		}
	}

	// =====================================================================
	// RENDER
	// =====================================================================

	return (
		<div className={cn('relative w-full', className)}>
			{/* Input */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-50" />
				<Input
					ref={inputRef}
					type="text"
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onFocus={() => {
						if (results.length > 0) {
							setShowSuggestions(true)
						}
					}}
					onBlur={() => {
						// Delay para permitir clicks en sugerencias
						setTimeout(() => setShowSuggestions(false), 200)
					}}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					className="pl-9"
				/>
				{isLoading && (
					<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
				)}
			</div>

			{/* Sugerencias */}
			{showSuggestions && results.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto"
				>
					{results.map((result, resultIndex) => {
						let itemIndex = resultIndex

						return (
							<div key={result.responsable.id} className="p-2">
								{/* Responsable */}
								<div
									className={cn(
										'flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
										selectedIndex === itemIndex && 'bg-gray-100 dark:bg-gray-700',
									)}
									onClick={() => handleSelectResponsable(result.responsable)}
								>
									{getProfileIcon('adulto')}
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm">{result.responsable.nombre}</div>
										<div className="text-xs text-muted-foreground">
											{result.responsable.cedula || 'Sin cédula'} • {result.responsable.telefono || 'Sin teléfono'}
										</div>
									</div>
									<span className="text-xs text-muted-foreground">Responsable</span>
								</div>

								{/* Dependientes */}
								{result.dependientes.length > 0 && (
									<div className="ml-6 mt-1 space-y-1">
										{result.dependientes.map((dep) => {
											itemIndex++
											return (
												<div
													key={dep.id}
													className={cn(
														'flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
														selectedIndex === itemIndex && 'bg-gray-100 dark:bg-gray-700',
													)}
													onClick={() => handleSelect(dep, result.responsable)}
												>
													{getProfileIcon(dep.tipo_paciente)}
													<div className="flex-1 min-w-0">
														<div className="font-medium text-sm">{dep.nombre}</div>
														<div className="text-xs text-muted-foreground">
															{dep.tipo_paciente === 'menor'
																? `Menor • ${dep.edad || 'Sin edad'}`
																: dep.tipo_paciente === 'animal'
																? `Animal • ${dep.especie || 'Sin especie'}`
																: 'Sin información'}
														</div>
													</div>
													<span className="text-xs text-muted-foreground">
														{dep.tipo_paciente === 'menor' ? 'Menor' : 'Animal'}
													</span>
												</div>
											)
										})}
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}

			{/* Error */}
			{error && <div className="mt-1 text-sm text-red-500">{error}</div>}
		</div>
	)
}
