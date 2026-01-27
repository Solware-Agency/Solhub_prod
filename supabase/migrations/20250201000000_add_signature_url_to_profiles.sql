/*
  # Add signature_url column to profiles table

  1. Changes
    - Add `signature_url` column to `profiles` table (text, nullable)
    - Add constraint to validate URL format if present
    - This column will store the URL of the doctor's signature image (JPG/JPEG)
    - Only for SPT laboratory and medical roles (medico_tratante, patologo, residente)

  2. Security
    - Maintain existing RLS policies
    - URL validation ensures data integrity
*/

-- Add signature_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS signature_url text NULL;

-- Add comment to document the column
COMMENT ON COLUMN profiles.signature_url IS 'URL de la firma digital del médico. Solo para roles médicos en laboratorio SPT. Formato: JPG/JPEG almacenado en Supabase Storage.';

-- Add constraint to validate URL format if signature_url is provided
ALTER TABLE profiles
ADD CONSTRAINT profiles_signature_url_check 
CHECK (
  signature_url IS NULL 
  OR (
    signature_url ~* '^https?://' 
    AND length(signature_url) > 0
  )
);

-- Create index for faster queries (optional, but useful if we need to search by signature_url)
CREATE INDEX IF NOT EXISTS idx_profiles_signature_url 
ON profiles(signature_url) 
WHERE signature_url IS NOT NULL;
