import React, { memo, useMemo } from 'react'
import { type Control, useWatch } from 'react-hook-form'
import { type FormValues } from '@features/form/lib/form-schema'
import { FormField, FormItem, FormLabel, FormControl } from '@shared/components/ui/form'
import { Input } from '@shared/components/ui/input'
import { createCalculatorInputHandler } from '@shared/utils/number-utils'

interface PaymentHeaderProps {
	control: Control<FormValues>
	inputStyles: string
	exchangeRate?: number
	isLoadingRate?: boolean
	totalAmountReadOnly?: boolean
}

export const PaymentHeader = memo(({ control, inputStyles, exchangeRate, isLoadingRate, totalAmountReadOnly = false }: PaymentHeaderProps) => {
	const totalAmount = useWatch({
		control,
		name: 'totalAmount',
	})
	const totalInVes = React.useMemo(() => {
		if (exchangeRate && totalAmount) {
			const amount = parseFloat(String(totalAmount))
			if (!isNaN(amount) && amount > 0) {
				return (amount * exchangeRate).toFixed(2)
			}
		}
		return null
	}, [totalAmount, exchangeRate])

	const currencyLabel = '$'

	return (
		<React.Fragment>
			<FormField
				control={control}
				name="totalAmount"
				render={({ field }) => {
					const readOnlyValue =
						field.value != null && field.value !== '' ? String(Number(field.value).toFixed(2)) : '0,00'
					return (
					<FormItem className="w-full">
						<FormLabel className="text-sm sm:text-base">Monto Total {currencyLabel}</FormLabel>
						<FormControl>
							{totalAmountReadOnly ? (
								<Input
									type="text"
									value={readOnlyValue}
									readOnly
									className={`${inputStyles} text-right font-mono bg-muted`}
								/>
							) : (
								(() => {
									const calculatorHandler = createCalculatorInputHandler(field.value || 0, field.onChange)
									return (
										<Input
											type="text"
											inputMode="decimal"
											placeholder="0,00"
											value={calculatorHandler.displayValue}
											onKeyDown={calculatorHandler.handleKeyDown}
											onPaste={calculatorHandler.handlePaste}
											onFocus={calculatorHandler.handleFocus}
											onChange={calculatorHandler.handleChange}
											className={`${inputStyles} text-right font-mono`}
											autoComplete="off"
										/>
									)
								})()
							)}
						</FormControl>
						<div className="flex gap-2 items-center flex-nowrap">
							{totalInVes && <p className="text-xs sm:text-sm font-bold text-green-600 whitespace-nowrap">{totalInVes} VES</p>}
							<p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
								{isLoadingRate ? 'Cargando tasa...' : `Tasa BCV: ${exchangeRate?.toFixed(2) || 'N/A'} VES/USD`}
							</p>
						</div>
					</FormItem>
					)
				}}
			/>
		</React.Fragment>
	)
})

PaymentHeader.displayName = 'PaymentHeader'
