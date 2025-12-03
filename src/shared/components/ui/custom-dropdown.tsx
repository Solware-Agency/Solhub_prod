import { useState, useRef, useEffect, forwardRef } from 'react'
import type React from 'react'
import ReactDOM from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@shared/lib/cn'

interface DropdownOption {
	value: string
	label: string
	disabled?: boolean
}

interface CustomDropdownProps {
	options: DropdownOption[]
	value?: string
	placeholder?: string
	className?: string
	disabled?: boolean
	onChange?: (value: string) => void
	defaultValue?: string
	direction?: 'auto' | 'up' | 'down'
	'data-testid'?: string
	id?: string
}

const CustomDropdown = forwardRef<HTMLDivElement, CustomDropdownProps>(
	(
		{
			options,
			value,
			placeholder = 'Seleccione una opción',
			className,
			disabled,
			onChange,
			defaultValue,
			direction = 'auto',
			id,
			...props
		},
		ref,
	) => {
		const [isOpen, setIsOpen] = useState(false)
		const [selectedValue, setSelectedValue] = useState(value || defaultValue || '')
		const dropdownRef = useRef<HTMLDivElement>(null)
		const listRef = useRef<HTMLDivElement>(null)
		const [, setOpenDirection] = useState<'up' | 'down'>('down')
		const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null)

		// Combine refs
		const combinedRef = (node: HTMLDivElement) => {
			dropdownRef.current = node
			if (typeof ref === 'function') {
				ref(node)
			} else if (ref) {
				ref.current = node
			}
		}

		// Close dropdown when clicking outside
		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				const targetNode = event.target as Node
				const clickedInsideTrigger = dropdownRef.current?.contains(targetNode)
				const clickedInsideList = listRef.current?.contains(targetNode)

				if (!clickedInsideTrigger && !clickedInsideList) {
					setIsOpen(false)
				}
			}

			// Use capture phase to ensure we catch events before modal handlers
			// Only add listener when dropdown is open
			if (isOpen) {
				document.addEventListener('mousedown', handleClickOutside, true)
			}

			return () => {
				if (isOpen) {
					document.removeEventListener('mousedown', handleClickOutside, true)
				}
			}
		}, [isOpen])

		// Handle keyboard navigation
		useEffect(() => {
			const handleKeyDown = (event: KeyboardEvent) => {
				if (!isOpen) return

				switch (event.key) {
					case 'Escape':
						setIsOpen(false)
						break
					case 'ArrowDown':
						event.preventDefault()
						// Focus next option
						break
					case 'ArrowUp':
						event.preventDefault()
						// Focus previous option
						break
					case 'Enter':
						event.preventDefault()
						// Select focused option
						break
				}
			}

			document.addEventListener('keydown', handleKeyDown)
			return () => document.removeEventListener('keydown', handleKeyDown)
		}, [isOpen])

		// Sync with external value changes
		useEffect(() => {
			if (value !== undefined) {
				setSelectedValue(value)
			}
		}, [value])

		const computePositioning = () => {
			const node = dropdownRef.current
			if (!node) return

			// Check if we're inside a modal or dialog
			const isInModal = node.closest('[role="dialog"]') || node.closest('.modal') || node.closest('[data-modal]')

			if (isInModal) {
				// For modals, use relative positioning to avoid portal issues
				setMenuStyle({
					position: 'absolute',
					top: '100%',
					left: 0,
					width: '100%',
					zIndex: 50,
				})
				setOpenDirection('down')
				return
			}

			const rect = node.getBoundingClientRect()
			const viewportH = window.innerHeight || document.documentElement.clientHeight
			const spaceBelow = viewportH - rect.bottom
			const spaceAbove = rect.top

			let nextDirection: 'up' | 'down' = 'down'
			if (direction === 'up' || direction === 'down') {
				nextDirection = direction
			} else {
				// auto
				nextDirection = spaceBelow >= 160 || spaceBelow >= spaceAbove ? 'down' : 'up'
			}

			setOpenDirection(nextDirection)

			// Fixed positioning to avoid clipping by overflow ancestors
			if (nextDirection === 'down') {
				setMenuStyle({
					position: 'fixed',
					top: rect.bottom + 4,
					left: rect.left,
					width: rect.width,
				})
			} else {
				setMenuStyle({
					position: 'fixed',
					top: rect.top - 4,
					left: rect.left,
					width: rect.width,
					transform: 'translateY(-100%)',
				})
			}
		}

		const handleToggle = (e?: React.MouseEvent) => {
			if (disabled) return
			e?.preventDefault()
			e?.stopPropagation()
			const next = !isOpen
			if (next) {
				computePositioning()
			}
			setIsOpen(next)
		}

		// Close dropdown on scroll and reposition on resize while open
		useEffect(() => {
			if (!isOpen) return
			const onScroll = () => setIsOpen(false) // Close dropdown on scroll to keep it fixed
			const onResize = () => computePositioning()

			// Only listen to scroll events on the window, not on all elements
			window.addEventListener('scroll', onScroll, { passive: true })
			window.addEventListener('resize', onResize)

			return () => {
				window.removeEventListener('scroll', onScroll)
				window.removeEventListener('resize', onResize)
			}
		}, [isOpen])

		const handleSelect = (optionValue: string) => {
			setSelectedValue(optionValue)
			setIsOpen(false)
			onChange?.(optionValue)
		}

		const selectedOption = options.find((option) => option.value === selectedValue)

		// Check if we're inside a modal to determine rendering strategy
		const isInModal =
			dropdownRef.current?.closest('[role="dialog"]') ||
			dropdownRef.current?.closest('.modal') ||
			dropdownRef.current?.closest('[data-modal]')

		const dropdownContent = (
			<div
				ref={listRef}
				className={cn(
					'overflow-visible rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 duration-200',
					isInModal ? 'absolute z-50' : 'fixed z-[1000]',
				)}
				style={menuStyle || undefined}
				role="listbox"
				onMouseDown={(e) => {
					// Prevent the dropdown from closing when clicking inside it
					e.stopPropagation()
				}}
			>
				{options.length === 0 ? (
					<div className="px-3 py-2 text-sm text-muted-foreground">No hay opciones disponibles</div>
				) : (
					options.map((option) => (
						<div
							key={option.value}
							onClick={(e) => {
								e.preventDefault()
								e.stopPropagation()
								if (!option.disabled) {
									handleSelect(option.value)
								}
							}}
							onMouseDown={(e) => {
								e.preventDefault()
								e.stopPropagation()
							}}
							className={cn(
								'relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
								option.disabled && 'pointer-events-none opacity-50',
								selectedValue === option.value && 'bg-accent text-accent-foreground',
							)}
							role="option"
							aria-selected={selectedValue === option.value}
						>
							<span>{option.label}</span>
						</div>
					))
				)}
			</div>
		)

		return (
			<div ref={combinedRef} className={cn('relative w-full', className)} {...props}>
				{/* Trigger */}
				<div
					id={id}
					onClick={handleToggle}
					onMouseDown={(e) => {
						// Prevent the dropdown from closing when clicking the trigger
						e.stopPropagation()
					}}
					className={cn(
						'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer transition-transform duration-200 hover:border-primary hover:shadow-sm hover:bg-accent/50',
						disabled && 'cursor-not-allowed opacity-50 hover:border-input hover:shadow-none hover:bg-background',
						isOpen && 'ring-2 ring-ring ring-offset-2',
					)}
					tabIndex={disabled ? -1 : 0}
					role="combobox"
					aria-expanded={isOpen}
					aria-haspopup="listbox"
				>
					<span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
						{selectedOption ? selectedOption.label : placeholder}
					</span>
					<ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform duration-200', isOpen && 'rotate-180')} />
				</div>

				{/* Dropdown Content */}
				{isOpen && menuStyle && (isInModal ? dropdownContent : ReactDOM.createPortal(dropdownContent, document.body))}
			</div>
		)
	},
)

CustomDropdown.displayName = 'CustomDropdown'

export { CustomDropdown }
export type { DropdownOption, CustomDropdownProps }
