import React, { memo } from 'react'
import { type Control, useWatch, useFormContext } from 'react-hook-form'
import { type FormValues } from '@features/form/lib/form-schema'
import { FormField, FormItem, FormLabel, FormControl } from '@shared/components/ui/form'
import { Input } from '@shared/components/ui/input'
import { FormDropdown, createDropdownOptions } from '@shared/components/ui/form-dropdown'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { useEffect } from 'react'
import { createCalculatorInputHandler } from '@shared/utils/number-utils'

interface PaymentHeaderProps {
	control: Control<FormValues>
	inputStyles: string
	exchangeRate?: number
	isLoadingRate?: boolean
}

export const PaymentHeader = memo(({ control, inputStyles, exchangeRate, isLoadingRate }: PaymentHeaderProps) => {
	const { profile } = useUserProfile()
	const { setValue } = useFormContext()
	const totalAmount = useWatch({
		control,
		name: 'totalAmount',
	})
	const branch = useWatch({
		control,
		name: 'branch',
	})

	// Auto-set branch if user has an assigned branch
	useEffect(() => {
		if (profile?.assigned_branch && !branch) {
			// Set the branch to the user's assigned branch
			setValue('branch', profile.assigned_branch)
		}
	}, [profile, branch, setValue])

	const totalInVes = React.useMemo(() => {
		if (exchangeRate && totalAmount) {
			const amount = parseFloat(String(totalAmount))
			if (!isNaN(amount) && amount > 0) {
				return (amount * exchangeRate).toFixed(2)
			}
		}
		return null
	}, [totalAmount, exchangeRate])

	// Memoize the amount change handler to prevent re-renders

	return (
		<React.Fragment>
			<FormField
				control={control}
				name="branch"
				render={({ field }) => (
					<FormItem className="w-full">
						<FormLabel className="text-sm sm:text-base">Sede *</FormLabel>
						<FormControl>
							<FormDropdown
								options={createDropdownOptions(
									!profile?.assigned_branch ? ['PMG', 'CPC', 'CNX', 'STX', 'MCY'] : [profile.assigned_branch],
								)}
								value={field.value}
								onChange={field.onChange}
								placeholder="Seleccione una sede"
								className={inputStyles}
								disabled={!!profile?.assigned_branch}
								id="payment-branch"
							/>
						</FormControl>
						{profile?.assigned_branch && (
							<p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
								Tu cuenta está limitada a la sede {profile.assigned_branch}
							</p>
						)}
					</FormItem>
				)}
			/>
			<FormField
				control={control}
				name="totalAmount"
				render={({ field }) => (
					<FormItem className="w-full">
						<FormLabel className="text-sm sm:text-base">Monto Total $</FormLabel>
						<FormControl>
							{(() => {
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
							})()}
						</FormControl>
						<div className="flex gap-2 items-center">
							{totalInVes && <p className="text-xs sm:text-sm font-bold text-green-600">{totalInVes} VES</p>}
							<p className="text-[10px] sm:text-xs text-muted-foreground">
								{isLoadingRate ? 'Cargando tasa...' : `Tasa BCV: ${exchangeRate?.toFixed(2) || 'N/A'} VES/USD`}
							</p>
						</div>
					</FormItem>
				)}
			/>
		</React.Fragment>
	)
})

PaymentHeader.displayName = 'PaymentHeader'
