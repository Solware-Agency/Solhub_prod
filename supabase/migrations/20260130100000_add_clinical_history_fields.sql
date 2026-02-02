/*
  # Agregar campos de historia clínica a triaje_records

  1. Changes
    - Add 6 TEXT columns to `triaje_records`: enfermedad_actual, antecedentes_quirurgicos,
      diagnostico, plan_de_accion, lugar_de_nacimiento, telefono_emergencia
    - All nullable, optional

  2. Purpose
    - Enfermedad actual: descripción de la enfermedad/condición actual
    - Antecedentes quirúrgicos: historial de cirugías
    - Diagnóstico: diagnóstico del caso
    - Plan de acción: plan terapéutico o seguimiento
    - Lugar de nacimiento: dato demográfico del paciente
    - Teléfono de emergencia: contacto de emergencia
*/

-- Agregar columnas a triaje_records
ALTER TABLE triaje_records ADD COLUMN IF NOT EXISTS enfermedad_actual text NULL;
ALTER TABLE triaje_records ADD COLUMN IF NOT EXISTS antecedentes_quirurgicos text NULL;
ALTER TABLE triaje_records ADD COLUMN IF NOT EXISTS diagnostico text NULL;
ALTER TABLE triaje_records ADD COLUMN IF NOT EXISTS plan_de_accion text NULL;
ALTER TABLE triaje_records ADD COLUMN IF NOT EXISTS lugar_de_nacimiento text NULL;
ALTER TABLE triaje_records ADD COLUMN IF NOT EXISTS telefono_emergencia text NULL;

COMMENT ON COLUMN triaje_records.enfermedad_actual IS 'Descripción de la enfermedad o condición actual del paciente.';
COMMENT ON COLUMN triaje_records.antecedentes_quirurgicos IS 'Historial de cirugías previas.';
COMMENT ON COLUMN triaje_records.diagnostico IS 'Diagnóstico del caso.';
COMMENT ON COLUMN triaje_records.plan_de_accion IS 'Plan terapéutico o de seguimiento.';
COMMENT ON COLUMN triaje_records.lugar_de_nacimiento IS 'Lugar de nacimiento del paciente.';
COMMENT ON COLUMN triaje_records.telefono_emergencia IS 'Número de teléfono de contacto de emergencia.';

-- Verificación
DO $$
DECLARE
  cols text[] := ARRAY['enfermedad_actual','antecedentes_quirurgicos','diagnostico','plan_de_accion','lugar_de_nacimiento','telefono_emergencia'];
  c text;
BEGIN
  FOREACH c IN ARRAY cols
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'triaje_records' AND column_name = c
    ) THEN
      RAISE EXCEPTION 'Error: La columna % no se agregó correctamente a triaje_records', c;
    END IF;
  END LOOP;
  RAISE NOTICE 'Migración completada: 6 columnas de historia clínica agregadas a triaje_records';
END $$;
