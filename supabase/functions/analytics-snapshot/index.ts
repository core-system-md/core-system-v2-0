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

  const today = new Date().toISOString().split('T')[0];

  const { data: tenants, error: tenantError } = await supabase
    .from('master_tenants')
    .select('id')
    .eq('is_active', true);

  if (tenantError || !tenants) {
    return new Response(JSON.stringify({ error: tenantError?.message }), { status: 500 });
  }

  const results = [];
  for (const tenant of tenants) {
    const { data: stats, error: statsError } = await supabase.rpc('compute_daily_snapshot', {
      p_tenant_id: tenant.id,
      p_date: today
    });

    if (statsError) {
      results.push({ tenant_id: tenant.id, error: statsError.message });
    } else {
      results.push({ tenant_id: tenant.id, snapshot: stats });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    date: today,
    tenants_processed: results.length,
    results
  }), { status: 200 });
});
