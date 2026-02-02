import React, { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover'
import { Calendar as CalendarComponent } from '@shared/components/ui/calendar'
import { cn } from '@shared/lib/utils'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

export type DateRangeMode = 'today' | 'month' | 'day' | 'range'

export interface DateRange {
	start: Date
	end: Date
	mode: DateRangeMode
}

interface DateRangeSelectorProps {
	value: DateRange
	onChange: (range: DateRange) => void
	className?: string
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ value, onChange, className }) => {
	const [isDayOpen, setIsDayOpen] = useState(false)
	const [isRangeOpen, setIsRangeOpen] = useState(false)
	
	// Estados internos independientes para cada modo
	const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()))
	const [selectedRange, setSelectedRange] = useState<{ from: Date; to: Date }>({
		from: startOfMonth(new Date()),
		to: endOfMonth(new Date()),
	})
	
	// Estado temporal para el rango mientras se está seleccionando
	const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date } | undefined>(undefined)

	const handleModeChange = (mode: DateRangeMode) => {
		const now = new Date()
		let start: Date
		let end: Date

		switch (mode) {
			case 'today':
				start = startOfDay(now)
				end = endOfDay(now)
				break
			case 'month':
				start = startOfMonth(now)
				end = endOfMonth(now)
				break
			case 'day':
				// Usar el día guardado independientemente
				start = startOfDay(selectedDay)
				end = endOfDay(selectedDay)
				break
			case 'range':
				// Usar el rango guardado independientemente
				start = selectedRange.from
				end = selectedRange.to
				break
		}

		onChange({ start, end, mode })
		if (mode !== 'day' && mode !== 'range') {
			setIsDayOpen(false)
			setIsRangeOpen(false)
		}
	}

	const handleCustomDateChange = (range: { from?: Date; to?: Date } | undefined) => {
		// Actualizar el rango temporal mientras se selecciona
		setTempRange(range)
		
		// Solo guardar y aplicar cuando se hayan seleccionado ambas fechas
		if (range?.from && range?.to) {
			const newRange = {
				from: startOfDay(range.from),
				to: endOfDay(range.to),
			}
			// Guardar el rango seleccionado
			setSelectedRange(newRange)
			onChange({
				start: newRange.from,
				end: newRange.to,
				mode: 'range',
			})
			setIsRangeOpen(false)
			setTempRange(undefined)
		}
	}
	
	// Resetear el rango temporal cuando se abre el popover
	const handleRangePopoverChange = (open: boolean) => {
		setIsRangeOpen(open)
		if (open) {
			setTempRange(undefined)
		}
	}

	const handleSingleDayChange = (date: Date | undefined) => {
		if (date) {
			const newDay = startOfDay(date)
			// Guardar el día seleccionado
			setSelectedDay(newDay)
			onChange({
				start: newDay,
				end: endOfDay(date),
				mode: 'day',
			})
			setIsDayOpen(false)
		}
	}

	const getDisplayText = () => {
		switch (value.mode) {
			case 'today':
				return 'Hoy'
			case 'month': {
				// Check if the selected month is the current month
				const now = new Date()
				const isCurrentMonth =
					value.start.getMonth() === now.getMonth() && value.start.getFullYear() === now.getFullYear()

				if (isCurrentMonth) {
					return 'Este Mes'
				} else {
					// Show the month name and year for other months
					return format(value.start, 'MMMM yyyy', { locale: es })
				}
			}
			case 'day':
				return format(value.start, 'dd/MM/yyyy', { locale: es })
			case 'range':
				return `${format(value.start, 'dd/MM/yyyy', { locale: es })} - ${format(value.end, 'dd/MM/yyyy', {
					locale: es,
				})}`
		}
	}

	const getModeButtonClass = (mode: DateRangeMode) => {
		return cn(
			'px-3 py-2 text-sm font-medium transition-colors',
			value.mode === mode
				? 'bg-primary text-primary-foreground'
				: 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
		)
	}

	return (
		<div className={cn('flex flex-col gap-2', className)}>
			{/* Mode Selector */}
			<div className="flex flex-wrap rounded-lg border border-input bg-background p-1 gap-1">
				<Button
					variant="ghost"
					size="sm"
					className={getModeButtonClass('today')}
					onClick={() => handleModeChange('today')}
				>
					Hoy
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className={getModeButtonClass('month')}
					onClick={() => handleModeChange('month')}
				>
					Este Mes
				</Button>

				{/* Popover para día específico */}
				<Popover open={isDayOpen} onOpenChange={setIsDayOpen}>
					<PopoverTrigger asChild>
						<Button variant="ghost" size="sm" className={cn(getModeButtonClass('day'), 'flex items-center gap-2')}>
							<Calendar className="h-4 w-4" />
							Día
							<ChevronDown className="h-3 w-3" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<CalendarComponent
							initialFocus
							mode="single"
							defaultMonth={selectedDay}
							selected={selectedDay}
							onSelect={handleSingleDayChange}
							disabled={{ after: new Date() }}
							toDate={new Date()}
							fromDate={new Date(2020, 0, 1)}
							locale={es}
						/>
					</PopoverContent>
				</Popover>

				{/* Popover para rango de fechas */}
				<Popover open={isRangeOpen} onOpenChange={handleRangePopoverChange}>
					<PopoverTrigger asChild>
						<Button variant="ghost" size="sm" className={cn(getModeButtonClass('range'), 'flex items-center gap-2')}>
							<Calendar className="h-4 w-4" />
							Rango
							<ChevronDown className="h-3 w-3" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<CalendarComponent
							initialFocus
							mode="range"
							defaultMonth={selectedRange.from}
							selected={tempRange}
							onSelect={handleCustomDateChange}
							numberOfMonths={1}
							disabled={{ after: new Date() }}
							toDate={new Date()}
							fromDate={new Date(2020, 0, 1)}
							locale={es}
						/>
					</PopoverContent>
				</Popover>
			</div>

			{/* Display Current Selection */}
			<div className="text-sm text-muted-foreground text-center">
				{value.mode === 'range' ? (
					<span>
						Rango: <span className="font-medium">{getDisplayText()}</span>
					</span>
				) : value.mode === 'day' ? (
					<span>
						Día: <span className="font-medium">{getDisplayText()}</span>
					</span>
				) : (
					<span>
						Mostrando: <span className="font-medium">{getDisplayText()}</span>
					</span>
				)}
			</div>
		</div>
	)
}

export default DateRangeSelector
