// supabase/functions/analytics-snapshot/index.ts
// CRON: nightly — data warehouse snapshot to avoid live query pressure

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('generate_daily_snapshot', {
    snapshot_date: today,
  });

  if (error) {
    console.error('Snapshot failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ date: today, tenants_processed: data || 0 }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
