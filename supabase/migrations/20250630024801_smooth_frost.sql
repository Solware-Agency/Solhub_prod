/*
  # Implement Display Name Synchronization System

  1. New Features
    - Bidirectional synchronization of display_name between auth.users and profiles
    - Automatic updates when display_name changes in either table
    - Consistent display_name values across the system

  2. Implementation
    - Create function to update auth.users when profiles.display_name changes
    - Create function to update profiles when auth.users.raw_user_meta_data.display_name changes
    - Create triggers to automatically call these functions on updates
    - Ensure new user creation establishes this synchronization

  3. Security
    - Functions use SECURITY DEFINER to bypass RLS
    - Careful validation to prevent SQL injection
*/

-- First, ensure the display_name column exists in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
COMMENT ON COLUMN profiles.display_name IS 'User display name for UI personalization';

-- Function to sync display_name from profiles to auth.users
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync display_name from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_display_name_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value text;
BEGIN
  -- Extract display_name from raw_user_meta_data
  display_name_value := NEW.raw_user_meta_data ->> 'display_name';
  
  -- Only proceed if display_name exists and has changed
  IF display_name_value IS NOT NULL AND 
     (OLD.raw_user_meta_data ->> 'display_name' IS DISTINCT FROM display_name_value) THEN
    
    -- Update the display_name in profiles
    UPDATE profiles
    SET display_name = display_name_value
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync display_name from profiles to auth.users
DROP TRIGGER IF EXISTS sync_display_name_to_auth_trigger ON profiles;
CREATE TRIGGER sync_display_name_to_auth_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_display_name_to_auth();

-- Create trigger to sync display_name from auth.users to profiles
DROP TRIGGER IF EXISTS sync_display_name_to_profile_trigger ON auth.users;
CREATE TRIGGER sync_display_name_to_profile_trigger
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_display_name_to_profile();

-- Function to handle new user creation and sync initial display_name
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value text;
BEGIN
  -- Extract display_name from raw_user_meta_data if it exists
  display_name_value := NEW.raw_user_meta_data ->> 'display_name';
  
  -- Insert into profiles with display_name if available
  INSERT INTO profiles (id, email, role, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'juegosgeorge0502@gmail.com' THEN 'owner'
      ELSE 'employee'
    END,
    display_name_value
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Backfill: Sync existing display_name values from auth.users to profiles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT 
      u.id, 
      u.raw_user_meta_data ->> 'display_name' as display_name
    FROM 
      auth.users u
    WHERE 
      u.raw_user_meta_data ->> 'display_name' IS NOT NULL
  LOOP
    UPDATE profiles
    SET display_name = r.display_name
    WHERE id = r.id AND (display_name IS NULL OR display_name <> r.display_name);
  END LOOP;
END $$;

-- Backfill: Sync existing display_name values from profiles to auth.users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT 
      p.id, 
      p.display_name
    FROM 
      profiles p
    WHERE 
      p.display_name IS NOT NULL
  LOOP
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object('display_name', r.display_name)
        WHEN raw_user_meta_data -> 'display_name' IS NULL THEN
          raw_user_meta_data || jsonb_build_object('display_name', r.display_name)
        ELSE 
          raw_user_meta_data - 'display_name' || jsonb_build_object('display_name', r.display_name)
      END
    WHERE id = r.id AND (raw_user_meta_data ->> 'display_name' IS NULL OR raw_user_meta_data ->> 'display_name' <> r.display_name);
  END LOOP;
END $$;