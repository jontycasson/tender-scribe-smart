-- Function to trigger password reset email for a user
  CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    target_user_email text
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
  DECLARE
    target_user_id uuid;
  BEGIN
    -- Only allow admins
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Get user ID from email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_user_email;

    IF target_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Note: Actual email sending must be done via Supabase Auth API from frontend
    -- This function validates admin access and user existence
    RETURN jsonb_build_object(
      'success', true,
      'user_id', target_user_id,
      'email', target_user_email
    );
  END;
  $$;

  -- Function to delete a user (soft delete - updates metadata)
  CREATE OR REPLACE FUNCTION public.admin_delete_user(
    target_user_email text
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
  DECLARE
    target_user_id uuid;
  BEGIN
    -- Only allow admins
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Get user ID from email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_user_email;

    IF target_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Delete user's company profile if they own one
    DELETE FROM public.company_profiles WHERE user_id = target_user_id;

    -- Remove from company memberships
    DELETE FROM public.company_members WHERE user_id = target_user_id;

    -- Note: Actual user deletion from auth.users must be done via Supabase Admin API
    RETURN jsonb_build_object(
      'success', true,
      'user_id', target_user_id,
      'message', 'User data cleaned up. Complete deletion requires Supabase Admin API call.'
    );
  END;
  $$;
