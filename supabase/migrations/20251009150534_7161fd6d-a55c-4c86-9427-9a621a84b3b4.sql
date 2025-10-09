-- Create admin function to create users
CREATE OR REPLACE FUNCTION public.admin_create_user(
  target_user_email text,
  target_user_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Validate email format
  IF target_user_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email format'
    );
  END IF;
  
  -- Validate password length
  IF LENGTH(target_user_password) < 6 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Password must be at least 6 characters'
    );
  END IF;
  
  -- Check if user already exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = target_user_email
  ) INTO v_user_exists;
  
  IF v_user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User with this email already exists'
    );
  END IF;
  
  -- Note: We can't directly create auth.users from SQL due to security restrictions
  -- This function validates and returns success - actual user creation should be done via edge function
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Validation passed',
    'email', target_user_email
  );
END;
$$;