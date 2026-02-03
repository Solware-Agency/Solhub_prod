import { type Control, useWatch, useFormContext } from 'react-hook-form';
import { type FormValues } from '@features/form/lib/form-schema';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
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
import { cn } from '@shared/lib/cn';
import type { SampleTypeCost } from '@services/supabase/laboratories/sample-type-costs-service';

interface ServiceSectionProps {
  control: Control<FormValues>;
  inputStyles: string;
  sampleTypeCosts?: SampleTypeCost[] | null;
}

const sampleTypeOptionsFromCosts = (costs: SampleTypeCost[]) =>
  costs.map((c) => ({ value: c.name, label: c.name }));

export const ServiceSection = memo(
  ({ control, inputStyles, sampleTypeCosts }: ServiceSectionProps) => {
    const { profile } = useUserProfile();
    const { laboratory } = useLaboratory();
    const branch = useWatch({ control, name: 'branch' });
    const isSPT = laboratory?.slug?.toLowerCase() === 'spt';
    
    // Obtener setValue del contexto del formulario de forma segura
    const formContext = useFormContext<FormValues>();
    const setValue = formContext.setValue;

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
        setValue('consulta', '', { shouldValidate: false, shouldDirty: false });
      }
    }, [consultaConfig?.enabled, consultaValue, setValue]);

    // Opciones de especialidades médicas para el dropdown de consulta
    const consultaOptions = useMemo(() => {
      const options = [
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
        { value: 'Reumatología', label: 'Reumatología' },
        { value: 'Fisioterapia', label: 'Fisioterapia' },
        { value: 'Psiquiatría', label: 'Psiquiatría' },
        { value: 'Optometría', label: 'Optometría' },
        { value: 'Odontología', label: 'Odontología' },
      ];
      // Ordenar alfabéticamente por label
      const sortedOptions = [...options].sort((a, b) => 
        a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
      );
      return createDropdownOptions(sortedOptions);
    }, []);
    // Obtener tipos de examen desde la configuración del laboratorio
    const examTypesOptions = useMemo(() => {
      const examTypes = laboratory?.config?.examTypes || [];
      // Si hay tipos configurados, usarlos; si no, usar valores por defecto
      if (examTypes.length > 0) {
        // Ordenar alfabéticamente antes de crear las opciones
        const sortedExamTypes = [...examTypes].sort((a, b) => 
          a.localeCompare(b, 'es', { sensitivity: 'base' })
        );
        return createDropdownOptions(
          sortedExamTypes.map((type) => ({ value: type, label: type })),
        );
      }
      // Fallback a valores por defecto si no hay configuración (también ordenados)
      return createDropdownOptions([
        { value: 'Biopsia', label: 'Biopsia' },
        { value: 'Citología', label: 'Citología' },
        { value: 'Inmunohistoquímica', label: 'Inmunohistoquímica' },
      ]);
    }, [JSON.stringify(laboratory?.config?.examTypes)]);

    // Obtener branches desde la configuración del laboratorio
    const branchOptions = useMemo(() => {
      const branches = laboratory?.config?.branches || [];
      // Si hay branches configurados, usarlos; si no, usar valores por defecto
      if (branches.length > 0) {
        return branches;
      }
      // Fallback a valores por defecto si no hay configuración
      return ['PMG', 'CPC', 'CNX', 'STX', 'MCY'];
    }, [laboratory?.config?.branches]);

    // Auto-set branch if user has an assigned branch
    useEffect(() => {
      if (profile?.assigned_branch && !branch) {
        setValue('branch', profile.assigned_branch, { shouldValidate: true, shouldDirty: false });
      }
    }, [profile?.assigned_branch, branch, setValue]);

    // Verificar si es el laboratorio Conspat para aplicar layout especial
    const isConspat = laboratory?.slug === 'conspat';
    
    // Verificar si es el laboratorio LM/Marihorgen para mostrar campos específicos
    const isLM = laboratory?.slug?.toLowerCase() === 'lm' || laboratory?.slug?.toLowerCase() === 'marihorgen';
    const hasSampleTypeCosts = !!laboratory?.features?.hasSampleTypeCosts;

    return (
      <Card className='transition-transform duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
        <CardHeader className='p-3 sm:p-4 md:p-6'>
          <CardTitle className='text-base sm:text-lg'>Servicio</CardTitle>
        </CardHeader>
        <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 flex flex-wrap gap-2 sm:gap-3'>
          {/* Tipo de Examen - Obligatorio para Conspat, opcional para SPT */}
          <FormField
            control={control}
            name='examType'
            render={({ field, fieldState }) => (
              <FormItem className='min-w-[180px] flex-1'>
                <FormLabel>Tipo de Examen {!isSPT && '*'}</FormLabel>
                <FormControl>
                  <FormDropdown
                    options={examTypesOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder='Seleccione una opción'
                    className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                    id='service-exam-type'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Procedencia - CON AUTOCOMPLETADO */}
          {(procedenciaConfig?.enabled || isLM) && (
            <FormField
              control={control}
              name='origin'
              render={({ field, fieldState }) => (
                <FormItem className='min-w-[180px] flex-1'>
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
                      className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Sede - Movido desde la sección de Pagos */}
          <FormField
            control={control}
            name='branch'
            render={({ field, fieldState }) => (
              <FormItem className='min-w-[180px] flex-1'>
                <FormLabel>Sede *</FormLabel>
                <FormControl>
                  <FormDropdown
                    options={createDropdownOptions(
                      !profile?.assigned_branch ? branchOptions : [profile.assigned_branch],
                    )}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder='Seleccione una sede'
                    className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                    disabled={!!profile?.assigned_branch}
                    id='service-branch'
                  />
                </FormControl>
                <FormMessage />
                {profile?.assigned_branch && (
                  <p className='text-[10px] sm:text-xs text-muted-foreground mt-1'>
                    Tu cuenta está limitada a la sede {profile.assigned_branch}
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Médico Tratante - CON AUTOCOMPLETADO - Solo visible si está habilitado en la configuración o es LM/Marihorgen */}
          {(medicoTratanteConfig?.enabled || isLM) && (
            <FormField
              control={control}
              name='treatingDoctor'
              render={({ field, fieldState }) => (
                <FormItem className='min-w-[180px] flex-1'>
                  <FormLabel>
                    Médico Tratante {medicoTratanteConfig?.required && '*'}
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
                      className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Para Conspat: Tipo de Muestra, Cantidad de Muestras y Relación van juntos en la segunda línea (Relación al final) */}
          {/* Para otros laboratorios: Tipo de Muestra y Cantidad de Muestras van antes de Relación */}
          {isConspat ? (
            <div className='w-full flex flex-wrap gap-2 sm:gap-3'>
              {/* Tipo de Muestra - Dropdown para Marihorgen (costos), Autocomplete para otros */}
              {(sampleTypeConfig?.enabled || hasSampleTypeCosts) && (
                <FormField
                  control={control}
                  name='sampleType'
                  render={({ field, fieldState }) => (
                    <FormItem className='min-w-[180px] flex-1'>
                      <FormLabel>Tipo de Muestra *</FormLabel>
                      <FormControl>
                        {hasSampleTypeCosts && sampleTypeCosts && sampleTypeCosts.length > 0 ? (
                          <FormDropdown
                            options={createDropdownOptions(sampleTypeOptionsFromCosts(sampleTypeCosts))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder='Seleccione tipo de muestra'
                            className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                            id='service-sample-type'
                          />
                        ) : (
                          <AutocompleteInput
                            fieldName='sampleType'
                            placeholder='Ej: Biopsia de Piel'
                            iconRight={
                              <Microscope className='h-4 w-4 text-muted-foreground' />
                            }
                            {...field}
                            className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Cantidad de Muestras - PLACEHOLDER ACTUALIZADO */}
              {(numberOfSamplesConfig?.enabled || hasSampleTypeCosts) && (
                <FormField
                  control={control}
                  name='numberOfSamples'
                  render={({ field, fieldState }) => (
                    <FormItem className='min-w-[180px] flex-1'>
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
                          className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Relación - CON AUTOCOMPLETADO - Al final a la derecha */}
              {relationshipConfig?.enabled && (
                <FormField
                  control={control}
                  name='relationship'
                  render={({ field }) => (
                    <FormItem className='min-w-[180px] flex-1'>
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
            </div>
          ) : (
            <>
              {/* Tipo de Muestra - Dropdown para Marihorgen (costos), Autocomplete para otros */}
              {(sampleTypeConfig?.enabled || hasSampleTypeCosts) && (
                <FormField
                  control={control}
                  name='sampleType'
                  render={({ field, fieldState }) => (
                    <FormItem className='min-w-[180px] flex-1'>
                      <FormLabel>Tipo de Muestra *</FormLabel>
                      <FormControl>
                        {hasSampleTypeCosts && sampleTypeCosts && sampleTypeCosts.length > 0 ? (
                          <FormDropdown
                            options={createDropdownOptions(sampleTypeOptionsFromCosts(sampleTypeCosts))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder='Seleccione tipo de muestra'
                            className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                            id='service-sample-type'
                          />
                        ) : (
                          <AutocompleteInput
                            fieldName='sampleType'
                            placeholder='Ej: Biopsia de Piel'
                            iconRight={
                              <Microscope className='h-4 w-4 text-muted-foreground' />
                            }
                            {...field}
                            className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Cantidad de Muestras - PLACEHOLDER ACTUALIZADO */}
              {(numberOfSamplesConfig?.enabled || hasSampleTypeCosts) && (
                <FormField
                  control={control}
                  name='numberOfSamples'
                  render={({ field, fieldState }) => (
                    <FormItem className='min-w-[180px] flex-1'>
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
                          className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                        />
                      </FormControl>
                      <FormMessage />
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
                    <FormItem className='min-w-[180px] flex-1'>
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
            </>
          )}

          {/* Consulta (Especialidad Médica) - Solo visible si está habilitado en la configuración del módulo */}
          {consultaConfig?.enabled && (
            <FormField
              control={control}
              name='consulta'
              render={({ field, fieldState }) => (
                <FormItem className='min-w-[180px] flex-1'>
                  <FormLabel>
                    Consulta {consultaConfig.required && '*'}
                  </FormLabel>
                  <FormControl>
                    <FormDropdown
                      options={consultaOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder='Seleccione una especialidad'
                      className={cn(inputStyles, fieldState.error && 'border-red-500 focus:border-red-500')}
                      id='service-consulta'
                    />
                  </FormControl>
                  <FormMessage />
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
