// supabase/functions/notification-processor/index.ts
// CRON: every 5 minutes — drain notification_queue and route via adapters

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch pending notifications
  const { data: pending, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Fetch failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const notif of pending || []) {
    // Route by channel (whatsapp, sms, email, in_app)
    const channel = notif.channel;
    let delivered = false;

    try {
      if (channel === 'whatsapp') {
        // TODO: Integrate Twilio/Infobip adapter
        delivered = true;
      } else if (channel === 'sms') {
        delivered = true;
      } else if (channel === 'email') {
        delivered = true;
      } else if (channel === 'in_app') {
        delivered = true;
      }

      await supabase
        .from('notification_queue')
        .update({
          status: delivered ? 'sent' : 'failed',
          attempts: notif.attempts + 1,
          sent_at: delivered ? new Date().toISOString() : null,
        })
        .eq('id', notif.id);

      if (delivered) sent++;
      else failed++;
    } catch (err) {
      console.error('Delivery error:', err);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ processed: (pending || []).length, sent, failed }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
