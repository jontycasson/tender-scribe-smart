-- Critical Security Fixes Migration

-- 1. Fix Storage Security - Make tender-documents bucket private and add proper RLS policies
UPDATE storage.buckets 
SET public = false 
WHERE id = 'tender-documents';

-- Add RLS policies for tender documents storage
-- Users can only access files in their own company's folder structure
CREATE POLICY "Company users can upload to their own folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'tender-documents' AND
  -- Extract company_profile_id from the path (format: company_id/file_name)
  (storage.foldername(name))[1]::uuid = public.get_user_company_profile_id()
);

CREATE POLICY "Company users can view their own files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'tender-documents' AND
  -- Extract company_profile_id from the path (format: company_id/file_name)
  (storage.foldername(name))[1]::uuid = public.get_user_company_profile_id()
);

CREATE POLICY "Company users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'tender-documents' AND
  -- Extract company_profile_id from the path (format: company_id/file_name)
  (storage.foldername(name))[1]::uuid = public.get_user_company_profile_id()
);

CREATE POLICY "Company users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'tender-documents' AND
  -- Extract company_profile_id from the path (format: company_id/file_name)
  (storage.foldername(name))[1]::uuid = public.get_user_company_profile_id()
);

-- 2. Add function to generate secure signed URLs for file access
CREATE OR REPLACE FUNCTION public.get_tender_file_url(file_path TEXT, expires_in INTEGER DEFAULT 3600)
RETURNS TEXT AS $$
DECLARE
  signed_url TEXT;
BEGIN
  -- This function will be used by application code to generate signed URLs
  -- The actual signed URL generation happens in the application layer
  -- This function validates that the user has access to the file
  
  -- Check if user has access to this file path
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects 
    WHERE bucket_id = 'tender-documents' 
    AND name = file_path
    AND (storage.foldername(name))[1]::uuid = public.get_user_company_profile_id()
  ) THEN
    RAISE EXCEPTION 'Access denied to file: %', file_path;
  END IF;
  
  RETURN file_path; -- Return path for application to generate signed URL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to sanitize filenames
CREATE OR REPLACE FUNCTION public.sanitize_filename(original_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove dangerous characters and normalize filename
  RETURN regexp_replace(
    regexp_replace(
      trim(original_name),
      '[^a-zA-Z0-9._-]', '_', 'g'  -- Replace unsafe chars with underscore
    ),
    '{2,}', '_', 'g'  -- Replace multiple underscores with single
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Add table to track file upload attempts for security monitoring
CREATE TABLE IF NOT EXISTS public.file_upload_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
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
USING (company_profile_id = public.get_user_company_profile_id());

CREATE POLICY "Users can create upload logs for their company" 
ON public.file_upload_logs 
FOR INSERT 
WITH CHECK (company_profile_id = public.get_user_company_profile_id());

-- 5. Enhance demo rate limiting with additional tracking
ALTER TABLE public.demo_uses 
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS referer TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Add index for enhanced rate limiting
CREATE INDEX IF NOT EXISTS idx_demo_uses_ip_hour 
ON public.demo_uses (ip_address, date_trunc('hour', created_at));

-- Add function for enhanced demo rate limiting
CREATE OR REPLACE FUNCTION public.check_demo_rate_limit(
  email_param TEXT,
  ip_param TEXT,
  user_agent_param TEXT DEFAULT NULL
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
  
  -- Check hourly IP limit (stricter: 2 per hour per IP)
  SELECT COUNT(*) INTO hourly_ip_count
  FROM public.demo_uses 
  WHERE ip_address = ip_param 
  AND created_at >= NOW() - INTERVAL '1 hour';
  
  -- Check for suspicious patterns (same user agent from different IPs)
  IF user_agent_param IS NOT NULL AND LENGTH(user_agent_param) > 50 THEN
    -- Additional validation could be added here
    NULL;
  END IF;
  
  result := jsonb_build_object(
    'email_count', email_count,
    'ip_count', ip_count,
    'hourly_ip_count', hourly_ip_count,
    'email_limit_reached', email_count >= 3,
    'ip_limit_reached', ip_count >= 3,
    'hourly_limit_reached', hourly_ip_count >= 2,
    'can_proceed', (email_count < 3 AND ip_count < 3 AND hourly_ip_count < 2)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_security_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Log important security events
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'tenders' THEN
    INSERT INTO public.file_upload_logs (
      user_id, 
      company_profile_id, 
      original_filename, 
      sanitized_filename, 
      file_size,
      upload_success,
      created_at
    ) VALUES (
      OLD.user_id,
      OLD.company_profile_id,
      'DELETED: ' || OLD.original_filename,
      'audit_log',
      0,
      false,
      now()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for tender deletions
DROP TRIGGER IF EXISTS audit_tender_deletions ON public.tenders;
CREATE TRIGGER audit_tender_deletions
  AFTER DELETE ON public.tenders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_security_events();

-- Add comments for documentation
COMMENT ON FUNCTION public.get_tender_file_url IS 'Validates user access to files and returns path for signed URL generation';
COMMENT ON FUNCTION public.sanitize_filename IS 'Sanitizes filenames to prevent directory traversal and other attacks';
COMMENT ON FUNCTION public.check_demo_rate_limit IS 'Enhanced rate limiting with multiple criteria for demo endpoint';
COMMENT ON TABLE public.file_upload_logs IS 'Security audit log for all file upload attempts';

-- Update auth configuration (these settings need to be applied through Supabase dashboard)
-- OTP expiry: Reduce from default to 600 seconds (10 minutes)
-- Leaked password protection: Enable
-- Note: These are configured through the dashboard, not SQL