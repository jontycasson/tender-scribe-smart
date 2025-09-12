-- Create proper admin role system for demo_uses table security
-- This addresses the security finding about exposed customer email/IP data

-- 1. Create app_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table for proper admin management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = check_user_id 
        AND role = 'admin'
    );
$$;

-- 4. Create RLS policies for user_roles table
DROP POLICY IF EXISTS "Only admins can manage user roles" ON public.user_roles;
CREATE POLICY "Only admins can manage user roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 5. Update demo_uses RLS policy to use proper admin check
DROP POLICY IF EXISTS "Service role and admins can read demo submissions" ON public.demo_uses;
CREATE POLICY "Only authenticated admins can read demo submissions" 
ON public.demo_uses 
FOR SELECT 
TO authenticated
USING (public.is_admin());

-- 6. Create function to safely view demo statistics without exposing PII
CREATE OR REPLACE FUNCTION public.get_demo_usage_stats()
RETURNS TABLE (
    total_submissions BIGINT,
    unique_companies BIGINT,
    submissions_last_24h BIGINT,
    submissions_last_week BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        COUNT(*) as total_submissions,
        COUNT(DISTINCT company_name) as unique_companies,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as submissions_last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as submissions_last_week
    FROM public.demo_uses;
$$;

-- 7. Create data retention function for GDPR compliance
CREATE OR REPLACE FUNCTION public.cleanup_old_demo_pii()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Anonymize PII data older than 90 days for compliance
    UPDATE public.demo_uses 
    SET 
        email = 'anonymized@example.com',
        ip_address = NULL,
        user_agent = NULL,
        referer = NULL
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND email != 'anonymized@example.com';
    
    -- Delete completely anonymized records older than 1 year
    DELETE FROM public.demo_uses 
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND email = 'anonymized@example.com';
    
    RAISE LOG 'Cleaned up old demo PII data for compliance';
END;
$$;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_demo_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;