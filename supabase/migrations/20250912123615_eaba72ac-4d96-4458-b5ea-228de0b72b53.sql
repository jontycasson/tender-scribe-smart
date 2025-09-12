-- Drop the problematic admin_users view that exposes auth.users
DROP VIEW IF EXISTS public.admin_users;

-- Create a safer function to get admin user info without exposing auth.users directly
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(user_id uuid, role public.app_role, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Insufficient privileges to view admin users';
  END IF;
  
  RETURN QUERY
  SELECT ur.user_id, ur.role, ur.created_at
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ORDER BY ur.created_at DESC;
END;
$$;