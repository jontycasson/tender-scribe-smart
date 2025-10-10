-- Fix Priority 1 - Medium Risk Security Issues

-- 1. Create audit log for demo PII access
CREATE TABLE IF NOT EXISTS public.demo_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  access_type text NOT NULL,
  records_accessed integer,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.demo_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view access logs"
ON public.demo_access_logs FOR SELECT
USING (public.is_admin());

-- Update get_demo_usage_stats to log access
CREATE OR REPLACE FUNCTION public.get_demo_usage_stats()
RETURNS TABLE(total_submissions bigint, unique_companies bigint, submissions_last_24h bigint, submissions_last_week bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  record_count bigint;
BEGIN
    -- Only allow admin users to access demo usage statistics
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required to view demo usage statistics.';
    END IF;
    
    -- Get record count for audit
    SELECT COUNT(*) INTO record_count FROM public.demo_uses;
    
    -- Log the access attempt with current IP
    INSERT INTO public.demo_access_logs (admin_user_id, access_type, records_accessed, ip_address)
    VALUES (
      auth.uid(), 
      'stats_query', 
      record_count,
      current_setting('request.headers', true)::json->>'x-real-ip'
    );
    
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_submissions,
        COUNT(DISTINCT company_name)::bigint as unique_companies,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::bigint as submissions_last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::bigint as submissions_last_week
    FROM public.demo_uses;
END;
$function$;

-- Reduce PII retention to 30 days for better GDPR compliance
CREATE OR REPLACE FUNCTION public.cleanup_old_demo_uses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.demo_uses 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$function$;

-- 2. Fix company_members privilege escalation vulnerability
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Company owners can manage members" ON public.company_members;

-- Create new policy that prevents self-modification
CREATE POLICY "Company owners can manage other members" 
ON public.company_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.id = company_members.company_profile_id 
    AND cp.user_id = auth.uid()
  )
  AND company_members.user_id != auth.uid()
);

-- Allow viewing own membership (separate from the existing view policy)
CREATE POLICY "Users can view their own membership details"
ON public.company_members FOR SELECT
USING (user_id = auth.uid());

-- Create audit log for role changes
CREATE TABLE IF NOT EXISTS public.role_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_role text,
  new_role text,
  company_id uuid REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.role_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins and company owners can view role changes"
ON public.role_change_logs FOR SELECT
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.company_profiles cp
    WHERE cp.id = role_change_logs.company_id 
    AND cp.user_id = auth.uid()
  )
);

-- Create trigger to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO public.role_change_logs (
      changed_by,
      target_user,
      old_role,
      new_role,
      company_id
    ) VALUES (
      auth.uid(),
      NEW.user_id,
      OLD.role,
      NEW.role,
      NEW.company_profile_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER role_change_audit
  AFTER UPDATE ON public.company_members
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();