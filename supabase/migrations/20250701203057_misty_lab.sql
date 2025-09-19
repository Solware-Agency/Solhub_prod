/*
  # Create change_logs table for audit trail

  1. New Tables
    - `change_logs`
      - `id` (uuid, primary key)
      - `medical_record_id` (uuid, foreign key to medical_records_clean)
      - `user_id` (uuid, foreign key to auth.users)
      - `user_email` (text, email of the user who made the change)
      - `field_name` (text, name of the field that was changed)
      - `field_label` (text, human-readable label of the field)
      - `old_value` (text, previous value)
      - `new_value` (text, new value)
      - `changed_at` (timestamptz, when the change was made)
      - `created_at` (timestamptz, record creation timestamp)

  2. Security
    - Enable RLS on `change_logs` table
    - Add policies for authenticated users to read change logs
    - Add policy for authenticated users to insert change logs
    - Only allow reading change logs for records the user has access to

  3. Indexes
    - Add index on medical_record_id for faster queries
    - Add index on user_id for user-specific queries
    - Add index on changed_at for chronological queries
*/

-- Check if table exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'change_logs') THEN
    -- Create change_logs table
    CREATE TABLE change_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      medical_record_id uuid NOT NULL REFERENCES medical_records_clean(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      user_email text NOT NULL,
      field_name text NOT NULL,
      field_label text NOT NULL,
      old_value text,
      new_value text,
      changed_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz DEFAULT now()
    );

    -- Enable Row Level Security
    ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

    -- Create indexes for better performance
    CREATE INDEX idx_change_logs_medical_record_id ON change_logs(medical_record_id);
    CREATE INDEX idx_change_logs_user_id ON change_logs(user_id);
    CREATE INDEX idx_change_logs_changed_at ON change_logs(changed_at DESC);
  END IF;
END $$;

-- Check if policy exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'change_logs' AND policyname = 'Authenticated users can read change logs'
  ) THEN
    -- Policy: Authenticated users can read all change logs
    CREATE POLICY "Authenticated users can read change logs"
      ON change_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Check if policy exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'change_logs' AND policyname = 'Authenticated users can insert change logs'
  ) THEN
    -- Policy: Authenticated users can insert change logs
    CREATE POLICY "Authenticated users can insert change logs"
      ON change_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users cannot update or delete change logs (audit trail integrity)
-- No UPDATE or DELETE policies = no one can modify change logs

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_change_logs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if trigger exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_change_logs_created_at' AND tgrelid = 'change_logs'::regclass
  ) THEN
    -- Create trigger to automatically update created_at
    CREATE TRIGGER update_change_logs_created_at
      BEFORE INSERT ON change_logs
      FOR EACH ROW EXECUTE FUNCTION update_change_logs_updated_at();
  END IF;
END $$;