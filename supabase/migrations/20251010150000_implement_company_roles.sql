-- Implement Company Role-Based Access Control (RBAC)
-- Roles: owner (created company), admin (can manage users/settings), member (regular user)

-- Helper function: Check if user is company owner
CREATE OR REPLACE FUNCTION public.is_company_owner(company_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_company_id UUID;
  result BOOLEAN;
BEGIN
  -- If company_id not provided, use user's company
  IF company_id IS NULL THEN
    target_company_id := public.get_user_company_profile_id();
  ELSE
    target_company_id := company_id;
  END IF;

  -- Check if user owns the company profile
  SELECT EXISTS(
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.id = target_company_id
    AND cp.user_id = auth.uid()
  ) INTO result;

  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user is company admin or owner
CREATE OR REPLACE FUNCTION public.is_company_admin(company_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_company_id UUID;
  user_role TEXT;
BEGIN
  -- If company_id not provided, use user's company
  IF company_id IS NULL THEN
    target_company_id := public.get_user_company_profile_id();
  ELSE
    target_company_id := company_id;
  END IF;

  -- Check if user is owner (has company profile)
  IF public.is_company_owner(target_company_id) THEN
    RETURN true;
  END IF;

  -- Check if user is admin in company_members
  SELECT cm.role INTO user_role
  FROM public.company_members cm
  WHERE cm.company_profile_id = target_company_id
  AND cm.user_id = auth.uid();

  RETURN user_role IN ('admin', 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Get user's role in their company
CREATE OR REPLACE FUNCTION public.get_user_company_role()
RETURNS TEXT AS $$
DECLARE
  company_id UUID;
  user_role TEXT;
BEGIN
  company_id := public.get_user_company_profile_id();

  IF company_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if owner
  IF public.is_company_owner(company_id) THEN
    RETURN 'owner';
  END IF;

  -- Check company_members table
  SELECT cm.role INTO user_role
  FROM public.company_members cm
  WHERE cm.company_profile_id = company_id
  AND cm.user_id = auth.uid();

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function: Add team member (owner/admin only)
CREATE OR REPLACE FUNCTION public.add_team_member(
  member_email TEXT,
  member_role TEXT DEFAULT 'member'
)
RETURNS JSONB AS $$
DECLARE
  company_id UUID;
  target_user_id UUID;
  result JSONB;
BEGIN
  -- Get user's company
  company_id := public.get_user_company_profile_id();

  IF company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not part of a company');
  END IF;

  -- Check if user is owner or admin
  IF NOT public.is_company_admin(company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only company owners and admins can add team members');
  END IF;

  -- Validate role
  IF member_role NOT IN ('admin', 'member') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Must be admin or member');
  END IF;

  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = member_email;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found. They must create an account first');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.user_id = target_user_id
    AND cm.company_profile_id = company_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a team member');
  END IF;

  -- Check if user owns another company
  IF EXISTS (
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.user_id = target_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already owns a company profile');
  END IF;

  -- TODO: Check plan limits here
  -- For now, allow unlimited users

  -- Add member
  INSERT INTO public.company_members (user_id, company_profile_id, role)
  VALUES (target_user_id, company_id, member_role);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', member_email,
    'role', member_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Remove team member (owner/admin only)
CREATE OR REPLACE FUNCTION public.remove_team_member(
  member_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  company_id UUID;
  member_role TEXT;
BEGIN
  company_id := public.get_user_company_profile_id();

  IF company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not part of a company');
  END IF;

  -- Check if user is owner or admin
  IF NOT public.is_company_admin(company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only company owners and admins can remove team members');
  END IF;

  -- Get member's role
  SELECT cm.role INTO member_role
  FROM public.company_members cm
  WHERE cm.user_id = member_user_id
  AND cm.company_profile_id = company_id;

  IF member_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a team member');
  END IF;

  -- Don't allow removing yourself
  IF member_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot remove yourself');
  END IF;

  -- Delete member
  DELETE FROM public.company_members
  WHERE user_id = member_user_id
  AND company_profile_id = company_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update team member role (owner/admin only)
CREATE OR REPLACE FUNCTION public.update_team_member_role(
  member_user_id UUID,
  new_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  company_id UUID;
  current_role TEXT;
BEGIN
  company_id := public.get_user_company_profile_id();

  IF company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not part of a company');
  END IF;

  -- Check if user is owner or admin
  IF NOT public.is_company_admin(company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only company owners and admins can update roles');
  END IF;

  -- Validate new role
  IF new_role NOT IN ('admin', 'member') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role. Must be admin or member');
  END IF;

  -- Get current role
  SELECT cm.role INTO current_role
  FROM public.company_members cm
  WHERE cm.user_id = member_user_id
  AND cm.company_profile_id = company_id;

  IF current_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a team member');
  END IF;

  -- Update role
  UPDATE public.company_members
  SET role = new_role
  WHERE user_id = member_user_id
  AND company_profile_id = company_id;

  RETURN jsonb_build_object('success', true, 'new_role', new_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get team members (all users can see)
CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ,
  last_sign_in TIMESTAMPTZ
) AS $$
DECLARE
  company_id UUID;
  owner_id UUID;
  owner_email TEXT;
BEGIN
  company_id := public.get_user_company_profile_id();

  IF company_id IS NULL THEN
    RETURN;
  END IF;

  -- Get company owner info
  SELECT cp.user_id, au.email INTO owner_id, owner_email
  FROM public.company_profiles cp
  JOIN auth.users au ON au.id = cp.user_id
  WHERE cp.id = company_id;

  -- Return owner first
  RETURN QUERY
  SELECT
    owner_id,
    owner_email,
    'owner'::TEXT,
    (SELECT created_at FROM public.company_profiles WHERE id = company_id),
    (SELECT last_sign_in_at FROM auth.users WHERE id = owner_id);

  -- Return members
  RETURN QUERY
  SELECT
    cm.user_id,
    au.email::TEXT,
    cm.role::TEXT,
    cm.created_at,
    au.last_sign_in_at
  FROM public.company_members cm
  JOIN auth.users au ON au.id = cm.user_id
  WHERE cm.company_profile_id = company_id
  ORDER BY cm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update RLS policy for company_profiles (only owner/admin can update)
DROP POLICY IF EXISTS "Users can update their company profile" ON public.company_profiles;

CREATE POLICY "Company owners and admins can update profile"
ON public.company_profiles
FOR UPDATE
USING (
  user_id = auth.uid() OR
  public.is_company_admin(id)
);

-- Add comments for documentation
COMMENT ON FUNCTION public.is_company_owner IS 'Returns true if current user owns the company profile';
COMMENT ON FUNCTION public.is_company_admin IS 'Returns true if current user is owner or admin of the company';
COMMENT ON FUNCTION public.get_user_company_role IS 'Returns current user role in their company (owner, admin, member, or NULL)';
COMMENT ON FUNCTION public.add_team_member IS 'Add a new team member to the company (owner/admin only)';
COMMENT ON FUNCTION public.remove_team_member IS 'Remove a team member from the company (owner/admin only)';
COMMENT ON FUNCTION public.update_team_member_role IS 'Update a team member role (owner/admin only)';
COMMENT ON FUNCTION public.get_team_members IS 'Get all team members for current user company';

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Company RBAC system implemented successfully';
  RAISE NOTICE 'Roles: owner (company creator), admin (can manage team), member (regular user)';
  RAISE NOTICE 'Functions available: is_company_owner(), is_company_admin(), get_user_company_role()';
  RAISE NOTICE 'Team management: add_team_member(), remove_team_member(), update_team_member_role(), get_team_members()';
END $$;
