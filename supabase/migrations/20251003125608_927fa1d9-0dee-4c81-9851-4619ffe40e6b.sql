-- Create admin function for company management with stats
CREATE OR REPLACE FUNCTION public.get_admin_companies_with_stats()
RETURNS TABLE(
  id uuid,
  company_name text,
  industry text,
  team_size text,
  created_at timestamptz,
  updated_at timestamptz,
  tender_count bigint,
  last_tender_date timestamptz,
  project_count bigint,
  user_count bigint
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
    cp.id,
    cp.company_name,
    cp.industry,
    cp.team_size,
    cp.created_at,
    cp.updated_at,
    COUNT(DISTINCT t.id)::bigint as tender_count,
    MAX(t.created_at) as last_tender_date,
    COUNT(DISTINCT p.id)::bigint as project_count,
    COUNT(DISTINCT cm.user_id)::bigint + 1 as user_count
  FROM public.company_profiles cp
  LEFT JOIN public.tenders t ON t.company_profile_id = cp.id
  LEFT JOIN public.projects p ON p.company_profile_id = cp.id
  LEFT JOIN public.company_members cm ON cm.company_profile_id = cp.id
  GROUP BY cp.id, cp.company_name, cp.industry, cp.team_size, cp.created_at, cp.updated_at
  ORDER BY cp.created_at DESC;
END;
$$;

-- Create admin function for file upload statistics
CREATE OR REPLACE FUNCTION public.get_admin_file_upload_stats()
RETURNS TABLE(
  total_uploads bigint,
  successful_uploads bigint,
  failed_uploads bigint,
  total_size bigint,
  recent_uploads jsonb
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
    COUNT(*)::bigint as total_uploads,
    COUNT(*) FILTER (WHERE upload_success = true)::bigint as successful_uploads,
    COUNT(*) FILTER (WHERE upload_success = false)::bigint as failed_uploads,
    COALESCE(SUM(file_size), 0)::bigint as total_size,
    (
      SELECT jsonb_agg(row_to_json(recent.*))
      FROM (
        SELECT id, original_filename, file_size, upload_success, created_at, mime_type
        FROM public.file_upload_logs
        ORDER BY created_at DESC
        LIMIT 10
      ) recent
    ) as recent_uploads
  FROM public.file_upload_logs;
END;
$$;

-- Create admin function for table statistics
CREATE OR REPLACE FUNCTION public.get_admin_table_stats()
RETURNS TABLE(
  table_name text,
  row_count bigint
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
  SELECT 'tenders'::text, (SELECT COUNT(*) FROM public.tenders)::bigint
  UNION ALL
  SELECT 'tender_responses'::text, (SELECT COUNT(*) FROM public.tender_responses)::bigint
  UNION ALL
  SELECT 'company_profiles'::text, (SELECT COUNT(*) FROM public.company_profiles)::bigint
  UNION ALL
  SELECT 'qa_memory'::text, (SELECT COUNT(*) FROM public.qa_memory)::bigint
  UNION ALL
  SELECT 'projects'::text, (SELECT COUNT(*) FROM public.projects)::bigint
  UNION ALL
  SELECT 'demo_uses'::text, (SELECT COUNT(*) FROM public.demo_uses)::bigint
  UNION ALL
  SELECT 'user_roles'::text, (SELECT COUNT(*) FROM public.user_roles)::bigint
  UNION ALL
  SELECT 'company_members'::text, (SELECT COUNT(*) FROM public.company_members)::bigint
  UNION ALL
  SELECT 'file_upload_logs'::text, (SELECT COUNT(*) FROM public.file_upload_logs)::bigint;
END;
$$;

-- Create admin function for browsing table data
CREATE OR REPLACE FUNCTION public.get_admin_table_data(
  p_table_name text,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Validate table name to prevent SQL injection
  IF p_table_name NOT IN (
    'tenders', 'tender_responses', 'company_profiles', 'qa_memory', 
    'projects', 'demo_uses', 'user_roles', 'company_members', 'file_upload_logs'
  ) THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;
  
  EXECUTE format(
    'SELECT jsonb_agg(row_to_json(t.*)) FROM (SELECT * FROM public.%I ORDER BY created_at DESC LIMIT %s) t',
    p_table_name,
    p_limit
  ) INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;