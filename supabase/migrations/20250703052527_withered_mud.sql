/*
  # Create medical_records_clean table

  1. New Tables
    - `medical_records_clean`
      - Patient information fields
      - Exam and medical details
      - Payment tracking with multiple methods
      - Biopsy-specific fields
      - Audit fields (created_by, timestamps)

  2. Security
    - Enable RLS on `medical_records_clean` table
    - Add policies for branch-based access control
    - Owners have full access, employees filtered by branch

  3. Indexes
    - Performance indexes for common queries
    - Unique constraint on code field
*/

-- Create medical_records_clean table
CREATE TABLE IF NOT EXISTS medical_records_clean (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  id_number text NOT NULL,
  phone varchar(15) NOT NULL CHECK (char_length(phone) >= 1 AND char_length(phone) <= 15),
  email text,
  exam_type text NOT NULL,
  origin text NOT NULL,
  treating_doctor text NOT NULL,
  sample_type text NOT NULL,
  number_of_samples integer NOT NULL CHECK (number_of_samples > 0),
  relationship text,
  branch text NOT NULL,
  date timestamptz NOT NULL,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount > 0),
  exchange_rate numeric(10,2),
  payment_status text NOT NULL DEFAULT 'Pendiente',
  remaining numeric(10,2) DEFAULT 0,
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
  comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  code text UNIQUE,
  date_of_birth date CHECK (date_of_birth <= CURRENT_DATE),
  created_by uuid REFERENCES auth.users(id),
  created_by_display_name text,
  material_remitido text,
  informacion_clinica text,
  descripcion_macroscopica text,
  diagnostico text,
  comentario text
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_full_name ON medical_records_clean(full_name);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_id_number ON medical_records_clean(id_number);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_phone ON medical_records_clean(phone);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_branch ON medical_records_clean(branch);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_payment_status ON medical_records_clean(payment_status);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_created_at ON medical_records_clean(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_code ON medical_records_clean(code);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_date_of_birth ON medical_records_clean(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_created_by ON medical_records_clean(created_by);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_material_remitido ON medical_records_clean(material_remitido);
CREATE INDEX IF NOT EXISTS idx_medical_records_clean_diagnostico ON medical_records_clean(diagnostico);

-- Enable Row Level Security
ALTER TABLE medical_records_clean ENABLE ROW LEVEL SECURITY;

-- Create policies for medical records
CREATE POLICY "Owners have full access to medical records"
  ON medical_records_clean
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Filter records by branch for employees"
  ON medical_records_clean
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'employee' AND 
      (assigned_branch IS NULL OR assigned_branch = medical_records_clean.branch)
    )
  );

CREATE POLICY "Employees can insert records for their branch"
  ON medical_records_clean
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'employee' AND 
      (assigned_branch IS NULL OR assigned_branch = medical_records_clean.branch)
    )
  );

CREATE POLICY "Employees can update records for their branch"
  ON medical_records_clean
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'employee' AND 
      (assigned_branch IS NULL OR assigned_branch = medical_records_clean.branch)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'employee' AND 
      (assigned_branch IS NULL OR assigned_branch = medical_records_clean.branch)
    )
  );

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_medical_records_clean_updated_at ON medical_records_clean;
CREATE TRIGGER update_medical_records_clean_updated_at
  BEFORE UPDATE ON medical_records_clean
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();