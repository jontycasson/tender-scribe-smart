-- Fix security vulnerabilities in demo_uses table

-- 1. Drop duplicate RLS policies to avoid conflicts
DROP POLICY IF EXISTS "Allow validated public demo submissions with rate limiting" ON public.demo_uses;
DROP POLICY IF EXISTS "Only authenticated admins can read demo submissions" ON public.demo_uses;

-- 2. Keep the more explicit and secure policies
-- (demo_uses_validated_insert_policy, demo_uses_admin_only_select_policy, 
--  demo_uses_no_update_policy, demo_uses_no_delete_policy already exist)

-- 3. Fix the get_demo_usage_stats function to require admin privileges
CREATE OR REPLACE FUNCTION public.get_demo_usage_stats()
 RETURNS TABLE(total_submissions bigint, unique_companies bigint, submissions_last_24h bigint, submissions_last_week bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    -- Only allow admin users to access demo usage statistics
    SELECT 
        CASE WHEN public.is_admin() THEN COUNT(*) ELSE 0 END as total_submissions,
        CASE WHEN public.is_admin() THEN COUNT(DISTINCT company_name) ELSE 0 END as unique_companies,
        CASE WHEN public.is_admin() THEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') ELSE 0 END as submissions_last_24h,
        CASE WHEN public.is_admin() THEN COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') ELSE 0 END as submissions_last_week
    FROM public.demo_uses
    WHERE public.is_admin() = true; -- Fail fast if not admin
$function$;

-- 4. Add additional security logging function for demo uses access
CREATE OR REPLACE FUNCTION public.log_demo_access_attempt()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log any access attempts to demo_uses data
  RAISE LOG 'Demo data access attempt by user: %, admin status: %, timestamp: %', 
    COALESCE(auth.uid()::text, 'anonymous'), 
    public.is_admin(),
    NOW();
END;
$function$;

-- 5. Create a view for safe demo statistics that includes logging
CREATE OR REPLACE VIEW public.demo_stats_secure AS
SELECT 
  CASE 
    WHEN public.is_admin() THEN 
      (SELECT COUNT(*) FROM public.demo_uses)::bigint
    ELSE 0::bigint 
  END as total_submissions,
  CASE 
    WHEN public.is_admin() THEN 
      (SELECT COUNT(DISTINCT company_name) FROM public.demo_uses)::bigint
    ELSE 0::bigint 
  END as unique_companies,
  CASE 
    WHEN public.is_admin() THEN 
      (SELECT COUNT(*) FROM public.demo_uses WHERE created_at >= NOW() - INTERVAL '24 hours')::bigint
    ELSE 0::bigint 
  END as submissions_last_24h,
  CASE 
    WHEN public.is_admin() THEN 
      (SELECT COUNT(*) FROM public.demo_uses WHERE created_at >= NOW() - INTERVAL '7 days')::bigint
    ELSE 0::bigint 
  END as submissions_last_week;