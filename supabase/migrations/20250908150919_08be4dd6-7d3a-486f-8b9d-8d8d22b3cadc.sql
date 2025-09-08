-- Remove the public read access policy for demo_uses table
-- This prevents competitors from harvesting email addresses
-- The edge function can still read data using service role key

DROP POLICY "Allow reading demo uses for rate limiting" ON public.demo_uses;

-- The edge function will continue to work because it uses the service role key
-- which bypasses RLS policies, but regular users can no longer read the table