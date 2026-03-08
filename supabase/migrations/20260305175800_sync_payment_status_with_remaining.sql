-- Sincronizar payment_status con remaining en medical_records_clean.
-- Si remaining <= 0 y hay total_amount > 0 -> Pagado; si remaining > 0 -> Incompleto.
CREATE OR REPLACE FUNCTION sync_payment_status_with_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.remaining IS NOT NULL AND NEW.total_amount IS NOT NULL AND NEW.total_amount > 0 THEN
    IF NEW.remaining <= 0 THEN
      NEW.payment_status := 'Pagado';
    ELSE
      NEW.payment_status := 'Incompleto';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_status_remaining ON medical_records_clean;
CREATE TRIGGER trg_sync_payment_status_remaining
  BEFORE UPDATE ON medical_records_clean
  FOR EACH ROW
  WHEN (
    OLD.remaining IS DISTINCT FROM NEW.remaining
    OR OLD.total_amount IS DISTINCT FROM NEW.total_amount
  )
  EXECUTE FUNCTION sync_payment_status_with_remaining();
