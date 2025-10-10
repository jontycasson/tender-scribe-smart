-- Fix security_audit_log RLS policy to prevent manipulation
-- Drop the insecure policy that allows any authenticated user to insert
DROP POLICY IF EXISTS "System can log security events" ON public.security_audit_log;

-- Create a new policy that only allows service role to insert
CREATE POLICY "Only service role can log events"
ON public.security_audit_log 
FOR INSERT
TO service_role
WITH CHECK (true);

-- Update the log_security_event function to use SECURITY DEFINER properly
CREATE OR REPLACE FUNCTION public.log_security_event(event_type_param text, details_param jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    event_type_param,
    auth.uid(),
    details_param,
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the operation
    RAISE WARNING 'Failed to log security event: %', SQLERRM;
END;
$$;