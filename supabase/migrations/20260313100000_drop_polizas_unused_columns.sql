-- Eliminar columnas de polizas que ya no se usan.
-- Recordatorios usan solo next_payment_date y ventanas por fecha (sin flags).
-- Historial de pagos está en pagos_poliza.

ALTER TABLE public.polizas
  DROP COLUMN IF EXISTS alert_30_enviada,
  DROP COLUMN IF EXISTS alert_14_enviada,
  DROP COLUMN IF EXISTS alert_7_enviada,
  DROP COLUMN IF EXISTS alert_dia_enviada,
  DROP COLUMN IF EXISTS alert_post_enviada,
  DROP COLUMN IF EXISTS ultima_alerta,
  DROP COLUMN IF EXISTS alert_type_ultima,
  DROP COLUMN IF EXISTS alert_cycle_id,
  DROP COLUMN IF EXISTS dias_prox_vencimiento,
  DROP COLUMN IF EXISTS fecha_pago_ultimo,
  DROP COLUMN IF EXISTS fecha_pago_ultimo_backup;
