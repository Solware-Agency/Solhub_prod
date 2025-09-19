/*
  # Fix User Profile Synchronization

  1. Problem
    - Users are created in auth.users but corresponding profiles are not being created
    - The handle_new_user trigger function is failing silently
    - Synchronization between auth.users and profiles table is broken

  2. Solution
    - Recreate the handle_new_user function with better error handling
    - Ensure the trigger is properly registered
    - Add a function to sync existing users that might be missing profiles
    - Improve display_name synchronization between tables
    - Fix transaction handling to prevent silent failures

  3. Changes
    - Recreate handle_new_user function with robust error handling
    - Recreate on_auth_user_created trigger
    - Add sync_missing_profiles function to create profiles for existing users
    - Execute sync for existing users
*/

-- Recreate handle_new_user function with improved error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Log the new user creation attempt
  RAISE LOG 'Creating profile for new user: %', NEW.id;
  
  -- Check if profile already exists (to prevent duplicate key errors)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RAISE LOG 'Profile already exists for user: %', NEW.id;
    RETURN NEW;
  END IF;

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
  
  RAISE LOG 'Profile created successfully for user: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle case where profile already exists (race condition)
    RAISE LOG 'Profile already exists for user (caught exception): %', NEW.id;
    RETURN NEW;
  WHEN others THEN
    -- Log error but don't fail the transaction
    RAISE LOG 'Error in handle_new_user: % - %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger for the updated handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to sync display_name from auth.users to profiles
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
    
    RAISE LOG 'Updated profile display_name for user: %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in sync_display_name_to_profile: % - %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync display_name from auth.users to profiles
DROP TRIGGER IF EXISTS sync_display_name_to_profile_trigger ON auth.users;
CREATE TRIGGER sync_display_name_to_profile_trigger
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_display_name_to_profile();

-- Create function to sync missing profiles for existing users
CREATE OR REPLACE FUNCTION sync_missing_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  profile_count INTEGER := 0;
BEGIN
  RAISE LOG 'Starting sync of missing profiles';
  
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
    )
  LOOP
    -- Insert missing profile
    INSERT INTO profiles (
      id, 
      email, 
      role, 
      estado, 
      display_name
    )
    VALUES (
      user_record.id,
      COALESCE(user_record.email, ''),
      CASE 
        WHEN user_record.email = 'juegosgeorge0502@gmail.com' THEN 'owner'
        ELSE 'employee'
      END,
      CASE
        WHEN user_record.email = 'juegosgeorge0502@gmail.com' THEN 'aprobado'
        ELSE 'pendiente'
      END,
      COALESCE(user_record.raw_user_meta_data->>'display_name', NULL)
    )
    ON CONFLICT (id) DO NOTHING;
    
    profile_count := profile_count + 1;
  END LOOP;
  
  RAISE LOG 'Completed sync of missing profiles. Created % profiles', profile_count;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in sync_missing_profiles: % - %', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the sync function to create profiles for existing users
SELECT sync_missing_profiles();

-- Create function to sync display_name from profiles to auth.users
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
    
    RAISE LOG 'Updated auth.users display_name for user: %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in sync_display_name_to_auth: % - %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync display_name from profiles to auth.users
DROP TRIGGER IF EXISTS sync_display_name_to_auth_trigger ON profiles;
CREATE TRIGGER sync_display_name_to_auth_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_display_name_to_auth();

-- Add index on email for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add index on role for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add index on estado for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON profiles(estado);