-- Fix the security definer view issue
DROP VIEW IF EXISTS public.demo_stats_secure;

-- The get_demo_usage_stats function is already properly secured with admin checks
-- No need for an additional view that could introduce security definer issues

-- Add better error handling to the get_demo_usage_stats function
CREATE OR REPLACE FUNCTION public.get_demo_usage_stats()
 RETURNS TABLE(total_submissions bigint, unique_companies bigint, submissions_last_24h bigint, submissions_last_week bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only allow admin users to access demo usage statistics
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required to view demo usage statistics.';
    END IF;
    
    -- Log the access attempt
    RAISE LOG 'Demo usage stats accessed by admin user: %', auth.uid();
    
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_submissions,
        COUNT(DISTINCT company_name)::bigint as unique_companies,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::bigint as submissions_last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::bigint as submissions_last_week
    FROM public.demo_uses;
END;
$function$;