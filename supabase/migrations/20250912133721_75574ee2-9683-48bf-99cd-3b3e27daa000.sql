-- Assign admin role to the specific user
INSERT INTO public.user_roles (user_id, role)
VALUES ('649b9d79-b9cf-4394-970c-2fef89d515ab', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Test the function works by creating a simpler version for debugging
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin_test()
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
    -- For debugging, let's bypass the admin check temporarily
    -- and log what auth.uid() returns
    RAISE LOG 'Current auth.uid(): %', auth.uid();
    RAISE LOG 'is_admin() result: %', public.is_admin();
    
    -- Only allow admins to call this function
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Insufficient privileges to view all users. Current user: %, is_admin: %', auth.uid(), public.is_admin();
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