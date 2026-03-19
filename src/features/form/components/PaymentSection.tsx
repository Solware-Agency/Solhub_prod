import {
	type Control,
	type FieldArrayWithId,
	type UseFieldArrayAppend,
	type UseFieldArrayRemove,
	useWatch,
	useFormContext,
} from 'react-hook-form'
import { type FormValues } from '@features/form/lib/form-schema'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { FormDropdown, createDropdownOptions } from '@shared/components/ui/form-dropdown'
import { FormField, FormLabel, FormItem, FormControl, FormMessage } from '@shared/components/ui/form'
import { useMemo, memo, useCallback, useEffect } from 'react'
import { PaymentHeader } from './payment/PaymentHeader'
import { ConverterUSDtoVES } from './payment/ConverterUSDtoVES'
import { PaymentMethodsList } from './payment/PaymentMethodsList'
import { PaymentSectionSkeleton } from './payment/PaymentSectionSkeleton'
import { calculatePaymentDetails, calculatePaymentDetailsWithCredit } from '@features/form/lib/payment/payment-utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'
import { Input } from '@shared/components/ui/input'
import { createCalculatorInputHandlerWithCurrency } from '@shared/utils/number-utils'
import { Info } from 'lucide-react'
import type { SampleTypeCost } from '@services/supabase/laboratories/sample-type-costs-service'
import { cn } from '@shared/lib/cn'

export type PriceTypeOption = 'taquilla' | 'convenios' | 'descuento'

interface PaymentSectionProps {
	control: Control<FormValues>
	fields: FieldArrayWithId<FormValues, 'payments', 'id'>[]
	append?: UseFieldArrayAppend<FormValues, 'payments'> | (() => void)
	remove: UseFieldArrayRemove
	inputStyles: string
	usdValue: string
	setUsdValue: (value: string) => void
	vesValue: string
	vesInputValue: string
	setVesInputValue: (value: string) => void
	usdFromVes: string
	converterUsdValue: string
	setConverterUsdValue: (value: string) => void
	converterVesValue: string
	exchangeRate: number | undefined
	isLoadingRate: boolean
	isSampleTypeCostsEnabled?: boolean
	sampleTypeCosts?: SampleTypeCost[] | null
	/** Porcentaje de descuento para precio convenios (ej. 5). Usado para calcular precio desde taquilla. */
	convenioDiscountPercent?: number
	/** Porcentaje de descuento para precio descuento (ej. 10). Usado para calcular precio desde taquilla. */
	descuentoDiscountPercent?: number
	/** Crédito disponible del paciente (saldo a favor) para labs con hasPositiveBalance. */
	patientCredit?: number
	hasPositiveBalance?: boolean
}

