-- Phase 1 & 2: Subscription System with Admin Complimentary Access
-- ============================================================================

-- 1. Add subscription tracking fields to company_profiles
ALTER TABLE public.company_profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' 
  CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled', 'expired', 'complimentary')),
ADD COLUMN IF NOT EXISTS billing_period TEXT 
  CHECK (billing_period IN ('monthly', 'annual')),
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_tenders_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_tender_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS is_complimentary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS complimentary_reason TEXT;

-- 2. Create subscription events log table
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_profile_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on subscription_events
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view subscription events
CREATE POLICY "Admins can view all subscription events"
ON public.subscription_events
FOR SELECT
USING (public.is_admin());

-- System can insert events
CREATE POLICY "System can insert subscription events"
ON public.subscription_events
FOR INSERT
WITH CHECK (true);

-- 3. Create subscription prices table
CREATE TABLE IF NOT EXISTS public.subscription_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  price_gbp NUMERIC(10,2) NOT NULL,
  stripe_price_id TEXT,
  seats INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plan_name, billing_period)
);

-- Enable RLS
ALTER TABLE public.subscription_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can view prices
CREATE POLICY "Anyone can view subscription prices"
ON public.subscription_prices
FOR SELECT
USING (true);

-- Only admins can manage prices
CREATE POLICY "Admins can manage subscription prices"
ON public.subscription_prices
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Insert pricing data (monthly and annual with 20% discount)
INSERT INTO public.subscription_prices (plan_name, billing_period, price_gbp, seats) VALUES
('Solo', 'monthly', 94.99, 1),
('Solo', 'annual', 75.99, 1),
('Starter', 'monthly', 113.99, 2),
('Starter', 'annual', 91.19, 2),
('Pro', 'monthly', 136.99, 5),
('Pro', 'annual', 109.59, 5),
('Enterprise', 'monthly', 164.99, 10),
('Enterprise', 'annual', 131.99, 10)
ON CONFLICT (plan_name, billing_period) DO NOTHING;

-- 4. Create admin function to grant complimentary access
CREATE OR REPLACE FUNCTION public.admin_grant_complimentary_access(
  target_company_id UUID,
  p_plan_name TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_seats INTEGER;
BEGIN
  -- Only admins can grant complimentary access
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin privileges required');
  END IF;

  -- Get seat limit for plan
  SELECT seats INTO plan_seats
  FROM public.subscription_prices
  WHERE plan_name = p_plan_name AND billing_period = 'monthly'
  LIMIT 1;

  IF plan_seats IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid plan name');
  END IF;

  -- Update company profile
  UPDATE public.company_profiles
  SET 
    subscription_status = 'complimentary',
    is_complimentary = true,
    complimentary_reason = p_reason,
    plan_name = p_plan_name,
    seat_limit = plan_seats,
    trial_end_date = NULL,
    billing_period = NULL,
    updated_at = now()
  WHERE id = target_company_id;

  -- Log event
  INSERT INTO public.subscription_events (company_profile_id, event_type, event_data)
  VALUES (target_company_id, 'complimentary_granted', 
    jsonb_build_object(
      'plan', p_plan_name, 
      'reason', p_reason, 
      'granted_by', auth.uid(),
      'seats', plan_seats
    ));

  RETURN jsonb_build_object(
    'success', true, 
    'plan', p_plan_name, 
    'seats', plan_seats,
    'message', 'Complimentary access granted successfully'
  );
END;
$$;

-- 5. Create admin function to revoke complimentary access
CREATE OR REPLACE FUNCTION public.admin_revoke_complimentary_access(target_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin privileges required');
  END IF;

  -- Move to trial status
  UPDATE public.company_profiles
  SET 
    subscription_status = 'trial',
    is_complimentary = false,
    complimentary_reason = NULL,
    trial_start_date = now(),
    trial_end_date = now() + interval '14 days',
    trial_tenders_processed = 0,
    plan_name = 'Solo',
    seat_limit = 1,
    updated_at = now()
  WHERE id = target_company_id;

  -- Log event
  INSERT INTO public.subscription_events (company_profile_id, event_type, event_data)
  VALUES (target_company_id, 'complimentary_revoked', 
    jsonb_build_object('revoked_by', auth.uid()));

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Complimentary access revoked. Company moved to trial status.'
  );
END;
$$;

-- 6. Create function to check if subscription is active
CREATE OR REPLACE FUNCTION public.is_subscription_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_id UUID;
  status TEXT;
  is_comp BOOLEAN;
  trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  company_id := public.get_user_company_profile_id();
  
  IF company_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT 
    subscription_status, 
    is_complimentary, 
    trial_end_date
  INTO status, is_comp, trial_end
  FROM public.company_profiles
  WHERE id = company_id;

  -- Complimentary accounts always have access
  IF is_comp = true AND status = 'complimentary' THEN
    RETURN true;
  END IF;

  -- Active paid subscriptions
  IF status = 'active' THEN
    RETURN true;
  END IF;

  -- Trial accounts within trial period
  IF status = 'trial' AND now() <= trial_end THEN
    RETURN true;
  END IF;

  -- All other cases = no access (including past_due, cancelled, expired)
  RETURN false;
END;
$$;

-- 7. Create function to check if user can create tender
CREATE OR REPLACE FUNCTION public.can_create_tender()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_id UUID;
  status TEXT;
  is_comp BOOLEAN;
  trial_processed INTEGER;
  trial_limit INTEGER;
BEGIN
  company_id := public.get_user_company_profile_id();
  
  IF company_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_create', false,
      'reason', 'no_company',
      'message', 'No company profile found. Please complete onboarding.'
    );
  END IF;
  
  SELECT 
    subscription_status, 
    is_complimentary,
    trial_tenders_processed,
    trial_tender_limit
  INTO status, is_comp, trial_processed, trial_limit
  FROM public.company_profiles
  WHERE id = company_id;

  -- Check if subscription is active first
  IF NOT public.is_subscription_active() THEN
    RETURN jsonb_build_object(
      'can_create', false,
      'reason', 'subscription_inactive',
      'message', 'Your subscription is not active. Please upgrade to continue.',
      'subscription_status', status
    );
  END IF;

  -- Complimentary and active paid accounts have unlimited tenders
  IF is_comp = true OR status = 'active' THEN
    RETURN jsonb_build_object(
      'can_create', true, 
      'reason', 'unlimited',
      'subscription_status', status
    );
  END IF;

  -- Trial accounts check limit
  IF status = 'trial' THEN
    IF trial_processed >= trial_limit THEN
      RETURN jsonb_build_object(
        'can_create', false,
        'reason', 'trial_limit_reached',
        'message', format('Trial limit of %s tenders reached. Upgrade to continue processing tenders.', trial_limit),
        'tenders_used', trial_processed,
        'tender_limit', trial_limit
      );
    ELSE
      RETURN jsonb_build_object(
        'can_create', true,
        'reason', 'trial',
        'tenders_remaining', trial_limit - trial_processed,
        'tenders_used', trial_processed,
        'tender_limit', trial_limit
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'can_create', false, 
    'reason', 'unknown_status',
    'message', 'Unable to determine subscription status.'
  );
