-- Add AI generation tracking for rate limiting
-- Tracks how many times users generate AI content for their company profile

-- Add columns to company_profiles table for tracking AI usage
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS ai_generation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_generation_last_reset TIMESTAMPTZ DEFAULT now();

-- Create index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_company_profiles_ai_tracking
ON public.company_profiles(user_id, ai_generation_last_reset);

-- Add comment for documentation
COMMENT ON COLUMN public.company_profiles.ai_generation_count IS 'Number of AI field generations used in current period (resets daily)';
COMMENT ON COLUMN public.company_profiles.ai_generation_last_reset IS 'Timestamp of last AI generation counter reset';

-- Function to check and enforce rate limits
CREATE OR REPLACE FUNCTION public.check_ai_generation_limit(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  profile_record RECORD;
  daily_limit INTEGER := 20;  -- Max 20 AI generations per day
  reset_window INTERVAL := '24 hours';
  should_reset BOOLEAN;
BEGIN
  -- Get current AI usage stats
  SELECT
    ai_generation_count,
    ai_generation_last_reset,
    EXTRACT(EPOCH FROM (now() - ai_generation_last_reset)) > EXTRACT(EPOCH FROM reset_window) as needs_reset
  INTO profile_record
  FROM public.company_profiles
  WHERE user_id = user_id_param;

  -- If no profile exists yet, allow generation
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', daily_limit,
      'reset_at', now() + reset_window
    );
  END IF;

  -- Reset counter if 24 hours have passed
  IF profile_record.needs_reset THEN
    UPDATE public.company_profiles
    SET
      ai_generation_count = 0,
      ai_generation_last_reset = now()
    WHERE user_id = user_id_param;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', daily_limit,
      'reset_at', now() + reset_window
    );
  END IF;

  -- Check if limit exceeded
  IF profile_record.ai_generation_count >= daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', profile_record.ai_generation_last_reset + reset_window,
      'error', 'Daily AI generation limit reached. Limit resets in ' ||
               to_char(profile_record.ai_generation_last_reset + reset_window - now(), 'HH24:MI') || ' hours.'
    );
  END IF;

  -- Allow generation and return remaining count
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', daily_limit - profile_record.ai_generation_count,
    'reset_at', profile_record.ai_generation_last_reset + reset_window
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment AI generation count
CREATE OR REPLACE FUNCTION public.increment_ai_generation_count(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Increment counter for user's company profile
  UPDATE public.company_profiles
  SET ai_generation_count = ai_generation_count + 1
  WHERE user_id = user_id_param;

  -- If no profile exists, this is a no-op (profile will be created later during onboarding)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION public.check_ai_generation_limit IS 'Check if user has remaining AI generation quota (20/day limit)';
COMMENT ON FUNCTION public.increment_ai_generation_count IS 'Increment AI generation counter after successful generation';

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'AI generation tracking added successfully';
  RAISE NOTICE 'Rate limit: 20 generations per 24 hours';
  RAISE NOTICE 'Functions: check_ai_generation_limit(), increment_ai_generation_count()';
END $$;
