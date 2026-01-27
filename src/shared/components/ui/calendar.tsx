import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@shared/lib/cn'
import { buttonVariants } from '@shared/components/ui/button'

// Ensure the calendar is properly contained and doesn't overflow
import './calendar-styles.css'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
	const [showYearPicker, setShowYearPicker] = React.useState(false)
	// Use month from props if controlled, otherwise maintain internal state
	const [internalMonth, setInternalMonth] = React.useState(props.defaultMonth || new Date())
	const currentMonth = props.month || internalMonth

	// Update internal month when props.month changes (for controlled usage)
	React.useEffect(() => {
		if (props.month) {
			setInternalMonth(props.month)
		}
	}, [props.month])

	// Year picker functionality
	const currentYear = new Date().getFullYear()
	const currentMonthNum = new Date().getMonth()
	const currentDay = new Date().getDate()
	const startYear = 1900 // Allow selection from 1900
	const endYear = currentYear // No permitir años futuros

	// Verificar si hay una función disabled para saber si debemos restringir fechas futuras
	const hasDisabledProp = !!props.disabled
	const isDateDisabled = (date: Date) => {
		if (props.disabled) {
			if (typeof props.disabled === 'function') {
				return props.disabled(date)
			}
		}
		return false
	}

	const handleYearSelect = (year: number) => {
		// Si el año es futuro, no permitir seleccionarlo
		if (year > currentYear) {
			return
		}
		
		// Si el año es el actual, asegurarse de que el mes no sea futuro
		let month = currentMonth.getMonth()
		if (year === currentYear && month > currentMonthNum) {
			month = currentMonthNum
		}
		
		const newDate = new Date(year, month, 1)
		// Update internal state if not controlled
		if (!props.month) {
			setInternalMonth(newDate)
		}
		setShowYearPicker(false)
		// Call the onMonthChange prop if it exists
		props.onMonthChange?.(newDate)
	}

	const generateYearGrid = () => {
		const years = []
		for (let year = startYear; year <= endYear; year++) {
			years.push(year)
		}
		return years.reverse() // Show newest years first
	}

	// Funciones para cambiar de mes
	const handlePrevMonth = () => {
		const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
		// Update internal state if not controlled
		if (!props.month) {
			setInternalMonth(prevMonth)
		}
		props.onMonthChange?.(prevMonth)
	}

	const handleNextMonth = () => {
		const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		
		// Si hay una función disabled que restringe fechas futuras, no permitir avanzar a meses futuros
		if (hasDisabledProp && isDateDisabled(nextMonth)) {
			return
		}
		
		// Si el mes siguiente es futuro, no permitir avanzar
		if (nextMonth > today) {
			return
		}
		
		// Update internal state if not controlled
		if (!props.month) {
			setInternalMonth(nextMonth)
		}
		props.onMonthChange?.(nextMonth)
	}

	const renderYearPicker = () => {
		const years = generateYearGrid()
		const selectedYear = currentMonth.getFullYear()

		return (
			<div 
				className="absolute top-0 left-0 right-0 bottom-0 bg-white dark:bg-background z-100 rounded-md border shadow-lg p-3 sm:p-4"
				style={{
					overscrollBehavior: 'contain',
					touchAction: 'pan-y'
				}}
			>
				<div className="flex items-center justify-between mb-3 sm:mb-4">
					<h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">Seleccionar Año</h3>
					<button
						onClick={() => setShowYearPicker(false)}
						className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-none"
					>
						<ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
					</button>
				</div>

				<div 
					className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2 max-h-48 sm:max-h-64 overflow-y-auto"
					style={{
						WebkitOverflowScrolling: 'touch',
						overscrollBehavior: 'contain',
						touchAction: 'pan-y',
						willChange: 'scroll-position'
					}}
					onTouchStart={(e) => {
						// Prevenir que el scroll se propague al body
						e.stopPropagation()
					}}
					onTouchMove={(e) => {
						// Prevenir que el scroll se propague al body
						e.stopPropagation()
					}}
				>
					{years.map((year) => {
						const isFutureYear = year > currentYear
						const isFutureMonth = year === currentYear && currentMonth.getMonth() > currentMonthNum
						const isDisabled = isFutureYear || (hasDisabledProp && isFutureMonth)
						
						return (
							<button
								key={year}
								onClick={() => !isDisabled && handleYearSelect(year)}
								disabled={isDisabled}
								className={cn(
									"p-1.5 sm:p-2 text-xs sm:text-sm font-medium rounded-md transition-transform duration-200 hover:scale-105",
									isDisabled && "opacity-30 cursor-not-allowed",
									!isDisabled && year === selectedYear && 'bg-primary text-primary-foreground shadow-md',
									!isDisabled && year === currentYear && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-500',
									!isDisabled && year !== selectedYear && year !== currentYear && 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
								)}
							>
								{year}
							</button>
						)
					})}
				</div>

				<div className="mt-3 sm:mt-4 flex justify-center gap-1.5 sm:gap-2">
					<button
						onClick={() => handleYearSelect(currentYear)}
						className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-none"
					>
						Ir a {currentYear}
					</button>
					<button
						onClick={() => handleYearSelect(2000)}
						className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-md transition-none"
					>
						Ir a 2000
					</button>
				</div>
			</div>
		)
	}

	// Custom caption component with year picker y flechas de mes
	const CustomCaption = ({ displayMonth }: { displayMonth: Date }) => {
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		const nextMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1)
		nextMonth.setHours(0, 0, 0, 0)
		
		// Verificar si el mes siguiente está deshabilitado
		let isNextMonthDisabled = false
		if (hasDisabledProp) {
			isNextMonthDisabled = isDateDisabled(nextMonth)
		}
		// También deshabilitar si el mes siguiente es futuro
		if (nextMonth > today) {
			isNextMonthDisabled = true
		}
		
		return (
			<div className="flex justify-center pt-1 relative items-center gap-1 sm:gap-2">
				<button
					onClick={handlePrevMonth}
					className="absolute left-0 p-0.5 sm:p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
					aria-label="Mes anterior"
				>
					<ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
				</button>
				<button
					onClick={() => setShowYearPicker(true)}
					className="text-xs sm:text-sm font-medium hover:text-primary transition-none cursor-pointer px-1.5 sm:px-2 py-0.5 sm:py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					{displayMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
				</button>
				<button
					onClick={handleNextMonth}
					disabled={isNextMonthDisabled}
					className={cn(
						"absolute right-0 p-0.5 sm:p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800",
						isNextMonthDisabled && "opacity-50 cursor-not-allowed"
					)}
					aria-label="Mes siguiente"
				>
					<ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
				</button>
			</div>
		)
	}

	return (
		<div className="relative calendar-container">
			{showYearPicker && renderYearPicker()}
			<DayPicker
				showOutsideDays={showOutsideDays}
				className={cn('p-2 sm:p-3 bg-popover', className)}
				month={currentMonth}
				onMonthChange={(month) => {
					// Update internal state if not controlled
					if (!props.month) {
						setInternalMonth(month)
					}
					props.onMonthChange?.(month)
				}}
				classNames={{
					months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
					month: 'space-y-4',
					caption: 'flex justify-center pt-1 relative items-center',
					caption_label: 'text-sm font-medium',
					nav: 'space-x-1 flex items-center',
					nav_button: cn(
						buttonVariants({ variant: 'outline' }),
						'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
					),
					nav_button_previous: 'absolute left-1',
					nav_button_next: 'absolute right-1',
					table: 'w-full border-collapse space-y-1',
					head_row: 'flex justify-center',
					head_cell: 'text-muted-foreground rounded-md w-7 sm:w-9 font-normal text-[0.7rem] sm:text-[0.8rem]',
					row: 'flex w-full mt-1 sm:mt-2 justify-center',
					cell: 'h-7 w-7 sm:h-9 sm:w-9 text-center text-xs sm:text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
					day: cn(
						buttonVariants({ variant: 'ghost' }),
						'h-7 w-7 sm:h-9 sm:w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-purple-100 hover:text-purple-700',
					),
					day_range_end: 'day-range-end',
					day_selected:
						'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
					day_today: 'bg-accent text-accent-foreground',
					day_outside:
						'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
					day_disabled: 'text-muted-foreground opacity-50',
					day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
					day_hidden: 'invisible',
					...classNames,
				}}
				components={{
					IconLeft: () => <ChevronLeft className="h-4 w-4" />,
					IconRight: () => <ChevronRight className="h-4 w-4" />,
					Caption: CustomCaption,
				}}
				{...props}
			/>
		</div>
	)
}
Calendar.displayName = 'Calendar'

export { Calendar }