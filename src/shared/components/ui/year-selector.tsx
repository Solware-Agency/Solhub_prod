import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@shared/components/ui/button'

interface YearSelectorProps {
  selectedYear: number
  onYearChange: (year: number) => void
  minYear?: number
  maxYear?: number
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  selectedYear,
  onYearChange,
  minYear = 2020,
  maxYear = new Date().getFullYear() + 2
}) => {
  const handlePreviousYear = () => {
    if (selectedYear > minYear) {
      onYearChange(selectedYear - 1)
    }
  }

  const handleNextYear = () => {
    if (selectedYear < maxYear) {
      onYearChange(selectedYear + 1)
    }
  }

  return (
    <div className="flex items-center bg-white dark:bg-background rounded-lg border border-gray-200 dark:border-gray-700 p-1">
      <Button 
        variant="ghost"
        size="sm"
        onClick={handlePreviousYear}
        disabled={selectedYear <= minYear}
        className="h-6 sm:h-8 w-6 sm:w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
      
      <div className="px-2 sm:px-3 py-0.5 sm:py-1 min-w-[40px] sm:min-w-[60px] text-center">
        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedYear}
        </span>
      </div>
      
      <Button 
        variant="ghost"
        size="sm"
        onClick={handleNextYear}
        disabled={selectedYear >= maxYear}
        className="h-6 sm:h-8 w-6 sm:w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    </div>
  )
}