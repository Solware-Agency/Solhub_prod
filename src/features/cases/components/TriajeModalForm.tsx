import React, { useState, useEffect } from 'react';
import { Loader2, Info, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import type { MedicalCaseWithPatient } from '@/services/supabase/cases/medical-cases-service';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { Button } from '@shared/components/ui/button';
import { TooltipTrigger, TooltipContent, TooltipProvider } from '@shared/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useToast } from '@shared/hooks/use-toast';

interface TriajeFormData {
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
  fuma: 'muy alta' | 'alta' | 'media' | 'baja' | 'muy baja' | 'No' | '';
  cafe: 'muy alta' | 'alta' | 'media' | 'baja' | 'muy baja' | 'No' | '';
  alcohol: 'muy alta' | 'alta' | 'media' | 'baja' | 'muy baja' | 'No' | '';
  motivoConsulta: string;
  examenFisico: string;
  comentario: string;
}

interface TriajeModalFormProps {
  case_: MedicalCaseWithPatient | null;
  onClose: () => void;
  onSave?: () => void;
}

const TriajeModalForm: React.FC<TriajeModalFormProps> = ({ case_, onClose, onSave }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<TriajeFormData>({
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
    value: string | 'muy alta' | 'alta' | 'media' | 'baja' | 'muy baja' | 'No',
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  const handleNumericInput = (
    field: keyof TriajeFormData,
    value: string,
  ) => {
    // Solo permitir números y punto decimal
    const numericValue = value.replace(/[^0-9.]/g, '');
    handleInputChange(field, numericValue);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!case_) {
      setError('No hay un caso seleccionado.');
      return;
    }

    try {
      setLoading(true);

      // TODO: Integrar con backend aquí para guardar los datos de triaje
      // Por ahora solo simulamos el envío
      console.log('Datos del triaje para el caso:', case_.id, formData);

      // Simular guardado
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: '✅ Triaje registrado exitosamente',
        description: `Los datos de triaje han sido guardados para el caso ${case_.code || case_.id}.`,
      });

      setMessage('Triaje registrado exitosamente.');

      // Limpiar formulario después de 1 segundo
      setTimeout(() => {
        setFormData({
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
        setMessage('');
        if (onSave) {
          onSave();
        }
        onClose();
      }, 1000);
    } catch (err: unknown) {
      console.error('Error al registrar triaje:', err);
      const msg = err instanceof Error ? err.message : '';
      setError('Error al registrar el triaje. Inténtalo de nuevo.');
      toast({
        title: '❌ Error al registrar triaje',
        description: msg || 'Hubo un problema al guardar los datos de triaje.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = 'transition-transform duration-300 focus:border-primary focus:ring-primary';

  if (!case_) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {/* Sección: Motivo de Consulta y Hábitos en la misma fila */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3 sm:gap-4">
          {/* Motivo de consulta - Izquierda */}
          <Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Motivo de consulta</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              <Textarea
                placeholder="Ingrese el motivo de consulta..."
                value={formData.motivoConsulta}
                onChange={(e) => handleInputChange('motivoConsulta', e.target.value)}
                disabled={loading}
                rows={4}
                className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
              />
            </CardContent>
          </Card>

          {/* Hábitos - Derecha */}
          <Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Hábitos</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tabaco</label>
                  <select
                    value={formData.fuma}
                    onChange={(e) =>
                      handleInputChange('fuma', e.target.value as 'muy alta' | 'alta' | 'media' | 'baja' | 'muy baja' | 'No' | '')
                    }
                    disabled={loading}
                    className={`w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inputStyles}`}
                  >
                    <option value="">Seleccione...</option>
                    <option value="No">No</option>
                    <option value="muy alta">Muy alta</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                    <option value="muy baja">Muy baja</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Café</label>
                  <select
                    value={formData.cafe}
                    onChange={(e) =>
                      handleInputChange('cafe', e.target.value as 'muy alta' | 'alta' | 'media' | 'baja' | 'muy baja' | 'No' | '')
                    }
                    disabled={loading}
                    className={`w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inputStyles}`}
                  >
                    <option value="">Seleccione...</option>
                    <option value="No">No</option>
                    <option value="muy alta">Muy alta</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                    <option value="muy baja">Muy baja</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Alcohol</label>
                  <select
                    value={formData.alcohol}
                    onChange={(e) =>
                      handleInputChange('alcohol', e.target.value as 'muy alta' | 'alta' | 'media' | 'baja' | 'muy baja' | 'No' | '')
                    }
                    disabled={loading}
                    className={`w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${inputStyles}`}
                  >
                    <option value="">Seleccione...</option>
                    <option value="No">No</option>
                    <option value="muy alta">Muy alta</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                    <option value="muy baja">Muy baja</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sección: Antecedentes - Ocupa todo el ancho */}
        <Card className="hover:border-primary hover:shadow-lg hover:shadow-primary/20">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Antecedentes</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
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
                <TooltipPrimitive.Root delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top"
                    sideOffset={5}
                    className="!z-[9999999]"
                  >
                    <p>Frecuencia cardíaca</p>
                  </TooltipContent>
                </TooltipPrimitive.Root>
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
                <TooltipPrimitive.Root delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top"
                    sideOffset={5}
                    className="!z-[9999999]"
                  >
                    <p>Frecuencia respiratoria</p>
                  </TooltipContent>
                </TooltipPrimitive.Root>
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
                <TooltipPrimitive.Root delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top"
                    sideOffset={5}
                    className="!z-[9999999]"
                  >
                    <p>Saturación de oxígeno</p>
                  </TooltipContent>
                </TooltipPrimitive.Root>
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
                <TooltipPrimitive.Root delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top"
                    sideOffset={5}
                    className="!z-[9999999]"
                  >
                    <p>Índice de masa corporal</p>
                  </TooltipContent>
                </TooltipPrimitive.Root>
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
        <div className="flex gap-4 pt-4">
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
            onClick={onClose}
            disabled={loading}
            variant="outline"
            className="px-6"
          >
            Cancelar
          </Button>
        </div>
      </form>
      </div>
    </TooltipProvider>
  );
};

export default TriajeModalForm;

