import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@shared/components/ui/button';
import { Form } from '@shared/components/ui/form';
import { useToast } from '@shared/hooks/use-toast';
import { createFormSchema, type FormValues } from '@features/form/lib/form-schema';
import { PatientDataSection } from './PatientDataSection';
import { ServiceSection } from './ServiceSection';
import { PaymentSection } from './PaymentSection';
import { CommentsSection } from './CommentsSection';
import { Loader2, Trash2 } from 'lucide-react';
import { useExchangeRate } from '@shared/hooks/useExchangeRate';
import { useResetForm } from '@shared/hooks/useResetForm';
import {
  registerMedicalCase,
  validateRegistrationData,
} from '@services/supabase/cases/registration-service';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { FeatureGuard } from '@shared/components/FeatureGuard';
import { useModuleConfig } from '@shared/hooks/useModuleConfig';

const getInitialFormValues = (): FormValues => ({
  fullName: '',
  idType: 'V' as const,
  idNumber: '',
  phone: '',
  ageValue: 0,
  ageUnit: 'Años' as const,
  email: '',
  gender: '' as any, // Sin valor por defecto - placeholder
  examType: '',
  doctorName: '',
  treatingDoctor: '',
  patientType: '',
  origin: '',
  originType: '',
  patientBranch: '',
  branch: '',
  sampleType: '',
  numberOfSamples: 1,
  relationship: '',
  consulta: '', // Especialidad médica (solo para lab SPT)
  registrationDate: new Date(),
  totalAmount: 0, // Puede ser 0 si el módulo de pagos está deshabilitado
  payments: [{ method: '', amount: 0, reference: '' }],
  comments: '',
});

