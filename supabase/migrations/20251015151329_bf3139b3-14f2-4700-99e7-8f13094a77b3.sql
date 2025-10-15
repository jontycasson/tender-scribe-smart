-- Update jonty@truesourceconsulting.co.uk to trial Solo plan for testing

UPDATE company_profiles
SET 
  subscription_status = 'trial',
  is_complimentary = false,
  complimentary_reason = NULL,
  plan_name = 'Solo',
  seat_limit = 1,
  trial_start_date = now(),
  trial_end_date = now() + interval '14 days',
  trial_tenders_processed = 0,
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL,
  billing_period = NULL,
  current_period_start = NULL,
  current_period_end = NULL,
  cancel_at_period_end = false,
  updated_at = now()
WHERE user_id = 'f9c59713-282d-4d73-b17e-ed36c9c56e7e';