END;
$$;

-- 8. Create function to increment trial tender count
CREATE OR REPLACE FUNCTION public.increment_trial_tender_count(company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_profiles
  SET trial_tenders_processed = trial_tenders_processed + 1
  WHERE id = company_id AND subscription_status = 'trial';
END;
$$;

-- 9. Create function to get subscription status details
CREATE OR REPLACE FUNCTION public.get_subscription_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_id UUID;
  company_data RECORD;
  days_remaining INTEGER;
BEGIN
  company_id := public.get_user_company_profile_id();
  
  IF company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No company profile found');
  END IF;

  SELECT 
    subscription_status,
    is_complimentary,
    plan_name,
    billing_period,
    trial_start_date,
    trial_end_date,
    trial_tenders_processed,
    trial_tender_limit,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  INTO company_data
  FROM public.company_profiles
  WHERE id = company_id;

  -- Calculate days remaining for trial
  IF company_data.subscription_status = 'trial' AND company_data.trial_end_date IS NOT NULL THEN
    days_remaining := EXTRACT(DAY FROM (company_data.trial_end_date - now()));
  END IF;

  RETURN jsonb_build_object(
    'subscription_status', company_data.subscription_status,
    'is_complimentary', COALESCE(company_data.is_complimentary, false),
    'is_active', public.is_subscription_active(),
    'plan_name', company_data.plan_name,
    'billing_period', company_data.billing_period,
    'trial_days_remaining', days_remaining,
    'trial_tenders_used', COALESCE(company_data.trial_tenders_processed, 0),
    'trial_tender_limit', COALESCE(company_data.trial_tender_limit, 10),
    'current_period_end', company_data.current_period_end,
    'cancel_at_period_end', COALESCE(company_data.cancel_at_period_end, false)
  );
END;
$$;

-- 10. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_profiles_subscription_status 
ON public.company_profiles(subscription_status);

CREATE INDEX IF NOT EXISTS idx_company_profiles_stripe_customer_id 
ON public.company_profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_company_profile_id 
ON public.subscription_events(company_profile_id);

-- 11. Add comments for documentation
COMMENT ON COLUMN public.company_profiles.subscription_status IS 'Current subscription status: trial, active, past_due, cancelled, expired, or complimentary';
COMMENT ON COLUMN public.company_profiles.is_complimentary IS 'Admin-granted complimentary access that bypasses payment requirements';
COMMENT ON COLUMN public.company_profiles.trial_tender_limit IS 'Maximum tenders allowed during trial period (default: 10, not advertised publicly)';
COMMENT ON TABLE public.subscription_events IS 'Audit log for all subscription-related events';
COMMENT ON TABLE public.subscription_prices IS 'Available subscription plans with pricing for monthly and annual billing';
