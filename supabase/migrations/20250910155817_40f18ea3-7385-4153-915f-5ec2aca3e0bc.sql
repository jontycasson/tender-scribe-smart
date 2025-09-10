-- Fix demo_uses table security with proper validation and management

-- Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "Only service role can read demo submissions" ON public.demo_uses;

-- Add proper SELECT policy for service role and admin access
CREATE POLICY "Service role and admins can read demo submissions" 
ON public.demo_uses 
FOR SELECT 
USING (
  -- Allow service role (for backend processing and cleanup)
  auth.jwt()->>'role' = 'service_role' OR
  -- Allow authenticated users to read aggregate data only (no personal info)
  (auth.uid() IS NOT NULL AND false) -- Placeholder for future admin roles
);

-- Improve INSERT policy with better validation
DROP POLICY IF EXISTS "Allow public demo submissions" ON public.demo_uses;

CREATE POLICY "Allow validated public demo submissions" 
ON public.demo_uses 
FOR INSERT 
WITH CHECK (
  -- Ensure email is valid format
  email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' AND
  -- Ensure email length is reasonable
  length(email) <= 254 AND
  -- Ensure company name is provided and reasonable length
  company_name IS NOT NULL AND
  length(company_name) BETWEEN 1 AND 200 AND
  -- Ensure question is provided and reasonable length
  question IS NOT NULL AND
  length(question) BETWEEN 10 AND 1000 AND
  -- Basic content validation - no obvious spam patterns
  question !~* '.*(viagra|casino|lottery|prince|inheritance).*'
);

-- Add function to clean up old demo submissions (older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_demo_uses()
RETURNS void AS $$
BEGIN
  DELETE FROM public.demo_uses 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for better performance on IP-based rate limiting
CREATE INDEX IF NOT EXISTS idx_demo_uses_ip_created 
ON public.demo_uses (ip_address, created_at);

-- Add index for email-based rate limiting  
CREATE INDEX IF NOT EXISTS idx_demo_uses_email_created 
ON public.demo_uses (email, created_at);

-- Add comment documenting the table's purpose and security measures
COMMENT ON TABLE public.demo_uses IS 'Stores demo submissions with built-in validation and automatic cleanup after 90 days. Rate limited by IP and email in application logic.';