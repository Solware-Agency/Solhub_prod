/*
  # Create medical_records_clean table

  1. New Tables
    - `medical_records_clean`
      - `id` (uuid, primary key)
      - Patient information fields
      - Medical service fields  
      - Payment information fields
      - Timestamps

  2. Security
    - Enable RLS on `medical_records_clean` table
    - Add policies for authenticated users to manage records
*/

-- Create medical_records_clean table
CREATE TABLE IF NOT EXISTS medical_records_clean (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Patient Information
  full_name text NOT NULL,
  id_number text NOT NULL,
  phone text NOT NULL,
  age integer NOT NULL CHECK (age > 0),
  email text,
  
  -- Medical Service Information
  exam_type text NOT NULL,
  origin text NOT NULL,
  treating_doctor text NOT NULL,
  sample_type text NOT NULL,
  number_of_samples integer NOT NULL CHECK (number_of_samples > 0),
  relationship text,
  branch text NOT NULL,
  date text NOT NULL,
  
  -- Financial Information
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  exchange_rate numeric(10,4),
  payment_status text NOT NULL DEFAULT 'Pendiente',
  remaining numeric(10,2) NOT NULL DEFAULT 0,
  
  -- Payment Methods (up to 4)
  payment_method_1 text,
  payment_amount_1 numeric(10,2),
  payment_reference_1 text,
  payment_method_2 text,
  payment_amount_2 numeric(10,2),
  payment_reference_2 text,
  payment_method_3 text,
  payment_amount_3 numeric(10,2),
  payment_reference_3 text,
  payment_method_4 text,
  payment_amount_4 numeric(10,2),
  payment_reference_4 text,
  
  -- Additional Information
  comments text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE medical_records_clean ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can read medical records"
  ON medical_records_clean
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert medical records"
  ON medical_records_clean
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update medical records"
  ON medical_records_clean
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete medical records"
  ON medical_records_clean
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_id_number ON medical_records_clean(id_number);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_full_name ON medical_records_clean(full_name);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_created_at ON medical_records_clean(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_payment_status ON medical_records_clean(payment_status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_medical_records_clean_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_medical_records_clean_updated_at ON medical_records_clean;
CREATE TRIGGER update_medical_records_clean_updated_at
  BEFORE UPDATE ON medical_records_clean
  FOR EACH ROW EXECUTE FUNCTION update_medical_records_clean_updated_at();