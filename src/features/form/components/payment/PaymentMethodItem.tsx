import { type Control, type FieldArrayWithId, type UseFieldArrayRemove, useWatch } from 'react-hook-form'
import { type FormValues } from '@features/form/lib/form-schema'
import { FormField, FormItem, FormLabel, FormControl } from '@shared/components/ui/form'
import { Input } from '@shared/components/ui/input'
import { FormDropdown, createDropdownOptions } from '@shared/components/ui/form-dropdown'
import { Button } from '@shared/components/ui/button'
import { Trash2, FileText } from 'lucide-react'
import { isBolivaresMethod } from '@features/form/lib/payment/payment-utils'
import { createCalculatorInputHandlerWithCurrency } from '@shared/utils/number-utils'
import { memo, useMemo, useCallback } from 'react'

interface PaymentMethodItemProps {
	control: Control<FormValues>
	index: number
	item: FieldArrayWithId<FormValues, 'payments', 'id'>
	remove: UseFieldArrayRemove
	inputStyles: string
	fieldsLength: number
	className?: string
	exchangeRate?: number
}

export const PaymentMethodItem = memo(
	({ control, index, remove, inputStyles, fieldsLength, className, exchangeRate }: PaymentMethodItemProps) => {
		const paymentMethod = useWatch({ control, name: `payments.${index}.method` })

		// Use useMemo to prevent unnecessary recalculations
		const { currencyLabel } = useMemo(() => {
			const isBolivares = isBolivaresMethod(paymentMethod)
			return {
				isBolivares,
				currencyLabel: isBolivares ? 'Bs' : '$',
				currencySymbol: isBolivares ? 'Bs' : '$',
			}
		}, [paymentMethod])

		// Memoize the handler to prevent unnecessary re-renders
		const handleRemove = useCallback(() => remove(index), [remove, index])

		return (
			<div className="relative">
				<div
					className={
						className ||
						'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 items-start bg-secondary p-3 sm:p-4 rounded-lg'
					}
				>
					<FormField
						control={control}
						name={`payments.${index}.method`}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Forma de Pago {index + 1}</FormLabel>
								<FormControl>
									<FormDropdown
										options={createDropdownOptions([
											'Punto de venta',
											'Dólares en efectivo',
											'Zelle',
											'Pago móvil',
											'Bs en efectivo',
										])}
										value={field.value}
										onChange={field.onChange}
										placeholder="Método"
										className={inputStyles}
										id={`payment-method-${index}`}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<FormField
						control={control}
						name={`payments.${index}.amount`}
						render={({ field }) => {
							const calculatorHandler = createCalculatorInputHandlerWithCurrency(
								field.value || 0,
								field.onChange,
								paymentMethod,
								exchangeRate,
							)

							return (
								<FormItem>
									<FormLabel>Monto {currencyLabel}</FormLabel>
									<FormControl>
										<div className="flex flex-col gap-1 w-full">
											<div className="w-full">
												<Input
													id={`payment-amount-${index}`}
													name={`payments.${index}.amount`}
													type="text"
													inputMode="decimal"
													placeholder={calculatorHandler.placeholder}
													value={calculatorHandler.displayValue}
													onKeyDown={calculatorHandler.handleKeyDown}
													onPaste={calculatorHandler.handlePaste}
													onFocus={calculatorHandler.handleFocus}
													onChange={calculatorHandler.handleChange}
													className={`${inputStyles} text-right font-mono`}
													autoComplete="off"
												/>
											</div>
											{calculatorHandler.conversionText && (
												<p className="text-xs text-green-600 dark:text-green-400 text-right">
													{calculatorHandler.conversionText}
												</p>
											)}
										</div>
									</FormControl>
								</FormItem>
							)
						}}
					/>
					<FormField
						control={control}
						name={`payments.${index}.reference`}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Comprobante</FormLabel>
								<FormControl>
									<Input
										id={`payment-reference-${index}`}
										placeholder="Referencia"
										{...field}
										className={inputStyles}
										iconRight={<FileText className="h-4 w-4 text-muted-foreground" />}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
				</div>
				{fieldsLength > 1 && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute top-2 right-2 text-destructive z-10"
						onClick={handleRemove}
						aria-label="Eliminar método de pago"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				)}
			</div>
		)
	},
)

PaymentMethodItem.displayName = 'PaymentMethodItem'
