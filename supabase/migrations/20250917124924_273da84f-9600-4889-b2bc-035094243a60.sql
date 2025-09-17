-- Strengthen RLS policies for demo_uses table
-- This addresses the security finding about customer data access

-- First, ensure RLS is enabled
ALTER TABLE public.demo_uses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to rebuild them more securely
DROP POLICY IF EXISTS "Allow validated public demo submissions with rate limiting" ON public.demo_uses;
DROP POLICY IF EXISTS "Only authenticated admins can read demo submissions" ON public.demo_uses;

-- Recreate INSERT policy with validation (same as before but more explicit)
CREATE POLICY "demo_uses_validated_insert_policy" ON public.demo_uses
FOR INSERT
WITH CHECK (
  -- Email validation
  email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' AND
  length(email) <= 254 AND
  -- Company name validation
  company_name IS NOT NULL AND
  length(company_name) >= 2 AND
  length(company_name) <= 100 AND
  -- Question validation
  question IS NOT NULL AND
  length(question) >= 20 AND
  length(question) <= 500 AND
  -- Security filters
  question !~* '.*(viagra|casino|lottery|prince|inheritance|bitcoin|crypto|investment|loan|credit|debt|money|cash|profit|earn|rich|wealthy|millionaire|hack|crack|password|login|admin|root|sql|script|javascript|php|eval|exec|system|shell|cmd).*' AND
  question !~* '.*(union|select|insert|update|delete|drop|create|alter|truncate|<script|javascript:|data:|vbscript:|onload|onerror|onclick).*' AND
  company_name !~* '.*(test|demo|example|sample|fake|temp|xxx|aaa|bbb|ccc|111|222|333).*'
);

-- Recreate SELECT policy - ONLY authenticated admins can read
CREATE POLICY "demo_uses_admin_only_select_policy" ON public.demo_uses
FOR SELECT
USING (
  -- Only authenticated users with admin role can access this data
  auth.uid() IS NOT NULL AND
  public.is_admin(auth.uid())
);

-- Prevent all UPDATE and DELETE operations for security
CREATE POLICY "demo_uses_no_update_policy" ON public.demo_uses
FOR UPDATE
USING (false);

CREATE POLICY "demo_uses_no_delete_policy" ON public.demo_uses
FOR DELETE
USING (false);

-- Add additional security logging
CREATE OR REPLACE FUNCTION public.log_demo_uses_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any access attempts to this sensitive table
  RAISE LOG 'demo_uses table access by user: %, operation: %', auth.uid(), TG_OP;
  
  -- For SELECT operations, ensure it's an admin
  IF TG_OP = 'SELECT' AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized access to demo_uses table';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log access attempts
DROP TRIGGER IF EXISTS demo_uses_access_log ON public.demo_uses;
CREATE TRIGGER demo_uses_access_log
  BEFORE SELECT OR INSERT OR UPDATE OR DELETE ON public.demo_uses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_demo_uses_access();