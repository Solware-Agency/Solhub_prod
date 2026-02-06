import { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@shared/components/ui/input'
import { cn } from '@shared/lib/cn'
import { Loader2, Search, User, Building2 } from 'lucide-react'
import { searchAsegurados, type Asegurado } from '@services/supabase/aseguradoras/asegurados-service'

interface AseguradoSearchAutocompleteProps {
	onSelect: (asegurado: Asegurado) => void
	onSearchChange?: (value: string) => void
	placeholder?: string
	className?: string
	minSearchLength?: number
	disabled?: boolean
}

export const AseguradoSearchAutocomplete = ({
	onSelect,
	onSearchChange,
	placeholder = 'Buscar por documento o nombre',
	className,
	minSearchLength = 2,
	disabled = false,
}: AseguradoSearchAutocompleteProps) => {
	const [inputValue, setInputValue] = useState('')
	const [results, setResults] = useState<Asegurado[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const [error, setError] = useState<string | null>(null)

	const suggestionsRef = useRef<HTMLDivElement>(null)
	const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const currentSearchTermRef = useRef<string>('')

	const performSearch = useCallback(
		async (searchTerm: string) => {
			const trimmed = searchTerm.trim()
			if (trimmed.length < minSearchLength) {
				setResults([])
				setShowSuggestions(false)
				currentSearchTermRef.current = ''
				return
			}

			currentSearchTermRef.current = trimmed
			setIsLoading(true)
			setError(null)

			try {
				const data = await searchAsegurados(trimmed, 12)
				if (currentSearchTermRef.current === trimmed) {
					setResults(data)
					setShowSuggestions(data.length > 0)
				}
			} catch (err) {
				if (currentSearchTermRef.current === trimmed) {
					console.error('Error buscando asegurados:', err)
					setError('Error al buscar asegurados')
					setResults([])
				}
			} finally {
				if (currentSearchTermRef.current === trimmed) {
					setIsLoading(false)
				}
			}
		},
		[minSearchLength],
	)

	useEffect(() => {
		if (debounceTimeoutRef.current) {
			clearTimeout(debounceTimeoutRef.current)
			debounceTimeoutRef.current = null
		}

		const trimmed = inputValue.trim()
		if (trimmed.length < minSearchLength) {
			setResults([])
			setShowSuggestions(false)
			currentSearchTermRef.current = ''
			return
		}

		debounceTimeoutRef.current = setTimeout(() => {
			if (inputValue.trim() === trimmed) {
				performSearch(trimmed)
			}
			debounceTimeoutRef.current = null
		}, 300)

		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current)
				debounceTimeoutRef.current = null
			}
		}
	}, [inputValue, performSearch, minSearchLength])

	const handleSelect = useCallback(
		(asegurado: Asegurado) => {
			setInputValue(`${asegurado.full_name} · ${asegurado.document_id}`)
			setResults([])
			setShowSuggestions(false)
			setSelectedIndex(-1)
			onSelect(asegurado)
		},
		[onSelect],
	)

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!showSuggestions || results.length === 0) return

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
				break
			case 'ArrowUp':
				e.preventDefault()
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
				break
			case 'Enter':
				e.preventDefault()
				if (selectedIndex >= 0) {
					handleSelect(results[selectedIndex])
				}
				break
			case 'Escape':
				setShowSuggestions(false)
				setSelectedIndex(-1)
				break
		}
	}

	const getIcon = (tipo?: string | null) =>
		tipo === 'Persona jurídica' ? <Building2 className="w-4 h-4 text-slate-500" /> : <User className="w-4 h-4 text-slate-500" />

	return (
		<div className={cn('relative w-full', className)}>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-50" />
				<Input
					type="text"
					value={inputValue}
					onChange={(e) => {
						setInputValue(e.target.value)
						onSearchChange?.(e.target.value)
					}}
					onFocus={() => {
						if (results.length > 0) {
							setShowSuggestions(true)
						}
					}}
					onBlur={() => {
						setTimeout(() => {
							const activeElement = document.activeElement
							const suggestionsElement = suggestionsRef.current
							if (!suggestionsElement?.contains(activeElement)) {
								setShowSuggestions(false)
							}
						}, 200)
					}}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					className="pl-9"
				/>
				{isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
			</div>

			{showSuggestions && results.length > 0 && (
				<div
					ref={suggestionsRef}
					className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto"
				>
					{results.map((asegurado, idx) => (
						<div
							key={asegurado.id}
							className={cn(
								'flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
								selectedIndex === idx && 'bg-gray-100 dark:bg-gray-700',
							)}
							onClick={() => handleSelect(asegurado)}
						>
							{getIcon(asegurado.tipo_asegurado)}
							<div className="flex-1 min-w-0">
								<div className="font-medium text-sm truncate">{asegurado.full_name}</div>
								<div className="text-xs text-muted-foreground truncate">
									{asegurado.document_id} • {asegurado.phone || 'Sin teléfono'}
								</div>
							</div>
							<span className="text-xs text-muted-foreground">{asegurado.tipo_asegurado}</span>
						</div>
					))}
				</div>
			)}

			{error && <div className="mt-1 text-sm text-red-500">{error}</div>}
		</div>
	)
}
