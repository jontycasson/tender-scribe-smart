-- Create admin function to reset user password
CREATE OR REPLACE FUNCTION admin_reset_user_password(target_user_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT is_admin() INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Check if target user exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = target_user_email
  ) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Return success - actual password reset will be done via Supabase Auth API
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password reset validated'
  );
END;
$$;

-- Create admin function to delete user
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_user_id UUID;
BEGIN
  -- Check if current user is admin
  SELECT is_admin() INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = target_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Delete user's company profile if exists
  DELETE FROM company_profiles WHERE user_id = v_user_id;
  
  -- Delete user's tenders
  DELETE FROM tenders WHERE user_id = v_user_id;
  
  -- Delete user's role assignments
  DELETE FROM user_roles WHERE user_id = v_user_id;
  
  -- Delete user from auth.users (cascades to other tables)
  DELETE FROM auth.users WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User successfully deleted'
  );
END;
$$;