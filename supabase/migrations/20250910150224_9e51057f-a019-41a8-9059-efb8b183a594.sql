-- Fix security vulnerability: Restrict access to demo_uses table
-- Add SELECT policy to prevent unauthorized access to customer email addresses and company data

-- Only allow service role to read demo submission data (for internal analytics/admin purposes)
CREATE POLICY "Only service role can read demo submissions" 
ON public.demo_uses 
FOR SELECT 
USING (false); -- No one can read by default

-- Alternative: If you need authenticated users to read their own submissions, use this instead:
-- CREATE POLICY "Users can read their own demo submissions" 
-- ON public.demo_uses 
-- FOR SELECT 
-- USING (auth.uid() IS NOT NULL AND auth.jwt()->>'email' = email);

-- For now, we're using the most restrictive approach where only the service role can access this data