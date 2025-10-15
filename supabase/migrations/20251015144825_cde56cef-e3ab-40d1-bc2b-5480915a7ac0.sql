-- Update missing monthly price IDs

-- Solo Plan Monthly
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIVr8JaWWTTAfKWs4KTdM37'
WHERE plan_name = 'Solo' AND billing_period = 'monthly';

-- Starter Plan Monthly
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SDKvf4o5EJkqy39x8pGT2lc'
WHERE plan_name = 'Starter' AND billing_period = 'monthly';

-- Pro Plan Monthly
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SDKvI3zJuB8M3hWJfbR5yXK'
WHERE plan_name = 'Pro' AND billing_period = 'monthly';

-- Enterprise Plan Monthly
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SDKvlRyMkNUbWFr9yFKxOgZ'
WHERE plan_name = 'Enterprise' AND billing_period = 'monthly';