/*
  # Agregar campo estado_spt para sala de espera SPT

  1. Changes
    - Add `estado_spt` column to `medical_records_clean` table (text, nullable)
    - Add CHECK constraint for valid values: 'pendiente_triaje', 'esperando_consulta', 'finalizado'
    - Create index for fast queries by laboratory, estado and branch
    - Add comment for documentation

  2. Purpose
    - Track the status of medical cases in SPT waiting room workflow
    - States: pendiente_triaje → esperando_consulta → finalizado
    - Only new cases from implementation date will have this field
    - Old cases remain NULL and don't affect waiting room

  3. Migration Strategy
    - Existing records will have NULL estado_spt (compatible with old cases and other labs)
    - New SPT cases will be set to 'pendiente_triaje' on creation
    - Triggers will automatically update state when triage is created or report is generated
*/

-- Agregar columna estado_spt
ALTER TABLE medical_records_clean 
ADD COLUMN IF NOT EXISTS estado_spt text NULL;

-- Agregar constraint para validar valores permitidos
ALTER TABLE medical_records_clean
DROP CONSTRAINT IF EXISTS medical_records_clean_estado_spt_check;

ALTER TABLE medical_records_clean
ADD CONSTRAINT medical_records_clean_estado_spt_check 
CHECK (
  estado_spt IS NULL 
  OR estado_spt IN ('pendiente_triaje', 'esperando_consulta', 'finalizado')
);

-- Crear índice compuesto para queries eficientes por laboratorio, estado y sede
CREATE INDEX IF NOT EXISTS idx_medical_records_estado_spt 
ON medical_records_clean(laboratory_id, estado_spt, branch)
WHERE estado_spt IS NOT NULL;

-- Comentario para documentación
COMMENT ON COLUMN medical_records_clean.estado_spt IS 
'Estado del caso en el flujo de sala de espera SPT: pendiente_triaje (recién registrado), esperando_consulta (triaje realizado), finalizado (informe generado/enviado). NULL para casos antiguos y otros laboratorios.';

-- Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_records_clean' 
    AND column_name = 'estado_spt'
  ) THEN
    RAISE NOTICE '✅ Columna estado_spt agregada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo agregar estado_spt';
  END IF;
END $$;
