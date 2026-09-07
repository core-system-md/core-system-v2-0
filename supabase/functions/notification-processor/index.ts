import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function isAuthorized(req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  const { data, error } = await supabase.rpc('get_internal_cron_secret');
  return !error && typeof data === 'string' && data.length > 0 && data === token;
}

function getUnsupportedChannelMessage(channel: string): string {
  return `Notification channel '${channel}' has no configured delivery adapter`;
}

Deno.serve(async (req) => {
  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: notifications, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!notifications || notifications.length === 0) {
    return new Response(JSON.stringify({ success: true, processed: 0, results: [] }), { status: 200 });
  }

  const results = [];
  for (const notif of notifications) {
    await supabase
      .from('notification_queue')
      .update({ status: 'processing' })
      .eq('id', notif.id)
      .eq('status', 'queued');

    // Delivery adapters are not implemented in the active codebase yet.
    // Never report a notification as sent unless a real adapter confirms delivery.
    const errorMessage = getUnsupportedChannelMessage(notif.channel);
    const nextRetryCount = (notif.retry_count ?? 0) + 1;
    const exhausted = nextRetryCount >= (notif.max_retries ?? 3);

    const { error: updateError } = await supabase
      .from('notification_queue')
      .update({
        status: exhausted ? 'failed' : 'queued',
        retry_count: nextRetryCount,
        error_message: errorMessage,
      })
      .eq('id', notif.id);

    results.push({
      id: notif.id,
      status: exhausted ? 'failed' : 'queued',
      retry_count: nextRetryCount,
      error: updateError?.message ?? errorMessage,
    });
  }

  return new Response(JSON.stringify({
    success: true,
    processed: results.length,
    results,
  }), { status: 200 });
});