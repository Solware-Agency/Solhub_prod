/*
  # Fix Jesus user role in database

  1. Changes
    - Ensure Jesus user has admin role in the database
    - Force update the role in the profiles table
    - Add logging for the change

  2. Security
    - Maintains existing RLS policies
*/

-- Ensure Jesus has admin role (force update)
UPDATE profiles
SET 
  role = 'admin',
  updated_at = now()
WHERE 
  email = 'jesus@email.com';

-- Log the change for audit purposes
INSERT INTO change_logs (
  medical_record_id,
  user_id,
  user_email,
  field_name,
  field_label,
  old_value,
  new_value,
  changed_at
)
SELECT
  '00000000-0000-0000-0000-000000000000', -- placeholder ID for system changes
  id,
  email,
  'role',
  'Rol de Usuario',
  'previous_role', -- We don't know the exact previous role
  'admin',
  now()
FROM 
  profiles
WHERE 
  email = 'jesus@email.com';

-- Output confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Jesus user role has been set to admin';
END $$;