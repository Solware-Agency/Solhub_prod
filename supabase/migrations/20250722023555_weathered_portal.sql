/*
  # Replace date_of_birth with age field

  1. Schema Changes
    - Drop the existing date_of_birth column (date type)
    - Add new edad column (text type) to store age with unit (e.g., "10 MESES", "12 AÑOS")
    - Update any constraints or indexes

  2. Data Migration
    - Convert existing date_of_birth data to edad format before dropping the column
    - Calculate age from date_of_birth and convert to appropriate format

  3. Security
    - Maintain existing RLS policies
    - Update any policies that referenced date_of_birth
*/

-- First, let's add the new edad column
ALTER TABLE medical_records_clean 
ADD COLUMN IF NOT EXISTS edad text;

-- Migrate existing data from date_of_birth to edad
UPDATE medical_records_clean 
SET edad = CASE 
  WHEN date_of_birth IS NOT NULL THEN
    CASE 
      WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::date)) >= 1 THEN
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth::date))::text || ' AÑOS'
      ELSE
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, date_of_birth::date))::text || ' MESES'
    END
  ELSE NULL
END
WHERE date_of_birth IS NOT NULL AND edad IS NULL;

-- Drop the old date_of_birth column
ALTER TABLE medical_records_clean 
DROP COLUMN IF EXISTS date_of_birth;

-- Add index for the new edad column for better performance
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_edad 
ON medical_records_clean(edad);

-- Update any existing constraints if needed
-- (No specific constraints needed for edad as it's a text field)