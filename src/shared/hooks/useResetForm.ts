import { useEffect } from 'react'
import { type UseFormReturn } from 'react-hook-form'

export function useResetForm(
	form: UseFormReturn<any>,
	getInitialFormValues: () => any,
	setUsdValue: (s: string) => void,
	setIsSubmitted: (b: boolean) => void,
	toast: (args: any) => void,
) {
	useEffect(() => {
		const clearFormHandler = () => {
			form.reset(getInitialFormValues())
			setUsdValue('')
			setIsSubmitted(false)
			toast({
				title: '🧹 Formulario Limpio',
				description: 'Todos los campos han sido reiniciados.',
			})
		}
		window.addEventListener('clearForm', clearFormHandler)
		return () => window.removeEventListener('clearForm', clearFormHandler)
	}, [form, toast, setUsdValue, setIsSubmitted, getInitialFormValues])
}