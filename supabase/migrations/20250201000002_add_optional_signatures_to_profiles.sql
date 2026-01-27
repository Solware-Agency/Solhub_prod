/*
  # Add optional signature_url_2 and signature_url_3 columns to profiles table

  1. Changes
    - Add `signature_url_2` column to `profiles` table (text, nullable)
    - Add `signature_url_3` column to `profiles` table (text, nullable)
    - Add constraints to validate URL format if present
    - These columns will store URLs of additional optional signature images (JPG/JPEG)
    - Only for SPT laboratory and medical roles (medico_tratante, patologo, residente)

  2. Security
    - Maintain existing RLS policies
    - URL validation ensures data integrity
*/

-- Add signature_url_2 column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS signature_url_2 text NULL;

-- Add comment to document the column
COMMENT ON COLUMN profiles.signature_url_2 IS 'URL de la segunda firma digital del médico (opcional). Solo para roles médicos en laboratorio SPT. Formato: JPG/JPEG almacenado en Supabase Storage.';

-- Add constraint to validate URL format if signature_url_2 is provided
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_signature_url_2_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_signature_url_2_check 
CHECK (
  signature_url_2 IS NULL 
  OR (
    signature_url_2 ~* '^https?://' 
    AND length(signature_url_2) > 0
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_signature_url_2 
ON profiles(signature_url_2) 
WHERE signature_url_2 IS NOT NULL;

-- Add signature_url_3 column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS signature_url_3 text NULL;

-- Add comment to document the column
COMMENT ON COLUMN profiles.signature_url_3 IS 'URL de la tercera firma digital del médico (opcional). Solo para roles médicos en laboratorio SPT. Formato: JPG/JPEG almacenado en Supabase Storage.';

-- Add constraint to validate URL format if signature_url_3 is provided
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_signature_url_3_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_signature_url_3_check 
CHECK (
  signature_url_3 IS NULL 
  OR (
    signature_url_3 ~* '^https?://' 
    AND length(signature_url_3) > 0
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_signature_url_3 
ON profiles(signature_url_3) 
WHERE signature_url_3 IS NOT NULL;
