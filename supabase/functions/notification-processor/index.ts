import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .limit(50);

  if (error || !notifications || notifications.length === 0) {
    return new Response(JSON.stringify({ success: true, processed: 0 }), { status: 200 });
  }

  const results = [];
  for (const notif of notifications) {
    await supabase
      .from('notification_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', notif.id);

    const sent = true; // TODO: Integrate with WhatsApp/SMS API

    await supabase
      .from('notification_queue')
      .update({
        status: sent ? 'sent' : 'failed',
        sent_at: sent ? new Date().toISOString() : null,
        retry_count: notif.retry_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', notif.id);

    results.push({ id: notif.id, status: sent ? 'sent' : 'failed' });
  }

  return new Response(JSON.stringify({
    success: true,
    processed: results.length,
    results
  }), { status: 200 });
});
