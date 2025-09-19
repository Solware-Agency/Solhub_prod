import { Input } from '@shared/components/ui/input'
import { FormLabel } from '@shared/components/ui/form'
import { memo } from 'react'
import { createCalculatorInputHandler } from '@shared/utils/number-utils'
import { useToast } from '@shared/hooks/use-toast'
import { Button } from '@shared/components/ui/button'
import { Copy } from 'lucide-react'

interface CurrencyConverterProps {
	usdValue: string
	setUsdValue: (value: string) => void
	vesValue: string
	vesInputValue: string
	setVesInputValue: (value: string) => void
	usdFromVes: string
	exchangeRate: number | undefined
	isLoadingRate: boolean
	inputStyles: string
}

export const ConverterUSDtoVES = memo(({ usdValue, setUsdValue, vesValue, inputStyles }: CurrencyConverterProps) => {
	const { toast } = useToast()

	// Calculator handlers for both inputs
	const usdCalculatorHandler = createCalculatorInputHandler(parseFloat(usdValue) || 0, (value: number) =>
		setUsdValue(value.toString()),
	)

	const handleCopyToClipboard = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value)
			toast({
				title: '📋 Copiado',
				description: `USD copiado al portapapeles`,
				className: 'bg-green-100 border-green-400 text-green-800',
			})
		} catch {
			toast({
				title: '❌ No se pudo copiar',
				description: 'Intenta nuevamente.',
				variant: 'destructive',
			})
		}
	}

	return (
		<div className="w-full space-y-2">
			<FormLabel className="text-sm sm:text-base">Convertidor USD a VES</FormLabel>
			<Input
				type="text"
				inputMode="decimal"
				placeholder="0,00"
				value={usdCalculatorHandler.displayValue}
				onKeyDown={usdCalculatorHandler.handleKeyDown}
				onPaste={usdCalculatorHandler.handlePaste}
				onFocus={usdCalculatorHandler.handleFocus}
				onChange={usdCalculatorHandler.handleChange}
				className={`${inputStyles} text-right font-mono`}
				autoComplete="off"
			/>
			{vesValue && (
				<div className="flex items-center gap-2">
					<p className="text-xs sm:text-sm font-bold text-green-600">{vesValue} VES</p>
					<Button
						variant="ghost"
						size="icon"
						type="button"
						className="h-6 w-6 flex-shrink-0"
						onClick={(e) => {
							e.stopPropagation()
							handleCopyToClipboard(vesValue)
						}}
						aria-label="Copiar VES"
					>
						<Copy className="size-4" />
					</Button>
				</div>
			)}
		</div>
	)
})

ConverterUSDtoVES.displayName = 'ConverterUSDtoVES'
