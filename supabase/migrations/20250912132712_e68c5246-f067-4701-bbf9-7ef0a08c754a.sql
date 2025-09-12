-- Create admin function to get all users with their company profile status
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE(
    user_id uuid,
    email text,
    email_confirmed_at timestamp with time zone,
    created_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    has_company_profile boolean,
    company_profile_id uuid,
    company_name text,
    industry text,
    team_size text,
    company_created_at timestamp with time zone,
    company_updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Only allow admins to call this function
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Insufficient privileges to view all users';
    END IF;

    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email,
        au.email_confirmed_at,
        au.created_at,
        au.last_sign_in_at,
        (cp.id IS NOT NULL) as has_company_profile,
        cp.id as company_profile_id,
        cp.company_name,
        cp.industry,
        cp.team_size,
        cp.created_at as company_created_at,
        cp.updated_at as company_updated_at
    FROM auth.users au
    LEFT JOIN public.company_profiles cp ON au.id = cp.user_id
    ORDER BY au.created_at DESC;
END;
$$;