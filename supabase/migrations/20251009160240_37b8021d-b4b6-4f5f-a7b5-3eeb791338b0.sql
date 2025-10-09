-- Create admin function to create company profiles for any user
CREATE OR REPLACE FUNCTION public.admin_create_company(
  target_user_id uuid,
  p_company_name text,
  p_industry text,
  p_team_size text,
  p_mission text DEFAULT '',
  p_past_projects text DEFAULT '',
  p_specializations text DEFAULT '',
  p_values text DEFAULT '',
  p_years_in_business text DEFAULT '',
  p_services_offered text[] DEFAULT ARRAY[]::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  -- Only allow admins
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Check if user already has a company profile
  IF EXISTS (SELECT 1 FROM public.company_profiles WHERE user_id = target_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already has a company profile'
    );
  END IF;
  
  -- Create company profile
  INSERT INTO public.company_profiles (
    user_id,
    company_name,
    industry,
    team_size,
    mission,
    past_projects,
    specializations,
    values,
    years_in_business,
    services_offered
  ) VALUES (
    target_user_id,
    p_company_name,
    p_industry,
    p_team_size,
    p_mission,
    p_past_projects,
    p_specializations,
    p_values,
    p_years_in_business,
    p_services_offered
  )
  RETURNING id INTO new_company_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'company_id', new_company_id
  );
END;
$$;