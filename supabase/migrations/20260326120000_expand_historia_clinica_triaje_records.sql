-- Historia clínica ampliada: nuevos campos en triaje_records
-- UI Sí/No se mapea a boolean en BD (null = sin responder).

ALTER TABLE public.triaje_records
  ADD COLUMN IF NOT EXISTS ant_problemas_tiroides boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_obesidad boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_cancer boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_asma boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_bronquitis_cronica boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_enfisema boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_tbc boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_anticoagulante boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_reaccion_anestesia boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_cardiopatia boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_nefropatia boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_cirugia_abdominal_alta boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_disnea boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_tos boolean NULL,
  ADD COLUMN IF NOT EXISTS ant_expectoracion boolean NULL,
  ADD COLUMN IF NOT EXISTS intervenido_quirurgico boolean NULL,
  ADD COLUMN IF NOT EXISTS fecha_intervencion_quirurgica date NULL,
  ADD COLUMN IF NOT EXISTS tipo_intervencion_quirurgica text NULL,
  ADD COLUMN IF NOT EXISTS otra_enfermedad_cronica boolean NULL,
  ADD COLUMN IF NOT EXISTS tratamiento_otra_causa boolean NULL,
  ADD COLUMN IF NOT EXISTS convulsiones boolean NULL,
  ADD COLUMN IF NOT EXISTS acv boolean NULL,
  ADD COLUMN IF NOT EXISTS estado_civil text NULL,
  ADD COLUMN IF NOT EXISTS alimentacion text NULL,
  ADD COLUMN IF NOT EXISTS habitos_intestinales text NULL,
  ADD COLUMN IF NOT EXISTS sueno text NULL,
  ADD COLUMN IF NOT EXISTS neurologico text NULL,
  ADD COLUMN IF NOT EXISTS sintomas text NULL,
  ADD COLUMN IF NOT EXISTS direccion_completa text NULL,
  ADD COLUMN IF NOT EXISTS direccion_ciudad text NULL,
  ADD COLUMN IF NOT EXISTS direccion_estado text NULL,
  ADD COLUMN IF NOT EXISTS fecha_hora_salida timestamptz NULL,
  ADD COLUMN IF NOT EXISTS diagnostico_egreso text NULL,
  ADD COLUMN IF NOT EXISTS drogas_habito text NULL,
  ADD COLUMN IF NOT EXISTS chimo_habito text NULL;

ALTER TABLE public.triaje_records
  DROP CONSTRAINT IF EXISTS triaje_records_estado_civil_check;

ALTER TABLE public.triaje_records
  ADD CONSTRAINT triaje_records_estado_civil_check
  CHECK (
    estado_civil IS NULL
    OR estado_civil IN (
      'Soltero/a',
      'Casado/a',
      'Divorciado/a',
      'Viudo/a',
      'Unión libre',
      'Separado/a'
    )
  );

COMMENT ON COLUMN public.triaje_records.diagnostico_egreso IS 'Diagnóstico de egreso (UI: datos adicionales).';
COMMENT ON COLUMN public.triaje_records.fecha_hora_salida IS 'Fecha y hora de salida (manual). Ingreso = creación del caso en UI.';
