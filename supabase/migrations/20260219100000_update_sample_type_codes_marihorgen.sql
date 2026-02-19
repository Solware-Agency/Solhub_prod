-- =====================================================
-- Actualizar códigos de tipos de muestra según ESTRUCTURA DE COSTOS (2).pdf
-- Marihorgen/LM: reemplazar códigos A01, B01, etc. por CXG, PAAF, etc.
-- COLN para COLON NO TUMORAL (evitar conflicto con COL)
-- =====================================================

-- 1. Actualizar sample_type en medical_records_clean donde cambió el nombre
-- (para que los casos existentes sigan vinculados correctamente)
UPDATE public.medical_records_clean m
SET sample_type = sub.new_name,
    updated_at = NOW()
FROM (
  SELECT l.id AS laboratory_id, map.old_name, map.new_name
  FROM public.laboratories l
  CROSS JOIN (VALUES
    ('P.A.A.F.', 'PUNCIÓN CON AGUJA FINA'),
    ('GANGLIO CERVICAL', 'GANGLIO LINFÁTICO'),
    ('GANGLIO SUPRACLAVICULAR', 'GANGLIO LINFÁTICO'),
    ('GANGLIO AXILAR', 'GANGLIO LINFÁTICO'),
    ('GANGLIO INGUINAL', 'GANGLIO LINFÁTICO')
  ) AS map(old_name, new_name)
  WHERE l.slug IN ('marihorgen', 'lm')
) sub
WHERE m.laboratory_id = sub.laboratory_id
  AND m.sample_type = sub.old_name;

-- 2. Eliminar registros actuales de sample_type_costs para marihorgen/lm
DELETE FROM public.sample_type_costs stc
WHERE stc.laboratory_id IN (SELECT id FROM public.laboratories WHERE slug IN ('marihorgen', 'lm'));

