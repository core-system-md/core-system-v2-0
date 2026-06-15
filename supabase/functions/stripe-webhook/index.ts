// supabase/functions/stripe-webhook/index.ts
// Webhook: Stripe sandbox events — subscription, payment, trial

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  // TODO: Verify signature with Stripe library when available in Deno
  // For now, parse and validate basic structure

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
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
