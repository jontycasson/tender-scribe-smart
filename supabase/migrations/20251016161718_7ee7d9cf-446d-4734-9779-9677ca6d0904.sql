-- Fix get_demo_usage_stats to be VOLATILE and harden error handling
CREATE OR REPLACE FUNCTION public.get_demo_usage_stats()
RETURNS TABLE(
  total_submissions bigint,
  unique_companies bigint,
  submissions_last_24h bigint,
  submissions_last_week bigint
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  record_count bigint;
BEGIN
  -- Enforce admin-only access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required to view demo usage statistics.';
  END IF;

  -- Attempt to log access, but never fail stats if logging fails
  BEGIN
    SELECT COUNT(*) INTO record_count FROM public.demo_uses;

    INSERT INTO public.demo_access_logs (admin_user_id, access_type, records_accessed, ip_address)
    VALUES (
      auth.uid(),
      'stats_query',
      record_count,
      current_setting('request.headers', true)::json->>'x-real-ip'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to log demo access: %', SQLERRM;
  END;

  -- Return the stats
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_submissions,
    COUNT(DISTINCT company_name)::bigint as unique_companies,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::bigint as submissions_last_24h,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::bigint as submissions_last_week
  FROM public.demo_uses;
END;
$function$;