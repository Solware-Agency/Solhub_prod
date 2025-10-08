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
				// Mantener el día actual si ya es day, sino usar hoy
				if (value.mode === 'day') {
					start = value.start
					end = value.end
				} else {
					start = startOfDay(now)
					end = endOfDay(now)
				}
				break
			case 'range':
				// Mantener el rango actual si ya es range, sino usar el mes actual
				if (value.mode === 'range') {
					start = value.start
					end = value.end
				} else {
					start = startOfMonth(now)
					end = endOfMonth(now)
				}
				break
		}

		onChange({ start, end, mode })
		if (mode !== 'day' && mode !== 'range') {
			setIsDayOpen(false)
			setIsRangeOpen(false)
		}
	}

	const handleCustomDateChange = (range: { from?: Date; to?: Date } | undefined) => {
		if (range?.from && range?.to) {
			onChange({
				start: startOfDay(range.from),
				end: endOfDay(range.to),
				mode: 'range',
			})
		}
	}

	const handleSingleDayChange = (date: Date | undefined) => {
		if (date) {
			onChange({
				start: startOfDay(date),
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
			case 'month':
				return 'Este Mes'
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
							defaultMonth={value.start}
							selected={value.start}
							onSelect={handleSingleDayChange}
							disabled={{ after: new Date() }}
							toDate={new Date()}
							fromDate={new Date(2020, 0, 1)}
							locale={es}
						/>
					</PopoverContent>
				</Popover>

				{/* Popover para rango de fechas */}
				<Popover open={isRangeOpen} onOpenChange={setIsRangeOpen}>
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
							defaultMonth={value.start}
							selected={{
								from: value.start,
								to: value.end,
							}}
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
