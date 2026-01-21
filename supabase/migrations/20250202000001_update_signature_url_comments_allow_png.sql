/*
  # Update signature URL column comments to reflect PNG support

  1. Changes
    - Update comments on signature_url, signature_url_2, and signature_url_3 columns
    - Reflect that these columns now support JPG/JPEG/PNG formats
    - Maintain backward compatibility
*/

-- Update comment for signature_url column
COMMENT ON COLUMN profiles.signature_url IS 'URL de la firma digital del médico. Solo para roles médicos en laboratorio SPT. Formato: JPG/JPEG/PNG almacenado en Supabase Storage.';

-- Update comment for signature_url_2 column
COMMENT ON COLUMN profiles.signature_url_2 IS 'URL de la segunda firma digital del médico (opcional). Solo para roles médicos en laboratorio SPT. Formato: JPG/JPEG/PNG almacenado en Supabase Storage.';

-- Update comment for signature_url_3 column
COMMENT ON COLUMN profiles.signature_url_3 IS 'URL de la tercera firma digital del médico (opcional). Solo para roles médicos en laboratorio SPT. Formato: JPG/JPEG/PNG almacenado en Supabase Storage.';
