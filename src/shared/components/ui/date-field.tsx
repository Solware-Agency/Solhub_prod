import React, { useCallback, useState } from 'react'
import { format, parse, isValid, startOfDay, endOfDay } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
import { Calendar } from '@shared/components/ui/calendar'
import { cn } from '@shared/lib/cn'

const DISPLAY_FORMAT = 'dd/MM/yyyy'
const ISO_FORMAT = 'yyyy-MM-dd'

function toIso(value: string): string {
	const t = value.replace(/\D/g, '')
	if (t.length !== 8) return ''
	const d = parseInt(t.slice(0, 2), 10)
	const m = parseInt(t.slice(2, 4), 10)
	const y = parseInt(t.slice(4, 8), 10)
	if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return ''
	const parsed = parse(`${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`, DISPLAY_FORMAT, new Date())
	return isValid(parsed) ? format(parsed, ISO_FORMAT) : ''
}

function toDisplay(iso: string): string {
	if (!iso?.trim()) return ''
	const parsed = parse(iso.slice(0, 10), ISO_FORMAT, new Date())
	return isValid(parsed) ? format(parsed, DISPLAY_FORMAT) : ''
}

function formatTyping(raw: string): string {
	const digits = raw.replace(/\D/g, '').slice(0, 8)
	if (digits.length <= 2) return digits
	if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
	return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export interface DateFieldProps {
	/** Valor en yyyy-MM-dd (ISO) */
	value: string
	onChange: (iso: string) => void
	/** Si true, no se permiten fechas futuras (ej. nacimiento) */
	disallowFuture?: boolean
	/** Si true, no se permiten fechas pasadas */
	disallowPast?: boolean
	minDate?: Date
	maxDate?: Date
	placeholder?: string
	disabled?: boolean
	/** Mostrar botón para abrir calendario (default true) */
	showCalendarButton?: boolean
	className?: string
	id?: string
	/** Clases del contenedor (flex) */
	containerClassName?: string
}

export const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(
	(
		{
			value,
			onChange,
			disallowFuture = false,
			disallowPast = false,
			minDate,
			maxDate,
			placeholder = 'DD/MM/AAAA',
			disabled = false,
			showCalendarButton = true,
			className,
			id,
			containerClassName,
		},
		ref,
	) => {
		const [display, setDisplay] = useState(() => toDisplay(value))
		const [isFocused, setIsFocused] = useState(false)

		React.useEffect(() => {
			if (!isFocused) {
				setDisplay(toDisplay(value))
			}
		}, [value, isFocused])

		const today = new Date()
		const effectiveMin = minDate ?? (disallowPast ? startOfDay(today) : undefined)
		const effectiveMax = maxDate ?? (disallowFuture ? endOfDay(today) : undefined)

		const clampToBounds = useCallback(
			(iso: string): string => {
				if (!iso) return ''
				const d = parse(iso, ISO_FORMAT, new Date())
				if (!isValid(d)) return ''
				if (effectiveMin && d < effectiveMin) return format(effectiveMin, ISO_FORMAT)
				if (effectiveMax && d > effectiveMax) return format(effectiveMax, ISO_FORMAT)
				return iso
			},
			[effectiveMin, effectiveMax],
		)

		const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const formatted = formatTyping(e.target.value)
			setDisplay(formatted)
			const iso = toIso(formatted)
			if (iso) onChange(clampToBounds(iso))
		}

		const handleBlur = () => {
			setIsFocused(false)
			const iso = toIso(display)
			if (iso) {
				const clamped = clampToBounds(iso)
				onChange(clamped)
				setDisplay(toDisplay(clamped))
			} else if (display.trim()) {
				setDisplay(toDisplay(value))
			} else {
				onChange('')
			}
		}

		const handleCalendarSelect = (date: Date | undefined) => {
			if (!date) return
			const iso = format(date, ISO_FORMAT)
			const clamped = clampToBounds(iso)
			onChange(clamped)
			setDisplay(toDisplay(clamped))
		}

		const parsedDate = value ? parse(value.slice(0, 10), ISO_FORMAT, new Date()) : undefined
		const calendarDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined

		const inputEl = (
			<Input
				ref={ref}
				id={id}
				type="text"
				inputMode="numeric"
				placeholder={placeholder}
				value={display}
				onChange={handleInputChange}
				onFocus={() => setIsFocused(true)}
				onBlur={handleBlur}
				disabled={disabled}
				maxLength={10}
				className={cn('tabular-nums', className)}
			/>
		)

		if (!showCalendarButton) {
			return inputEl
		}

		return (
			<div className={cn('flex gap-2', containerClassName)}>
				<div className="flex-1 min-w-0">{inputEl}</div>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="shrink-0 h-10 w-10 p-0"
							disabled={disabled}
							aria-label="Abrir calendario"
						>
							<CalendarIcon className="h-4 w-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="end">
						<Calendar
							mode="single"
							selected={calendarDate}
							onSelect={handleCalendarSelect}
							disabled={(d) => {
								const dayStart = startOfDay(d)
								if (effectiveMin && dayStart < startOfDay(effectiveMin)) return true
								if (effectiveMax && dayStart > startOfDay(effectiveMax)) return true
								return false
							}}
							allowFutureDates={!disallowFuture}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
			</div>
		)
	},
)

DateField.displayName = 'DateField'
