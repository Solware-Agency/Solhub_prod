import { type Control, useWatch, useFormContext } from 'react-hook-form';
import { type FormValues } from '@features/form/lib/form-schema';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from '@shared/components/ui/form';
import { Input } from '@shared/components/ui/input';
import { AutocompleteInput } from '@shared/components/ui/autocomplete-input';
import {
  FormDropdown,
  createDropdownOptions,
} from '@shared/components/ui/form-dropdown';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { useLaboratory } from '@/app/providers/LaboratoryContext';
import { useModuleField } from '@shared/hooks/useModuleField';
import { useEffect, memo, useMemo } from 'react';
import { Stethoscope, MapPin, Microscope } from 'lucide-react';

interface ServiceSectionProps {
  control: Control<FormValues>;
  inputStyles: string;
}

export const ServiceSection = memo(
  ({ control, inputStyles }: ServiceSectionProps) => {
    const { profile } = useUserProfile();
    const { laboratory } = useLaboratory();
    const branch = useWatch({ control, name: 'branch' });

    // Obtener setValue del contexto del formulario (si está disponible)
    let setValue: ((name: string, value: any) => void) | undefined;
    try {
      const formContext = useFormContext<FormValues>();
      setValue = formContext.setValue;
    } catch {
      // Si no hay FormContext, usar el control directamente
      setValue = (name: string, value: any) => {
        if (control._formValues) {
          control._formValues[name as keyof typeof control._formValues] = value;
        }
        // Notificar el cambio
        if (control._subjects?.values) {
          control._subjects.values.next({
            ...control._formValues,
            [name]: value,
          });
        }
      };
    }

    // Verificar si el campo "médico tratante" está habilitado en la configuración del módulo
    const medicoTratanteConfig = useModuleField(
      'registrationForm',
      'medicoTratante',
    );
    const procedenciaConfig = useModuleField('registrationForm', 'procedencia');
    const examTypeConfig = useModuleField('registrationForm', 'examType');
    const sampleTypeConfig = useModuleField('registrationForm', 'sampleType');
    const numberOfSamplesConfig = useModuleField(
      'registrationForm',
      'numberOfSamples',
    );
    const relationshipConfig = useModuleField(
      'registrationForm',
      'relationship',
    );

    // Verificar configuración del módulo para el campo consulta
    const consultaConfig = useModuleField('registrationForm', 'consulta');

    // Obtener el valor actual del campo consulta
    const consultaValue = useWatch({ control, name: 'consulta' });

    // Resetear el valor a string vacío cuando el campo se deshabilita
    useEffect(() => {
      if (!consultaConfig?.enabled && consultaValue) {
        setValue('consulta', '');
      }
    }, [consultaConfig?.enabled, consultaValue, setValue]);

    // Opciones de especialidades médicas para el dropdown de consulta
    const consultaOptions = useMemo(() => {
      return createDropdownOptions([
        { value: 'Cardiología', label: 'Cardiología' },
        { value: 'Cirujano Cardiovascular', label: 'Cirujano Cardiovascular' },
        { value: 'Dermatología', label: 'Dermatología' },
        { value: 'Endocrinología', label: 'Endocrinología' },
        { value: 'Gastroenterología', label: 'Gastroenterología' },
        { value: 'Ginecología', label: 'Ginecología' },
        { value: 'Medicina Interna', label: 'Medicina Interna' },
        { value: 'Nefrología', label: 'Nefrología' },
        { value: 'Neumonología', label: 'Neumonología' },
        { value: 'Neurología', label: 'Neurología' },
        { value: 'Neurocirugía', label: 'Neurocirugía' },
        { value: 'Otorrinolaringología', label: 'Otorrinolaringología' },
        { value: 'Pediatría', label: 'Pediatría' },
        { value: 'Psicología', label: 'Psicología' },
        { value: 'Traumatología', label: 'Traumatología' },
        { value: 'Urología', label: 'Urología' },
        { value: 'Oftalmología', label: 'Oftalmología' },
        { value: 'Medicina General', label: 'Medicina General' },
        { value: 'Medicina del Dolor', label: 'Medicina del Dolor' },
        { value: 'Radiólogos', label: 'Radiólogos (Radiología)' },
        { value: 'Fisioterapia', label: 'Fisioterapia' },
        { value: 'Psiquiatría', label: 'Psiquiatría' },
        { value: 'Optometría', label: 'Optometría' },
        { value: 'Odontología', label: 'Odontología' },
      ]);
    }, []);
    // Obtener tipos de examen desde la configuración del laboratorio
    const examTypesOptions = useMemo(() => {
      const examTypes = laboratory?.config?.examTypes || [];
      // Si hay tipos configurados, usarlos; si no, usar valores por defecto
      if (examTypes.length > 0) {
        return createDropdownOptions(
          examTypes.map((type) => ({ value: type, label: type })),
        );
      }
      // Fallback a valores por defecto si no hay configuración
      return createDropdownOptions([
        { value: 'Inmunohistoquímica', label: 'Inmunohistoquímica' },
        { value: 'Biopsia', label: 'Biopsia' },
        { value: 'Citología', label: 'Citología' },
      ]);
    }, [laboratory?.config?.examTypes]);

    // Auto-set branch if user has an assigned branch - memoized with useCallback
    useEffect(() => {
      if (profile?.assigned_branch && !branch) {
        // Set the branch to the user's assigned branch
        // Note: This would need to be passed as a prop or use useFormContext
        // For now, we'll comment this out as it's not working correctly
        // const setValue = control._options.context?.setValue
        // if (setValue) {
        // 	setValue('branch', profile.assigned_branch)
        // }
      }
    }, [profile, branch, control]);

    return (
      <Card className='transition-transform duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
        <CardHeader className='p-3 sm:p-4 md:p-6'>
          <CardTitle className='text-base sm:text-lg'>Servicio</CardTitle>
        </CardHeader>
        <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3'>
          {/* Tipo de Examen - Usa config.examTypes del laboratorio */}
          {examTypeConfig?.enabled && (
            <FormField
              control={control}
              name='examType'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Examen *</FormLabel>
                  <FormControl>
                    <FormDropdown
                      options={examTypesOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='Seleccione una opción'
                      className={inputStyles}
                      id='service-exam-type'
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
          {/* Procedencia - CON AUTOCOMPLETADO */}
          {procedenciaConfig?.enabled && (
            <FormField
              control={control}
              name='origin'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedencia *</FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      fieldName='origin'
                      placeholder='Hospital o Clínica'
                      iconRight={
                        <MapPin className='h-4 w-4 text-muted-foreground' />
                      }
                      {...field}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const { value } = e.target;
                        if (/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s0-9]*$/.test(value)) {
                          field.onChange(e);
                        }
                      }}
                      className={inputStyles}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* Médico Tratante - CON AUTOCOMPLETADO - Solo visible si está habilitado en la configuración */}
          {medicoTratanteConfig?.enabled && (
            <FormField
              control={control}
              name='treatingDoctor'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Médico Tratante {medicoTratanteConfig.required && '*'}
                  </FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      fieldName='treatingDoctor'
                      placeholder='Nombre del Médico'
                      iconRight={
                        <Stethoscope className='h-4 w-4 text-muted-foreground' />
                      }
                      {...field}
                      onChange={(e) => {
                        const { value } = e.target;
                        if (/^[A-Za-zÑñÁáÉéÍíÓóÚúÜü\s]*$/.test(value)) {
                          field.onChange(e);
                        }
                      }}
                      className={inputStyles}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
          {/* Tipo de Muestra - CON AUTOCOMPLETADO */}
          {sampleTypeConfig?.enabled && (
            <FormField
              control={control}
              name='sampleType'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Muestra *</FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      fieldName='sampleType'
                      placeholder='Ej: Biopsia de Piel'
                      iconRight={
                        <Microscope className='h-4 w-4 text-muted-foreground' />
                      }
                      {...field}
                      className={inputStyles}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* Cantidad de Muestras - PLACEHOLDER ACTUALIZADO */}
          {numberOfSamplesConfig?.enabled && (
            <FormField
              control={control}
              name='numberOfSamples'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad de Muestras *</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='0'
                      {...field}
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? 0 : Number(value));
                      }}
                      className={inputStyles}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* Relación - CON AUTOCOMPLETADO */}
          {relationshipConfig?.enabled && (
            <FormField
              control={control}
              name='relationship'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relación</FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      fieldName='relationship'
                      placeholder='Relación con el Caso'
                      {...field}
                      className={inputStyles}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* Consulta (Especialidad Médica) - Solo visible si está habilitado en la configuración del módulo */}
          {consultaConfig?.enabled && (
            <FormField
              control={control}
              name='consulta'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Consulta {consultaConfig.required && '*'}
                  </FormLabel>
                  <FormControl>
                    <FormDropdown
                      options={consultaOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='Seleccione una especialidad'
                      className={inputStyles}
                      id='service-consulta'
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </CardContent>
      </Card>
    );
  },
);

ServiceSection.displayName = 'ServiceSection';
