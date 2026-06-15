// supabase/functions/leakage-detector/index.ts
// CRON: every hour — flags treatment gaps (patients scheduled but no session)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase.rpc('detect_leakage_gaps');

  if (error) {
    console.error('Leakage detection failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ flagged: data || 0, timestamp: new Date().toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
