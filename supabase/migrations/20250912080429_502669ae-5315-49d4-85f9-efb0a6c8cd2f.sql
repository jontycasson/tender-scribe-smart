-- Fix function search path security warnings

-- Fix sanitize_filename function  
CREATE OR REPLACE FUNCTION public.sanitize_filename(original_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove dangerous characters and normalize filename
  RETURN regexp_replace(
    regexp_replace(
      trim(original_name),
      '[^a-zA-Z0-9._-]', '_', 'g'
    ),
    '_{2,}', '_', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Fix check_demo_rate_limit function
CREATE OR REPLACE FUNCTION public.check_demo_rate_limit(
  email_param TEXT,
  ip_param TEXT
) RETURNS JSONB AS $$
DECLARE
  email_count INTEGER;
  ip_count INTEGER;
  hourly_ip_count INTEGER;
  result JSONB;
BEGIN
  -- Check email-based limit (3 per email total)
  SELECT COUNT(*) INTO email_count
  FROM public.demo_uses 
  WHERE email = email_param;
  
  -- Check IP-based limit (3 per IP total)  
  SELECT COUNT(*) INTO ip_count
  FROM public.demo_uses 
  WHERE ip_address = ip_param;
  
  -- Check hourly IP limit (2 per hour per IP)
  SELECT COUNT(*) INTO hourly_ip_count
  FROM public.demo_uses 
  WHERE ip_address = ip_param 
  AND created_at >= NOW() - INTERVAL '1 hour';
  
  result := jsonb_build_object(
    'email_count', email_count,
    'ip_count', ip_count,
    'hourly_ip_count', hourly_ip_count,
    'can_proceed', (email_count < 3 AND ip_count < 3 AND hourly_ip_count < 2)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix cleanup_old_demo_uses function (from previous migration)
CREATE OR REPLACE FUNCTION public.cleanup_old_demo_uses()
RETURNS void AS $$
BEGIN
  DELETE FROM public.demo_uses 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;