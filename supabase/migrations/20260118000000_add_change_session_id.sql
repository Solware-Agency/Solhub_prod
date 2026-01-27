/*
  # Agregar change_session_id para agrupar cambios por sesión de edición

  1. Changes
    - Add `change_session_id` column to `change_logs` table (UUID, nullable)
    - Create index for fast grouping queries
    - Add comment for documentation

  2. Purpose
    - Group multiple field changes made in the same edit session
    - Improve UX by showing one row per edit session with details modal
    - Session ID is generated per submit, not per modal open (mitigates long sessions)

  3. Migration Strategy
    - Existing records will have NULL change_session_id (fallback to id for grouping)
    - New records will have session_id generated on insert
*/

-- Agregar columna para agrupar cambios de la misma sesión
ALTER TABLE change_logs 
ADD COLUMN IF NOT EXISTS change_session_id UUID;

-- Crear índice para agrupación rápida
CREATE INDEX IF NOT EXISTS idx_change_logs_session_id 
ON change_logs(change_session_id)
WHERE change_session_id IS NOT NULL;

-- Comentario para documentación
COMMENT ON COLUMN change_logs.change_session_id IS 
'ID de sesión para agrupar múltiples cambios realizados en el mismo submit por el mismo usuario en la misma entidad. Generado por submit, no por abrir modal (mitiga sesiones largas)';

-- Verificación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'change_logs' 
    AND column_name = 'change_session_id'
  ) THEN
    RAISE NOTICE '✅ Columna change_session_id agregada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo agregar change_session_id';
  END IF;
END $$;