-- 3. Insertar nuevos tipos de muestra con códigos actualizados del PDF
INSERT INTO public.sample_type_costs (laboratory_id, code, name, price_taquilla, price_convenios, price_descuento)
SELECT l.id, v.code, v.name, v.price_taquilla, v.price_convenios, v.price_descuento
FROM public.laboratories l
CROSS JOIN (VALUES
  ('CXG', 'CITOLOGIAS GINECOLÓGICAS', 15.00, 14.25, 13.50),
  ('CXNG', 'CITOLOGIAS NO GINECOLÓGICAS', 15.00, 14.25, 13.50),
  ('PAAF', 'PUNCIÓN CON AGUJA FINA', 40.00, 38.00, 36.00),
  ('REV', 'REVISIÓN', 40.00, 38.00, 36.00),
  ('LIQ', 'LÍQUIDO', 40.00, 38.00, 36.00),
  ('CU', 'CUELLO UTERINO', 40.00, 38.00, 36.00),
  ('VAG', 'VAGINA', 40.00, 38.00, 36.00),
  ('VUL', 'VULVA', 40.00, 38.00, 36.00),
  ('ENDOM', 'ENDOMETRIO', 40.00, 38.00, 36.00),
  ('PUNCH', 'PIEL (punch)', 40.00, 38.00, 36.00),
  ('BRON', 'MUCOSA BRONQUIAL', 40.00, 38.00, 36.00),
  ('PLEU', 'PLEURA', 40.00, 38.00, 36.00),
  ('CAR', 'CARINAS', 40.00, 38.00, 36.00),
  ('VEJ', 'MUCOSA VESICAL', 40.00, 38.00, 36.00),
  ('BOCA', 'MUCOSA ORAL', 40.00, 38.00, 36.00),
  ('ESO', 'ESÓFAGO', 40.00, 38.00, 36.00),
  ('ESTO', 'ESTÓMAGO', 40.00, 38.00, 36.00),
  ('DUO', 'DUODENO', 40.00, 38.00, 36.00),
  ('YEY', 'YEYUNO', 40.00, 38.00, 36.00),
  ('ILE', 'ILEON', 40.00, 38.00, 36.00),
  ('COL', 'COLON', 40.00, 38.00, 36.00),
  ('REC', 'RECTO', 40.00, 38.00, 36.00),
  ('ANO', 'ANO', 40.00, 38.00, 36.00),
  ('TRU1', 'TRUCUT MAMA', 40.00, 38.00, 36.00),
  ('TRU2', 'TRUCUT GANGLIO', 40.00, 38.00, 36.00),
  ('TRU3', 'TRUCUT PRÓSTATA', 40.00, 38.00, 36.00),
  ('TRU4', 'TRUCUT PARTES BLANDAS', 40.00, 38.00, 36.00),
  ('GANG', 'GANGLIO LINFÁTICO', 50.00, 47.50, 45.00),
  ('NASAL', 'FOSA NASAL', 50.00, 47.50, 45.00),
  ('LEGR', 'LEGRADO UTERINO', 50.00, 47.50, 45.00),
  ('AMEU', 'ASPIRACIÓN MANUAL ENDOUTERINA', 60.00, 57.00, 54.00),
  ('EE', 'EMBARAZO ECTÓPICO', 60.00, 57.00, 54.00),
  ('APE', 'APÉNDICE CECAL', 60.00, 57.00, 54.00),
  ('VB', 'VESÍCULA BILIAR', 60.00, 57.00, 54.00),
  ('TU', 'TROMPAS UTERINAS', 60.00, 57.00, 54.00),
  ('PLAST', 'PLASTRÓN GANGLIONAR', 60.00, 57.00, 54.00),
  ('AMIG', 'AMIGDALAS', 60.00, 57.00, 54.00),
  ('ADENO', 'ADENOIDES', 60.00, 57.00, 54.00),
  ('MIO', 'MIOMA', 60.00, 57.00, 54.00),
  ('LIP', 'LIPOMA', 60.00, 57.00, 54.00),
  ('PB', 'PARTES BLANDAS', 60.00, 57.00, 54.00),
  ('HEMO', 'HEMORROIDES', 60.00, 57.00, 54.00),
  ('PLI', 'PLICOMA ANAL', 60.00, 57.00, 54.00),
  ('CONO', 'CONO DE CUELLO UTERINO', 70.00, 66.50, 63.00),
  ('TP', 'TIROIDECTOMIA PARCIAL', 80.00, 76.00, 72.00),
  ('EPI', 'EPIPLON', 80.00, 76.00, 72.00),
  ('OVA', 'OVARIO NO TUMORAL', 80.00, 76.00, 72.00),
  ('CAP', 'CÁPSULA MAMARIA', 80.00, 76.00, 72.00),
  ('PIELT', 'PIEL POR TUMOR', 90.00, 85.50, 81.00),
  ('INT', 'INTESTINOS NO TUMORALES', 90.00, 85.50, 81.00),
  ('PROST', 'PRÓSTATA NO TUMORAL', 90.00, 85.50, 81.00),
  ('RIÑ', 'RIÑÓN NO TUMORAL', 90.00, 85.50, 81.00),
  ('BAZ', 'BAZO NO TUMORAL', 90.00, 85.50, 81.00),
  ('COLN', 'COLON NO TUMORAL', 90.00, 85.50, 81.00),
  ('MP', 'MASTECTOMÍA PARCIAL', 90.00, 85.50, 81.00),
  ('ADN', 'ADENOMASTECTOMÍA', 90.00, 85.50, 81.00),
  ('CUAD', 'CUADRANTECTOMÍA', 90.00, 85.50, 81.00),
  ('BGC', 'GANGLIO CENTINELA', 100.00, 95.00, 90.00),
  ('ESTE', 'BIOPSIAS POR ESTEROTAXIA', 100.00, 95.00, 90.00),
  ('RTUP', 'RESECCIÓN TRANSURETRAL PROSTÁTICA', 100.00, 95.00, 90.00),
  ('RTUV', 'RESECCIÓN TRANSURETRAL VESICAL', 100.00, 95.00, 90.00),
  ('DISEC', 'DISECCIÓN GANGLIONAR', 100.00, 95.00, 90.00),
  ('AO', 'AORTA', 100.00, 95.00, 90.00),
  ('HATSA', 'ÚTERO SIN ANEXOS', 100.00, 95.00, 90.00),
  ('HATCA', 'UTERO CON ANEXOS', 150.00, 142.50, 135.00),
  ('MT', 'MASTECTOMÍA TOTAL', 150.00, 142.50, 135.00),
  ('TT', 'TIROIDECTOMÍA TOTAL', 150.00, 142.50, 135.00),
  ('NT', 'NEFRECTOMÍA TOTAL', 150.00, 142.50, 135.00),
  ('CC', 'CONSULTA INTRAOPERATORIA', 250.00, 237.50, 225.00),
  ('SNC', 'SISTEMA NERVIOSO', 250.00, 237.50, 225.00),
  ('TUPB', 'TUMORES DE PARTES BLANDAS', 250.00, 237.50, 225.00),
  ('NEFR', 'NEFRECTOMÍA RADICAL', 250.00, 237.50, 225.00),
  ('COLR', 'COLECTOMÍA RADICAL', 250.00, 237.50, 225.00),
  ('Q03', 'MASTECTOMÍA RADICAL', 250.00, 237.50, 225.00),
  ('POV', 'PROTOCOLO DE OVARIO', 250.00, 237.50, 225.00),
  ('PE', 'PROTOCOLO DE ENDOMETRIO', 250.00, 237.50, 225.00),
  ('HUE', 'HUESO', 250.00, 237.50, 225.00),
  ('MO', 'MÉDULA ÓSEA', 250.00, 237.50, 225.00),
  ('PROR', 'PROSTATECTOMIA RADICAL', 300.00, 285.00, 270.00),
  ('AMP', 'AMPUTACIONES', 400.00, 380.00, 360.00),
  ('IHQ', 'ANTICUERPOS', 90.00, NULL, NULL)
) AS v(code, name, price_taquilla, price_convenios, price_descuento)
WHERE l.slug IN ('marihorgen', 'lm');

-- 4. Actualizar sample_type en casos que tenían "COLON NO TUMORAL" (nombre igual, solo cambió código)
-- No hay cambio de nombre para COLON NO TUMORAL, solo el código en la tabla de costos.

-- 5. Actualizar casos con "BIOPSIAS DE HUESO" → "HUESO" (tipo eliminado, mapear a HUE)
UPDATE public.medical_records_clean m
SET sample_type = 'HUESO',
    updated_at = NOW()
WHERE m.laboratory_id IN (SELECT id FROM public.laboratories WHERE slug IN ('marihorgen', 'lm'))
  AND m.sample_type = 'BIOPSIAS DE HUESO';
