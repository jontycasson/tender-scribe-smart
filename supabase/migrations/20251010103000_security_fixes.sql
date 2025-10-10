-- Security Fixes Migration
-- Date: 2025-10-10
-- Purpose: Remove security vulnerabilities found in audit

-- 1. Remove Admin Bypass Function
DROP FUNCTION IF EXISTS public.get_all_users_for_admin_bypass();

DROP FUNCTION IF EXISTS public.get_all_users_for_admin_test();

COMMENT ON FUNCTION public.get_all_users_for_admin IS 'Secure admin function';

-- 2. Fix Storage Bucket Policies
UPDATE storage.buckets
SET public = false
WHERE id = 'tender-documents';

DROP POLICY IF EXISTS "Company users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Company users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Company users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Company users can delete their own files" ON storage.objects;

CREATE POLICY "Users can upload files to their company folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tender-documents' AND
  (storage.foldername(name))[1]::text = public.get_user_company_profile_id()::text
);

CREATE POLICY "Users can view files in their company folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tender-documents' AND
  (storage.foldername(name))[1]::text = public.get_user_company_profile_id()::text
);

CREATE POLICY "Users can update files in their company folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tender-documents' AND
  (storage.foldername(name))[1]::text = public.get_user_company_profile_id()::text
)
WITH CHECK (
  bucket_id = 'tender-documents' AND
  (storage.foldername(name))[1]::text = public.get_user_company_profile_id()::text
);

CREATE POLICY "Users can delete files in their company folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tender-documents' AND
  (storage.foldername(name))[1]::text = public.get_user_company_profile_id()::text
);

-- 3. Enhance Admin Function Security
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
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Insufficient privileges';
    END IF;

    RAISE LOG 'Admin access: %', auth.uid();

    RETURN QUERY
    SELECT
        au.id::uuid as user_id,
        COALESCE(au.email, '')::text as email,
        au.email_confirmed_at::timestamp with time zone as email_confirmed_at,
        au.created_at::timestamp with time zone as created_at,
        au.last_sign_in_at::timestamp with time zone as last_sign_in_at,
        (cp.id IS NOT NULL)::boolean as has_company_profile,
        cp.id::uuid as company_profile_id,
        COALESCE(cp.company_name, '')::text as company_name,
        COALESCE(cp.industry, '')::text as industry,
        COALESCE(cp.team_size, '')::text as team_size,
        cp.created_at::timestamp with time zone as company_created_at,
        cp.updated_at::timestamp with time zone as company_updated_at
    FROM auth.users au
    LEFT JOIN public.company_profiles cp ON au.id = cp.user_id
    ORDER BY au.created_at DESC;
END;
$$;

-- 4. Create Security Event Log
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('admin_access', 'unauthorized_attempt', 'file_access_denied', 'policy_violation')),
  user_id UUID REFERENCES auth.users(id),
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at
ON public.security_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type
ON public.security_audit_log(event_type);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id
ON public.security_audit_log(user_id);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security audit log"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "System can log security events"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Helper Function
DROP FUNCTION IF EXISTS public.log_security_event(text, jsonb);

CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param TEXT,
  details_param JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    details
  ) VALUES (
    event_type_param,
    auth.uid(),
    details_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_security_event IS 'Logs security events';

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_all_users_for_admin_bypass'
  ) THEN
    RAISE EXCEPTION 'Bypass function still exists';
  END IF;

  RAISE NOTICE 'Security fixes applied successfully';
END $$;
