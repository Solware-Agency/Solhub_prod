/*
  # Create RPC function to delete user from auth.users

  1. New Function
    - `delete_user_from_auth` - RPC function with SECURITY DEFINER to delete users from auth.users
    - This function requires admin privileges and should only be called by owners

  2. Security
    - Function has SECURITY DEFINER to access auth.users
    - Validates that the caller is an owner
    - Validates that both users belong to the same laboratory
*/

-- Create function to delete user from auth.users
-- This function requires SECURITY DEFINER to access auth.users table
CREATE OR REPLACE FUNCTION delete_user_from_auth(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_user_id uuid;
  v_current_user_lab_id uuid;
  v_target_user_lab_id uuid;
  v_current_user_role text;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Get current user's laboratory_id and role
  SELECT laboratory_id, role INTO v_current_user_lab_id, v_current_user_role
  FROM profiles
  WHERE id = v_current_user_id;

  IF v_current_user_lab_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no tiene laboratorio asignado'
    );
  END IF;

  -- Only owners can delete users
  IF v_current_user_role != 'owner' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo los propietarios pueden eliminar usuarios'
    );
  END IF;

  -- Get target user's laboratory_id
  SELECT laboratory_id INTO v_target_user_lab_id
  FROM profiles
  WHERE id = p_user_id;

  IF v_target_user_lab_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario a eliminar no encontrado'
    );
  END IF;

  -- Validate that both users belong to the same laboratory
  IF v_target_user_lab_id != v_current_user_lab_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No puedes eliminar usuarios de otro laboratorio'
    );
  END IF;

  -- Prevent self-deletion
  IF p_user_id = v_current_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No puedes eliminar tu propio usuario'
    );
  END IF;

  -- Step 1: Set changed_by to NULL in audit_logs to avoid foreign key constraint violation
  -- This preserves the audit trail while allowing user deletion
  UPDATE audit_logs 
  SET changed_by = NULL 
  WHERE changed_by = p_user_id;

  -- Step 2: Delete user from auth.users
  -- This requires SECURITY DEFINER to work
  DELETE FROM auth.users WHERE id = p_user_id;

  -- Check if deletion was successful
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuario no encontrado en auth.users'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuario eliminado exitosamente de auth.users'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Error al eliminar usuario: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
-- RLS and function logic will ensure only owners can actually delete
GRANT EXECUTE ON FUNCTION delete_user_from_auth(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user_from_auth(uuid) IS 'Elimina un usuario de auth.users. Solo puede ser llamada por owners del mismo laboratorio.';
