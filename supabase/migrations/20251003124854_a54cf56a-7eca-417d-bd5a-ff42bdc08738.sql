-- Create admin dashboard stats function
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  total_users bigint,
  total_companies bigint,
  total_tenders bigint,
  active_companies_30d bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admin users
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM auth.users)::bigint as total_users,
    (SELECT COUNT(*) FROM public.company_profiles)::bigint as total_companies,
    (SELECT COUNT(*) FROM public.tenders)::bigint as total_tenders,
    (SELECT COUNT(*) FROM public.company_profiles 
     WHERE updated_at >= NOW() - INTERVAL '30 days')::bigint as active_companies_30d;
END;
$$;

-- Create admin tender stats function
CREATE OR REPLACE FUNCTION public.get_admin_tender_stats(days_back integer DEFAULT 30)
RETURNS TABLE(
  date text,
  tender_count bigint,
  response_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    TO_CHAR(d.day, 'Mon DD') as date,
    COUNT(DISTINCT t.id)::bigint as tender_count,
    COUNT(DISTINCT tr.id)::bigint as response_count
  FROM generate_series(
    NOW() - (days_back || ' days')::interval,
    NOW(),
    '1 day'::interval
  ) d(day)
  LEFT JOIN public.tenders t ON DATE_TRUNC('day', t.created_at) = DATE_TRUNC('day', d.day)
  LEFT JOIN public.tender_responses tr ON DATE_TRUNC('day', tr.created_at) = DATE_TRUNC('day', d.day)
  GROUP BY d.day
  ORDER BY d.day DESC;
END;
$$;

-- Create admin top companies function
CREATE OR REPLACE FUNCTION public.get_admin_top_companies(limit_count integer DEFAULT 5)
RETURNS TABLE(
  company_name text,
  tender_count bigint,
  response_count bigint,
  last_active timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    cp.company_name,
    COUNT(DISTINCT t.id)::bigint as tender_count,
    COUNT(DISTINCT tr.id)::bigint as response_count,
    GREATEST(cp.updated_at, MAX(t.created_at), MAX(tr.created_at)) as last_active
  FROM public.company_profiles cp
  LEFT JOIN public.tenders t ON t.company_profile_id = cp.id
  LEFT JOIN public.tender_responses tr ON tr.company_profile_id = cp.id
  GROUP BY cp.id, cp.company_name, cp.updated_at
  ORDER BY last_active DESC NULLS LAST
  LIMIT limit_count;
END;
$$;