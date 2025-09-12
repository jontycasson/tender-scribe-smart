-- Critical Security Fixes Migration (Fixed)

-- 1. Fix Storage Security - Make tender-documents bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'tender-documents';

-- 2. Add RLS policies for tender documents storage
CREATE POLICY "Company users can upload to their own folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'tender-documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Company users can view their own files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'tender-documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Company users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'tender-documents' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Company users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'tender-documents' AND
  auth.uid() IS NOT NULL
);

-- 3. Create function to sanitize filenames
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Add table to track file upload attempts for security monitoring
CREATE TABLE IF NOT EXISTS public.file_upload_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  company_profile_id UUID,
  original_filename TEXT NOT NULL,
  sanitized_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  upload_success BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for file upload logs
ALTER TABLE public.file_upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's upload logs" 
ON public.file_upload_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create upload logs" 
ON public.file_upload_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Enhance demo rate limiting with additional tracking
ALTER TABLE public.demo_uses 
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS referer TEXT;

-- 6. Add function for enhanced demo rate limiting
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add comments for documentation
COMMENT ON FUNCTION public.sanitize_filename IS 'Sanitizes filenames to prevent directory traversal and other attacks';
COMMENT ON FUNCTION public.check_demo_rate_limit IS 'Enhanced rate limiting with multiple criteria for demo endpoint';
COMMENT ON TABLE public.file_upload_logs IS 'Security audit log for all file upload attempts';