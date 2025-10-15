-- Migrate existing 4 companies to complimentary Enterprise access
-- These are early adopters being transitioned from pre-payment system

UPDATE public.company_profiles
SET 
  subscription_status = 'complimentary',
  is_complimentary = true,
  complimentary_reason = 'Early adopter - migrated from pre-payment system',
  plan_name = 'Enterprise',
  seat_limit = 10,
  billing_period = NULL,
  trial_end_date = NULL,
  trial_start_date = NULL,
  updated_at = now()
WHERE id IN (
  '7c4d908b-15b0-47d6-9fc0-d9c9b688e9ae', -- iWell
  '26aa2427-77d2-4019-853f-d49cf5b5b214', -- 111 Rockets Ltd
  '63050b94-f18f-4030-8b03-8c2bce3b7cf5', -- ista Energy Solutions Ltd
  '38f47636-36da-4255-bf85-958c66ed642a'  -- BBC
);

-- Log the migration events
INSERT INTO public.subscription_events (company_profile_id, event_type, event_data)
SELECT 
  id,
  'complimentary_granted',
  jsonb_build_object(
    'plan', 'Enterprise',
    'reason', 'Early adopter - migrated from pre-payment system',
    'migration_date', now()
  )
FROM public.company_profiles
WHERE id IN (
  '7c4d908b-15b0-47d6-9fc0-d9c9b688e9ae',
  '26aa2427-77d2-4019-853f-d49cf5b5b214',
  '63050b94-f18f-4030-8b03-8c2bce3b7cf5',
  '38f47636-36da-4255-bf85-958c66ed642a'
);