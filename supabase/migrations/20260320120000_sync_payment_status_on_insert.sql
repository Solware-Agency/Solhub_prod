-- Sincronizar payment_status con remaining también en INSERT.
-- Así, si la app envía remaining = 0 pero payment_status = 'Incompleto', la BD corrige a 'Pagado'.
CREATE TRIGGER trg_sync_payment_status_remaining_insert
  BEFORE INSERT ON medical_records_clean
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_status_with_remaining();
