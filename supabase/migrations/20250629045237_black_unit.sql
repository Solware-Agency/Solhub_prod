/*
  # Replace age field with date_of_birth

  1. Schema Changes
    - Add `date_of_birth` column as DATE type
    - Remove `age` column and its constraints
    - Add constraint to ensure date_of_birth is not in the future
    - Add index for better performance

  2. Data Migration
    - For existing records, we cannot accurately convert age to date_of_birth
    - New records will use date_of_birth field
    - Age will be calculated dynamically in the application

  3. Security
    - Maintain existing RLS policies
    - Add validation constraints for date_of_birth
*/

-- Add date_of_birth column
ALTER TABLE medical_records_clean 
ADD COLUMN date_of_birth date;

-- Add constraint to ensure date_of_birth is not in the future
ALTER TABLE medical_records_clean 
ADD CONSTRAINT medical_records_clean_date_of_birth_check 
CHECK (date_of_birth <= CURRENT_DATE);

-- Add index for better performance on date_of_birth queries
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_date_of_birth 
ON medical_records_clean(date_of_birth);

-- Remove the old age column and its constraints
ALTER TABLE medical_records_clean 
DROP CONSTRAINT IF EXISTS medical_records_clean_age_check;

ALTER TABLE medical_records_clean 
DROP COLUMN IF EXISTS age;

-- Add comment to document the date_of_birth field
COMMENT ON COLUMN medical_records_clean.date_of_birth IS 'Patient date of birth - age is calculated dynamically from this field';