export function MedicalFormContainer() {
  const { toast } = useToast();
  const { data: exchangeRate, isLoading: isLoadingRate } = useExchangeRate();
  const [usdValue, setUsdValue] = useState('');
  const [vesValue, setVesValue] = useState('');
  const [vesInputValue, setVesInputValue] = useState('');
  const [usdFromVes, setUsdFromVes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientSectionResetKey, setPatientSectionResetKey] = useState(0)

	// Obtener configuración completa del módulo para pasar a registerMedicalCase
	const moduleConfig = useModuleConfig('registrationForm')

	// Crear schema dinámico basado en la configuración del módulo
	const dynamicFormSchema = useMemo(() => {
		return createFormSchema(moduleConfig)
	}, [moduleConfig])

	// Crear resolver dinámico que se actualiza cuando cambia el schema
	const dynamicResolver = useMemo(() => {
		return zodResolver(dynamicFormSchema)
	}, [dynamicFormSchema])

	const form = useForm<FormValues>({
		resolver: dynamicResolver,
		defaultValues: getInitialFormValues(),
		mode: 'onChange', // Validar en tiempo real para feedback inmediato
		reValidateMode: 'onChange', // Re-validar en onChange después del primer submit
		shouldUnregister: false, // Mantener valores incluso cuando campos se desmonten
	})

	// Actualizar el resolver cuando cambie el schema dinámico
	// Esto es necesario porque react-hook-form no actualiza el resolver automáticamente
	useEffect(() => {
		// Limpiar solo errores de campos que ya no son requeridos
		// No limpiar TODOS los errores para evitar perder validaciones en curso
		const currentErrors = form.formState.errors

		// Solo re-trigger si hay errores existentes, para evitar validaciones innecesarias
		if (Object.keys(currentErrors).length > 0) {
			form.trigger()
		}
	}, [dynamicFormSchema])

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'payments',
	})

	// Memoize the form control to prevent unnecessary re-renders
	const formControl = useMemo(() => form.control, [form.control])

	// Sync VES with USD input - memoized to prevent unnecessary re-renders
	useEffect(() => {
		if (exchangeRate && usdValue) {
			const usd = parseFloat(usdValue)
			if (!isNaN(usd)) {
				setVesValue((usd * exchangeRate).toFixed(2))
			}
		} else {
			setVesValue('')
		}
	}, [usdValue, exchangeRate])

	// Sync USD with VES input - memoized to prevent unnecessary re-renders
	useEffect(() => {
		if (exchangeRate && vesInputValue && exchangeRate > 0) {
			const ves = parseFloat(vesInputValue)
			if (!isNaN(ves)) {
				setUsdFromVes((ves / exchangeRate).toFixed(2))
			}
		} else {
			setUsdFromVes('')
		}
	}, [vesInputValue, exchangeRate])

	useResetForm(form, getInitialFormValues, setUsdValue, setIsSubmitted, toast)

	// Memoize the append handler to prevent unnecessary re-renders
	const handleAppend = useCallback(() => {
		append({ method: '', amount: 0, reference: '' })
	}, [append])

	// Memoize the submit handler to prevent unnecessary re-renders
	const onSubmit = useCallback(
		async (data: FormValues) => {
			console.log('🚀 onSubmit ejecutándose con datos:', data)
			setIsSubmitting(true)

			try {
				console.log('Enviando datos del formulario con nueva estructura:', data)
				console.log('Datos de pagos:', data.payments)
				console.log('Tasa de cambio:', exchangeRate)

				// Normalizar datos para asegurar que todos los campos opcionales tengan valores por defecto (no undefined)
				const normalizedData = {
					...data,
					examType: data.examType ?? '',
					treatingDoctor: data.treatingDoctor ?? '',
					origin: data.origin ?? '',
					sampleType: data.sampleType ?? '',
					branch: data.branch ?? '',
					consulta: data.consulta ?? '',
					relationship: data.relationship ?? '',
					email: data.email ?? '',
					numberOfSamples: data.numberOfSamples ?? 1,
				}

				// Validar datos antes del envío
				// Pasar configuración completa del módulo para validación
				const validationResult = validateRegistrationData(normalizedData, exchangeRate, moduleConfig)
				
				// Si hay errores, sincronizarlos con react-hook-form para mostrar campos en rojo
				if (Object.keys(validationResult.fieldErrors).length > 0) {
					// Establecer errores en cada campo del formulario
					Object.entries(validationResult.fieldErrors).forEach(([fieldName, errorMessage]) => {
						form.setError(fieldName as keyof FormValues, {
							type: 'manual',
							message: errorMessage,
						})

					})
					
					// Mostrar toast con mensaje general
					toast({
						title: '❌ Error de validación',
						description: validationResult.errorMessages.join(', '),
						variant: 'destructive',
					})
					
					// Scroll al primer campo con error
					const firstErrorField = Object.keys(validationResult.fieldErrors)[0]
					if (firstErrorField) {
						const element = document.querySelector(`[name="${firstErrorField}"]`) || 
						                document.getElementById(`service-${firstErrorField}`) ||
						                document.getElementById(`patient-${firstErrorField}`)
						if (element) {
							setTimeout(() => {
								element.scrollIntoView({ behavior: 'smooth', block: 'center' })
								if ('focus' in element && typeof (element as any).focus === 'function') {
									(element as any).focus()
								}
							}, 100)
						}
					}
					
					return
				}

				// Registrar caso médico con nueva estructura
				// Pasar moduleConfig para manejar valores por defecto cuando campos están deshabilitados
				const result = await registerMedicalCase(normalizedData, exchangeRate, moduleConfig)

				if (result.error) {
					console.error('Error al guardar con nueva estructura:', result.error)
					toast({
						title: '❌ Error al guardar',
						description: result.error,
						variant: 'destructive',
					})
					return
				}

				console.log('Registro guardado exitosamente con nueva estructura:', {
					patient: result.patient,
					medicalCase: result.medicalCase,
					isNewPatient: result.isNewPatient,
					patientUpdated: result.patientUpdated,
				})

				// Mensaje de éxito personalizado
				let successMessage = 'El caso médico se ha registrado correctamente.'
				if (result.isNewPatient) {
					successMessage += ' Se creó un nuevo paciente.'
				} else if (result.patientUpdated) {
					successMessage += ' Se actualizaron los datos del paciente.'
				} else {
					successMessage += ' Se agregó a un paciente existente.'
				}

				toast({
					title: '✅ Registro guardado',
					description: successMessage,
				})

				// Reset form and show new record button
				setIsSubmitted(true)
				setUsdValue('')
				setVesValue('')
				setVesInputValue('')
				setUsdFromVes('')

				// Reset form to initial values
				form.reset(getInitialFormValues())
			} catch (error) {
				console.error('Error inesperado:', error)
				toast({
					title: '❌ Error inesperado',
					description: 'Ocurrió un error inesperado. Intenta nuevamente.',
					variant: 'destructive',
				})
			} finally {
				setIsSubmitting(false)
			}
		},
		[exchangeRate, form, toast, setUsdValue, setVesValue, setVesInputValue, setUsdFromVes],
	)

	// Handler para errores de validación del formulario
	const onError = useCallback(
		(errors: any) => {
			console.log('❌ Errores de validación del formulario:', errors)
			
			// Prioridad: Si falta el nombre del paciente, mostrar mensaje específico
			if (errors.fullName) {
				toast({
					title: '⚠️ Paciente no seleccionado',
					description: 'Por favor, seleccione o ingrese un paciente para continuar con el registro del caso.',
					variant: 'destructive',
				})
			} else {
				// Otros errores de validación
				toast({
					title: '❌ Error de validación',
					description: 'Por favor, los campos en rojo son obligatorios.',
					variant: 'destructive',
				})
			}
			
			// Scroll al primer campo con error
			const firstErrorField = Object.keys(errors)[0]
			if (firstErrorField) {
				const element = document.getElementsByName(firstErrorField)[0]
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' })
					element.focus()
				}
			}
		},
		[toast],
	)

	// Handler directo para debuggear el botón
	const handleButtonClick = useCallback(
		(e: React.MouseEvent) => {
			console.log('🖱️ Botón clickeado!', e)
			console.log('📊 Estado del formulario:', {
				isSubmitting,
				isSubmitted,
				formErrors: form.formState.errors,
				isValid: form.formState.isValid,
				isDirty: form.formState.isDirty,
			})

			// Forzar el submit del formulario
			form.handleSubmit(onSubmit, onError)()
		},
		[form, onSubmit, onError, isSubmitting, isSubmitted],
	)

	// Memoize the clear form handler to prevent unnecessary re-renders
	const handleClearForm = useCallback(() => {
		form.reset(getInitialFormValues())
		setUsdValue('')
		setVesValue('')
		setVesInputValue('')
		setUsdFromVes('')
		setIsSubmitted(false)
		// Incrementar resetKey para resetear el estado interno de NewPatientDataSection
		setPatientSectionResetKey((prev) => prev + 1)
		toast({
			title: ' Formulario Limpio',
			description: 'Todos los campos han sido reiniciados.',
		})
	}, [form, toast])

	// Listen for clear form events from parent components
	useEffect(() => {
		const handleClearFormEvent = () => {
			handleClearForm()
		}

		window.addEventListener('clearForm', handleClearFormEvent)

		return () => {
			window.removeEventListener('clearForm', handleClearFormEvent)
		}
	}, [handleClearForm])

	const inputStyles = 'transition-transform duration-300 focus:border-primary focus:ring-primary'
	const { profile } = useUserProfile()

	return (
		<>
			{/* Boton sticky fuera del contenedor principal */}
			<div className="hidden lg:block fixed top-4 right-4 z-50">
				<Button
					type="button"
					onClick={handleClearForm}
					variant="outline"
					className="flex items-center gap-1 text-xs py-1 px-2 sm:py-1.5 sm:px-2.5 bg-background/95 backdrop-blur-sm border-2 hover:border-primary shadow-lg hover:shadow-xl"
				>
					<Trash2 className="h-4 w-4" />
					Limpiar
				</Button>
			</div>

			<div className="">
				<div className="flex justify-between mb-3 sm:mb-4 md:mb-6">
					<div>
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Formulario de Registro</h2>
								<div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full"></div>
							</div>
						</div>
						<h3 className="text-sm text-primary font-semibold mt-2 sm:mt-3">Bienvenido, {profile?.display_name}</h3>
					</div>
				</div>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-3 sm:space-y-4 md:space-y-6">
						<PatientDataSection key={patientSectionResetKey} control={formControl} inputStyles={inputStyles} />
						<ServiceSection control={formControl} inputStyles={inputStyles} />
						<FeatureGuard feature="hasPayment">
							<PaymentSection
								control={formControl}
								fields={fields}
								append={fields.length < 4 ? handleAppend : undefined}
								remove={remove}
								inputStyles={inputStyles}
								usdValue={usdValue}
								setUsdValue={setUsdValue}
								vesValue={vesValue}
								vesInputValue={vesInputValue}
								setVesInputValue={setVesInputValue}
								usdFromVes={usdFromVes}
								exchangeRate={exchangeRate}
								isLoadingRate={isLoadingRate}
							/>
						</FeatureGuard>
						<CommentsSection control={formControl} inputStyles={inputStyles} />
							<Button
								type="button"
								onClick={handleButtonClick}
								className="w-full font-bold text-sm sm:text-base py-1.5 sm:py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-transform duration-300 transform hover:-translate-y-1"
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Guardando...
									</>
								) : (
									'Enviar'
								)}
							</Button>
					</form>
				</Form>
			</div>
		</>
	)
}

export default MedicalFormContainer;
