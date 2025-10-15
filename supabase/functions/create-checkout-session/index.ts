import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log(`User authenticated: ${user.id}, email: ${user.email}`);

    const { plan_name, billing_period } = await req.json();
    
    console.log(`Creating checkout session for user ${user.id}, plan: ${plan_name}, billing: ${billing_period}`);

    // Get company profile
    const { data: company, error: companyError } = await supabase
      .from('company_profiles')
      .select('id, stripe_customer_id, company_name')
      .eq('user_id', user.id)
      .single();

    if (companyError || !company) {
      throw new Error('Company profile not found');
    }

    // Get price from subscription_prices
    const { data: priceData, error: priceError } = await supabase
      .from('subscription_prices')
      .select('stripe_price_id, price_gbp')
      .eq('plan_name', plan_name)
      .eq('billing_period', billing_period)
      .eq('is_active', true)
      .single();

    if (priceError || !priceData?.stripe_price_id) {
      throw new Error('Price not found for this plan');
    }

    // Create or retrieve Stripe customer
    let customerId = company.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          company_id: company.id,
          company_name: company.company_name,
        },
      });
      customerId = customer.id;

      // Update company with customer ID
      await supabase
        .from('company_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', company.id);
      
      console.log(`Created Stripe customer ${customerId} for company ${company.id}`);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceData.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/pricing`,
      metadata: {
        company_id: company.id,
        plan_name,
        billing_period,
      },
    });

    console.log(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
