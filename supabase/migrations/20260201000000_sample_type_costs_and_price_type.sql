-- =====================================================
-- sample_type_costs: tabla de estructura de costos por laboratorio (Marihorgen)
-- price_type: columna opcional en medical_records_clean para guardar tarifa usada
-- =====================================================

-- 1. Tabla sample_type_costs
CREATE TABLE IF NOT EXISTS public.sample_type_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES public.laboratories(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  price_taquilla NUMERIC(10,2) NOT NULL,
  price_convenios NUMERIC(10,2),
  price_descuento NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(laboratory_id, code)
);

CREATE INDEX IF NOT EXISTS idx_sample_type_costs_laboratory
  ON public.sample_type_costs(laboratory_id);

COMMENT ON TABLE public.sample_type_costs IS 'Estructura de costos por tipo de muestra (ej. Marihorgen). Taquilla = costo 1, Convenios = costo 2, Descuento = costo 3 (10%).';

-- 2. RLS
ALTER TABLE public.sample_type_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sample_type_costs from their laboratory"
  ON public.sample_type_costs FOR SELECT
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update sample_type_costs in their laboratory"
  ON public.sample_type_costs FOR UPDATE
  USING (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    laboratory_id = (SELECT laboratory_id FROM public.profiles WHERE id = auth.uid())
  );

-- 3. Columna price_type en medical_records_clean (opcional, para Marihorgen)
ALTER TABLE public.medical_records_clean
  ADD COLUMN IF NOT EXISTS price_type TEXT;

COMMENT ON COLUMN public.medical_records_clean.price_type IS 'Tipo de tarifa aplicada: taquilla, convenios o descuento (solo Marihorgen).';

