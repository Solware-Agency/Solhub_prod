/*
  # owner_display_code en medical_records_clean (Marihorgen + Inmunohistoquímica)

  1. Cambios
    - Añadir columna `owner_display_code` (text, nullable) en `medical_records_clean`
    - Solo usada por laboratorio Marihorgen para casos de Inmunohistoquímica
    - El owner puede poner un código visible (máx. 5 dígitos, solo números)
    - El código interno `code` del sistema se mantiene y no se edita

  2. Propósito
    - Marihorgen: el owner edita el caso y pone su propio código en el badge (debajo del título)
    - Si no pone código, el badge se muestra vacío (para que se note que debe editarlo)
    - Máximo 5 caracteres, solo números. Validación en frontend/backend.
*/

ALTER TABLE medical_records_clean
ADD COLUMN IF NOT EXISTS owner_display_code text;

COMMENT ON COLUMN medical_records_clean.owner_display_code IS
'Código visible que el owner de Marihorgen puede asignar a casos de Inmunohistoquímica. Máx. 5 dígitos. Solo para mostrar en UI; el código único del sistema sigue en code.';