export const PaymentSection = memo((props: PaymentSectionProps) => {
	const {
		control,
		fields,
		append,
		remove,
		inputStyles,
		setUsdValue,
		converterUsdValue,
		setConverterUsdValue,
		converterVesValue,
		exchangeRate,
		isLoadingRate,
		isSampleTypeCostsEnabled = false,
		sampleTypeCosts = null,
		convenioDiscountPercent = 5,
		descuentoDiscountPercent = 10,
		patientCredit = 0,
		hasPositiveBalance = false,
	} = props
	const { setValue } = useFormContext<FormValues>()
	const creditApplied = useWatch({ control, name: 'creditApplied', defaultValue: 0 }) ?? 0
	const factorConvenios = (100 - convenioDiscountPercent) / 100
	const factorDescuento = (100 - descuentoDiscountPercent) / 100
	const watchedPayments = useWatch({
		control,
		name: 'payments',
		defaultValue: [],
	})
	const totalAmount = useWatch({
		control,
		name: 'totalAmount',
	})
	const sampleType = useWatch({ control, name: 'sampleType', defaultValue: '' })
	const numberOfSamples = useWatch({ control, name: 'numberOfSamples', defaultValue: 1 })
	const priceType = useWatch({ control, name: 'priceType', defaultValue: '' })

	const selectedCost = useMemo(() => {
		if (!sampleType || !sampleTypeCosts?.length) return null
		return sampleTypeCosts.find((c) => c.name === sampleType) ?? null
	}, [sampleType, sampleTypeCosts])

	const onlyTaquilla = useMemo(
		() => selectedCost?.price_convenios == null && selectedCost?.price_descuento == null,
		[selectedCost]
	)

	const round2 = useCallback((value: number) => Number(value.toFixed(2)), [])

	const getMultiplier = useCallback(() => {
		const qty = typeof numberOfSamples === 'number' ? numberOfSamples : Number(numberOfSamples)
		return Math.max(1, isNaN(qty) ? 1 : qty)
	}, [numberOfSamples])

	const applyPriceOption = useCallback(
		(option: PriceTypeOption) => {
			if (!selectedCost) return
			const taquilla = selectedCost.price_taquilla
			const amount =
				option === 'taquilla'
					? taquilla
					: option === 'convenios'
						? taquilla != null ? round2(taquilla * factorConvenios) : null
						: taquilla != null ? round2(taquilla * factorDescuento) : null
			if (amount != null) {
				const total = round2(amount * getMultiplier())
				setValue('totalAmount', total, { shouldValidate: true })
				setValue('priceType', option, { shouldValidate: false })
				setUsdValue(String(total))
			}
		},
		[selectedCost, setValue, setUsdValue, getMultiplier, round2, factorConvenios, factorDescuento]
	)

	// When sample type changes in Marihorgen, clear price selection so user picks again
	useEffect(() => {
		if (!isSampleTypeCostsEnabled) return
		setValue('priceType', '', { shouldValidate: false })
		setValue('totalAmount', 0, { shouldValidate: true })
		setUsdValue('')
	}, [sampleType, isSampleTypeCostsEnabled, setValue, setUsdValue])

	useEffect(() => {
		if (!isSampleTypeCostsEnabled) return
		if (!selectedCost || !priceType) return
		const taquilla = selectedCost.price_taquilla
		const base =
			priceType === 'taquilla'
				? taquilla
				: priceType === 'convenios'
					? taquilla != null ? round2(taquilla * factorConvenios) : null
					: taquilla != null ? round2(taquilla * factorDescuento) : null
		if (base == null) return
		const total = round2(base * getMultiplier())
		setValue('totalAmount', total, { shouldValidate: true })
		setUsdValue(String(total))
	}, [numberOfSamples, priceType, selectedCost, isSampleTypeCostsEnabled, getMultiplier, round2, setValue, setUsdValue, factorConvenios, factorDescuento])

	// Use useMemo to prevent recalculation on every render (consider creditApplied when hasPositiveBalance)
	const { paymentStatus, isPaymentComplete, missingAmount } = useMemo(() => {
		const numCredit = Number(creditApplied) || 0
		if (hasPositiveBalance && numCredit > 0) {
			return calculatePaymentDetailsWithCredit(watchedPayments, totalAmount, exchangeRate, numCredit)
		}
		return calculatePaymentDetails(watchedPayments, totalAmount, exchangeRate)
	}, [totalAmount, watchedPayments, exchangeRate, creditApplied, hasPositiveBalance])

	if (isLoadingRate) {
		return <PaymentSectionSkeleton />
	}

	return (
		<Card className="transition-transform duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/20">
			<CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
				<CardTitle className="text-lg sm:text-xl">Pago</CardTitle>
				<Tooltip>
						<TooltipTrigger>
							<Info className="size-4" />
						</TooltipTrigger>
						<TooltipContent>
							<p>
								El maximo de metodos de pago son 4.
							</p>
						</TooltipContent>
					</Tooltip>
			</CardHeader>
			<CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4 sm:space-y-6">
				<div
					className={cn(
						'grid grid-cols-1 gap-3 sm:gap-4 items-start',
						isSampleTypeCostsEnabled && sampleTypeCosts && sampleTypeCosts.length > 0
							? 'md:grid-cols-[1fr_1fr_1fr_1fr]'
							: 'md:grid-cols-[1fr_1fr_1fr]'
					)}
				>
					{isSampleTypeCostsEnabled && sampleTypeCosts && sampleTypeCosts.length > 0 && (
						<div className="w-full">
							<FormField
								control={control}
								name="priceType"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormLabel className="text-sm sm:text-base">Tipo de precio <span className="text-destructive">*</span></FormLabel>
										<FormControl>
											<FormDropdown
												options={createDropdownOptions(
													[
														{ value: 'taquilla', label: 'Taquilla (Costo 1)' },
														{ value: 'convenios', label: 'Convenios (Costo 2)', disabled: onlyTaquilla },
														{ value: 'descuento', label: 'Descuento (Costo 3)', disabled: onlyTaquilla },
													]
												)}
												value={field.value || ''}
												onChange={(value) => applyPriceOption(value as PriceTypeOption)}
												placeholder="Seleccione tipo de precio"
												disabled={!selectedCost}
												className={cn(!selectedCost && 'opacity-50 cursor-not-allowed')}
												id="payment-price-type"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{!sampleType && (
								<p className="text-xs text-muted-foreground mt-2">Seleccione primero el tipo de muestra arriba.</p>
							)}
						</div>
					)}
					<div className="w-full">
						<PaymentHeader
							control={control}
							inputStyles={inputStyles}
							exchangeRate={exchangeRate}
							isLoadingRate={isLoadingRate}
							totalAmountReadOnly={isSampleTypeCostsEnabled && !!sampleType && !!priceType}
						/>
					</div>
					<div className="w-full">
						<ConverterUSDtoVES
							converterUsdValue={converterUsdValue}
							setConverterUsdValue={setConverterUsdValue}
							converterVesValue={converterVesValue}
							exchangeRate={exchangeRate}
							isLoadingRate={isLoadingRate}
							inputStyles={inputStyles}
						/>
					</div>

					{/* Aplicar saldo a favor - solo labs con hasPositiveBalance (misma lógica/UI que monto en métodos de pago) */}
					{hasPositiveBalance && patientCredit > 0 && totalAmount > 0 && (
						<div className="w-full space-y-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3">
							<p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
								Crédito disponible: ${patientCredit.toFixed(2)} USD
							</p>
							<FormField
								control={control}
								name="creditApplied"
								render={({ field }) => {
									const maxAllowed = Math.min(patientCredit, totalAmount)
									const calculatorHandler = createCalculatorInputHandlerWithCurrency(
										field.value ?? 0,
										(newValue) => field.onChange(Math.min(maxAllowed, Math.max(0, newValue))),
										'Zelle', // USD: sin conversión VES en método; igual mostramos conversión abajo si hay tasa
										exchangeRate,
									)
									return (
										<FormItem>
											<FormLabel className="text-sm">Aplicar saldo a favor (USD)</FormLabel>
											<FormControl>
												<div className="flex flex-col gap-1 w-full">
													<div className="w-full">
														<Input
															id="credit-applied-amount"
															name="creditApplied"
															type="text"
															inputMode="decimal"
															placeholder={calculatorHandler.placeholder}
															value={calculatorHandler.displayValue}
															onKeyDown={calculatorHandler.handleKeyDown}
															onPaste={calculatorHandler.handlePaste}
															onFocus={calculatorHandler.handleFocus}
															onChange={calculatorHandler.handleChange}
															className={cn(inputStyles, 'text-right font-mono')}
															autoComplete="off"
														/>
													</div>
													{calculatorHandler.conversionText && (
														<p className="text-xs text-emerald-600 dark:text-emerald-400 text-right">
															{calculatorHandler.conversionText}
														</p>
													)}
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)
								}}
							/>
							{creditApplied > 0 && (
								<p className="text-xs text-emerald-700 dark:text-emerald-300">
									Monto restante a pagar con métodos: ${(Math.max(0, totalAmount - (Number(creditApplied) || 0))).toFixed(2)} USD
								</p>
							)}
						</div>
					)}

					{/* Estado de pago - aparece en la misma línea */}
					<div className="flex items-start justify-center md:justify-start pt-6 w-full">
						{/* Mensaje de error cuando monto total es 0 */}
						{totalAmount === 0 && (
							<div className="dark:bg-red-900 bg-red-900 text-red-200 border border-red-700 rounded-lg px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap">
								<div className="flex items-center gap-1">
									<span>⚠️</span>
									<span>El monto total debe ser mayor a 0,01</span>
								</div>
							</div>
						)}

						{/* Alerta de monto pendiente */}
						{totalAmount > 0 && !isPaymentComplete && missingAmount && missingAmount > 0 && (
							<div className="dark:bg-red-900 bg-red-900 text-red-200 border border-red-700 rounded-lg px-2 sm:px-3 py-2 text-xs font-semibold w-full max-w-full">
								<div className="flex items-center">Monto pendiente: ${missingAmount.toFixed(2)}</div>
								{exchangeRate && (
									<div className="mt-1 text-xs text-red-300 font-normal">
										Equivalente: Bs {(missingAmount * exchangeRate).toFixed(2)}
									</div>
								)}
							</div>
						)}

						{/* Mensaje de pago completado */}
						{totalAmount > 0 && isPaymentComplete && (
							<div className="bg-green-900/70 text-green-200 border border-green-700 rounded-lg px-2 sm:px-3 py-2 text-xs font-semibold w-full max-w-full">
								<div className="flex items-center">
									<span className="mr-1">✅</span>
									Pago completado
								</div>
								<div className="mt-1 text-xs text-green-300 font-normal">El monto total ha sido cubierto</div>
							</div>
						)}
					</div>
				</div>

				<PaymentMethodsList
					control={control}
					fields={fields}
					append={append}
					remove={remove}
					inputStyles={inputStyles}
					paymentStatus={paymentStatus}
					exchangeRate={exchangeRate}
				/>
			</CardContent>
		</Card>
	)
})

PaymentSection.displayName = 'PaymentSection'