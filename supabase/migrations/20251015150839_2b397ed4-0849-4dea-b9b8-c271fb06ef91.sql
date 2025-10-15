-- Update subscription_prices with TEST MODE Stripe price IDs

-- Solo Plan Monthly
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIWHwQrQwn2JxasUM0WsqgL'
WHERE plan_name = 'Solo' AND billing_period = 'monthly';

-- Starter Plan Monthly
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIWIBQrQwn2JxasuM8wKpZ3'
WHERE plan_name = 'Starter' AND billing_period = 'monthly';

-- Pro Plan Monthly
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIWIgQrQwn2JxasTnlAKwUd'
WHERE plan_name = 'Pro' AND billing_period = 'monthly';

-- Enterprise Plan Monthly
UPDATE subscription_prices 
SET stripe_price_id = 'price_1SIWIgQrQwn2JxasAD6a1eea'
WHERE plan_name = 'Enterprise' AND billing_period = 'monthly';