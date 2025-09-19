/*
  # Create immuno_requests table for immunohistochemistry requests

  1. New Tables
    - `immuno_requests`
      - `id` (uuid, primary key)
      - `case_id` (uuid, foreign key to medical_records_clean)
      - `inmunorreacciones` (text array or text)
      - `n_reacciones` (integer)
      - `precio_unitario` (decimal, default 18)
      - `total` (decimal, calculated)
      - `pagado` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `immuno_requests` table
    - Add policies for authenticated users to read and manage requests

  3. Performance
    - Add indexes for case_id and created_at
*/

-- Create immuno_requests table
CREATE TABLE IF NOT EXISTS immuno_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES medical_records_clean(id) ON DELETE CASCADE,
  inmunorreacciones text NOT NULL,
  n_reacciones integer NOT NULL,
  precio_unitario decimal(10,2) NOT NULL DEFAULT 18.00,
  total decimal(10,2) NOT NULL,
  pagado boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE immuno_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_immuno_requests_case_id ON immuno_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_immuno_requests_created_at ON immuno_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_immuno_requests_pagado ON immuno_requests(pagado);

-- Create policies for RLS

-- Policy: Authenticated users can read all immuno requests
CREATE POLICY "Authenticated users can read immuno requests"
  ON immuno_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert immuno requests
CREATE POLICY "Authenticated users can insert immuno requests"
  ON immuno_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update immuno requests
CREATE POLICY "Authenticated users can update immuno requests"
  ON immuno_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only owners can delete immuno requests
CREATE POLICY "Owners can delete immuno requests"
  ON immuno_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_immuno_requests_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_immuno_requests_updated_at ON immuno_requests;
CREATE TRIGGER update_immuno_requests_updated_at
  BEFORE UPDATE ON immuno_requests
  FOR EACH ROW EXECUTE FUNCTION update_immuno_requests_updated_at();

-- Add comment to document the table
COMMENT ON TABLE immuno_requests IS 'Table to store immunohistochemistry reaction requests and payment status';
COMMENT ON COLUMN immuno_requests.case_id IS 'Reference to the medical record case';
COMMENT ON COLUMN immuno_requests.inmunorreacciones IS 'Comma-separated list of immunoreactions';
COMMENT ON COLUMN immuno_requests.n_reacciones IS 'Number of immunoreactions requested';
COMMENT ON COLUMN immuno_requests.precio_unitario IS 'Unit price per reaction';
COMMENT ON COLUMN immuno_requests.total IS 'Total calculated price (n_reacciones * precio_unitario)';
COMMENT ON COLUMN immuno_requests.pagado IS 'Whether the immunoreactions have been paid for';