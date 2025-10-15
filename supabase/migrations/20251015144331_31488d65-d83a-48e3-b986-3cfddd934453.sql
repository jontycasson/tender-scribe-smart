-- Update subscription_prices with Stripe price IDs

-- Solo Plan
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIVqsJaWWTTAfKWsABbMwFr'
WHERE plan_name = 'Solo' AND billing_period = 'monthly';

UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIVrhJaWWTTAfKWsP3H6IFrQ'
WHERE plan_name = 'Solo' AND billing_period = 'annual';

-- Starter Plan (only annual visible in screenshot)
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIVqJaWWTTAfKWsv65NOUn1'
WHERE plan_name = 'Starter' AND billing_period = 'annual';

-- Pro Plan (only annual visible in screenshot)
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIVpJaWWTTAfKWsy8LVeFI9'
WHERE plan_name = 'Pro' AND billing_period = 'annual';

-- Enterprise Plan (only annual visible in screenshot)
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIVoyJaWWTTAfKWsQbaECHE'
WHERE plan_name = 'Enterprise' AND billing_period = 'annual';