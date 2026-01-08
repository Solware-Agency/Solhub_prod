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

    return (
      <Card className='transition-transform duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/20'>
        <CardHeader className='p-3 sm:p-4 md:p-6'>
          <CardTitle className='text-base sm:text-lg'>Servicio</CardTitle>
        </CardHeader>
        <CardContent className='p-3 sm:p-4 pt-0 sm:pt-0 flex flex-wrap gap-2 sm:gap-3'>
          {/* Tipo de Examen - Usa config.examTypes del laboratorio */}
          {examTypeConfig?.enabled && (
            <FormField
              control={control}
              name='examType'
              render={({ field }) => (
                <FormItem className='min-w-[180px] flex-1'>
                  <FormLabel>Tipo de Examen{!isSPT && ' *'}</FormLabel>
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
                      className={inputStyles}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* Sede - Movido desde la sección de Pagos */}
          <FormField
            control={control}
            name='branch'
            render={({ field }) => (
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
                    className={inputStyles}
                    disabled={!!profile?.assigned_branch}
                    id='service-branch'
                  />
                </FormControl>
                {profile?.assigned_branch && (
                  <p className='text-[10px] sm:text-xs text-muted-foreground mt-1'>
                    Tu cuenta está limitada a la sede {profile.assigned_branch}
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Médico Tratante - CON AUTOCOMPLETADO - Solo visible si está habilitado en la configuración */}
          {medicoTratanteConfig?.enabled && (
            <FormField
              control={control}
              name='treatingDoctor'
              render={({ field }) => (
                <FormItem className='min-w-[180px] flex-1'>
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

          {/* Para Conspat: Tipo de Muestra, Cantidad de Muestras y Relación van juntos en la segunda línea (Relación al final) */}
          {/* Para otros laboratorios: Tipo de Muestra y Cantidad de Muestras van antes de Relación */}
          {isConspat ? (
            <div className='w-full flex flex-wrap gap-2 sm:gap-3'>
              {/* Tipo de Muestra - CON AUTOCOMPLETADO */}
              {sampleTypeConfig?.enabled && (
                <FormField
                  control={control}
                  name='sampleType'
                  render={({ field }) => (
                    <FormItem className='min-w-[180px] flex-1'>
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
                          className={inputStyles}
                        />
                      </FormControl>
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
              {/* Tipo de Muestra - CON AUTOCOMPLETADO */}
              {sampleTypeConfig?.enabled && (
                <FormField
                  control={control}
                  name='sampleType'
                  render={({ field }) => (
                    <FormItem className='min-w-[180px] flex-1'>
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
              render={({ field }) => (
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
