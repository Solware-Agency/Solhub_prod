/*
  # Create change logs table for audit trail

  1. New Tables
    - `change_logs`
      - `id` (uuid, primary key)
      - `medical_record_id` (uuid, foreign key to medical_records_clean)
      - `user_id` (uuid, foreign key to auth.users)
      - `user_email` (text)
      - `field_name` (text)
      - `field_label` (text)
      - `old_value` (text, nullable)
      - `new_value` (text, nullable)
      - `changed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `change_logs` table
    - Add policies for authenticated users to read and insert change logs
    - No update/delete policies to maintain audit trail integrity

  3. Performance
    - Add indexes for medical_record_id, user_id, and changed_at
    - Add trigger for automatic timestamp updates
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

-- Enable Row Level Security
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_change_logs_medical_record_id ON change_logs(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_user_id ON change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_changed_at ON change_logs(changed_at DESC);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read change logs" ON change_logs;
DROP POLICY IF EXISTS "Authenticated users can insert change logs" ON change_logs;

-- Create policies for RLS

-- Policy: Authenticated users can read all change logs
-- (Since medical records are accessible to all authenticated users in this system)
CREATE POLICY "Authenticated users can read change logs"
  ON change_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert change logs
CREATE POLICY "Authenticated users can insert change logs"
  ON change_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_change_logs_created_at ON change_logs;

-- Create trigger to automatically update created_at (though it's not really needed since we don't update)
-- This is just for consistency with other tables
CREATE TRIGGER update_change_logs_created_at
  BEFORE INSERT ON change_logs
  FOR EACH ROW EXECUTE FUNCTION update_change_logs_updated_at();