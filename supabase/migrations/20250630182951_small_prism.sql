/*
  # Fix profiles table creation and user signup flow

  1. Schema Changes
    - Ensure profiles table exists with correct structure
    - Add proper constraints and indexes
    - Fix user creation trigger function

  2. Security
    - Set up proper RLS policies
    - Ensure proper access control

  3. User Management
    - Fix user signup flow
    - Ensure proper profile creation on signup
*/

-- First check if profiles table exists, if not create it
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  assigned_branch text,
  display_name text,
  estado text NOT NULL DEFAULT 'pendiente'
);

-- Add constraints with proper error handling
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role = ANY (ARRAY['owner'::text, 'employee'::text]));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_estado_check' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_estado_check 
      CHECK (estado = ANY (ARRAY['pendiente'::text, 'aprobado'::text]));
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "All users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Owners can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "All users can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup with improved error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles with proper NULL handling and explicit type casting
  INSERT INTO profiles (
    id, 
    email, 
    role, 
    estado, 
    display_name
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    CASE 
      WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'owner'
      ELSE 'employee'
    END,
    CASE
      WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'aprobado'
      ELSE 'pendiente'
    END,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL)
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for the updated handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_branch ON profiles(assigned_branch);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON profiles(estado);

-- Create function to sync display_name between auth.users and profiles
CREATE OR REPLACE FUNCTION sync_display_name_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if display_name has changed
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    -- Update the display_name in auth.users.raw_user_meta_data
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE 
        -- If raw_user_meta_data is null, create a new JSON object
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object('display_name', NEW.display_name)
        -- If raw_user_meta_data exists but doesn't have display_name, add it
        WHEN raw_user_meta_data -> 'display_name' IS NULL THEN
          raw_user_meta_data || jsonb_build_object('display_name', NEW.display_name)
        -- Otherwise update the existing display_name
        ELSE 
          raw_user_meta_data - 'display_name' || jsonb_build_object('display_name', NEW.display_name)
      END
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in sync_display_name_to_auth: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync display_name from profiles to auth.users
DROP TRIGGER IF EXISTS sync_display_name_to_auth_trigger ON profiles;
CREATE TRIGGER sync_display_name_to_auth_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_display_name_to_auth();

-- Create function to check if user is approved before login
CREATE OR REPLACE FUNCTION check_user_approved()
RETURNS trigger AS $$
DECLARE
  is_approved boolean;
  user_exists boolean;
BEGIN
  -- Skip for new signups (they'll be pendiente by default)
  IF NEW.created_at = NEW.confirmed_at THEN
    RETURN NEW;
  END IF;

  -- Check if user profile exists
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = NEW.id
  ) INTO user_exists;
  
  -- If user profile doesn't exist, allow login (edge case)
  IF NOT user_exists THEN
    RETURN NEW;
  END IF;

  -- Check if user is approved
  SELECT (estado = 'aprobado') INTO is_approved
  FROM public.profiles
  WHERE id = NEW.id;

  -- If not approved, block the login
  IF NOT is_approved THEN
    RAISE EXCEPTION 'User account is pending approval';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in check_user_approved: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check approval status on login
DROP TRIGGER IF EXISTS check_user_approved_trigger ON auth.users;
CREATE TRIGGER check_user_approved_trigger
BEFORE UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
EXECUTE FUNCTION check_user_approved();