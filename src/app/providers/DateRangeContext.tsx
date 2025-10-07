import React, { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import type { DateRange } from '@shared/components/ui/date-range-selector'

interface DateRangeContextType {
	dateRange: DateRange
	setDateRange: (range: DateRange) => void
	selectedYear: number
	setSelectedYear: (year: number) => void
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined)

interface DateRangeProviderProps {
	children: ReactNode
}

export const DateRangeProvider: React.FC<DateRangeProviderProps> = ({ children }) => {
	// Estado inicial: Este Mes
	const [dateRange, setDateRange] = useState<DateRange>({
		start: startOfMonth(new Date()),
		end: endOfMonth(new Date()),
		mode: 'month',
	})

	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

	const contextValue: DateRangeContextType = {
		dateRange,
		setDateRange,
		selectedYear,
		setSelectedYear,
	}

	return <DateRangeContext.Provider value={contextValue}>{children}</DateRangeContext.Provider>
}

export const useDateRange = (): DateRangeContextType => {
	const context = useContext(DateRangeContext)
	if (context === undefined) {
		throw new Error('useDateRange must be used within a DateRangeProvider')
	}
	return context
}
