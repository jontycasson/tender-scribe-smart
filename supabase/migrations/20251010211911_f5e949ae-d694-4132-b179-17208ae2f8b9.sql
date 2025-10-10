-- Add plan and seat tracking to company_profiles
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS plan_name text DEFAULT 'Solo',
ADD COLUMN IF NOT EXISTS seat_limit integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS plan_start_date timestamp with time zone DEFAULT now();

-- Create an enum for plan names
DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('Solo', 'Starter', 'Pro', 'Enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update existing company_profiles to have default Solo plan
UPDATE public.company_profiles
SET plan_name = 'Solo', seat_limit = 1
WHERE plan_name IS NULL;

-- Create function to get seat usage for a company
CREATE OR REPLACE FUNCTION public.get_company_seat_usage(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name text;
  v_seat_limit integer;
  v_seats_used integer;
  v_owner_id uuid;
BEGIN
  -- Get plan info and owner
  SELECT plan_name, seat_limit, user_id
  INTO v_plan_name, v_seat_limit, v_owner_id
  FROM company_profiles
  WHERE id = p_company_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Company not found',
      'seats_used', 0,
      'seat_limit', 0,
      'seats_available', 0
    );
  END IF;
  
  -- Count seats used (owner + members)
  SELECT 1 + COUNT(*) INTO v_seats_used
  FROM company_members
  WHERE company_profile_id = p_company_id;
  
  RETURN jsonb_build_object(
    'plan_name', v_plan_name,
    'seat_limit', v_seat_limit,
    'seats_used', v_seats_used,
    'seats_available', GREATEST(0, v_seat_limit - v_seats_used),
    'is_at_limit', v_seats_used >= v_seat_limit
  );
END;
$$;

-- Update add_team_member function to enforce seat limits
CREATE OR REPLACE FUNCTION public.add_team_member(member_email text, member_role text DEFAULT 'member'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_id UUID;
  target_user_id UUID;
  seat_usage jsonb;
BEGIN
  company_id := public.get_user_company_profile_id();

  IF company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not part of a company');
  END IF;

  -- Check if user is owner or admin
  IF NOT public.is_company_admin(company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only company owners and admins can add team members');
  END IF;

  -- Check seat limit BEFORE adding
  seat_usage := public.get_company_seat_usage(company_id);
  
  IF (seat_usage->>'is_at_limit')::boolean THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Seat limit reached. Your %s plan allows %s seats. Please upgrade your plan to add more team members.',
        seat_usage->>'plan_name',
        seat_usage->>'seat_limit'
      ),
      'seat_usage', seat_usage
    );
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

  -- Add member
  INSERT INTO public.company_members (user_id, company_profile_id, role)
  VALUES (target_user_id, company_id, member_role);

  -- Get updated seat usage
  seat_usage := public.get_company_seat_usage(company_id);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'email', member_email,
    'role', member_role,
    'seat_usage', seat_usage
  );
END;
$$;

-- Create function to update company plan
CREATE OR REPLACE FUNCTION public.update_company_plan(
  p_plan_name text,
  p_seat_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_current_seats integer;
BEGIN
  -- Get user's company
  v_company_id := public.get_user_company_profile_id();
  
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not part of a company');
  END IF;
  
  -- Check if user is owner
  IF NOT public.is_company_owner(v_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only company owners can update the plan');
  END IF;
  
  -- Check current seat usage
  SELECT 1 + COUNT(*) INTO v_current_seats
  FROM company_members
  WHERE company_profile_id = v_company_id;
  
  -- Don't allow downgrade if it would exceed seat limit
  IF v_current_seats > p_seat_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot downgrade. You currently have %s seats in use but %s plan only allows %s seats. Please remove team members first.',
        v_current_seats,
        p_plan_name,
        p_seat_limit
      ),
      'current_seats', v_current_seats,
      'new_limit', p_seat_limit
    );
  END IF;
  
  -- Update plan
  UPDATE company_profiles
  SET 
    plan_name = p_plan_name,
    seat_limit = p_seat_limit,
    plan_start_date = now(),
    updated_at = now()
  WHERE id = v_company_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'plan_name', p_plan_name,
    'seat_limit', p_seat_limit,
    'seat_usage', public.get_company_seat_usage(v_company_id)
  );
END;
$$;