import {
	type Control,
	type FieldArrayWithId,
	type UseFieldArrayAppend,
	type UseFieldArrayRemove,
	useWatch,
} from 'react-hook-form'
import { type FormValues } from '@features/form/lib/form-schema'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { useMemo, memo } from 'react'
import { PaymentHeader } from './payment/PaymentHeader'
import { ConverterUSDtoVES } from './payment/ConverterUSDtoVES'
import { PaymentMethodsList } from './payment/PaymentMethodsList'
import { PaymentSectionSkeleton } from './payment/PaymentSectionSkeleton'
import { calculatePaymentDetails } from '@features/form/lib/payment/payment-utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip'
import { Info } from 'lucide-react'

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
}: PaymentSectionProps) => {
	const watchedPayments = useWatch({
		control,
		name: 'payments',
		defaultValue: [],
	})

	const totalAmount = useWatch({
		control,
		name: 'totalAmount',
	})

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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
					<PaymentHeader
						control={control}
						inputStyles={inputStyles}
						exchangeRate={exchangeRate}
						isLoadingRate={isLoadingRate}
					/>
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

					{/* Estado de pago - aparece en la misma línea */}
					<div className="flex items-center justify-center">
						{/* Mensaje de error cuando monto total es 0 */}
						{totalAmount === 0 && (
							<div className="dark:bg-red-900 bg-red-900 text-red-200 border border-red-700 rounded-lg px-4 py-3 text-sm font-semibold">
								<div className="flex items-center">
									<span className="mr-1">⚠️</span>
									El monto total debe ser mayor a 0,01
								</div>
							</div>
						)}

						{/* Alerta de monto pendiente */}
						{totalAmount > 0 && !isPaymentComplete && missingAmount && missingAmount > 0 && (
							<div className="dark:bg-red-900 bg-red-900 text-red-200 border border-red-700 rounded-lg px-4 py-3 text-sm font-semibold">
								<div className="flex items-center">Monto pendiente: ${missingAmount.toFixed(2)}</div>
								{exchangeRate && (
									<div className="mt-1 text-sm text-red-300 font-normal">
										Equivalente: Bs {(missingAmount * exchangeRate).toFixed(2)}
									</div>
								)}
							</div>
						)}

						{/* Mensaje de pago completado */}
						{totalAmount > 0 && isPaymentComplete && (
							<div className="bg-green-900/70 text-green-200 border border-green-700 rounded-lg px-3 py-2 text-xs font-semibold">
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