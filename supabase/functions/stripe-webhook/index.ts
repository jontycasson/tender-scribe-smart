import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return new Response(JSON.stringify({ error: 'Webhook signature missing' }), { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log(`Webhook received: ${event.type}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        
        if (!companyId) {
          console.error('No company_id in session metadata');
          break;
        }

        console.log(`Checkout completed for company ${companyId}`);
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const planName = session.metadata?.plan_name || 'Solo';
        const billingPeriod = session.metadata?.billing_period || 'monthly';

        // Get seat limit from subscription_prices
        const { data: priceData } = await supabase
          .from('subscription_prices')
          .select('seats')
          .eq('plan_name', planName)
          .eq('billing_period', billingPeriod)
          .single();

        // Update company profile
        await supabase
          .from('company_profiles')
          .update({
            stripe_subscription_id: subscription.id,
            subscription_status: 'active',
            plan_name: planName,
            billing_period: billingPeriod,
            seat_limit: priceData?.seats || 1,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: false,
            trial_end_date: null,
          })
          .eq('id', companyId);

        // Log event
        await supabase
          .from('subscription_events')
          .insert({
            company_profile_id: companyId,
            event_type: 'subscription_created',
            stripe_event_id: event.id,
            event_data: { subscription_id: subscription.id, plan: planName, billing: billingPeriod },
          });

        console.log(`Subscription activated for company ${companyId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { data: company } = await supabase
          .from('company_profiles')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!company) {
          console.error(`No company found for subscription ${subscription.id}`);
          break;
        }

        const status = subscription.status === 'active' ? 'active' : 
                      subscription.status === 'past_due' ? 'past_due' :
                      subscription.status === 'canceled' ? 'cancelled' : 'active';

        await supabase
          .from('company_profiles')
          .update({
            subscription_status: status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('id', company.id);

        await supabase
          .from('subscription_events')
          .insert({
            company_profile_id: company.id,
            event_type: 'subscription_updated',
            stripe_event_id: event.id,
            event_data: { status, cancel_at_period_end: subscription.cancel_at_period_end },
          });

        console.log(`Subscription updated for company ${company.id}, status: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { data: company } = await supabase
          .from('company_profiles')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!company) {
          console.error(`No company found for subscription ${subscription.id}`);
          break;
        }

        await supabase
          .from('company_profiles')
          .update({
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
          })
          .eq('id', company.id);

        await supabase
          .from('subscription_events')
          .insert({
            company_profile_id: company.id,
            event_type: 'subscription_cancelled',
            stripe_event_id: event.id,
            event_data: { subscription_id: subscription.id },
          });

        console.log(`Subscription cancelled for company ${company.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        const { data: company } = await supabase
          .from('company_profiles')
          .select('id')
          .eq('stripe_subscription_id', invoice.subscription as string)
          .single();

        if (!company) break;

        await supabase
          .from('company_profiles')
          .update({ subscription_status: 'past_due' })
          .eq('id', company.id);

        await supabase
          .from('subscription_events')
          .insert({
            company_profile_id: company.id,
            event_type: 'payment_failed',
            stripe_event_id: event.id,
            event_data: { invoice_id: invoice.id },
          });

        console.log(`Payment failed for company ${company.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
