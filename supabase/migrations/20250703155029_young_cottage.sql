/*
  # Create change_logs table for audit trail

  1. New Tables
    - `change_logs`
      - Tracks all changes to medical records
      - Records user, field, old/new values, timestamps

  2. Security
    - Enable RLS on `change_logs` table
    - Users can insert their own logs
    - All authenticated users can read logs

  3. Functions
    - Function to update change logs timestamps
*/

-- Create change_logs table
CREATE TABLE IF NOT EXISTS change_logs (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_change_logs_medical_record_id ON change_logs(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_user_id ON change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_changed_at ON change_logs(changed_at DESC);

-- Enable Row Level Security
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'change_logs' AND policyname = 'Authenticated users can read change logs'
  ) THEN
    CREATE POLICY "Authenticated users can read change logs"
      ON change_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'change_logs' AND policyname = 'Authenticated users can insert change logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert change logs"
      ON change_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create function to update change logs timestamps
CREATE OR REPLACE FUNCTION update_change_logs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamps
DROP TRIGGER IF EXISTS update_change_logs_created_at ON change_logs;
CREATE TRIGGER update_change_logs_created_at
  BEFORE INSERT ON change_logs
  FOR EACH ROW EXECUTE FUNCTION update_change_logs_updated_at();