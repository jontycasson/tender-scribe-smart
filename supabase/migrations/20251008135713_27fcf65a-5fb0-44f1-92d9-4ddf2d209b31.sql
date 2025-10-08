-- Create admin functions for user and company management

-- Function to assign a user to a company
CREATE OR REPLACE FUNCTION public.assign_user_to_company(
  user_email text,
  company_id uuid,
  member_role text DEFAULT 'member'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  result jsonb;
BEGIN
  -- Only allow admins
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if company exists
  IF NOT EXISTS (SELECT 1 FROM public.company_profiles WHERE id = company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Company not found');
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.company_members 
    WHERE user_id = target_user_id AND company_profile_id = company_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this company');
  END IF;
  
  -- Insert company member
  INSERT INTO public.company_members (user_id, company_profile_id, role)
  VALUES (target_user_id, company_id, member_role);
  
  RETURN jsonb_build_object('success', true, 'user_id', target_user_id);
END;
$$;

-- Function to remove a user from a company
CREATE OR REPLACE FUNCTION public.remove_user_from_company(
  target_user_id uuid,
  company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admins
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Check if member exists
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members 
    WHERE user_id = target_user_id AND company_profile_id = company_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this company');
  END IF;
  
  -- Delete company member
  DELETE FROM public.company_members
  WHERE user_id = target_user_id AND company_profile_id = company_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to get all members of a company
CREATE OR REPLACE FUNCTION public.get_company_members(company_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  role text,
  joined_at timestamp with time zone,
  last_sign_in timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admins
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    cm.user_id,
    COALESCE(au.email, '')::text as email,
    cm.role::text,
    cm.created_at as joined_at,
    au.last_sign_in_at as last_sign_in
  FROM public.company_members cm
  JOIN auth.users au ON au.id = cm.user_id
  WHERE cm.company_profile_id = company_id
  ORDER BY cm.created_at DESC;
END;
$$;

-- Function to get tenders for a user's company (admin view)
CREATE OR REPLACE FUNCTION public.get_user_tenders_for_admin(
  target_user_id uuid,
  target_company_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  status text,
  created_at timestamp with time zone,
  total_questions integer,
  processed_questions integer,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id uuid;
BEGIN
  -- Only allow admins
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- If company_id not provided, get user's company
  IF target_company_id IS NULL THEN
    SELECT cp.id INTO user_company_id
    FROM public.company_profiles cp
    WHERE cp.user_id = target_user_id
    LIMIT 1;
    
    -- If no owned company, check company_members
    IF user_company_id IS NULL THEN
      SELECT cm.company_profile_id INTO user_company_id
      FROM public.company_members cm
      WHERE cm.user_id = target_user_id
      LIMIT 1;
    END IF;
  ELSE
    user_company_id := target_company_id;
  END IF;
  
  -- Return tenders for the company
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.status,
    t.created_at,
    t.total_questions,
    t.processed_questions,
    cp.company_name
  FROM public.tenders t
  JOIN public.company_profiles cp ON cp.id = t.company_profile_id
  WHERE t.company_profile_id = user_company_id
  ORDER BY t.created_at DESC;
END;
$$;