-- =====================================================
-- call_center_registros: registros de llamadas del call center (SPT)
-- Módulo visible solo para laboratorios con hasCallCenter
-- =====================================================

CREATE TABLE IF NOT EXISTS public.call_center_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES public.laboratories(id) ON DELETE CASCADE,
  nombre_apellido TEXT NOT NULL,
  telefono_1 TEXT,
  telefono_2 TEXT,
  motivo_llamada TEXT NOT NULL,
  respuesta_observaciones TEXT,
  referido_sede TEXT,
  atendido_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_call_center_registros_laboratory
  ON public.call_center_registros(laboratory_id);

CREATE INDEX IF NOT EXISTS idx_call_center_registros_created_at
  ON public.call_center_registros(created_at DESC);

COMMENT ON TABLE public.call_center_registros IS 'Registros de llamadas del call center. Solo SPT.';

-- RLS
ALTER TABLE public.call_center_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view call_center_registros from their laboratory"
  ON public.call_center_registros FOR SELECT
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert call_center_registros in their laboratory"
  ON public.call_center_registros FOR INSERT
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
  );
