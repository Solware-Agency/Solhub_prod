-- =====================================================
-- Saldo a favor y crédito aplicado (Lab Marihorgen / lm)
-- - saldo_a_favor: excedente cuando el paciente paga de más
-- - credit_applied: crédito del paciente aplicado al crear este caso
-- - Feature hasPositiveBalance para lab con slug 'lm'
-- =====================================================

-- Columnas en medical_records_clean
ALTER TABLE public.medical_records_clean
  ADD COLUMN IF NOT EXISTS saldo_a_favor numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_applied numeric(10,2) DEFAULT 0;

COMMENT ON COLUMN public.medical_records_clean.saldo_a_favor IS 'Excedente en USD cuando el paciente paga más del costo del caso (solo labs con hasPositiveBalance).';
COMMENT ON COLUMN public.medical_records_clean.credit_applied IS 'Crédito del paciente aplicado a este caso al crearlo; se descuenta de saldo_a_favor de casos anteriores (FIFO).';

-- Activar feature hasPositiveBalance para lab slug 'lm'
UPDATE public.laboratories
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{hasPositiveBalance}',
  'true'::jsonb
)
WHERE slug = 'lm';

-- =====================================================
-- RPC: Descontar crédito del paciente (FIFO)
-- Usado al crear un caso con credit_applied > 0
-- =====================================================
CREATE OR REPLACE FUNCTION public.deduct_patient_credit(
  p_patient_id uuid,
  p_laboratory_id uuid,
  p_amount_to_deduct numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining numeric := p_amount_to_deduct;
  v_row record;
BEGIN
  IF p_amount_to_deduct IS NULL OR p_amount_to_deduct <= 0 THEN
    RETURN;
  END IF;

  FOR v_row IN
    SELECT id, saldo_a_favor
    FROM medical_records_clean
    WHERE patient_id = p_patient_id
      AND laboratory_id = p_laboratory_id
      AND COALESCE(saldo_a_favor, 0) > 0
    ORDER BY created_at ASC, id ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF v_row.saldo_a_favor >= v_remaining THEN
      UPDATE medical_records_clean
      SET saldo_a_favor = saldo_a_favor - v_remaining,
          updated_at = now()
      WHERE id = v_row.id;
      v_remaining := 0;
    ELSE
      UPDATE medical_records_clean
      SET saldo_a_favor = 0,
          updated_at = now()
      WHERE id = v_row.id;
      v_remaining := v_remaining - v_row.saldo_a_favor;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.deduct_patient_credit(uuid, uuid, numeric) IS 'Descuenta crédito del paciente (saldo_a_favor) en orden FIFO por created_at. Usar tras insertar un caso con credit_applied > 0.';
