import {
  ClipboardList,
  AlertCircle,
  CheckCircle,
  Activity,
  Loader2,
  CreditCard,
  Info,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { findPatientByCedula } from '@/services/supabase/patients/patients-service';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { Button } from '@shared/components/ui/button';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { AutocompleteInput } from '@shared/components/ui/autocomplete-input';
import { usePatientAutofill } from '@shared/hooks/usePatientAutofill';
import { Tooltip, TooltipTrigger, TooltipContent } from '@shared/components/ui/tooltip';

interface TriajeFormData {
  cedula: string;
  nombreApellido: string;
  frecuenciaCardiaca: string;
  frecuenciaRespiratoria: string;
  saturacionOxigeno: string;
  temperatura: string;
  talla: string;
  peso: string;
  presionArterial: string;
  imc: string;
  antecedentesFamiliares: string;
  antecedentesPersonales: string;
  habitosPsicobiologicos: string;
  fuma: 'Sí' | 'No' | '';
  cafe: 'Sí' | 'No' | '';
  alcohol: 'Sí' | 'No' | '';
  motivoConsulta: string;
  examenFisico: string;
  comentario: string;
}

function TriajeForm() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const [formData, setFormData] = useState<TriajeFormData>({
    cedula: '',
    nombreApellido: '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    saturacionOxigeno: '',
    temperatura: '',
    talla: '',
    peso: '',
    presionArterial: '',
    imc: '',
    antecedentesFamiliares: '',
    antecedentesPersonales: '',
    habitosPsicobiologicos: '',
    fuma: '',
    cafe: '',
    alcohol: '',
    motivoConsulta: '',
    examenFisico: '',
    comentario: '',
  });

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cedulaValue, setCedulaValue] = useState('');

  // Función adaptadora para el autofill del formulario de triaje
  // SOLO llena el nombre, ignora todos los demás campos
  const setValueAdapter = useCallback((field: string, value: any) => {
    // Solo procesar el campo 'fullName' para llenar el nombre
    if (field === 'fullName') {
      setFormData((prev) => ({
        ...prev,
        nombreApellido: value as string,
      }));
    }
    // Ignorar todos los demás campos: 'idType', 'idNumber', 'phone', 'email', 'gender', 'ageValue', etc.
  }, []);

  const { fillPatientData, isLoading: isLoadingPatient, lastFilledPatient } = usePatientAutofill(setValueAdapter);

  // Handler para cuando se selecciona un paciente del autocomplete
  const handlePatientSelect = useCallback(
    (idNumber: string) => {
      // Si la cédula viene en formato completo (V-12345678), extraer el número
      const cedulaMatch = idNumber.match(/^([VEJC])-(.+)$/);
      if (cedulaMatch) {
        const [, , number] = cedulaMatch;
        setCedulaValue(number);
        setFormData((prev) => ({
          ...prev,
          cedula: number,
        }));
      } else {
        // Si no tiene formato, usar toda la cédula como número
        setCedulaValue(idNumber);
        setFormData((prev) => ({
          ...prev,
          cedula: idNumber,
        }));
      }
      
      // Llamar a fillPatientData con la cédula completa
      const fullCedula = idNumber.includes('-') ? idNumber : `V-${idNumber}`;
      fillPatientData(fullCedula, true); // Silencioso
    },
    [fillPatientData],
  );

  // Autofill automático cuando se escribe una cédula manualmente (6+ dígitos)
  useEffect(() => {
    if (!cedulaValue || cedulaValue.length < 6) {
      return;
    }

    // Debounce para evitar múltiples llamadas
    const timeoutId = setTimeout(() => {
      // Construir la cédula completa con prefijo V- por defecto
      const fullCedula = cedulaValue.includes('-') ? cedulaValue : `V-${cedulaValue}`;
      fillPatientData(fullCedula, true); // Silencioso
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [cedulaValue, fillPatientData]);


  // Calcular IMC automáticamente cuando cambian peso o talla
  useEffect(() => {
    const peso = parseFloat(formData.peso);
    const talla = parseFloat(formData.talla) / 100; // Convertir cm a metros

    if (peso > 0 && talla > 0) {
      const imcCalculado = (peso / (talla * talla)).toFixed(2);
      setFormData((prev) => ({
        ...prev,
        imc: imcCalculado,
      }));
    } else if (!peso || !talla) {
      setFormData((prev) => ({
        ...prev,
        imc: '',
      }));
    }
  }, [formData.peso, formData.talla]);

  const handleInputChange = (
    field: keyof TriajeFormData,
    value: string | 'Sí' | 'No',
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
    
    // Si se cambia la cédula manualmente, actualizar el valor del autocomplete
    if (field === 'cedula') {
      setCedulaValue(value as string);
    }
  };

  const handleNumericInput = (
    field: keyof TriajeFormData,
    value: string,
  ) => {
    // Solo permitir números y punto decimal
    const numericValue = value.replace(/[^0-9.]/g, '');
    handleInputChange(field, numericValue);
  };

  const validateForm = (): boolean => {
    if (!formData.cedula.trim()) {
      setError('La cédula es obligatoria.');
      return false;
    }

    if (!formData.nombreApellido.trim()) {
      setError('El nombre y apellido es obligatorio.');
      return false;
    }

    return true;
  };

  const handleSubmitTriaje = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // TODO: Integrar con backend aquí
      // Por ahora solo simulamos el envío
      console.log('Datos del triaje:', formData);

      setMessage('Triaje registrado exitosamente.');
      
      // Limpiar formulario después de 2 segundos
      setTimeout(() => {
        setFormData({
          cedula: '',
          nombreApellido: '',
          frecuenciaCardiaca: '',
          frecuenciaRespiratoria: '',
          saturacionOxigeno: '',
          temperatura: '',
          talla: '',
          peso: '',
          presionArterial: '',
          imc: '',
          antecedentesFamiliares: '',
          antecedentesPersonales: '',
          habitosPsicobiologicos: '',
          fuma: '',
          cafe: '',
          alcohol: '',
          motivoConsulta: '',
          examenFisico: '',
          comentario: '',
        });
        setCedulaValue('');
        setMessage('');
      }, 2000);
    } catch (err: unknown) {
      console.error('Error al registrar triaje:', err);
      const msg = err instanceof Error ? err.message : '';
      setError('Error al registrar el triaje. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = 'transition-transform duration-300 focus:border-primary focus:ring-primary';

  return (
    <div className="">
      <div className="flex justify-between mb-3 sm:mb-4 md:mb-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
                Formulario de Triaje
              </h2>
              <div className="w-16 sm:w-24 h-1 bg-primary mt-2 rounded-full"></div>
            </div>
          </div>
          <h3 className="text-sm text-primary font-semibold mt-2 sm:mt-3">
            Bienvenido, {profile?.display_name}
          </h3>
        </div>
      </div>

      <form onSubmit={handleSubmitTriaje} className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* Sección: Datos del Paciente y Hábitos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Datos del Paciente - Ocupa 2 columnas */}
          <Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20 lg:col-span-2">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                Datos del Paciente
                {isLoadingPatient && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="text-base font-medium mb-2 block">
                  Cédula: <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <AutocompleteInput
                    fieldName="idNumber"
                    placeholder="12345678"
                    value={cedulaValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9]*$/.test(value)) {
                        setCedulaValue(value);
                        handleInputChange('cedula', value);
                      }
                    }}
                    onPatientSelect={handlePatientSelect}
                    disabled={loading}
                    iconRight={<CreditCard className="h-4 w-4 text-muted-foreground" />}
                    className={`${inputStyles} ${isLoadingPatient ? 'border-blue-300 transition-none' : ''}`}
                  />
                </div>
              </div>
              <div>
                <label className="text-base font-medium mb-2 block">
                  Nombre y apellido: <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Nombre completo"
                  value={formData.nombreApellido}
                  onChange={(e) => handleInputChange('nombreApellido', e.target.value)}
                  required
                  disabled={loading}
                  className={inputStyles}
                />
              </div>
            </CardContent>
          </Card>

          {/* Hábitos - Ocupa 1 columna */}
          <Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Hábitos</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tabaco</label>
                  <select
                    value={formData.fuma}
                    onChange={(e) =>
                      handleInputChange('fuma', e.target.value as 'Sí' | 'No' | '')
                    }
                    disabled={loading}
                    className={`w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inputStyles}`}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Café</label>
                  <select
                    value={formData.cafe}
                    onChange={(e) =>
                      handleInputChange('cafe', e.target.value as 'Sí' | 'No' | '')
                    }
                    disabled={loading}
                    className={`w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inputStyles}`}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Alcohol</label>
                  <select
                    value={formData.alcohol}
                    onChange={(e) =>
                      handleInputChange('alcohol', e.target.value as 'Sí' | 'No' | '')
                    }
                    disabled={loading}
                    className={`w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inputStyles}`}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sección: Antecedentes */}
        <Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
          <CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div>
              <label className="text-base font-medium mb-2 block">Motivo de consulta</label>
              <Textarea
                placeholder="Ingrese el motivo de consulta..."
                value={formData.motivoConsulta}
                onChange={(e) => handleInputChange('motivoConsulta', e.target.value)}
                disabled={loading}
                rows={4}
                className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">
                Antecedentes personales
              </label>
              <Textarea
                placeholder="Ingrese los antecedentes personales..."
                value={formData.antecedentesPersonales}
                onChange={(e) => handleInputChange('antecedentesPersonales', e.target.value)}
                disabled={loading}
                rows={4}
                className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">
                Antecedentes familiares
              </label>
              <Textarea
                placeholder="Ingrese los antecedentes familiares..."
                value={formData.antecedentesFamiliares}
                onChange={(e) => handleInputChange('antecedentesFamiliares', e.target.value)}
                disabled={loading}
                rows={4}
                className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">
                Hábitos psicobiológicos
              </label>
              <Textarea
                placeholder="Ingrese los hábitos psicobiológicos..."
                value={formData.habitosPsicobiologicos}
                onChange={(e) => handleInputChange('habitosPsicobiologicos', e.target.value)}
                disabled={loading}
                rows={4}
                className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sección: Signos Vitales */}
        <Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Signos Vitales</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 sm:gap-3">
            <div>
              <label className="text-base font-medium mb-2 block flex items-center gap-1">
                FC
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Frecuencia cardíaca</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                type="text"
                placeholder="Latidos/min"
                value={formData.frecuenciaCardiaca}
                onChange={(e) => handleNumericInput('frecuenciaCardiaca', e.target.value)}
                disabled={loading}
                className={inputStyles}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block flex items-center gap-1">
                FR
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Frecuencia respiratoria</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                type="text"
                placeholder="Respiraciones/min"
                value={formData.frecuenciaRespiratoria}
                onChange={(e) => handleNumericInput('frecuenciaRespiratoria', e.target.value)}
                disabled={loading}
                className={inputStyles}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block flex items-center gap-1">
                SpO₂
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Saturación de oxígeno</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                type="text"
                placeholder="%"
                value={formData.saturacionOxigeno}
                onChange={(e) => handleNumericInput('saturacionOxigeno', e.target.value)}
                disabled={loading}
                className={inputStyles}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">Temperatura</label>
              <Input
                type="text"
                placeholder="°C"
                value={formData.temperatura}
                onChange={(e) => handleNumericInput('temperatura', e.target.value)}
                disabled={loading}
                className={inputStyles}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">Presión arterial</label>
              <Input
                type="text"
                placeholder="Ej: 120/80 mmHg"
                value={formData.presionArterial}
                onChange={(e) => handleInputChange('presionArterial', e.target.value)}
                disabled={loading}
                className={inputStyles}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">Talla</label>
              <Input
                type="text"
                placeholder="Cm"
                value={formData.talla}
                onChange={(e) => handleNumericInput('talla', e.target.value)}
                disabled={loading}
                className={inputStyles}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">Peso</label>
              <Input
                type="text"
                placeholder="Kg"
                value={formData.peso}
                onChange={(e) => handleNumericInput('peso', e.target.value)}
                disabled={loading}
                className={inputStyles}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block flex items-center gap-1">
                IMC
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Índice de masa corporal</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                type="text"
                placeholder="Kg/m²"
                value={formData.imc}
                readOnly
                disabled={loading}
                className={`${inputStyles} bg-muted cursor-not-allowed`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sección: Examen Físico y Observaciones */}
        <Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
          <CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="text-base font-medium mb-2 block">Examen físico</label>
              <Textarea
                placeholder="Ingrese el examen físico..."
                value={formData.examenFisico}
                onChange={(e) => handleInputChange('examenFisico', e.target.value)}
                disabled={loading}
                rows={4}
                className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
              />
            </div>
            <div>
              <label className="text-base font-medium mb-2 block">Observaciones</label>
              <Textarea
                placeholder="Ingrese observaciones adicionales..."
                value={formData.comentario}
                onChange={(e) => handleInputChange('comentario', e.target.value)}
                disabled={loading}
                rows={4}
                className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mensajes de error y éxito */}
        {error && (
          <div className="border px-4 py-3 rounded mb-4 flex items-start gap-2 bg-red-900/80 border-red-700 text-red-200">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {message && (
          <div className="bg-green-900/80 border border-green-700 text-green-200 px-4 py-3 rounded mb-4 flex items-center gap-2">
            <CheckCircle className="size-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 font-bold text-sm sm:text-base py-1.5 sm:py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white transition-transform duration-300 transform hover:-translate-y-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Registrar Triaje
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            variant="outline"
            className="px-6"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

export default TriajeForm;
