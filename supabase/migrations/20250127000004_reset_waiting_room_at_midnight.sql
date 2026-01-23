/*
  # Reinicio automático de sala de espera a las 12:00 AM

  1. Changes
    - Create function to reset waiting room states at midnight
    - Schedule pg_cron job to run daily at 00:00 (midnight)
    - Finalize all pending cases in SPT waiting room

  2. Purpose
    - Automatically finalize all pending cases in waiting room at midnight
    - Only applies to SPT laboratory (slug = 'spt')
    - Ensures clean slate for new day

  3. Behavior
    - Changes 'pendiente_triaje' → 'finalizado'
    - Changes 'esperando_consulta' → 'finalizado'
    - Only affects SPT laboratory cases
    - Runs daily at 00:00 (midnight)
*/

-- =====================================================
-- 1. FUNCIÓN: Reiniciar sala de espera (finalizar casos pendientes)
-- =====================================================
CREATE OR REPLACE FUNCTION reset_waiting_room_at_midnight()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  spt_lab_id uuid;
  cases_updated integer;
BEGIN
  -- Obtener ID del laboratorio SPT
  SELECT id INTO spt_lab_id
  FROM laboratories
  WHERE slug = 'spt'
  LIMIT 1;

  -- Si no existe SPT, no hacer nada
  IF spt_lab_id IS NULL THEN
    RAISE NOTICE '⚠️ Laboratorio SPT no encontrado, saltando reinicio de sala de espera';
    RETURN;
  END IF;

  -- Finalizar todos los casos pendientes de SPT
  UPDATE medical_records_clean
  SET 
    estado_spt = 'finalizado',
    updated_at = now()
  WHERE laboratory_id = spt_lab_id
    AND estado_spt IN ('pendiente_triaje', 'esperando_consulta');

  GET DIAGNOSTICS cases_updated = ROW_COUNT;

  RAISE NOTICE '✅ Sala de espera reiniciada: % casos finalizados', cases_updated;
END;
$$;

-- Comentario para documentación
COMMENT ON FUNCTION reset_waiting_room_at_midnight() IS 
'Reinicia la sala de espera SPT finalizando todos los casos pendientes. Se ejecuta automáticamente a las 00:00 todos los días.';

-- =====================================================
-- 2. CONFIGURAR JOB DE pg_cron (si está disponible)
-- =====================================================

-- Verificar si pg_cron está disponible
DO $$
BEGIN
  -- Intentar crear el job de cron
  -- Se ejecuta todos los días a las 00:00 (medianoche)
  PERFORM cron.schedule(
    'reset-waiting-room-midnight',
    '0 0 * * *', -- Cron expression: todos los días a las 00:00
    'SELECT reset_waiting_room_at_midnight();'
  );
  
  RAISE NOTICE '✅ Job de cron programado exitosamente para reiniciar sala de espera a las 00:00';
EXCEPTION
  WHEN OTHERS THEN
    -- Si pg_cron no está disponible, solo registrar advertencia
    RAISE WARNING '⚠️ pg_cron no está disponible. El reinicio automático debe configurarse manualmente o mediante otro método.';
    RAISE WARNING '   Para habilitar pg_cron en Supabase, contacta al administrador o usa Supabase Edge Functions.';
END $$;

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================

-- Verificar que la función existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'reset_waiting_room_at_midnight'
  ) THEN
    RAISE NOTICE '✅ Función reset_waiting_room_at_midnight creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear la función reset_waiting_room_at_midnight';
  END IF;
END $$;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- NOTA 1: Si pg_cron no está disponible en tu instancia de Supabase,
--         puedes usar Supabase Edge Functions con un trigger HTTP
--         o configurar un servicio externo que llame a esta función

-- NOTA 2: Para ejecutar manualmente la función:
--         SELECT reset_waiting_room_at_midnight();

-- NOTA 3: Para verificar el job de cron (si está disponible):
--         SELECT * FROM cron.job WHERE jobname = 'reset-waiting-room-midnight';

-- NOTA 4: Para deshabilitar el job (si es necesario):
--         SELECT cron.unschedule('reset-waiting-room-midnight');

-- =====================================================
-- Fin de la migración
-- =====================================================
