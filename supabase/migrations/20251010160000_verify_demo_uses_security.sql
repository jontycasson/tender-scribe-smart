-- Verification script for demo_uses table security
-- Run this to check if RLS is properly configured

-- Check if RLS is enabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  select_policy_count INTEGER;
  rec RECORD;
BEGIN
  -- Check RLS status
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'demo_uses'
  AND relnamespace = 'public'::regnamespace;

  RAISE NOTICE '=== DEMO_USES SECURITY STATUS ===';
  RAISE NOTICE 'RLS Enabled: %', COALESCE(rls_enabled, false);

  -- Count all policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'demo_uses';

  RAISE NOTICE 'Total Policies: %', policy_count;

  -- Count SELECT policies specifically
  SELECT COUNT(*) INTO select_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'demo_uses'
  AND cmd = 'SELECT';

  RAISE NOTICE 'SELECT Policies: %', select_policy_count;

  -- List all policies
  RAISE NOTICE '=== ALL POLICIES ===';
  FOR rec IN (
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'demo_uses'
    ORDER BY cmd, policyname
  ) LOOP
    RAISE NOTICE 'Policy: % (%) - Using: % - Check: %',
      rec.policyname, rec.cmd,
      COALESCE(rec.qual::text, 'NULL'),
      COALESCE(rec.with_check::text, 'NULL');
  END LOOP;

  -- Security check
  IF NOT COALESCE(rls_enabled, false) THEN
    RAISE EXCEPTION 'SECURITY ERROR: RLS is NOT enabled on demo_uses table!';
  END IF;

  IF select_policy_count = 0 THEN
    RAISE EXCEPTION 'SECURITY ERROR: No SELECT policies found! Data is exposed!';
  END IF;

  IF select_policy_count > 1 THEN
    RAISE WARNING 'Multiple SELECT policies found (%). Verify only admin access is allowed.', select_policy_count;
  END IF;

  RAISE NOTICE '=== SECURITY CHECK PASSED ===';
END $$;

-- Double-check: Try to ensure RLS is enabled (idempotent)
ALTER TABLE public.demo_uses ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (extra security)
ALTER TABLE public.demo_uses FORCE ROW LEVEL SECURITY;
