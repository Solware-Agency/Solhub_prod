import { forwardRef } from 'react'
import { CustomDropdown, type DropdownOption } from './custom-dropdown'
import { cn } from '@shared/lib/cn'

interface FormDropdownProps {
	options: DropdownOption[]
	value?: string
	placeholder?: string
	className?: string
	disabled?: boolean
	onChange?: (value: string) => void
	defaultValue?: string
	'data-testid'?: string
	id?: string
}

/**
 * FormDropdown - Componente dropdown personalizado para formularios
 * Compatible con react-hook-form y con animaciones verticales suaves
 */
const FormDropdown = forwardRef<HTMLDivElement, FormDropdownProps>(
	({ options, value, onChange, className, id, ...props }, ref) => {
		return (
			<CustomDropdown
				ref={ref}
				options={options}
				value={value}
				onChange={onChange}
				className={cn('transition-transform duration-300 focus:border-primary focus:ring-primary', className)}
				id={id}
				{...props}
			/>
		)
	},
)

FormDropdown.displayName = 'FormDropdown'

// Helper function para crear opciones fácilmente
const createDropdownOptions = (
	items: string[] | { value: string; label: string; disabled?: boolean }[],
): DropdownOption[] => {
	return items.map((item) => {
		if (typeof item === 'string') {
			return { value: item, label: item }
		}
		return item
	})
}

export { FormDropdown, createDropdownOptions }
export type { FormDropdownProps }
