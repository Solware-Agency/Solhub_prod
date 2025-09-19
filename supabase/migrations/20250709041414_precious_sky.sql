/*
  # Create user_settings table for session timeout preferences

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key, references auth.users)
      - `session_timeout` (integer, default 15 minutes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_settings` table
    - Add policies for users to read and update their own settings
    - Add policy for users to insert their own settings
*/

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_timeout integer NOT NULL DEFAULT 15,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS with checks to avoid "already exists" errors
DO $$ 
BEGIN
  -- Policy: Only user can read their settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_settings' AND policyname = 'Only user can read their settings'
  ) THEN
    CREATE POLICY "Only user can read their settings"
      ON user_settings
      FOR SELECT
      TO public
      USING (auth.uid() = id);
  END IF;

  -- Policy: Only user can update their settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_settings' AND policyname = 'Only user can update their settings'
  ) THEN
    CREATE POLICY "Only user can update their settings"
      ON user_settings
      FOR UPDATE
      TO public
      USING (auth.uid() = id);
  END IF;

  -- Policy: User can insert their own settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_settings' AND policyname = 'User can insert their own settings'
  ) THEN
    CREATE POLICY "User can insert their own settings"
      ON user_settings
      FOR INSERT
      TO public
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;