-- 4. Seed: insertar 77 tipos de muestra para laboratorios con slug marihorgen o lm
-- Se usa un DO block para iterar; insertamos desde valores fijos.
INSERT INTO public.sample_type_costs (laboratory_id, code, name, price_taquilla, price_convenios, price_descuento)
SELECT l.id, v.code, v.name, v.price_taquilla, v.price_convenios, v.price_descuento
FROM public.laboratories l
CROSS JOIN (VALUES
  ('A01', 'CITOLOGIAS GINECOLÓGICAS', 15.00, 14.25, 13.50),
  ('A02', 'P.A.A.F.', 40.00, 38.00, 36.00),
  ('A03', 'REVISIÓN', 40.00, 38.00, 36.00),
  ('B01', 'LÍQUIDO', 40.00, 38.00, 36.00),
  ('B02', 'CUELLO UTERINO', 40.00, 38.00, 36.00),
  ('B03', 'VAGINA', 40.00, 38.00, 36.00),
  ('B04', 'VULVA', 40.00, 38.00, 36.00),
  ('B05', 'ENDOMETRIO', 40.00, 38.00, 36.00),
  ('C01', 'PIEL (punch)', 40.00, 38.00, 36.00),
  ('D01', 'MUCOSA BRONQUIAL', 40.00, 38.00, 36.00),
  ('D02', 'PLEURA', 40.00, 38.00, 36.00),
  ('D03', 'CARINAS', 40.00, 38.00, 36.00),
  ('D04', 'MUCOSA VESICAL', 40.00, 38.00, 36.00),
  ('D05', 'MUCOSA ORAL', 40.00, 38.00, 36.00),
  ('E01', 'ESÓFAGO', 40.00, 38.00, 36.00),
  ('E02', 'ESTÓMAGO', 40.00, 38.00, 36.00),
  ('E03', 'DUODENO', 40.00, 38.00, 36.00),
  ('E04', 'YEYUNO', 40.00, 38.00, 36.00),
  ('E05', 'ILEON', 40.00, 38.00, 36.00),
  ('E06', 'COLON', 40.00, 38.00, 36.00),
  ('E07', 'RECTO', 40.00, 38.00, 36.00),
  ('E08', 'ANO', 40.00, 38.00, 36.00),
  ('F01', 'TRUCUT MAMA', 40.00, 38.00, 36.00),
  ('F02', 'TRUCUT GANGLIO', 40.00, 38.00, 36.00),
  ('F03', 'TRUCUT PRÓSTATA', 40.00, 38.00, 36.00),
  ('F04', 'TRUCUT PARTES BLANDAS', 40.00, 38.00, 36.00),
  ('G01', 'GANGLIO CERVICAL', 50.00, 47.50, 45.00),
  ('G02', 'GANGLIO SUPRACLAVICULAR', 50.00, 47.50, 45.00),
  ('G03', 'GANGLIO AXILAR', 50.00, 47.50, 45.00),
  ('G04', 'FOSA NASAL', 50.00, 47.50, 45.00),
  ('G05', 'GANGLIO INGUINAL', 50.00, 47.50, 45.00),
  ('G06', 'LEGRADO UTERINO', 50.00, 47.50, 45.00),
  ('H01', 'ASPIRACIÓN MANUAL ENDOUTERINA', 60.00, 57.00, 54.00),
  ('H02', 'EMBARAZO ECTÓPICO', 60.00, 57.00, 54.00),
  ('H03', 'APÉNDICE CECAL', 60.00, 57.00, 54.00),
  ('H04', 'VESÍCULA BILIAR', 60.00, 57.00, 54.00),
  ('H05', 'TROMPAS UTERINAS', 60.00, 57.00, 54.00),
  ('H06', 'PLASTRÓN GANGLIONAR', 60.00, 57.00, 54.00),
  ('H07', 'MIOMA', 60.00, 57.00, 54.00),
  ('H08', 'LIPOMA', 60.00, 57.00, 54.00),
  ('I04', 'PARTES BLANDAS', 60.00, 57.00, 54.00),
  ('I05', 'HEMORROIDES', 60.00, 57.00, 54.00),
  ('I06', 'PLICOMA ANAL', 60.00, 57.00, 54.00),
  ('J07', 'CONO DE CUELLO UTERINO', 70.00, 66.50, 63.00),
  ('K01', 'TIROIDECTOMIA PARCIAL', 80.00, 76.00, 72.00),
  ('K02', 'EPIPLON', 80.00, 76.00, 72.00),
  ('K03', 'OVARIO NO TUMORAL', 80.00, 76.00, 72.00),
  ('K04', 'CÁPSULA MAMARIA', 80.00, 76.00, 72.00),
  ('L01', 'PIEL POR TUMOR', 90.00, 85.50, 81.00),
  ('L02', 'INTESTINOS NO TUMORALES', 90.00, 85.50, 81.00),
  ('L03', 'PRÓSTATA NO TUMORAL', 90.00, 85.50, 81.00),
  ('L04', 'RIÑÓN NO TUMORAL', 90.00, 85.50, 81.00),
  ('L04B', 'BAZO NO TUMORAL', 90.00, 85.50, 81.00),
  ('L05', 'COLON NO TUMORAL', 90.00, 85.50, 81.00),
  ('M01', 'MASTECTOMÍA PARCIAL', 90.00, 85.50, 81.00),
  ('M02', 'ADENOMASTECTOMÍA', 90.00, 85.50, 81.00),
  ('M03', 'CUADRANTECTOMÍA', 90.00, 85.50, 81.00),
  ('M04', 'BIOPSIAS POR ESTEROTAXIA', 100.00, 95.00, 90.00),
  ('N01', 'RESECCIÓN TRANSURETRAL PROSTÁTICA', 100.00, 95.00, 90.00),
  ('N02', 'RESECCIÓN TRANSURETRAL VESICAL', 100.00, 95.00, 90.00),
  ('N03', 'DISECCIÓN GANGLIONAR', 100.00, 95.00, 90.00),
  ('N04', 'ÚTERO SIN ANEXOS', 100.00, 95.00, 90.00),
  ('P01', 'UTERO CON ANEXOS', 150.00, 142.50, 135.00),
  ('P02', 'MASTECTOMÍA TOTAL', 150.00, 142.50, 135.00),
  ('P03', 'TIROIDECTOMÍA TOTAL', 150.00, 142.50, 135.00),
  ('P04', 'BIOPSIAS DE HUESO', 150.00, 142.50, 135.00),
  ('P05', 'TUMORES DE PARTES BLANDAS', 250.00, 237.50, 225.00),
  ('Q01', 'NEFRECTOMÍA RADICAL', 250.00, 237.50, 225.00),
  ('Q02', 'COLECTOMÍA RADICAL', 250.00, 237.50, 225.00),
  ('Q03', 'MASTECTOMÍA RADICAL', 250.00, 237.50, 225.00),
  ('Q04', 'PROTOCOLO DE OVARIO', 250.00, 237.50, 225.00),
  ('Q05', 'PROTOCOLO DE ENDOMETRIO', 250.00, 237.50, 225.00),
  ('Q06', 'PROSTATECTOMIA RADICAL', 300.00, 285.00, 270.00),
  ('Q07', 'CONSULTA INTRAOPERATORIA', 250.00, 237.50, 225.00),
  ('Q08', 'AMPUTACIONES', 400.00, 380.00, 360.00),
  ('Q009', 'ANTICUERPOS', 90.00, NULL, NULL)
) AS v(code, name, price_taquilla, price_convenios, price_descuento)
WHERE l.slug IN ('marihorgen', 'lm')
ON CONFLICT (laboratory_id, code) DO NOTHING;
