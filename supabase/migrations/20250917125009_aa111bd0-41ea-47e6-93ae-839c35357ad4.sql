-- Fix demo_uses table security policies
-- This addresses the security finding about customer data access

-- Ensure RLS is enabled
ALTER TABLE public.demo_uses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to rebuild them more securely
DROP POLICY IF EXISTS "demo_uses_validated_insert_policy" ON public.demo_uses;
DROP POLICY IF EXISTS "demo_uses_admin_only_select_policy" ON public.demo_uses;
DROP POLICY IF EXISTS "demo_uses_no_update_policy" ON public.demo_uses;
DROP POLICY IF EXISTS "demo_uses_no_delete_policy" ON public.demo_uses;

-- Recreate INSERT policy with validation
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
  -- Security filters to prevent spam and malicious content
  question !~* '.*(viagra|casino|lottery|prince|inheritance|bitcoin|crypto|investment|loan|credit|debt|money|cash|profit|earn|rich|wealthy|millionaire|hack|crack|password|login|admin|root|sql|script|javascript|php|eval|exec|system|shell|cmd).*' AND
  question !~* '.*(union|select|insert|update|delete|drop|create|alter|truncate|<script|javascript:|data:|vbscript:|onload|onerror|onclick).*' AND
  company_name !~* '.*(test|demo|example|sample|fake|temp|xxx|aaa|bbb|ccc|111|222|333).*'
);

-- CRITICAL: Only authenticated admins can read sensitive customer data
CREATE POLICY "demo_uses_admin_only_select_policy" ON public.demo_uses
FOR SELECT
USING (
  -- Require authenticated user AND admin role
  auth.uid() IS NOT NULL AND 
  public.is_admin(auth.uid())
);

-- Prevent all UPDATE and DELETE operations for data integrity
CREATE POLICY "demo_uses_no_update_policy" ON public.demo_uses
FOR UPDATE
USING (false);

CREATE POLICY "demo_uses_no_delete_policy" ON public.demo_uses  
FOR DELETE
USING (false);

-- Add security logging function
CREATE OR REPLACE FUNCTION public.log_demo_uses_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access attempts to this sensitive table
  RAISE LOG 'demo_uses table access attempt by user: %, operation: %, authenticated: %', 
    COALESCE(auth.uid()::text, 'anonymous'), 
    TG_OP, 
    (auth.uid() IS NOT NULL);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;