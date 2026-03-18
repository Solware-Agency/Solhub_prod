-- Añadir soporte en change_logs para entidades del módulo aseguradoras (Inntegras).
-- Permite registrar historial de pólizas, asegurados, aseguradoras y pagos.

-- 0. Corregir filas con ambos IDs nulos para que cumplan el nuevo check (entity_type = 'profile')
UPDATE public.change_logs
SET entity_type = 'profile'
WHERE medical_record_id IS NULL AND patient_id IS NULL;

-- 1. Añadir columnas opcionales FK a tablas aseguradoras
ALTER TABLE public.change_logs
  ADD COLUMN IF NOT EXISTS poliza_id uuid REFERENCES public.polizas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asegurado_id uuid REFERENCES public.asegurados(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aseguradora_id uuid REFERENCES public.aseguradoras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pago_poliza_id uuid REFERENCES public.pagos_poliza(id) ON DELETE SET NULL;

-- 2. Índices para filtros y joins
CREATE INDEX IF NOT EXISTS idx_change_logs_poliza_id ON public.change_logs(poliza_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_asegurado_id ON public.change_logs(asegurado_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_aseguradora_id ON public.change_logs(aseguradora_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_pago_poliza_id ON public.change_logs(pago_poliza_id);

-- 3. Relajar constraint: permitir registros que referencien solo entidades aseguradoras
ALTER TABLE public.change_logs DROP CONSTRAINT IF EXISTS change_logs_entity_check;

ALTER TABLE public.change_logs
  ADD CONSTRAINT change_logs_entity_check CHECK (
    medical_record_id IS NOT NULL
    OR patient_id IS NOT NULL
    OR poliza_id IS NOT NULL
    OR asegurado_id IS NOT NULL
    OR aseguradora_id IS NOT NULL
    OR pago_poliza_id IS NOT NULL
    OR entity_type = 'profile'
  );

COMMENT ON COLUMN public.change_logs.poliza_id IS 'FK a póliza cuando entity_type = poliza (módulo aseguradoras).';
COMMENT ON COLUMN public.change_logs.asegurado_id IS 'FK a asegurado cuando entity_type = asegurado (módulo aseguradoras).';
COMMENT ON COLUMN public.change_logs.aseguradora_id IS 'FK a aseguradora cuando entity_type = aseguradora (módulo aseguradoras).';
COMMENT ON COLUMN public.change_logs.pago_poliza_id IS 'FK a pago cuando entity_type = pago_poliza (módulo aseguradoras).';
