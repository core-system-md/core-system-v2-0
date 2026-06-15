// supabase/functions/auto-lock-release/index.ts
// CRON: every 1 minute — releases idle locks abandoned by staff

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: abandoned, error } = await supabase.rpc('release_abandoned_locks', {
    timeout_minutes: 10,
  });

  if (error) {
    console.error('Lock release failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ released: abandoned || 0, timestamp: new Date().toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
