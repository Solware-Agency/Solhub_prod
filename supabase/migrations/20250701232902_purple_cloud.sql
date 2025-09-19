-- Update the role check constraint to include 'admin' if not already included
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check' 
    AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text, 'admin'::text, 'doctor'::text]));
  ELSE
    -- Check if the constraint already includes 'admin'
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'profiles_role_check' 
      AND pg_get_constraintdef(oid) LIKE '%admin%'
    ) THEN
      -- Drop and recreate with 'admin'
      ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
      ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text, 'admin'::text, 'doctor'::text]));
    END IF;
  END IF;
END $$;

-- Update Jesus to admin role
UPDATE profiles
SET role = 'admin'
WHERE email = 'jesus@email.com';

-- Log the change
INSERT INTO change_logs (
  medical_record_id,
  user_id,
  user_email,
  field_name,
  field_label,
  old_value,
  new_value
)
SELECT
  '00000000-0000-0000-0000-000000000000', -- placeholder ID
  id,
  email,
  'role',
  'Rol de Usuario',
  'employee',
  'admin'
FROM profiles
WHERE email = 'jesus@email.com';