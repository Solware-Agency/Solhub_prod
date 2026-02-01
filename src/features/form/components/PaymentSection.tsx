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
import { FormLabel, FormItem, FormControl } from '@shared/components/ui/form'
import { useMemo, memo, useCallback, useEffect } from 'react'
import { PaymentHeader } from './payment/PaymentHeader'
import { ConverterUSDtoVES } from './payment/ConverterUSDtoVES'
import { PaymentMethodsList } from './payment/PaymentMethodsList'
import { PaymentSectionSkeleton } from './payment/PaymentSectionSkeleton'
import { calculatePaymentDetails } from '@features/form/lib/payment/payment-utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'
import { Info, DollarSign, FileCheck, Percent } from 'lucide-react'
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
	exchangeRate: number | undefined
	isLoadingRate: boolean
	isMarihorgen?: boolean
	sampleTypeCosts?: SampleTypeCost[] | null
}

export const PaymentSection = memo(({
	control,
	fields,
	append,
	remove,
	inputStyles,
	usdValue,
	setUsdValue,
	vesValue,
	vesInputValue,
	setVesInputValue,
	usdFromVes,
	exchangeRate,
	isLoadingRate,
	isMarihorgen = false,
	sampleTypeCosts = null,
}: PaymentSectionProps) => {
	const { setValue } = useFormContext<FormValues>()
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
			const amount =
				option === 'taquilla'
					? selectedCost.price_taquilla
					: option === 'convenios'
						? selectedCost.price_convenios
						: selectedCost.price_descuento
			if (amount != null) {
				const total = round2(amount * getMultiplier())
				setValue('totalAmount', total, { shouldValidate: true })
				setValue('priceType', option, { shouldValidate: false })
				setUsdValue(String(total))
			}
		},
		[selectedCost, setValue, setUsdValue, getMultiplier, round2]
	)

	// When sample type changes in Marihorgen, clear price selection so user picks again
	useEffect(() => {
		if (!isMarihorgen) return
		setValue('priceType', '', { shouldValidate: false })
		setValue('totalAmount', 0, { shouldValidate: true })
		setUsdValue('')
	}, [sampleType, isMarihorgen, setValue, setUsdValue])

	useEffect(() => {
		if (!isMarihorgen) return
		if (!selectedCost || !priceType) return
		const base =
			priceType === 'taquilla'
				? selectedCost.price_taquilla
				: priceType === 'convenios'
					? selectedCost.price_convenios
					: selectedCost.price_descuento
		if (base == null) return
		const total = round2(base * getMultiplier())
		setValue('totalAmount', total, { shouldValidate: true })
		setUsdValue(String(total))
	}, [numberOfSamples, priceType, selectedCost, isMarihorgen, getMultiplier, round2, setValue, setUsdValue])

	// Use useMemo to prevent recalculation on every render
	const { paymentStatus, isPaymentComplete, missingAmount } = useMemo(() => {
		return calculatePaymentDetails(watchedPayments, totalAmount, exchangeRate)
	}, [totalAmount, watchedPayments, exchangeRate])

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
						isMarihorgen && sampleTypeCosts && sampleTypeCosts.length > 0
							? 'md:grid-cols-[1fr_1fr_1fr_1fr]'
							: 'md:grid-cols-[1fr_1fr_1fr]'
					)}
				>
					{isMarihorgen && sampleTypeCosts && sampleTypeCosts.length > 0 && (
						<div className="w-full">
							<FormItem className="w-full">
								<FormLabel className="text-sm sm:text-base">Tipo de precio</FormLabel>
								<FormControl>
									<FormDropdown
										options={createDropdownOptions(
											[
												{ value: 'taquilla', label: 'Taquilla (Costo 1)' },
												{ value: 'convenios', label: 'Convenios (Costo 2)', disabled: onlyTaquilla },
												{ value: 'descuento', label: 'Descuento (Costo 3)', disabled: onlyTaquilla },
											]
										)}
										value={priceType || ''}
										onChange={(value) => applyPriceOption(value as PriceTypeOption)}
										placeholder="Seleccione tipo de precio"
										disabled={!selectedCost}
										className={cn(!selectedCost && 'opacity-50 cursor-not-allowed')}
										id="payment-price-type"
									/>
								</FormControl>
							</FormItem>
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
							totalAmountReadOnly={isMarihorgen && !!sampleType && !!priceType}
						/>
					</div>
					<div className="w-full">
						<ConverterUSDtoVES
							usdValue={usdValue}
							setUsdValue={setUsdValue}
							vesValue={vesValue}
							vesInputValue={vesInputValue}
							setVesInputValue={setVesInputValue}
							usdFromVes={usdFromVes}
							exchangeRate={exchangeRate}
							isLoadingRate={isLoadingRate}
							inputStyles={inputStyles}
						/>
					</div>

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