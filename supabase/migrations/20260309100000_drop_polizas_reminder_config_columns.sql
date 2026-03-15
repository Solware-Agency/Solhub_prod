-- Quitar columnas de configuración de recordatorios no usadas en polizas.
-- La lógica real usa ventanas fijas (30, 14, 7, día D, post) y flags alert_*_enviada.

ALTER TABLE public.polizas
  DROP COLUMN IF EXISTS tipo_alerta,
  DROP COLUMN IF EXISTS dias_alerta,
  DROP COLUMN IF EXISTS dias_frecuencia,
  DROP COLUMN IF EXISTS dias_frecuencia_post,
  DROP COLUMN IF EXISTS dias_recordatorio;
