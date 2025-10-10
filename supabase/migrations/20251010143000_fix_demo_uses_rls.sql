-- CRITICAL SECURITY FIX: Lock down demo_uses table
-- Issue: Anonymous users can read all demo submissions (emails, companies, IPs, questions)
-- Solution: Remove all public access, allow only authenticated admins

-- Ensure RLS is enabled
ALTER TABLE public.demo_uses ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to ensure clean slate
DROP POLICY IF EXISTS "Allow public demo submissions" ON public.demo_uses;
DROP POLICY IF EXISTS "Allow reading demo uses for rate limiting" ON public.demo_uses;
DROP POLICY IF EXISTS "Allow validated public demo submissions" ON public.demo_uses;
DROP POLICY IF EXISTS "Only service role can read demo submissions" ON public.demo_uses;
DROP POLICY IF EXISTS "Service role and admins can read demo submissions" ON public.demo_uses;
DROP POLICY IF EXISTS "Allow validated public demo submissions with rate limiting" ON public.demo_uses;
DROP POLICY IF EXISTS "Only authenticated admins can read demo submissions" ON public.demo_uses;
DROP POLICY IF EXISTS "demo_uses_validated_insert_policy" ON public.demo_uses;
DROP POLICY IF EXISTS "demo_uses_admin_only_select_policy" ON public.demo_uses;
DROP POLICY IF EXISTS "demo_uses_no_update_policy" ON public.demo_uses;
DROP POLICY IF EXISTS "demo_uses_no_delete_policy" ON public.demo_uses;

-- Policy 1: Allow public INSERT for demo form submissions
-- This is OK because users need to submit demos
CREATE POLICY "demo_public_insert_only"
ON public.demo_uses
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL AND
  email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' AND
  length(email) <= 254 AND
  company_name IS NOT NULL AND
  length(company_name) >= 2 AND
  length(company_name) <= 100 AND
  question IS NOT NULL AND
  length(question) >= 10 AND
  length(question) <= 2000
);

-- Policy 2: CRITICAL - Only authenticated admins can SELECT
-- This prevents data harvesting by competitors
CREATE POLICY "demo_admin_select_only"
ON public.demo_uses
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

-- Policy 3: Block all UPDATE operations
CREATE POLICY "demo_no_updates"
ON public.demo_uses
FOR UPDATE
TO anon, authenticated
USING (false);

-- Policy 4: Block all DELETE operations
CREATE POLICY "demo_no_deletes"
ON public.demo_uses
FOR DELETE
TO anon, authenticated
USING (false);

-- Add comment for documentation
COMMENT ON TABLE public.demo_uses IS 'Stores demo form submissions. RLS enforced: INSERT=public, SELECT=admin only, UPDATE/DELETE=blocked';

-- Verification query
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'demo_uses'
  AND policyname LIKE 'demo_%';

  IF policy_count != 4 THEN
    RAISE WARNING 'Expected 4 policies on demo_uses, found %', policy_count;
  ELSE
    RAISE NOTICE 'demo_uses RLS policies configured correctly (4 policies active)';
  END IF;

  RAISE NOTICE 'Security fix applied: demo_uses table is now secure';
  RAISE NOTICE '- Anonymous users: Can INSERT only';
  RAISE NOTICE '- Authenticated admins: Can SELECT';
  RAISE NOTICE '- All users: Cannot UPDATE or DELETE';
END $$;
