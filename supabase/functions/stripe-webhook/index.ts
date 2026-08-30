// supabase/functions/stripe-webhook/index.ts
// Webhook: Stripe sandbox events — subscription, payment, trial

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const payload = await req.text();
  const signature = req.headers.get('Stripe-Signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Stripe-Signature header' }), { status: 400 });
  }

  // Verify the event actually came from Stripe using the signed webhook secret.
  // Without this, anyone who knows the public anon key could forge billing events
  // (e.g. mark a subscription as paid) by POSTing directly to this endpoint.
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe signature verification failed:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Map Stripe event to billing_events
  const eventType = event.type;
  let mappedType = 'other';

  if (eventType === 'customer.subscription.created') mappedType = 'subscription_created';
  else if (eventType === 'customer.subscription.updated') mappedType = 'subscription_upgraded';
  else if (eventType === 'customer.subscription.deleted') mappedType = 'subscription_cancelled';
  else if (eventType === 'invoice.payment_succeeded') mappedType = 'payment_succeeded';
  else if (eventType === 'invoice.payment_failed') mappedType = 'payment_failed';
  else if (eventType === 'checkout.session.completed') mappedType = 'trial_started';

  const tenantId = event.data?.object?.metadata?.tenant_id;

  if (!tenantId) {
    return new Response(JSON.stringify({ error: 'Missing tenant_id' }), { status: 400 });
  }

  const { error } = await supabase.from('billing_events').insert({
    tenant_id: tenantId,
    event_type: mappedType,
    stripe_event_id: event.id,
    amount_subunits: event.data?.object?.amount_total || 0,
    event_metadata: event,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Billing event insert failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true, type: mappedType }), { status: 200 });
});